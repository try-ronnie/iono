from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Order, OrderStatus, User, UserRole
from ..schemas import (
    CreateOrderRequest,
    OrdersResponse,
    UpdateOrderStatusRequest,
)
from ..services import create_order_record, order_to_out

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=OrdersResponse)
def list_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Order).options(joinedload(Order.items)).order_by(Order.created_at.desc())
    if current_user.role == UserRole.farmer:
        query = query.filter(Order.farmer_email == current_user.email)
    else:
        query = query.filter(Order.buyer_email == current_user.email)
    records = query.all()
    return OrdersResponse(items=[order_to_out(record) for record in records])


@router.post("", response_model=dict, status_code=201)
def create_order(
    payload: CreateOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.farmer:
        raise HTTPException(status_code=403, detail="Farmers cannot place orders")
    order = create_order_record(
        db,
        buyer=current_user,
        items=payload.items,
        total=Decimal(str(payload.total)),
        farmer_email=payload.farmerEmail,
        delivery_address=payload.deliveryAddress,
    )
    return {"order": order_to_out(order)}


@router.patch("/{order_id}/status", response_model=dict)
def update_order_status(
    order_id: int,
    payload: UpdateOrderStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role != UserRole.farmer:
        raise HTTPException(status_code=403, detail="Only farmers can update order status")
    if order.farmer_email and order.farmer_email.lower() != current_user.email.lower():
        raise HTTPException(status_code=403, detail="Not allowed to update this order")

    order.status = OrderStatus(payload.status.value)
    db.add(order)
    db.commit()
    db.refresh(order)
    return {"order": order_to_out(order)}
