from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class UserRole(str, Enum):
    buyer = "Buyer"
    farmer = "Farmer"


class OrderStatus(str, Enum):
    pending = "Pending"
    accepted = "Accepted"
    rejected = "Rejected"


class PaymentStatus(str, Enum):
    not_initiated = "NOT_INITIATED"
    pending = "PENDING"
    success = "SUCCESS"
    failed = "FAILED"


class PaymentMethod(str, Enum):
    mpesa = "MPESA"
    card = "CARD"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SqlEnum(UserRole), nullable=False, default=UserRole.buyer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    listings: Mapped[list["Listing"]] = relationship(back_populates="owner")
    orders_as_buyer: Mapped[list["Order"]] = relationship(
        back_populates="buyer", foreign_keys="Order.buyer_id"
    )
    orders_as_farmer: Mapped[list["Order"]] = relationship(
        back_populates="farmer", foreign_keys="Order.farmer_id"
    )


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    category: Mapped[str] = mapped_column(String(80), default="Cattle", nullable=False)
    breed: Mapped[str | None] = mapped_column(String(120), nullable=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    price: Mapped[str] = mapped_column(String(80), nullable=False)
    max_price: Mapped[str | None] = mapped_column(String(80), nullable=True)
    weight: Mapped[str | None] = mapped_column(String(80), nullable=True)
    age: Mapped[str | None] = mapped_column(String(80), nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text(), nullable=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="Available")
    health: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    owner: Mapped[User] = relationship(back_populates="listings")
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="listing")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    farmer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    buyer_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    buyer_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    farmer_email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    delivery_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    delivery_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    delivery_city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    delivery_county: Mapped[str | None] = mapped_column(String(120), nullable=True)
    delivery_postal_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    delivery_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[OrderStatus] = mapped_column(SqlEnum(OrderStatus), default=OrderStatus.pending)
    payment_status: Mapped[PaymentStatus] = mapped_column(
        SqlEnum(PaymentStatus), default=PaymentStatus.not_initiated
    )
    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        SqlEnum(PaymentMethod), nullable=True
    )
    payment_receipt: Mapped[str | None] = mapped_column(String(120), nullable=True)
    payment_result_desc: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    buyer: Mapped[User] = relationship(back_populates="orders_as_buyer", foreign_keys=[buyer_id])
    farmer: Mapped[User | None] = relationship(
        back_populates="orders_as_farmer", foreign_keys=[farmer_id]
    )
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )
    mpesa_transactions: Mapped[list["MpesaTransaction"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    listing_id: Mapped[int | None] = mapped_column(ForeignKey("listings.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    qty: Mapped[int] = mapped_column(default=1)
    price: Mapped[str] = mapped_column(String(80), nullable=False)
    weight: Mapped[str | None] = mapped_column(String(80), nullable=True)

    order: Mapped[Order] = relationship(back_populates="items")
    listing: Mapped[Listing | None] = relationship(back_populates="order_items")


class MpesaTransaction(Base):
    __tablename__ = "mpesa_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    merchant_request_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    checkout_request_id: Mapped[str | None] = mapped_column(String(120), nullable=True, unique=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    response_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    result_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    result_desc: Mapped[str | None] = mapped_column(Text(), nullable=True)
    mpesa_receipt: Mapped[str | None] = mapped_column(String(120), nullable=True)
    raw_payload: Mapped[str | None] = mapped_column(Text(), nullable=True)
    status: Mapped[PaymentStatus] = mapped_column(
        SqlEnum(PaymentStatus), default=PaymentStatus.pending
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    order: Mapped[Order] = relationship(back_populates="mpesa_transactions")
