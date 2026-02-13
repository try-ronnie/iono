from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .routers.auth import router as auth_router
from .routers.listings import router as listings_router
from .routers.orders import router as orders_router
from .routers.payments import router as payments_router
from .seed import seed_demo_users


app = FastAPI(title="Farmart API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as seed_db:
        seed_demo_users(seed_db)
except Exception as e:
    print(f"Database initialization error: {e}")

app.include_router(auth_router)
app.include_router(listings_router)
app.include_router(orders_router)
app.include_router(payments_router)


@app.get("/")
def root():
    return {"message": "Farmart API", "status": "running"}


@app.get("/health")
def health():
    return {"ok": True}
