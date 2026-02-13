import base64
import json
import re
from datetime import datetime
from decimal import Decimal

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..config import settings
from ..database import get_db
from ..dependencies import get_current_user
from ..models import MpesaTransaction, Order, PaymentMethod, PaymentStatus, User, UserRole
from ..schemas import (
    CardCheckoutRequest,
    MpesaCheckoutRequest,
    PaymentStatusResponse,
    PaymentSummaryResponse,
    RetryMpesaRequest,
)
from ..services import (
    create_order_record,
    order_to_out,
    parse_price_to_decimal,
    random_receipt,
    set_payment_state,
)

router = APIRouter(prefix="/payments", tags=["payments"])


def _resolve_order_for_user(db: Session, order_id: int, user: User) -> Order:
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.role == UserRole.farmer:
        if order.farmer_email and order.farmer_email.lower() != user.email.lower():
            raise HTTPException(status_code=403, detail="Not allowed")
    else:
        if order.buyer_email.lower() != user.email.lower():
            raise HTTPException(status_code=403, detail="Not allowed")
    return order


def _normalize_phone(phone_number: str) -> str:
    digits = re.sub(r"\D", "", phone_number or "")
    if digits.startswith("254") and len(digits) == 12:
        return digits
    if digits.startswith("0") and len(digits) == 10:
        return f"254{digits[1:]}"
    if digits.startswith("7") and len(digits) == 9:
        return f"254{digits}"
    raise HTTPException(status_code=400, detail="Invalid M-Pesa phone number format")


def _daraja_access_token() -> str:
    if not settings.daraja_consumer_key or not settings.daraja_consumer_secret:
        raise HTTPException(
            status_code=500,
            detail="Daraja consumer key/secret not configured",
        )

    url = f"{settings.daraja_base_url}/oauth/v1/generate?grant_type=client_credentials"
    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(
                url,
                auth=(settings.daraja_consumer_key, settings.daraja_consumer_secret),
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Daraja auth network error: {exc}") from exc
    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Daraja auth failed: {response.text}",
        )
    token = response.json().get("access_token")
    if not token:
        raise HTTPException(status_code=502, detail="Daraja access token missing")
    return token


def _daraja_stk_push(*, phone: str, amount: int, order_id: int) -> dict:
    required = [
        settings.daraja_shortcode,
        settings.daraja_passkey,
        settings.daraja_callback_url,
    ]
    if any(not value for value in required):
        raise HTTPException(
            status_code=500,
            detail="Daraja shortcode/passkey/callback URL not configured",
        )

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password_raw = f"{settings.daraja_shortcode}{settings.daraja_passkey}{timestamp}"
    password = base64.b64encode(password_raw.encode("utf-8")).decode("utf-8")
    token = _daraja_access_token()

    payload = {
        "BusinessShortCode": settings.daraja_shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": settings.daraja_transaction_type,
        "Amount": max(amount, 1),
        "PartyA": phone,
        "PartyB": settings.daraja_shortcode,
        "PhoneNumber": phone,
        "CallBackURL": settings.daraja_callback_url,
        "AccountReference": f"ORDER-{order_id}",
        "TransactionDesc": f"Farmart payment for order {order_id}",
    }

    url = f"{settings.daraja_base_url}/mpesa/stkpush/v1/processrequest"
    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.post(
                url,
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Daraja STK network error: {exc}") from exc
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Daraja STK failed: {response.text}")
    return response.json()


def _latest_mpesa_transaction(order: Order) -> MpesaTransaction | None:
    if not order.mpesa_transactions:
        return None
    return max(order.mpesa_transactions, key=lambda item: item.created_at)


@router.post("/mpesa/stk-push", response_model=dict)
def mpesa_stk_push(
    payload: MpesaCheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.farmer:
        raise HTTPException(status_code=403, detail="Farmers cannot pay for orders")

    order = create_order_record(
        db,
        buyer=current_user,
        items=payload.items,
        total=Decimal(str(payload.total)),
        farmer_email=payload.farmerEmail,
        delivery_address=payload.deliveryAddress,
    )

    phone = _normalize_phone(payload.phoneNumber)

    if settings.mpesa_mock:
        status = PaymentStatus.pending
        result_desc = "M-Pesa STK push sent"
        receipt = None
        if phone.endswith("0"):
            status = PaymentStatus.failed
            result_desc = "M-Pesa mock failure"
        elif phone.endswith("9"):
            status = PaymentStatus.success
            result_desc = "M-Pesa payment confirmed"
            receipt = random_receipt("MP")

        order = set_payment_state(
            db,
            order=order,
            method=PaymentMethod.mpesa,
            status=status,
            result_desc=result_desc,
            receipt=receipt,
        )
    else:
        daraja_response = _daraja_stk_push(
            phone=phone,
            amount=int(max(round(float(payload.total)), 1)),
            order_id=order.id,
        )
        response_code = str(daraja_response.get("ResponseCode", ""))
        is_ok = response_code == "0"
        order = set_payment_state(
            db,
            order=order,
            method=PaymentMethod.mpesa,
            status=PaymentStatus.pending if is_ok else PaymentStatus.failed,
            result_desc=daraja_response.get("ResponseDescription")
            or daraja_response.get("errorMessage")
            or "M-Pesa request sent",
            receipt=None,
        )
        tx = MpesaTransaction(
            order_id=order.id,
            merchant_request_id=daraja_response.get("MerchantRequestID"),
            checkout_request_id=daraja_response.get("CheckoutRequestID"),
            phone_number=phone,
            response_code=response_code,
            result_code=None,
            result_desc=daraja_response.get("CustomerMessage")
            or daraja_response.get("ResponseDescription"),
            raw_payload=json.dumps(daraja_response),
            status=PaymentStatus.pending if is_ok else PaymentStatus.failed,
        )
        db.add(tx)
        db.commit()
        db.refresh(order)

    return {
        "message": "M-Pesa prompt sent. Confirm on your phone.",
        "order": order_to_out(order),
        "payment": {
            "status": order.payment_status.value,
            "resultDesc": order.payment_result_desc,
            "receipt": order.payment_receipt,
        },
    }


@router.post("/card/checkout", response_model=dict)
def card_checkout(
    payload: CardCheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.farmer:
        raise HTTPException(status_code=403, detail="Farmers cannot pay for orders")

    if len(payload.cardNumber.replace(" ", "")) < 12:
        raise HTTPException(status_code=400, detail="Invalid card details")

    order = create_order_record(
        db,
        buyer=current_user,
        items=payload.items,
        total=Decimal(str(payload.total)),
        farmer_email=payload.farmerEmail,
        delivery_address=payload.deliveryAddress,
    )
    order = set_payment_state(
        db,
        order=order,
        method=PaymentMethod.card,
        status=PaymentStatus.success,
        result_desc="Card payment successful",
        receipt=random_receipt("CD"),
    )
    return {
        "message": "Card payment successful",
        "order": order_to_out(order),
        "payment": {
            "status": order.payment_status.value,
            "resultDesc": order.payment_result_desc,
            "receipt": order.payment_receipt,
        },
    }


@router.post("/mpesa/retry", response_model=dict)
def retry_mpesa(
    payload: RetryMpesaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = _resolve_order_for_user(db, payload.orderId, current_user)
    if current_user.role == UserRole.farmer:
        raise HTTPException(status_code=403, detail="Only buyers can retry payment")

    if payload.phoneNumber:
        phone = _normalize_phone(payload.phoneNumber)
    else:
        latest_tx = _latest_mpesa_transaction(order)
        phone = latest_tx.phone_number if latest_tx and latest_tx.phone_number else None
        if not phone:
            raise HTTPException(status_code=400, detail="Phone number required for retry")

    if settings.mpesa_mock:
        status = PaymentStatus.pending
        result_desc = "M-Pesa STK push sent"
        receipt = None
        if phone.endswith("0"):
            status = PaymentStatus.failed
            result_desc = "M-Pesa mock failure"
        elif phone.endswith("9"):
            status = PaymentStatus.success
            result_desc = "M-Pesa payment confirmed"
            receipt = random_receipt("MP")

        order = set_payment_state(
            db,
            order=order,
            method=PaymentMethod.mpesa,
            status=status,
            result_desc=result_desc,
            receipt=receipt,
        )
    else:
        daraja_response = _daraja_stk_push(
            phone=phone,
            amount=int(max(round(float(order.total)), 1)),
            order_id=order.id,
        )
        response_code = str(daraja_response.get("ResponseCode", ""))
        is_ok = response_code == "0"
        order = set_payment_state(
            db,
            order=order,
            method=PaymentMethod.mpesa,
            status=PaymentStatus.pending if is_ok else PaymentStatus.failed,
            result_desc=daraja_response.get("ResponseDescription")
            or daraja_response.get("errorMessage")
            or "M-Pesa retry sent",
            receipt=None,
        )
        tx = MpesaTransaction(
            order_id=order.id,
            merchant_request_id=daraja_response.get("MerchantRequestID"),
            checkout_request_id=daraja_response.get("CheckoutRequestID"),
            phone_number=phone,
            response_code=response_code,
            result_code=None,
            result_desc=daraja_response.get("CustomerMessage")
            or daraja_response.get("ResponseDescription"),
            raw_payload=json.dumps(daraja_response),
            status=PaymentStatus.pending if is_ok else PaymentStatus.failed,
        )
        db.add(tx)
        db.commit()
        db.refresh(order)

    return {
        "message": "M-Pesa prompt sent. Confirm on your phone.",
        "order": order_to_out(order),
        "payment": {
            "status": order.payment_status.value,
            "resultDesc": order.payment_result_desc,
            "receipt": order.payment_receipt,
        },
    }


@router.get("/{order_id}/status", response_model=PaymentStatusResponse)
def payment_status(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = _resolve_order_for_user(db, order_id, current_user)
    return PaymentStatusResponse(
        orderId=order.id,
        status=order.payment_status,
        paymentMethod=order.payment_method,
        receipt=order.payment_receipt,
        resultDesc=order.payment_result_desc,
    )


@router.post("/mpesa/callback", include_in_schema=False)
def mpesa_callback(payload: dict, db: Session = Depends(get_db)):
    callback = (
        payload.get("Body", {})
        .get("stkCallback", {})
    )
    checkout_request_id = callback.get("CheckoutRequestID")
    result_code = str(callback.get("ResultCode", ""))
    result_desc = callback.get("ResultDesc", "")

    if not checkout_request_id:
        return {"ResultCode": 1, "ResultDesc": "Missing CheckoutRequestID"}

    tx = (
        db.query(MpesaTransaction)
        .filter(MpesaTransaction.checkout_request_id == checkout_request_id)
        .first()
    )
    if not tx:
        return {"ResultCode": 1, "ResultDesc": "Transaction not found"}

    receipt = None
    metadata_items = callback.get("CallbackMetadata", {}).get("Item", []) or []
    for item in metadata_items:
        name = item.get("Name")
        if name == "MpesaReceiptNumber":
            receipt = item.get("Value")
            break

    order = db.query(Order).filter(Order.id == tx.order_id).first()
    if not order:
        return {"ResultCode": 1, "ResultDesc": "Order not found"}

    success = result_code == "0"
    tx.result_code = result_code
    tx.result_desc = result_desc
    tx.mpesa_receipt = receipt
    tx.raw_payload = json.dumps(payload)
    tx.status = PaymentStatus.success if success else PaymentStatus.failed

    order.payment_method = PaymentMethod.mpesa
    order.payment_status = PaymentStatus.success if success else PaymentStatus.failed
    order.payment_result_desc = result_desc
    if receipt:
        order.payment_receipt = receipt

    db.add(tx)
    db.add(order)
    db.commit()
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.get("/summary", response_model=PaymentSummaryResponse)
def payment_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.farmer:
        raise HTTPException(status_code=403, detail="Farmer role required")

    orders = (
        db.query(Order)
        .filter(Order.farmer_email == current_user.email)
        .order_by(Order.created_at.desc())
        .all()
    )
    total = len(orders)
    success = sum(1 for item in orders if item.payment_status == PaymentStatus.success)
    pending = sum(1 for item in orders if item.payment_status == PaymentStatus.pending)
    failed = sum(1 for item in orders if item.payment_status == PaymentStatus.failed)
    revenue = sum(
        parse_price_to_decimal(item.total)
        for item in orders
        if item.payment_status == PaymentStatus.success
    )

    return PaymentSummaryResponse(
        total=total,
        success=success,
        pending=pending,
        failed=failed,
        revenue=float(revenue),
    )
