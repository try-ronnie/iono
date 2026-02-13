from sqlalchemy.orm import Session

from .config import settings
from .models import User, UserRole
from .security import hash_password


def _ensure_user(
    db: Session,
    *,
    name: str,
    email: str,
    password: str,
    role: UserRole,
) -> None:
    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing:
        return

    user = User(
        name=name.strip(),
        email=email.lower(),
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)


def seed_demo_users(db: Session) -> None:
    if not settings.seed_demo_users:
        return

    _ensure_user(
        db,
        name=settings.demo_farmer_name,
        email=settings.demo_farmer_email,
        password=settings.demo_farmer_password,
        role=UserRole.farmer,
    )
    _ensure_user(
        db,
        name=settings.demo_buyer_name,
        email=settings.demo_buyer_email,
        password=settings.demo_buyer_password,
        role=UserRole.buyer,
    )
    db.commit()
