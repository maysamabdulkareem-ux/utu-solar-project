import pytest
import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from auth import _authenticate, router as auth_router
from companies import (
    PasswordResetConfirm,
    _password_hash as hash_legacy_company_password,
    confirm_password_reset,
    router as companies_router,
)
from company_portal import router as company_portal_router
from database import get_session
from models import Company, CompanyCredential, CompanyPasswordResetToken, User
from projects import router as projects_router
from reviews import router as reviews_router
from security import _jwt_settings, create_access_token, hash_password, user_from_token, verify_password

JWT_SECRET = "unit-test-jwt-secret-key-which-is-long-enough"


@pytest.fixture
def auth_env(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", JWT_SECRET)
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")


@pytest.fixture
def auth_api(auth_env):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    session = Session(engine)
    app = FastAPI()
    app.include_router(auth_router)
    app.include_router(companies_router)
    app.include_router(company_portal_router)
    app.include_router(projects_router)
    app.include_router(reviews_router)

    def override_session():
        yield session

    app.dependency_overrides[get_session] = override_session
    client = TestClient(app)
    yield client, session
    client.close()
    session.close()
    engine.dispose()


def test_password_hashing_rejects_invalid_passwords():
    hashed = hash_password("a-long-test-password")
    assert hashed != "a-long-test-password"
    assert verify_password("a-long-test-password", hashed)
    assert not verify_password("wrong-password", hashed)
    assert not verify_password("a-long-test-password", "not-a-hash")


def test_jwt_secret_is_required_in_every_environment(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.setenv("APP_ENV", "development")

    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY must be set"):
        _jwt_settings()


def test_client_register_login_and_profile(auth_api):
    client, _ = auth_api
    registered = client.post("/api/auth/register/client", json={
        "email": "client@example.com",
        "password": "a-long-client-password",
        "full_name": "Test Client",
        "phone": "07712345678",
    })
    assert registered.status_code == 201
    body = registered.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["role"] == "client"
    assert body["user"]["email"] == "client@example.com"

    invalid = client.post("/api/auth/login", json={
        "email": "client@example.com",
        "password": "wrong-password",
    })
    assert invalid.status_code == 401

    login = client.post("/api/auth/login", json={
        "email": "client@example.com",
        "password": "a-long-client-password",
    })
    assert login.status_code == 200
    token = login.json()["access_token"]
    profile = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert profile.status_code == 200
    assert profile.json()["full_name"] == "Test Client"


def test_oauth2_password_token_flow(auth_api):
    client, _ = auth_api
    client.post("/api/auth/register/client", json={
        "email": "oauth@example.com",
        "password": "a-long-client-password",
        "full_name": "OAuth Client",
    })
    token_response = client.post(
        "/api/auth/token",
        data={"username": "oauth@example.com", "password": "a-long-client-password"},
    )
    assert token_response.status_code == 200
    assert token_response.json()["access_token"]


def test_company_registration_is_unverified(auth_api):
    client, session = auth_api
    response = client.post("/api/auth/register/company", json={
        "name": "JWT Solar",
        "email": "company@example.com",
        "password": "a-long-company-password",
        "phone": "07712345679",
    })
    assert response.status_code == 201
    user = response.json()["user"]
    assert user["role"] == "company"
    assert user["is_verified"] is False
    company = session.get(Company, user["company_id"])
    assert company is not None
    assert company.verification_status == "pending"


def test_company_jwt_opens_existing_company_portal(auth_api):
    client, _ = auth_api
    registered = client.post("/api/auth/register/company", json={
        "name": "JWT Portal Solar",
        "email": "portal@example.com",
        "password": "a-long-company-password",
    })
    assert registered.status_code == 201
    token = registered.json()["access_token"]

    profile = client.get("/api/company/profile", headers={"Authorization": f"Bearer {token}"})
    assert profile.status_code == 200
    assert profile.json()["name"] == "JWT Portal Solar"


def test_company_can_update_support_phone_without_changing_verification_or_public_phone(auth_api):
    client, session = auth_api
    registered = client.post("/api/auth/register/company", json={
        "name": "Support Solar",
        "email": "support@example.com",
        "password": "a-long-company-password",
        "phone": "07712345679",
    })
    assert registered.status_code == 201
    token = registered.json()["access_token"]
    company_id = registered.json()["user"]["company_id"]

    company = session.get(Company, company_id)
    assert company is not None
    company.verification_status = "verified"
    session.add(company)
    session.commit()

    updated = client.put(
        "/api/company/profile/support-phone",
        headers={"Authorization": f"Bearer {token}"},
        json={"support_phone": "07812345678"},
    )
    assert updated.status_code == 200
    assert updated.json() == {"support_phone": "07812345678"}

    profile = client.get("/api/company/profile", headers={"Authorization": f"Bearer {token}"})
    assert profile.status_code == 200
    assert profile.json()["support_phone"] == "07812345678"
    assert profile.json()["verification_status"] == "verified"

    public_directory = client.get("/api/companies")
    public_company = next(item for item in public_directory.json() if item["id"] == company_id)
    assert public_company["phone"] == "07712345679"
    assert public_company["support_phone"] == "07812345678"

    invalid = client.put(
        "/api/company/profile/support-phone",
        headers={"Authorization": f"Bearer {token}"},
        json={"support_phone": "12"},
    )
    assert invalid.status_code == 422
    short_code = client.put(
        "/api/company/profile/support-phone",
        headers={"Authorization": f"Bearer {token}"},
        json={"support_phone": "6060"},
    )
    assert short_code.status_code == 200
    assert short_code.json() == {"support_phone": "6060"}
    cleared = client.put(
        "/api/company/profile/support-phone",
        headers={"Authorization": f"Bearer {token}"},
        json={"support_phone": None},
    )
    assert cleared.status_code == 200
    assert cleared.json() == {"support_phone": None}


@pytest.mark.parametrize("support_phone", ["07712345678", "6060", "6633", "0123456789"])
def test_company_registration_and_profile_settings_save_both_phone_numbers(auth_api, support_phone):
    client, session = auth_api
    registered = client.post("/api/auth/register/company", json={
        "name": "Contact Solar",
        "email": "contact@example.com",
        "password": "a-long-company-password",
        "phone": "07712345679",
        "support_phone": support_phone,
    })
    assert registered.status_code == 201
    token = registered.json()["access_token"]
    company_id = registered.json()["user"]["company_id"]

    company = session.get(Company, company_id)
    assert company is not None
    assert company.phone == "07712345679"
    assert company.support_phone == support_phone

    updated = client.put(
        "/api/company/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={"phone": "07799999999", "support_phone": support_phone},
    )
    assert updated.status_code == 200
    assert updated.json() == {"phone": "07799999999", "support_phone": support_phone}

    partial_update = client.put(
        "/api/company/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={"phone": "07788888888"},
    )
    assert partial_update.status_code == 200
    assert partial_update.json() == {"phone": "07788888888", "support_phone": support_phone}

    profile = client.get("/api/company/profile", headers={"Authorization": f"Bearer {token}"})
    assert profile.status_code == 200
    assert profile.json()["phone"] == "07788888888"
    assert profile.json()["support_phone"] == support_phone


@pytest.mark.parametrize("support_phone", ["07712345678", "6060", "6633", "0123456789"])
def test_company_registration_accepts_support_phone_formats(auth_api, support_phone):
    client, _ = auth_api
    registered = client.post("/api/auth/register/company", json={
        "name": "Contact Solar",
        "email": f"contact-{support_phone}@example.com",
        "password": "a-long-company-password",
        "support_phone": support_phone,
    })
    assert registered.status_code == 201


def test_company_from_the_old_login_system_migrates_on_first_sign_in(auth_api):
    client, session = auth_api
    company = Company(
        name="Old Login Solar",
        founded_year=2018,
        projects_count=0,
        phone="",
        email="old-login@example.com",
        verification_status="pending",
    )
    session.add(company)
    session.commit()
    session.refresh(company)
    # Accounts made by the removed /api/companies/register only had a credential.
    session.add(CompanyCredential(
        company_id=company.id,
        email="old-login@example.com",
        password_hash=hash_legacy_company_password("old-company-password"),
    ))
    session.commit()

    wrong = client.post("/api/auth/login", json={"email": "old-login@example.com", "password": "not-the-password"})
    assert wrong.status_code == 401
    migrated = client.post("/api/auth/login", json={"email": "old-login@example.com", "password": "old-company-password"})
    assert migrated.status_code == 200
    assert migrated.json()["user"]["role"] == "company"
    assert migrated.json()["user"]["company_id"] == company.id
    user = session.exec(select(User).where(User.email == "old-login@example.com")).one()
    assert verify_password("old-company-password", user.hashed_password)


def test_company_password_reset_revokes_existing_jwt(auth_api):
    _, session = auth_api
    company = Company(
        name="Reset Solar",
        founded_year=2020,
        projects_count=0,
        phone="",
        email="reset@example.com",
        verification_status="pending",
    )
    session.add(company)
    session.commit()
    session.refresh(company)
    user = User(
        email="reset@example.com",
        hashed_password=hash_password("old-company-password"),
        full_name="Reset Solar",
        role="company",
        company_id=company.id,
    )
    session.add(user)
    reset_token = "r" * 40
    session.add(CompanyPasswordResetToken(
        company_id=company.id,
        token_hash=hashlib.sha256(reset_token.encode()).hexdigest(),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
    ))
    session.commit()
    session.refresh(user)
    previous_jwt = create_access_token(user)

    confirm_password_reset(
        PasswordResetConfirm(token=reset_token, new_password="new-company-password"),
        session,
    )

    assert verify_password("new-company-password", user.hashed_password)
    with pytest.raises(HTTPException) as error:
        user_from_token(previous_jwt, session)
    assert error.value.status_code == 401


def test_jwt_required_and_role_guard(auth_api):
    client, session = auth_api
    client.post("/api/auth/register/client", json={
        "email": "client@example.com",
        "password": "a-long-client-password",
        "full_name": "Test Client",
    })
    login = client.post("/api/auth/login", json={
        "email": "client@example.com",
        "password": "a-long-client-password",
    })
    token = login.json()["access_token"]

    missing = client.get("/api/auth/me")
    assert missing.status_code == 401

    invalid = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"})
    assert invalid.status_code == 401

    forbidden = client.get("/api/auth/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert forbidden.status_code == 403

    admin = User(
        email="admin@example.com",
        hashed_password=hash_password("a-long-admin-password"),
        full_name="Admin",
        role="admin",
        is_active=True,
        is_verified=True,
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)
    admin_token = create_access_token(admin)
    allowed = client.get("/api/auth/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert allowed.status_code == 200
    emails = {row["email"] for row in allowed.json()}
    assert "client@example.com" in emails
    assert "admin@example.com" in emails


def test_client_jwt_is_forbidden_from_company_admin_routes(auth_api):
    client, _ = auth_api
    registered = client.post("/api/auth/register/client", json={
        "email": "regular-client@example.com",
        "password": "a-long-client-password",
        "full_name": "Regular Client",
    })
    token = registered.json()["access_token"]

    response = client.get(
        "/api/companies/admin/pending",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_inactive_user_cannot_use_token(auth_api):
    client, session = auth_api
    user = User(
        email="inactive@example.com",
        hashed_password=hash_password("a-long-test-password"),
        full_name="Inactive",
        role="client",
        is_active=False,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    login = client.post("/api/auth/login", json={
        "email": "inactive@example.com",
        "password": "a-long-test-password",
    })
    assert login.status_code == 403

    token = create_access_token(user)
    profile = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert profile.status_code == 403


def test_public_marketplace_endpoints_remain_open(auth_api):
    client, _ = auth_api
    assert client.get("/api/companies").status_code == 200
    assert client.get("/api/projects").status_code == 200
    assert client.get("/api/reviews/featured").status_code == 200


def test_seed_creates_demo_auth_accounts(monkeypatch, auth_env):
    import seed as seed_module

    monkeypatch.setenv("UTU_DEMO_PASSWORD", "initial-demo-password")
    monkeypatch.setattr(seed_module, "DEMO_PASSWORD", "initial-demo-password")
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    def create_test_tables():
        SQLModel.metadata.create_all(engine)

    monkeypatch.setattr(seed_module, "engine", engine)
    monkeypatch.setattr(seed_module, "create_db_and_tables", create_test_tables)
    seed_module.seed_companies()
    monkeypatch.setenv("UTU_DEMO_PASSWORD", "updated-demo-password")
    monkeypatch.setattr(seed_module, "DEMO_PASSWORD", "updated-demo-password")
    seed_module.seed_companies()

    with Session(engine) as session:
        emails = {user.email for user in session.exec(select(User)).all()}
        tigris = session.exec(select(User).where(User.email == "tech@solar.iq")).first()
        assert {"admin@solar.iq", "tech@solar.iq", "client@solar.iq"} <= emails
        assert tigris is not None
        assert tigris.role == "company"
        assert tigris.company_id is not None
        linked = session.exec(select(User).where(User.role == "company")).all()
        assert len(linked) >= 3
        assert all(user.company_id is not None for user in linked)
        admin = session.exec(select(User).where(User.email == "admin@solar.iq")).first()
        assert admin is not None
        assert verify_password("updated-demo-password", admin.hashed_password)
        assert not verify_password("initial-demo-password", admin.hashed_password)
        assert _authenticate("admin@solar.iq", "updated-demo-password", session).role == "admin"
    engine.dispose()


def _seed_test_engine(monkeypatch, seed_module):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    def create_test_tables():
        SQLModel.metadata.create_all(engine)

    monkeypatch.setattr(seed_module, "engine", engine)
    monkeypatch.setattr(seed_module, "create_db_and_tables", create_test_tables)
    return engine


def test_seed_refuses_to_run_without_a_demo_password(monkeypatch, auth_env):
    import seed as seed_module

    monkeypatch.setattr(seed_module, "DEMO_PASSWORD", None)
    engine = _seed_test_engine(monkeypatch, seed_module)
    with pytest.raises(RuntimeError, match="UTU_DEMO_PASSWORD"):
        seed_module.seed_companies()
    monkeypatch.setattr(seed_module, "DEMO_PASSWORD", "short")
    with pytest.raises(RuntimeError, match="UTU_DEMO_PASSWORD"):
        seed_module.seed_companies()
    engine.dispose()


def test_seed_never_creates_logins_for_real_companies(monkeypatch, auth_env):
    import seed as seed_module

    monkeypatch.setattr(seed_module, "DEMO_PASSWORD", "demo-password-for-tests")
    engine = _seed_test_engine(monkeypatch, seed_module)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(Company(
            name="Real Customer Company",
            founded_year=2020,
            phone="07700000099",
            email="owner@real-company.example",
            verification_status="verified",
        ))
        session.commit()

    seed_module.seed_companies()

    with Session(engine) as session:
        real_company = session.exec(
            select(Company).where(Company.name == "Real Customer Company")
        ).one()
        linked_users = session.exec(
            select(User).where(User.company_id == real_company.id)
        ).all()
        assert linked_users == []
        assert session.exec(
            select(User).where(User.email == "owner@real-company.example")
        ).first() is None
    engine.dispose()
