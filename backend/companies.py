import hashlib
import hmac
import logging
import os
import secrets
import base64
import binascii
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field as PydanticField
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from database import get_session
from email_service import send_password_reset_email, smtp_is_configured
from models import (
    Company,
    CompanyBase,
    CompanyCredential,
    CompanyLoginSession,
    CompanyPasswordResetToken,
    Project,
    CompanyVerification,
    CompanyQuote,
    DepositPayment,
    PolicyReport,
    QuoteRequest,
    QuoteRequestCompany,
    User,
    VerificationDocument,
)
from security import get_optional_current_user, hash_password, user_from_token

router = APIRouter(prefix="/api/companies", tags=["Companies"])
logger = logging.getLogger(__name__)


class CompanyRead(CompanyBase):
    id: int
    rating: float = 0
    reviews_count: int = 0


class CompanyPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    logo_url: Optional[str] = None
    founded_year: int
    projects_count: int
    phone: Optional[str] = None
    support_phone: Optional[str] = None
    address: Optional[str] = None
    verification_status: str
    rating: float = 0
    reviews_count: int = 0


class CompanyProjectRead(BaseModel):
    id: int
    title: str
    description: str
    system_kwp: Optional[float]
    location: str
    completed_at: Optional[datetime]


class CompanyRegistrationRead(BaseModel):
    id: int
    name: str
    verification_status: str


class CompanyLoginRead(BaseModel):
    access_token: str
    token_type: Literal["bearer"]
    company: CompanyRead


class MessageRead(BaseModel):
    message: str


class LogoutRead(BaseModel):
    detail: str


class CompanyAdminRead(CompanyRead):
    business_license_number: str
    tax_registration_number: str
    license_checked: bool
    tax_record_checked: bool
    projects_checked: bool
    reviewed_at: Optional[datetime]
    has_license_document: bool = False
    has_tax_document: bool = False
    verification_documents: List[str] = PydanticField(default_factory=list)
    completed_project_count: int = 0


class VerificationDocumentUpload(BaseModel):
    file_name: str = PydanticField(min_length=1, max_length=255)
    content_type: Literal["application/pdf", "image/jpeg", "image/png", "image/webp"]
    data_base64: str = PydanticField(min_length=1, max_length=4_194_304)
    document_type: Literal[
        "national_id",
        "syndicate_card",
        "chamber_id",
        "office_permit",
        "business_register",
        "project_proof",
        "license",
        "tax",
    ]


class VerificationDocumentRead(BaseModel):
    company_id: int
    document_type: Literal[
        "national_id",
        "syndicate_card",
        "chamber_id",
        "office_permit",
        "business_register",
        "project_proof",
        "license",
        "tax",
    ]
    file_name: str
    content_type: str
    data_base64: str


class AdminRevenueRead(BaseModel):
    assignment_id: Optional[int]
    request_id: Optional[int]
    project_id: int
    project_title: str
    company_name: str
    total_agreed_price_iqd: int
    commission_rate: float
    commission_fee_iqd: int
    status: Literal["accepted", "completed"]
    is_estimate: bool
    payment_status: Optional[Literal["paid", "refunded"]] = None
    commission_status: Optional[Literal["collected", "reversed"]] = None
    transaction_id: Optional[str] = None
    payment_method: Optional[Literal["zaincash", "fib", "qi_card"]] = None
    deposit_iqd: Optional[int] = None
    remaining_iqd: Optional[int] = None


class PolicyReportCreate(BaseModel):
    subject: str = PydanticField(min_length=2, max_length=160)
    description: str = PydanticField(min_length=2, max_length=2000)


class PolicyReportStatusUpdate(BaseModel):
    status: Literal["resolved", "dismissed"]


class PolicyReportRead(BaseModel):
    id: int
    subject: str
    description: str
    status: Literal["pending", "resolved", "dismissed"]
    created_at: datetime
    updated_at: datetime


PLATFORM_COMMISSION_RATE = 0.05
MAX_VERIFICATION_DOCUMENT_BYTES = 3 * 1024 * 1024


class CompanyRegistration(BaseModel):
    name: str = PydanticField(min_length=2, max_length=160)
    founded_year: Optional[int] = PydanticField(default=None, ge=1900, le=datetime.now().year)
    phone: Optional[str] = PydanticField(default=None, min_length=11, max_length=11, pattern=r"^07\d{9}$")
    support_phone: Optional[str] = PydanticField(
        default=None,
        max_length=11,
        pattern=r"^(?:07\d{9}|\d{3,6}|\d{7,11})$",
    )
    email: str = PydanticField(min_length=5, max_length=254)
    password: str = PydanticField(min_length=10, max_length=128)
    address: Optional[str] = PydanticField(default=None, min_length=2, max_length=240)
    business_license_number: Optional[str] = PydanticField(default=None, min_length=2, max_length=100)
    tax_registration_number: Optional[str] = PydanticField(default=None, min_length=2, max_length=100)
    projects_count: int = PydanticField(default=0, ge=0, le=100000)


class CompanyVerificationReview(BaseModel):
    decision: Literal["identity_verified", "verified", "rejected"]
    identity_document_checked: bool = False
    business_document_checked: bool = False
    project_evidence_checked: bool = False
    license_checked: bool = False
    tax_record_checked: bool = False
    projects_checked: bool = False
    rejection_reason: str = PydanticField(default="", max_length=500)


class CompanyLogin(BaseModel):
    email: str = PydanticField(min_length=5, max_length=254)
    password: str = PydanticField(min_length=1, max_length=128)


class PasswordResetRequest(BaseModel):
    email: str = PydanticField(min_length=5, max_length=254)


class PasswordResetConfirm(BaseModel):
    token: str = PydanticField(min_length=32, max_length=128)
    new_password: str = PydanticField(min_length=10, max_length=128)


def _password_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return f"{salt.hex()}:{derived.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, expected = stored.split(":", 1)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 310_000)
        return hmac.compare_digest(actual.hex(), expected)
    except (ValueError, TypeError):
        return False


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _public_company(company: Company) -> CompanyPublic:
    public = CompanyPublic.model_validate(company)
    if company.verification_status not in {"identity_verified", "verified"}:
        public.phone = None
        public.support_phone = None
    return public


@router.get("", response_model=List[CompanyPublic])
def get_companies(session: Session = Depends(get_session)):
    companies = session.exec(
        select(Company).where(Company.verification_status != "rejected")
    ).all()
    return [_public_company(company) for company in companies]


@router.post("/reports", response_model=PolicyReportRead, status_code=201)
def create_policy_report(
    payload: PolicyReportCreate,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    if current_user is None:
        raise HTTPException(status_code=401, detail="Sign in to submit a report")
    report = PolicyReport(
        reporter_id=current_user.id,
        subject=payload.subject.strip(),
        description=payload.description.strip(),
    )
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


@router.get("/admin/revenue", response_model=List[AdminRevenueRead])
def admin_revenue(
    x_admin_token: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    _require_admin(x_admin_token, current_user)
    accepted_quotes = session.exec(
        select(QuoteRequestCompany, Company, CompanyQuote)
        .join(Company, Company.id == QuoteRequestCompany.company_id)
        .join(CompanyQuote, CompanyQuote.request_company_id == QuoteRequestCompany.id)
        .where(QuoteRequestCompany.status == "selected")
    ).all()
    selected_by_request = {
        (assignment.request_id, assignment.company_id): (assignment, company, quote)
        for assignment, company, quote in accepted_quotes
    }
    completed_projects = session.exec(
        select(Project, Company)
        .join(Company, Company.id == Project.company_id)
        .where(Project.status.in_(["completed", "featured"]))
        .order_by(Project.id.desc())
    ).all()
    rows = []
    projects_with_quotes: set[tuple[int, int]] = set()
    for project, company in completed_projects:
        related_quote = (
            selected_by_request.get((project.quote_request_id, project.company_id))
            if project.quote_request_id is not None
            else None
        )
        assignment, _, quote = related_quote if related_quote else (None, None, None)
        price_is_estimate = quote is None
        agreed_price = (
            quote.total_iqd
            if quote is not None
            else max(1, round(project.system_kwp * 1_000_000))
        )
        payment = (
            session.exec(
                select(DepositPayment).where(DepositPayment.assignment_id == assignment.id)
            ).first()
            if assignment is not None
            else None
        )
        rows.append({
            "assignment_id": assignment.id if assignment is not None else None,
            "request_id": project.quote_request_id,
            "project_id": project.id,
            "project_title": project.title,
            "company_name": company.name,
            "total_agreed_price_iqd": agreed_price,
            "commission_rate": PLATFORM_COMMISSION_RATE,
            "commission_fee_iqd": round(agreed_price * PLATFORM_COMMISSION_RATE),
            "status": "completed",
            "is_estimate": price_is_estimate,
            "payment_status": payment.payment_status if payment else None,
            "commission_status": payment.commission_status if payment else None,
            "transaction_id": payment.transaction_id if payment else None,
            "payment_method": payment.payment_method if payment else None,
            "deposit_iqd": payment.deposit_iqd if payment else None,
            "remaining_iqd": payment.remaining_iqd if payment else None,
        })
        if assignment is not None:
            projects_with_quotes.add((assignment.request_id, assignment.company_id))

    for assignment, company, quote in accepted_quotes:
        if (assignment.request_id, assignment.company_id) in projects_with_quotes:
            continue
        request = session.get(QuoteRequest, assignment.request_id)
        payment = session.exec(
            select(DepositPayment).where(DepositPayment.assignment_id == assignment.id)
        ).first()
        rows.append({
            "assignment_id": assignment.id,
            "request_id": assignment.request_id,
            "project_id": 0,
            "project_title": request.group_id if request is not None else f"Request {assignment.request_id}",
            "company_name": company.name,
            "total_agreed_price_iqd": quote.total_iqd,
            "commission_rate": PLATFORM_COMMISSION_RATE,
            "commission_fee_iqd": round(quote.total_iqd * PLATFORM_COMMISSION_RATE),
            "status": "accepted",
            "is_estimate": False,
            "payment_status": payment.payment_status if payment else None,
            "commission_status": payment.commission_status if payment else None,
            "transaction_id": payment.transaction_id if payment else None,
            "payment_method": payment.payment_method if payment else None,
            "deposit_iqd": payment.deposit_iqd if payment else None,
            "remaining_iqd": payment.remaining_iqd if payment else None,
        })
    return rows


@router.post("/admin/revenue/{assignment_id}/refund")
def refund_deposit(
    assignment_id: int,
    x_admin_token: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    _require_admin(x_admin_token, current_user)
    payment = session.exec(
        select(DepositPayment).where(DepositPayment.assignment_id == assignment_id)
    ).first()
    if payment is None:
        raise HTTPException(status_code=404, detail="Deposit payment not found")
    if payment.payment_status == "refunded":
        return payment.model_dump(mode="json")
    payment.payment_status = "refunded"
    payment.commission_status = "reversed"
    payment.project_status = "cancelled"
    payment.refunded_at = datetime.now(timezone.utc)
    session.add(payment)
    session.commit()
    session.refresh(payment)
    return payment.model_dump(mode="json")


@router.get("/admin/reports", response_model=List[PolicyReportRead])
def admin_policy_reports(
    x_admin_token: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    _require_admin(x_admin_token, current_user)
    return session.exec(select(PolicyReport).order_by(PolicyReport.created_at.desc())).all()


@router.patch("/admin/reports/{report_id}", response_model=PolicyReportRead)
def update_policy_report_status(
    report_id: int,
    update: PolicyReportStatusUpdate,
    x_admin_token: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    _require_admin(x_admin_token, current_user)
    report = session.get(PolicyReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = update.status
    report.updated_at = datetime.now(timezone.utc)
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


@router.get("/{company_id}", response_model=CompanyPublic)
def get_company(company_id: int, session: Session = Depends(get_session)):
    company = session.exec(
        select(Company).where(
            Company.id == company_id,
            Company.verification_status != "rejected",
        )
    ).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return _public_company(company)


@router.post("/verification-documents", response_model=VerificationDocumentRead)
def upload_verification_document(
    upload: VerificationDocumentUpload,
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
):
    company_id = _authenticated_company_id(authorization, session)
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    try:
        file_data = base64.b64decode(upload.data_base64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=422, detail="Document data must be valid base64")
    if not file_data or len(file_data) > MAX_VERIFICATION_DOCUMENT_BYTES:
        raise HTTPException(status_code=413, detail="Document must be no larger than 3 MB")
    valid_signature = {
        "application/pdf": file_data.startswith(b"%PDF-"),
        "image/jpeg": file_data.startswith(b"\xff\xd8\xff"),
        "image/png": file_data.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/webp": len(file_data) >= 12 and file_data.startswith(b"RIFF") and file_data[8:12] == b"WEBP",
    }[upload.content_type]
    if not valid_signature:
        raise HTTPException(status_code=422, detail="Document content does not match its file type")
    file_name = upload.file_name.replace("\\", "/").rsplit("/", 1)[-1].strip()
    if not file_name or file_name in {".", ".."}:
        raise HTTPException(status_code=422, detail="A valid document file name is required")

    document = session.exec(
        select(VerificationDocument).where(
            VerificationDocument.company_id == company_id,
            VerificationDocument.document_type == upload.document_type,
        )
    ).first()
    if document is None:
        document = VerificationDocument(company_id=company_id, document_type=upload.document_type, file_name=file_name,
                                        content_type=upload.content_type, data_base64=upload.data_base64)
    else:
        document.file_name = file_name
        document.content_type = upload.content_type
        document.data_base64 = upload.data_base64
    session.add(document)
    session.commit()
    return {
        "company_id": company_id,
        "document_type": upload.document_type,
        "file_name": document.file_name,
        "content_type": document.content_type,
        "data_base64": document.data_base64,
    }


@router.get(
    "/admin/{company_id}/verification-documents/{document_type}",
    response_model=VerificationDocumentRead,
)
def get_verification_document(
    company_id: int,
    document_type: Literal[
        "national_id",
        "syndicate_card",
        "chamber_id",
        "office_permit",
        "business_register",
        "project_proof",
        "license",
        "tax",
    ],
    x_admin_token: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    _require_admin(x_admin_token, current_user)
    document = session.exec(
        select(VerificationDocument).where(
            VerificationDocument.company_id == company_id,
            VerificationDocument.document_type == document_type,
        )
    ).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Verification document not found")
    return {
        "company_id": company_id,
        "document_type": document.document_type,
        "file_name": document.file_name,
        "content_type": document.content_type,
        "data_base64": document.data_base64,
    }


@router.get("/{company_id}/projects", response_model=List[CompanyProjectRead])
def get_company_projects(company_id: int, session: Session = Depends(get_session)):
    company = session.exec(
        select(Company).where(
            Company.id == company_id,
            Company.verification_status != "rejected",
        )
    ).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    completed_projects = session.exec(
        select(Project).where(
            Project.company_id == company_id,
            Project.status.in_(["completed", "featured"]),
        ).order_by(Project.completed_at.desc(), Project.id)
    ).all()
    return [
        {
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "system_kwp": project.system_kwp,
            "location": " · ".join(
                value for value in (project.location_governorate, project.location_district) if value
            ),
            "completed_at": project.completed_at,
        }
        for project in completed_projects
    ]


@router.post("/register", response_model=CompanyRegistrationRead, status_code=201)
def register_company(payload: CompanyRegistration, session: Session = Depends(get_session)):
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    if session.exec(select(CompanyCredential).where(CompanyCredential.email == email)).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    if session.exec(select(Company).where(Company.email == email)).first():
        raise HTTPException(status_code=409, detail="A company with this email is already listed")

    company = Company(
        name=payload.name.strip(),
        founded_year=payload.founded_year or 0,
        projects_count=payload.projects_count,
        phone=(payload.phone or "").strip(),
        support_phone=(payload.support_phone or "").strip() or None,
        email=email,
        address=(payload.address or "").strip(),
        verification_status="pending",
    )
    session.add(company)
    session.flush()
    session.add(CompanyVerification(
        company_id=company.id,
        business_license_number=(payload.business_license_number or "").strip(),
        tax_registration_number=(payload.tax_registration_number or "").strip(),
    ))
    session.add(CompanyCredential(
        company_id=company.id,
        email=email,
        password_hash=_password_hash(payload.password),
    ))
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    session.refresh(company)
    return {"id": company.id, "name": company.name, "verification_status": company.verification_status}


@router.post("/login", response_model=CompanyLoginRead)
def login_company(payload: CompanyLogin, session: Session = Depends(get_session)):
    email = payload.email.strip().lower()
    credential = session.exec(
        select(CompanyCredential).where(CompanyCredential.email == email)
    ).first()
    if credential is None or not _verify_password(payload.password, credential.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")

    token = secrets.token_urlsafe(40)
    session.add(CompanyLoginSession(
        company_id=credential.company_id,
        token_hash=_token_hash(token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    ))
    session.commit()
    company = session.get(Company, credential.company_id)
    return {"access_token": token, "token_type": "bearer", "company": CompanyRead.model_validate(company)}


@router.post("/password-reset", response_model=MessageRead, status_code=202)
def request_password_reset(
    payload: PasswordResetRequest,
    session: Session = Depends(get_session),
):
    if not smtp_is_configured():
        raise HTTPException(status_code=503, detail="Company password recovery email is not configured")

    generic_response = {"message": "If this email belongs to a company account, reset instructions will be sent."}
    email = payload.email.strip().lower()
    credential = session.exec(
        select(CompanyCredential).where(CompanyCredential.email == email)
    ).first()
    if credential is None:
        return generic_response

    now = datetime.now(timezone.utc)
    recent_reset = session.exec(
        select(CompanyPasswordResetToken).where(
            CompanyPasswordResetToken.company_id == credential.company_id,
            CompanyPasswordResetToken.created_at > now - timedelta(minutes=1),
        )
    ).first()
    if recent_reset is not None:
        return generic_response

    token = secrets.token_urlsafe(32)
    reset = CompanyPasswordResetToken(
        company_id=credential.company_id,
        token_hash=_token_hash(token),
        expires_at=now + timedelta(minutes=30),
    )
    session.add(reset)
    session.commit()
    try:
        send_password_reset_email(email, token)
    except Exception:
        logger.exception("Could not deliver company password reset email")
        session.delete(reset)
        session.commit()
    return generic_response


@router.post("/password-reset/confirm", response_model=MessageRead)
def confirm_password_reset(
    payload: PasswordResetConfirm,
    session: Session = Depends(get_session),
):
    reset = session.exec(
        select(CompanyPasswordResetToken).where(
            CompanyPasswordResetToken.token_hash == _token_hash(payload.token)
        )
    ).first()
    if reset is None or reset.used_at is not None:
        raise HTTPException(status_code=400, detail="Password reset link is invalid or expired")

    expiry = reset.expires_at
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    if expiry <= now:
        raise HTTPException(status_code=400, detail="Password reset link is invalid or expired")

    credential = session.exec(
        select(CompanyCredential).where(CompanyCredential.company_id == reset.company_id)
    ).first()
    if credential is None:
        raise HTTPException(status_code=400, detail="Password reset link is invalid or expired")
    credential.password_hash = _password_hash(payload.new_password)
    linked_user = session.exec(select(User).where(User.company_id == reset.company_id)).first()
    if linked_user is not None:
        linked_user.hashed_password = hash_password(payload.new_password)
        linked_user.token_version += 1
        session.add(linked_user)
    reset.used_at = now
    sessions = session.exec(
        select(CompanyLoginSession).where(CompanyLoginSession.company_id == reset.company_id)
    ).all()
    for login_session in sessions:
        session.delete(login_session)
    session.add(credential)
    session.add(reset)
    session.commit()
    return {"message": "Password updated. Sign in with your new password."}


@router.post("/logout", response_model=LogoutRead)
def logout_company(
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Company login is required")
    login_session = session.exec(
        select(CompanyLoginSession).where(
            CompanyLoginSession.token_hash == _token_hash(authorization[7:].strip())
        )
    ).first()
    if login_session is not None:
        session.delete(login_session)
        session.commit()
    return {"detail": "Signed out"}


@router.get("/admin/pending", response_model=List[CompanyAdminRead])
def list_pending_companies(
    x_admin_token: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    _require_admin(x_admin_token, current_user)
    pending = session.exec(
        select(Company).where(Company.verification_status.in_(["pending", "identity_verified"]))
    ).all()
    documents = session.exec(
        select(VerificationDocument.company_id, VerificationDocument.document_type).where(
            VerificationDocument.company_id.in_([company.id for company in pending])
        )
    ).all() if pending else []
    available_documents: dict[int, set[str]] = {}
    for company_id, document_type in documents:
        available_documents.setdefault(company_id, set()).add(document_type)
    results = []
    for company in pending:
        verification = session.get(CompanyVerification, company.id)
        if verification is None:
            verification = CompanyVerification(company_id=company.id)
        results.append({
            **CompanyRead.model_validate(company).model_dump(),
            **verification.model_dump(),
            "has_license_document": "license" in available_documents.get(company.id, set()),
            "has_tax_document": "tax" in available_documents.get(company.id, set()),
            "verification_documents": sorted(available_documents.get(company.id, set())),
            "completed_project_count": len(session.exec(
                select(Project.id).where(
                    Project.company_id == company.id,
                    Project.status.in_(["completed", "featured"]),
                )
            ).all()),
        })
    return results


@router.post("/{company_id}/verification", response_model=CompanyRead)
def review_company(
    company_id: int,
    review: CompanyVerificationReview,
    x_admin_token: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    _require_admin(x_admin_token, current_user)
    if review.decision not in {"identity_verified", "verified", "rejected"}:
        raise HTTPException(status_code=422, detail="Decision must be verified or rejected")
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    verification = session.get(CompanyVerification, company_id)
    if verification is None:
        verification = CompanyVerification(company_id=company_id)
    verification.license_checked = review.license_checked
    verification.tax_record_checked = review.tax_record_checked
    verification.projects_checked = review.projects_checked
    verification.reviewed_at = datetime.now(timezone.utc)
    documents = session.exec(
        select(VerificationDocument.document_type).where(
            VerificationDocument.company_id == company_id
        )
    ).all()
    document_types = set(documents)
    identity_document_types = {"national_id", "syndicate_card", "chamber_id", "office_permit"}
    has_identity_document = bool(identity_document_types.intersection(document_types))
    completed_project_count = len(session.exec(
        select(Project.id).where(
            Project.company_id == company_id,
            Project.status.in_(["completed", "featured"]),
        )
    ).all())
    if review.decision == "identity_verified":
        if not has_identity_document:
            raise HTTPException(status_code=422, detail="Upload a National ID, syndicate card, chamber ID, or office permit")
        if not review.identity_document_checked:
            raise HTTPException(status_code=422, detail="Review the identity or office document before approval")
    if review.decision == "verified":
        meets_tier_two_requirements = (
            bool({"business_register", "license"}.intersection(document_types))
            and "project_proof" in document_types
            and company.projects_count >= 3
            and completed_project_count >= 3
            and review.business_document_checked
            and review.project_evidence_checked
        )
        meets_legacy_requirements = (
            bool(verification.business_license_number.strip())
            and bool(verification.tax_registration_number.strip())
            and company.projects_count >= 3
            and all((review.license_checked, review.tax_record_checked, review.projects_checked))
        )
        if not (meets_tier_two_requirements or meets_legacy_requirements):
            raise HTTPException(
                status_code=422,
                detail="Gold verification requires a business register, project proof, and at least three completed projects",
            )
    if review.decision == "verified" and not (
        {"business_register", "license"}.intersection(document_types)
        and "project_proof" in document_types
        and completed_project_count >= 3
    ):
        if not all((review.license_checked, review.tax_record_checked, review.projects_checked)):
            raise HTTPException(status_code=422, detail="Review all required legacy verification evidence before approval")
    company.verification_status = review.decision
    linked_user = session.exec(select(User).where(User.company_id == company_id)).first()
    if linked_user is not None:
        linked_user.is_verified = review.decision in {"identity_verified", "verified"}
        session.add(linked_user)
    session.add(verification)
    session.add(company)
    session.commit()
    session.refresh(company)
    return CompanyRead.model_validate(company)


def _require_admin(token: Optional[str], user: Optional[User] = None) -> None:
    if isinstance(user, User) and user.is_active:
        if user.role == "admin":
            return
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    expected = os.getenv("UTU_ADMIN_TOKEN")
    if not expected:
        raise HTTPException(status_code=503, detail="Admin access is not configured")
    if token is None or not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="Admin token is invalid")


def _authenticated_company_id(authorization: Optional[str], session: Session) -> int:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Company login is required")
    token = authorization[7:].strip()
    legacy_session = session.exec(
        select(CompanyLoginSession).where(
            CompanyLoginSession.token_hash == _token_hash(token)
        )
    ).first()
    if legacy_session is not None:
        expiry = legacy_session.expires_at
        expiry = expiry.replace(tzinfo=timezone.utc) if expiry.tzinfo is None else expiry
        if expiry <= datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Company session expired")
        return legacy_session.company_id
    user = user_from_token(token, session)
    if user.role != "company" or user.company_id is None:
        raise HTTPException(status_code=403, detail="A company account is required")
    return user.company_id