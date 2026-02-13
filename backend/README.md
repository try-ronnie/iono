# Farmart FastAPI Backend

FastAPI backend for:
- Farmer auth, listing CRUD, order accept/reject, payment summary
- Buyer auth, browse listings, checkout orders, payment flows
- PostgreSQL as the primary database

## 1. Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Update `.env` with your PostgreSQL credentials:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/farmart
JWT_SECRET_KEY=your-secret
FRONTEND_ORIGIN=http://localhost:5173
MPESA_MOCK=true
SEED_DEMO_USERS=true
```

## 2. Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 5001
```

The frontend already defaults to `http://localhost:5001`.

## 3. API Summary

- `POST /auth/register`
- `POST /auth/login`
- `GET /listings`
- `GET /listings/{id}`
- `POST /listings` (farmer)
- `PUT /listings/{id}` (farmer owner)
- `DELETE /listings/{id}` (owner)
- `GET /orders` (role-filtered)
- `POST /orders` (buyer)
- `PATCH /orders/{id}/status` (farmer)
- `POST /payments/mpesa/stk-push` (buyer)
- `POST /payments/card/checkout` (buyer)
- `POST /payments/mpesa/retry` (buyer)
- `GET /payments/{orderId}/status`
- `GET /payments/summary` (farmer)
- `GET /health`

## 4. Daraja (real STK push)

Set these in `.env`:

```env
MPESA_MOCK=false
DARAJA_BASE_URL=https://sandbox.safaricom.co.ke
DARAJA_CONSUMER_KEY=your_consumer_key
DARAJA_CONSUMER_SECRET=your_consumer_secret
DARAJA_SHORTCODE=your_shortcode
DARAJA_PASSKEY=your_lnm_passkey
DARAJA_CALLBACK_URL=https://your-public-url.example.com/payments/mpesa/callback
DARAJA_TRANSACTION_TYPE=CustomerPayBillOnline
```

Important:
- `DARAJA_CALLBACK_URL` must be publicly reachable by Safaricom.
- For local development, expose your backend using a tunnel (e.g. ngrok/cloudflared) and use that HTTPS URL.
- In sandbox, use a sandbox test MSISDN allowed for Lipa Na M-Pesa test prompts.

## 5. Mock M-Pesa behavior

When `MPESA_MOCK=true`:
- phone ending with `0` => failure
- phone ending with `9` => immediate success
- any other phone => pending (retry or status poll)

## 6. Demo Accounts (auto-seeded)

When `SEED_DEMO_USERS=true`, the app creates these users if they don't exist:
- Farmer: `farmer@example.com` / `farmer123`
- Buyer: `user@example.com` / `user123`
