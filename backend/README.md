# Utu Marketplace API

## Local development

From this directory, create an environment, install dependencies, seed the demo companies and portfolio projects, and start the API:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:JWT_SECRET_KEY = "replace-with-a-random-secret-at-least-32-characters-long"
$env:UTU_DEMO_PASSWORD = "choose-a-demo-password"   # demo databases only; seed refuses without it
python seed.py
uvicorn main:app --reload
```

The default database is `solar.db` in the backend working directory. The frontend uses `http://localhost:8000`; set `VITE_API_URL` when the API is hosted elsewhere. Configure `UTU_CORS_ORIGINS` as a comma-separated list of exact frontend origins outside local development. Local Vite origins on ports 5173 and 5174 are allowed by default.

## Marketplace flows

- Company registration requires only a company name and account credentials; contact and verification details can be added later. Every new company starts pending.
- Verification requires both registration numbers, at least three completed projects, and an admin checklist confirming the license, tax record, and project evidence were checked against original documents. The admin review endpoint is `POST /api/companies/{id}/verification`; it requires a signed-in admin account (admin JWT) and a JSON review body.
- The app does not upload or store document images yet; admins must inspect original documents outside the app before checking the evidence boxes. Legacy verified listings without a verification record are moved back to pending on startup.
- Verified and pending companies appear in public listings and can receive quote requests; only verified companies can access the request inbox or submit quotes. Rejected companies are excluded.
- Customers create quote requests with `POST /api/quote-requests`. The response contains a random access token; the frontend stores it locally and uses it to retrieve that request. The token is a bearer secret and must not be shared publicly.
- A request may include `is_green_initiative=true`; clients and company inboxes can filter with `?is_green_initiative=true|false`. Companies can mark `green_initiative_supported` on a quote only when the request carries that flag. Accepting a supported quote creates a random public verification URL under `/api/quote-requests/verify/{verification_id}`. Its response deliberately excludes customer names, phone numbers, notes, and budget; it contains project specifications and checked company-license status only.
- The RFQ's five-year repayment calculator is an illustrative planning estimate based on the budget entered by the customer. It is not a Central Bank loan offer or a representation of official rates; participating banks determine eligibility and final terms.
- If a guest later signs in or registers as a client in the same browser, the frontend uses the locally held request access tokens to claim unowned guest requests for that account. Only the matching client account can claim them, and already-owned requests cannot be transferred.
- Authenticated clients retrieve requests with `GET /api/quote-requests/mine`; the server filters strictly by the authenticated user ID. They can edit request contact, system capacity, battery, panel count, location, and notes at any lifecycle stage with `PATCH /api/quote-requests/{group_id}`. Ownership is checked on every edit; guest requests can use their private access token.
- Companies register at `POST /api/auth/register/company` and sign in at `POST /api/auth/login` like every other account, then use the company inbox and submit structured quotes. The inbox requires identity verification, and the customer's phone number is shown only after the customer places a deposit with that company. Accepted quotes are locked. Accounts from the removed company login are migrated to a normal account on their first sign-in.
- After a customer accepts a company's quote and installation is complete, the authenticated, verified installer records it with `POST /api/quote-requests/{group_id}/complete`. The project is tied to that RFQ and company, so it appears only to the customer who owns the request.
- Customers can review a completed installation only for the company whose quote they accepted, using that request's private access token with `POST /api/reviews`. Reviews are unique per project, include overall/communication/work-quality ratings, and update the company's public average using two-decimal half-up rounding. Attempts without an accepted quote and matching completed project return `403`; an unknown project returns `404`.
- Public review feeds are `GET /api/companies/{company_id}/reviews` and `GET /api/reviews/featured`; only verified installation reviews are returned.
- Completed installations are stored as `Project` records. Public clients use `GET /api/projects?status=completed` and `GET /api/projects/{id}`; the list endpoint returns all matching projects, newest first, without a default result cap. Administrators can manage project status in the authenticated admin dashboard. `featured=true` filters featured work; changing an in-progress project to completed makes it appear in the homepage feed.

## Configuration and data

- `DATABASE_URL` selects the SQLModel database. SQLite is the local default; PostgreSQL URLs are supported with the included psycopg driver.
- Authentication uses `POST /api/auth/register/client`, `POST /api/auth/register/company`, `POST /api/auth/login`, and the protected `GET /api/auth/me`. JWTs use HS256, default to a 30-minute lifetime, and require a `JWT_SECRET_KEY` of at least 32 characters in every environment. Set `ACCESS_TOKEN_EXPIRE_MINUTES` to change the lifetime.
- Company registrations create linked user/company records and start unverified. Company and administrator screens accept JWT-authenticated users; the older company session and admin-token flows remain available for compatibility.
- To review companies locally, seed the database, sign in to the frontend as `admin@solar.iq` using the configured `UTU_DEMO_PASSWORD`, then open the account menu and choose **Admin dashboard** (`#/admin`). The dashboard uses the signed-in admin JWT.
- `seed.py` creates demo logins for `admin@solar.iq`, `tech@solar.iq`, and `client@solar.iq`. Set `UTU_DEMO_PASSWORD` before seeding; each run updates these demo accounts to that password. Do not seed demo credentials into a production database.
- API route responses are validated against Pydantic schemas; unexpected server errors are logged and returned as structured JSON without exposing exception details. SQLite connections enable declared foreign-key constraints.
- Admin endpoints accept only a signed-in admin account. The old shared `UTU_ADMIN_TOKEN` header is no longer supported.
- Deposits are a demo flow: they are stored with status `simulated` (never `paid`) because no payment gateway is connected.
- `UTU_CORS_ORIGINS` should contain only trusted frontend origins.
- Company password recovery requires `SMTP_HOST`, `SMTP_PORT` (usually `587`), `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, and `PUBLIC_APP_URL`. Use an email provider's SMTP/app password, never a personal mailbox password. Without these settings the reset endpoint returns `503` and no reset email is sent.
- For local PowerShell testing, set those values in the backend terminal before starting Uvicorn. Keep the SMTP password only in the process environment or an untracked secret store; never commit it.
- Example configuration (replace the placeholders in your own terminal; do not send the SMTP password in chat):

```powershell
$env:SMTP_HOST = "smtp.your-provider.example"
$env:SMTP_PORT = "587"
$env:SMTP_USERNAME = "your-sender@your-domain.example"
$env:SMTP_PASSWORD = "your-provider-app-password"
$env:SMTP_FROM_EMAIL = "your-sender@your-domain.example"
$env:PUBLIC_APP_URL = "http://127.0.0.1:5173"
```
- Reset links are single-use, expire after 30 minutes, and invalidate every active company session after a successful password change. Reset requests return the same message for known and unknown email addresses.
- `seed.py` idempotently inserts the Rafidain Solar Systems, Tigris Energy Works, and Al-Nahrain Renewables demo companies and their matching sample projects. These are examples, not real installers or verification results.
- The same seed command adds verified example reviews to those completed demo projects. Replace demo content with customer-approved records before launch.
- Run the backend tests with `python -m pytest -q`. The legacy marketplace suite also supports `python -m unittest -v test_marketplace`.

Before a public launch, add managed schema migrations, secure file storage for company license/tax/project evidence, customer verification and recovery across devices, notification delivery, login rate limiting, and deployment secrets/backup procedures. The current login/session and admin interfaces are an MVP foundation, not a substitute for a production security review.
