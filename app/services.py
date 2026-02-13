import random
import re
import string
from decimal import Decimal, InvalidOperation

from sqlalchemy.orm import Session

from .models import Listing, Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus, User
from .schemas import DeliveryAddress, ListingOut, OrderItemInput, OrderItemOut, OrderOut


def normalize_role(value: str) -> str:
    if value.lower() == "farmer":
        return "Farmer"
    return "Buyer"


def parse_price_to_decimal(value: str | int | float | Decimal | None) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    cleaned = re.sub(r"[^0-9.]", "", str(value))
    if not cleaned:
        return Decimal("0")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return Decimal("0")


def listing_to_out(listing: Listing) -> ListingOut:
    owner_email = listing.owner.email if listing.owner else ""
    owner_name = listing.owner.name if listing.owner else "Farmer"
    return ListingOut(
        id=listing.id,
        title=listing.title,
        description=listing.description,
        category=listing.category,
        breed=listing.breed,
        location=listing.location,
        price=listing.price,
        maxPrice=listing.max_price,
        weight=listing.weight,
        age=listing.age,
        imageUrl=listing.image_url,
        status=listing.status,
        health=listing.health,
        ownerEmail=owner_email,
        ownerName=owner_name,
        createdAt=listing.created_at,
    )


def order_to_out(order: Order) -> OrderOut:
    items = [
        OrderItemOut(
            id=item.id,
            listingId=item.listing_id,
            title=item.name,
            name=item.name,
            qty=item.qty,
            price=item.price,
            weight=item.weight,
        )
        for item in order.items
    ]
    delivery = None
    if order.delivery_line1 or order.delivery_city:
        delivery = DeliveryAddress(
            line1=order.delivery_line1,
            line2=order.delivery_line2,
            city=order.delivery_city,
            county=order.delivery_county,
            postalCode=order.delivery_postal_code,
            phone=order.delivery_phone,
        )
    return OrderOut(
        id=order.id,
        buyerName=order.buyer_name,
        buyerEmail=order.buyer_email,
        farmerEmail=order.farmer_email,
        items=items,
        total=float(order.total or 0),
        status=order.status.value if isinstance(order.status, OrderStatus) else str(order.status),
        paymentStatus=order.payment_status.value
        if isinstance(order.payment_status, PaymentStatus)
        else str(order.payment_status),
        paymentMethod=order.payment_method.value if order.payment_method else None,
        paymentReceipt=order.payment_receipt,
        resultDesc=order.payment_result_desc,
        createdAt=order.created_at,
        deliveryAddress=delivery,
    )


def random_receipt(prefix: str = "RCP") -> str:
    alphabet = string.ascii_uppercase + string.digits
    return f"{prefix}{''.join(random.choice(alphabet) for _ in range(10))}"


def resolve_farmer_by_email(db: Session, farmer_email: str | None) -> User | None:
    if not farmer_email:
        return None
    return db.query(User).filter(User.email == farmer_email).first()


def create_order_record(
    db: Session,
    *,
    buyer: User,
    items: list[OrderItemInput],
    total: Decimal,
    farmer_email: str | None = None,
    delivery_address: DeliveryAddress | None = None,
) -> Order:
    farmer = resolve_farmer_by_email(db, farmer_email)
    order = Order(
        buyer_id=buyer.id,
        farmer_id=farmer.id if farmer else None,
        buyer_name=buyer.name,
        buyer_email=buyer.email,
        farmer_email=farmer_email,
        total=total,
        status=OrderStatus.pending,
        payment_status=PaymentStatus.not_initiated,
        delivery_line1=delivery_address.line1 if delivery_address else None,
        delivery_line2=delivery_address.line2 if delivery_address else None,
        delivery_city=delivery_address.city if delivery_address else None,
        delivery_county=delivery_address.county if delivery_address else None,
        delivery_postal_code=delivery_address.postalCode if delivery_address else None,
        delivery_phone=delivery_address.phone if delivery_address else None,
    )
    db.add(order)
    db.flush()

    for payload in items:
        item = OrderItem(
            order_id=order.id,
            listing_id=payload.listingId or payload.id,
            name=payload.title or payload.name or "Animal",
            qty=max(payload.qty, 1),
            price=str(payload.price),
            weight=payload.weight,
        )
        db.add(item)

    db.commit()
    db.refresh(order)
    return order


def set_payment_state(
    db: Session,
    *,
    order: Order,
    method: PaymentMethod,
    status: PaymentStatus,
    result_desc: str,
    receipt: str | None = None,
) -> Order:
    order.payment_method = method
    order.payment_status = status
    order.payment_result_desc = result_desc
    if receipt:
        order.payment_receipt = receipt
    db.add(order)
    db.commit()
    db.refresh(order)
    return order
