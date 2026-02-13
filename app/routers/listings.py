from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..dependencies import get_current_user, require_farmer
from ..models import Listing, User
from ..schemas import (
    ListingCreateRequest,
    ListingOut,
    ListingsResponse,
    ListingUpdateRequest,
)
from ..services import listing_to_out

router = APIRouter(prefix="/listings", tags=["listings"])


@router.get("", response_model=ListingsResponse)
def list_listings(db: Session = Depends(get_db)):
    records = (
        db.query(Listing).options(joinedload(Listing.owner)).order_by(Listing.created_at.desc()).all()
    )
    return ListingsResponse(items=[listing_to_out(record) for record in records])


@router.get("/{listing_id}", response_model=ListingOut)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    record = (
        db.query(Listing)
        .options(joinedload(Listing.owner))
        .filter(Listing.id == listing_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing_to_out(record)


@router.post("", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
def create_listing(
    payload: ListingCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    record = Listing(
        owner_id=current_user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        breed=payload.breed,
        location=payload.location,
        price=payload.price,
        max_price=payload.maxPrice,
        weight=payload.weight,
        age=payload.age,
        image_url=payload.imageUrl,
        status=payload.status or "Available",
        health=payload.health,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return listing_to_out(record)


@router.put("/{listing_id}", response_model=ListingOut)
def update_listing(
    listing_id: int,
    payload: ListingUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    record = db.query(Listing).filter(Listing.id == listing_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Listing not found")
    if record.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to update this listing")

    record.title = payload.title
    record.description = payload.description
    record.category = payload.category
    record.breed = payload.breed
    record.location = payload.location
    record.price = payload.price
    record.max_price = payload.maxPrice
    record.weight = payload.weight
    record.age = payload.age
    record.image_url = payload.imageUrl
    record.status = payload.status or "Available"
    record.health = payload.health

    db.add(record)
    db.commit()
    db.refresh(record)
    return listing_to_out(record)


@router.delete("/{listing_id}")
def delete_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(Listing).filter(Listing.id == listing_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Listing not found")
    if record.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this listing")
    db.delete(record)
    db.commit()
    return {"ok": True}
