from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import OrderStatus, PaymentMethod, PaymentStatus


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: str = Field(default="Buyer")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ListingCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    category: str = "Cattle"
    breed: str | None = None
    location: str | None = None
    price: str = Field(min_length=1, max_length=80)
    maxPrice: str | None = None
    weight: str | None = None
    age: str | None = None
    imageUrl: str | None = None
    status: str = "Available"
    health: str | None = None


class ListingUpdateRequest(ListingCreateRequest):
    pass


class ListingOut(BaseModel):
    id: int
    title: str
    description: str | None
    category: str
    breed: str | None
    location: str | None
    price: str
    maxPrice: str | None
    weight: str | None
    age: str | None
    imageUrl: str | None
    status: str
    health: str | None
    ownerEmail: str
    ownerName: str
    createdAt: datetime


class ListingsResponse(BaseModel):
    items: list[ListingOut]


class DeliveryAddress(BaseModel):
    line1: str | None = None
    line2: str | None = None
    city: str | None = None
    county: str | None = None
    postalCode: str | None = None
    phone: str | None = None


class OrderItemInput(BaseModel):
    id: int | None = None
    listingId: int | None = None
    title: str | None = None
    name: str | None = None
    qty: int = 1
    price: Any = "0"
    weight: str | None = None
    ownerEmail: str | None = None


class CreateOrderRequest(BaseModel):
    items: list[OrderItemInput]
    total: Decimal | float | int = 0
    farmerEmail: EmailStr | None = None
    deliveryAddress: DeliveryAddress | None = None


class UpdateOrderStatusRequest(BaseModel):
    status: OrderStatus


class OrderItemOut(BaseModel):
    id: int
    listingId: int | None
    title: str
    name: str
    qty: int
    price: str
    weight: str | None


class OrderOut(BaseModel):
    id: int
    buyerName: str | None
    buyerEmail: str
    farmerEmail: str | None
    items: list[OrderItemOut]
    total: float
    status: str
    paymentStatus: str
    paymentMethod: str | None
    paymentReceipt: str | None
    resultDesc: str | None = None
    createdAt: datetime
    deliveryAddress: DeliveryAddress | None


class OrdersResponse(BaseModel):
    items: list[OrderOut]


class MpesaCheckoutRequest(BaseModel):
    items: list[OrderItemInput]
    subtotal: float
    shipping: float
    total: float
    farmerEmail: EmailStr | None = None
    deliveryAddress: DeliveryAddress | None = None
    phoneNumber: str


class CardCheckoutRequest(BaseModel):
    items: list[OrderItemInput]
    subtotal: float
    shipping: float
    total: float
    farmerEmail: EmailStr | None = None
    deliveryAddress: DeliveryAddress | None = None
    cardNumber: str
    expiry: str
    cvv: str


class RetryMpesaRequest(BaseModel):
    orderId: int
    phoneNumber: str | None = None


class PaymentStatusResponse(BaseModel):
    orderId: int
    status: PaymentStatus
    paymentMethod: PaymentMethod | None = None
    receipt: str | None = None
    resultDesc: str | None = None


class PaymentSummaryResponse(BaseModel):
    total: int
    success: int
    pending: int
    failed: int
    revenue: float
