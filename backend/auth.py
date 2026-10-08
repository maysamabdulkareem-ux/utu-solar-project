from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, Field as PydanticField
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from companies import (
    CompanyRegistration,
    _password_hash as hash_legacy_company_password,
    _verify_password as verify_legacy_company_password,
)
from database import get_session
from models import Company, CompanyCredential, CompanyVerification, User
from security import create_access_token, get_current_user, hash_password, require_role, verify_password
from verification import verification_tier

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
Role = Literal["client", "company", "admin"]


class ClientRegister(BaseModel):
    email: str = PydanticField(min_length=5, max_length=254)
    phone: Optional[str] = PydanticField(default=None, min_length=11, max_length=11, pattern=r"^07\d{9}$")
    password: str = PydanticField(min_length=10, max_length=128)
    full_name: str = PydanticField(min_length=2, max_length=160)


class LoginRequest(BaseModel):
    email: str = PydanticField(min_length=5, max_length=254)
    password: str = PydanticField(min_length=1, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    phone: Optional[str]
    full_name: str
    role: Role
    is_active: bool
    is_verified: bool
    company_id: Optional[int]
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserRead


def _email(value: str) -> str:
    normalized = value.strip().lower()
    if "@" not in normalized or "." not in normalized.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    return normalized


def _ensure_unique_account(session: Session, email: str, phone: Optional[str]) -> None:
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    if session.exec(select(Company).where(Company.email == email)).first():
        raise HTTPException(status_code=409, detail="A company with this email is already listed")
    if phone and session.exec(select(User).where(User.phone == phone)).first():
        raise HTTPException(status_code=409, detail="An account with this phone number already exists")


def _response(user: User) -> AuthResponse:
    return AuthResponse(access_token=create_access_token(user), user=UserRead.model_validate(user))


@router.post("/register/client", response_model=AuthResponse, status_code=201)
def register_client(payload: ClientRegister, session: Session = Depends(get_session)):
    email = _email(payload.email)
    phone = payload.phone.strip() if payload.phone else None
    _ensure_unique_account(session, email, phone)
    user = User(
        email=email,
        phone=phone,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role="client",
        is_active=True,
        is_verified=False,
    )
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="An account with this email or phone already exists")
    session.refresh(user)
    return _response(user)


@router.post("/register/company", response_model=AuthResponse, status_code=201)
def register_company_user(payload: CompanyRegistration, session: Session = Depends(get_session)):
    email = _email(payload.email)
    phone = payload.phone.strip() if payload.phone else None
    _ensure_unique_account(session, email, phone)

    company = Company(
        name=payload.name.strip(),
        founded_year=payload.founded_year or 0,
        projects_count=payload.projects_count,
        phone=phone or "",
        support_phone=payload.support_phone.strip() if payload.support_phone else None,
        email=email,
        address=(payload.address or "").strip(),
        verification_status="pending",
    )
    user = User(
        email=email,
        phone=phone,
        hashed_password=hash_password(payload.password),
        full_name=payload.name.strip(),
        role="company",
        is_active=True,
        is_verified=False,
    )
    session.add(company)
    session.flush()
    user.company_id = company.id
    session.add(CompanyVerification(
        company_id=company.id,
        business_license_number=(payload.business_license_number or "").strip(),
        tax_registration_number=(payload.tax_registration_number or "").strip(),
    ))
    session.add(CompanyCredential(
        company_id=company.id,
        email=email,
        password_hash=hash_legacy_company_password(payload.password),
    ))
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="An account with this email or phone already exists")
    session.refresh(user)
    return _response(user)


def _upgrade_legacy_company_login(email: str, password: str, session: Session) -> Optional[User]:
    credential = session.exec(
        select(CompanyCredential).where(CompanyCredential.email == email)
    ).first()
    if credential is None or not verify_legacy_company_password(password, credential.password_hash):
        return None
    company = session.get(Company, credential.company_id)
    if company is None:
        return None
    user = User(
        email=email,
        phone=company.phone or None,
        hashed_password=hash_password(password),
        full_name=company.name,
        role="company",
        is_active=True,
        is_verified=verification_tier(company.verification_status) >= 1,
        company_id=company.id,
    )
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        return session.exec(select(User).where(User.email == email)).first()
    session.refresh(user)
    return user


def _authenticate(email: str, password: str, session: Session) -> User:
    user = session.exec(select(User).where(User.email == email)).first()
    if user is not None:
        if not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Email or password is incorrect")
    else:
        user = _upgrade_legacy_company_login(email, password, session)
        if user is None:
            raise HTTPException(status_code=401, detail="Email or password is incorrect")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")
    return user


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, session: Session = Depends(get_session)):
    return _response(_authenticate(_email(payload.email), payload.password, session))


@router.post("/token", response_model=AuthResponse)
def login_oauth2_token(
    form: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    return _response(_authenticate(_email(form.username), form.password, session))


@router.get("/me", response_model=UserRead)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.get("/admin/users", response_model=list[UserRead])
def list_users(
    _admin: User = Depends(require_role(["admin"])),
    session: Session = Depends(get_session),
):
    return session.exec(select(User).order_by(User.created_at.desc())).all()