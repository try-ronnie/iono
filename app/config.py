import os


class Settings:
    def __init__(self) -> None:
        database_url = os.getenv("DATABASE_URL", "")
        
        # Use SQLite for local development if PostgreSQL is not available
        if not database_url or "localhost" in database_url:
            # Check if we should use SQLite for development
            use_sqlite = os.getenv("USE_SQLITE", "true").lower() in {"1", "true", "yes", "on"}
            if use_sqlite:
                self.database_url = "sqlite:///./dev.db"
            else:
                self.database_url = os.getenv(
                    "DATABASE_URL",
                    "postgresql+psycopg://postgres:postgres@localhost:5432/farmart",
                )
        else:
            self.database_url = database_url
            
        # Convert postgres:// or postgresql:// to postgresql+psycopg://
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace(
                "postgres://", "postgresql+psycopg://", 1
            )
        elif self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace(
                "postgresql://", "postgresql+psycopg://", 1
            )
        self.jwt_secret_key = os.getenv("JWT_SECRET_KEY", "dev-secret-key")
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.access_token_expire_minutes = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120")
        )
        frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
        self.cors_origins = [
            frontend_origin,
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "*",  # Allow all origins temporarily for testing
        ]
        self.mpesa_mock = os.getenv("MPESA_MOCK", "true").lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        self.daraja_base_url = os.getenv(
            "DARAJA_BASE_URL", "https://sandbox.safaricom.co.ke"
        ).rstrip("/")
        self.daraja_consumer_key = os.getenv("DARAJA_CONSUMER_KEY", "")
        self.daraja_consumer_secret = os.getenv("DARAJA_CONSUMER_SECRET", "")
        self.daraja_shortcode = os.getenv("DARAJA_SHORTCODE", "")
        self.daraja_passkey = os.getenv("DARAJA_PASSKEY", "")
        self.daraja_callback_url = os.getenv("DARAJA_CALLBACK_URL", "")
        self.daraja_transaction_type = os.getenv(
            "DARAJA_TRANSACTION_TYPE", "CustomerPayBillOnline"
        )
        self.seed_demo_users = os.getenv("SEED_DEMO_USERS", "true").lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        self.demo_farmer_name = os.getenv("DEMO_FARMER_NAME", "Demo Farmer")
        self.demo_farmer_email = os.getenv("DEMO_FARMER_EMAIL", "farmer@example.com")
        self.demo_farmer_password = os.getenv("DEMO_FARMER_PASSWORD", "farmer123")
        self.demo_buyer_name = os.getenv("DEMO_BUYER_NAME", "Demo Buyer")
        self.demo_buyer_email = os.getenv("DEMO_BUYER_EMAIL", "user@example.com")
        self.demo_buyer_password = os.getenv("DEMO_BUYER_PASSWORD", "user123")


settings = Settings()
