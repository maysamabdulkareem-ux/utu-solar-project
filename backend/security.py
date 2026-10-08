import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlmodel import Session

from database import get_session
from models import User

password_hasher = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


def _jwt_settings() -> tuple[str, str, int]:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY must be set in every environment")
    if len(secret) < 32:
        raise RuntimeError("JWT_SECRET_KEY must contain at least 32 characters")
    issuer = os.getenv("JWT_ISSUER", "utu-api")
    expires_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    if expires_minutes < 1:
        raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be positive")
    return secret, issuer, expires_minutes


def validate_jwt_configuration() -> None:
    _jwt_settings()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return password_hasher.verify(password, hashed_password)
    except (UnknownHashError, ValueError, TypeError):
        return False


def create_access_token(user: User) -> str:
    secret, issuer, expires_minutes = _jwt_settings()
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user.id),
        "role": user.role,
        "ver": user.token_version,
        "iss": issuer,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(claims, secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    secret, issuer, _ = _jwt_settings()
    return jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        issuer=issuer,
        options={"require": ["sub", "exp", "iat", "iss", "ver"]},
    )


def user_from_token(token: str, session: Session) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        claims = decode_access_token(token)
        user_id = int(claims["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise credentials_error

    user = session.get(User, user_id)
    if user is None:
        raise credentials_error
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    if claims.get("role") != user.role or claims.get("ver") != user.token_version:
        raise credentials_error
    return user


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_from_token(token, session)


def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> Optional[User]:
    if token is None:
        return None
    try:
        return user_from_token(token, session)
    except HTTPException:
        return None


def company_id_from_authorization(authorization: Optional[str], session: Session) -> int:
    """The company a request acts for, from the signed-in company user's JWT.

    This is the only way a company authenticates; the old opaque company
    session tokens are no longer accepted.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Company login is required")
    user = user_from_token(authorization[7:].strip(), session)
    if user.role != "company" or user.company_id is None:
        raise HTTPException(status_code=403, detail="A company account is required")
    return user.company_id


def ensure_admin(user: Optional[User]) -> User:
    """Admin actions need a signed-in, active admin account (no shared token)."""
    if not isinstance(user, User):
        raise HTTPException(
            status_code=401,
            detail="Admin login is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active or user.role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user


def require_role(allowed_roles: list[str]):
    def role_dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return role_dependency
