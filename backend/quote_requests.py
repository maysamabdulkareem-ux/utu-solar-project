import hashlib
import json
import secrets
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field as PydanticField, model_validator
from sqlmodel import Session, select

from database import get_session
from chat_moderation import BLOCKED_MESSAGE, detect_contact_violation
from projects import ProjectRead, _project_payload
from models import (
    ChatMessage,
    Company,
    CompanyQuote,
    CompanyVerification,
    DepositPayment,
    QuoteRequest,
    QuoteRequestCompany,
    Project,
    PolicyReport,
    Review,
    User,
)
from security import company_id_from_authorization, get_optional_current_user, require_role
from verification import can_submit_quotes

router = APIRouter(prefix="/api/quote-requests", tags=["Quote requests"])

REQUEST_DETAIL_KEYS = {
    "fromCalculator",
    "systemType",
    "governorate",
    "district",
    "propertyType",
    "roofType",
    "roofArea",
    "gridStatus",
    "budget",
    "greenInitiativeRate",
    "timeline",
    "financing",
    "notes",
    "whatsapp",
}
DIRECT_FINANCING_MARKER = "\n[[UTU-DIRECT-FINANCING-V1:"
DIRECT_FINANCING_TERMS = (3, 6, 12, 24)
MAX_COMPANIES_PER_REQUEST = 3
ACTIVE_DEPOSIT_STATUSES = {"simulated", "paid"}


class QuoteRequestCreate(BaseModel):
    company_ids: list[int] = PydanticField(min_length=1, max_length=MAX_COMPANIES_PER_REQUEST)
    customer_name: str = PydanticField(min_length=2, max_length=120)
    customer_phone: str = PydanticField(min_length=11, max_length=11, pattern=r"^07\d{9}$")
    system_kwp: float = PydanticField(gt=0, le=5000)
    battery_kwh: float = PydanticField(ge=0, le=10000)
    panel_count: int = PydanticField(gt=0, le=10000)
    assessment_id: Optional[int] = None
    details: dict = PydanticField(default_factory=dict)
    is_green_initiative: bool = False
    green_initiative_budget_iqd: Optional[int] = PydanticField(
        default=None,
        gt=0,
        le=10_000_000_000,
    )

    @model_validator(mode="after")
    def require_green_budget(self):
        if self.is_green_initiative and self.green_initiative_budget_iqd is None:
            raise ValueError("A positive project budget is required for a Green Initiative request")
        return self


class ClaimGuestRequests(BaseModel):
    access_tokens: list[
        Annotated[str, PydanticField(min_length=32, max_length=128)]
    ] = PydanticField(default_factory=list, max_length=100)


class ChatMessageCreate(BaseModel):
    content: str = PydanticField(min_length=1, max_length=2000)


class ChatMessageRead(BaseModel):
    id: int
    sender_role: Literal["client", "company"]
    sender_name: str
    content: str
    violation_type: Optional[str]
    created_at: datetime


class QuoteRequestDetailsUpdate(BaseModel):
    governorate: Optional[str] = PydanticField(default=None, max_length=120)
    district: Optional[str] = PydanticField(default=None, max_length=120)
    notes: Optional[str] = PydanticField(default=None, max_length=2000)


class QuoteRequestUpdate(BaseModel):
    customer_name: Optional[str] = PydanticField(default=None, min_length=2, max_length=120)
    customer_phone: Optional[str] = PydanticField(
        default=None, min_length=11, max_length=11, pattern=r"^07\d{9}$"
    )
    system_kwp: Optional[float] = PydanticField(default=None, gt=0, le=5000)
    battery_kwh: Optional[float] = PydanticField(default=None, ge=0, le=10000)
    panel_count: Optional[int] = PydanticField(default=None, gt=0, le=10000)
    details: Optional[QuoteRequestDetailsUpdate] = None


class QuoteCreate(BaseModel):
    total_iqd: int = PydanticField(gt=0)
    panel_iqd: Optional[int] = PydanticField(default=None, ge=0)
    inverter_iqd: Optional[int] = PydanticField(default=None, ge=0)
    battery_iqd: Optional[int] = PydanticField(default=None, ge=0)
    installation_iqd: Optional[int] = PydanticField(default=None, ge=0)
    capacity_kwp: float = PydanticField(gt=0, le=5000)
    panel_brand: str = PydanticField(min_length=1, max_length=120)
    inverter_brand: str = PydanticField(min_length=1, max_length=120)
    battery_brand: str = PydanticField(min_length=1, max_length=120)
    warranty: str = PydanticField(min_length=1, max_length=500)
    install_days: int = PydanticField(gt=0, le=365)
    financing: bool = False
    down_payment_iqd: Optional[int] = PydanticField(default=None, ge=0)
    installment_months: Optional[int] = None
    monthly_installment_iqd: Optional[int] = PydanticField(default=None, gt=0)
    green_initiative_supported: bool = False
    valid_days: int = PydanticField(default=14, ge=1, le=90)
    notes: str = PydanticField(default="", max_length=2000)

    @model_validator(mode="after")
    def validate_direct_financing(self):
        schedule_values = (
            self.down_payment_iqd,
            self.installment_months,
            self.monthly_installment_iqd,
        )
        if self.financing:
            if self.down_payment_iqd is None or self.installment_months is None:
                raise ValueError("Down payment and installment period are required for direct financing")
            if self.installment_months not in DIRECT_FINANCING_TERMS:
                raise ValueError("Installment period must be 3, 6, 12, or 24 months")
            if self.down_payment_iqd >= self.total_iqd:
                raise ValueError("Down payment must be less than the total quote price")
            if self.monthly_installment_iqd is None:
                remaining = self.total_iqd - self.down_payment_iqd
                self.monthly_installment_iqd = max(
                    1,
                    int((Decimal(remaining) / Decimal(self.installment_months)).quantize(
                        Decimal("1"),
                        rounding=ROUND_HALF_UP,
                    )),
                )
        elif any(value is not None for value in schedule_values):
            raise ValueError("Payment schedule fields require financing to be enabled")
        return self


class CompletedInstallation(BaseModel):
    title: str = PydanticField(min_length=2, max_length=200)
    description: str = PydanticField(default="", max_length=2000)
    installation_type: str = PydanticField(min_length=2, max_length=120)
    image_url: str = PydanticField(default="", max_length=1000)
    gallery_urls: list[str] = PydanticField(default_factory=list, max_length=20)


class QuoteDetailsRead(BaseModel):
    total_iqd: int
    panel_iqd: int = 0
    inverter_iqd: int = 0
    battery_iqd: int = 0
    installation_iqd: int = 0
    capacity_kwp: float
    panel_brand: str
    inverter_brand: str
    battery_brand: str
    warranty: str
    install_days: int
    financing: bool
    down_payment_iqd: Optional[int] = None
    installment_months: Optional[int] = None
    monthly_installment_iqd: Optional[int] = None
    green_initiative_supported: bool = False
    valid_days: int
    notes: str
    created_at: datetime


class QuoteRead(QuoteDetailsRead):
    id: int


class CompletedProjectReviewRead(BaseModel):
    rating: float
    client_name: str
    comment: str
    is_verified: bool


class CompletedProjectRead(BaseModel):
    id: int
    title: str
    company_id: int
    company_name: str
    system_kwp: float
    battery_kwh: Optional[float]
    location_governorate: str
    location_district: str
    completed_at: Optional[datetime]
    reviewed: bool
    status: str
    company_verification_status: Optional[str]
    review_eligible: bool
    review: Optional[CompletedProjectReviewRead] = None


class DepositPaymentRead(BaseModel):
    transaction_id: str
    payment_method: str
    total_iqd: int
    deposit_iqd: int
    remaining_iqd: int
    commission_iqd: int
    payment_status: str
    commission_status: str
    project_status: str
    created_at: datetime
    refunded_at: Optional[datetime] = None


class QuoteRequestCompanyRead(BaseModel):
    id: int
    company_id: int
    company_name: Optional[str]
    company_verification_status: Optional[str] = None
    status: str
    green_verification_id: Optional[str] = None
    quote: Optional[QuoteDetailsRead]
    completed_projects: list[CompletedProjectRead]
    payment: Optional[DepositPaymentRead] = None


class QuoteRequestRead(BaseModel):
    group_id: str
    status: str
    created_at: datetime
    customer_name: str
    # None when the viewer is a company that has not received a deposit yet.
    customer_phone: Optional[str]
    system_kwp: float
    battery_kwh: float
    panel_count: int
    is_green_initiative: bool = False
    green_initiative_budget_iqd: Optional[int] = None
    details: dict
    companies: list[QuoteRequestCompanyRead]


class DepositPaymentCreate(BaseModel):
    payment_method: Literal["zaincash", "fib", "qi_card"]
    phone_number: str = PydanticField(pattern=r"^07\d{9}$")


class QuoteRequestCreatedRead(QuoteRequestRead):
    access_token: str


class GreenInitiativeVerificationRead(BaseModel):
    reference: str
    system_kwp: float
    battery_kwh: float
    panel_count: int
    governorate: str
    district: str
    company_name: str
    company_verification_status: str
    business_license_number: Optional[str]
    tax_registration_number: Optional[str]
    license_checked: bool
    tax_record_checked: bool
    projects_checked: bool
    reviewed_at: Optional[datetime]


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _serialize_quote(quote: CompanyQuote, *, exclude_id: bool = True) -> dict:
    result = quote.model_dump(
        mode="json",
        exclude={"request_company_id", *(("id",) if exclude_id else ())},
    )
    notes, schedule = _extract_direct_financing_schedule(result["notes"])
    result["notes"] = notes
    result.update(schedule)
    return result


def _extract_direct_financing_schedule(notes: str) -> tuple[str, dict]:
    if DIRECT_FINANCING_MARKER not in notes:
        return notes, {}
    user_notes, serialized = notes.rsplit(DIRECT_FINANCING_MARKER, 1)
    if not serialized.endswith("]]"):
        return notes, {}
    try:
        down_payment, months, monthly = (
            int(value) for value in serialized[:-2].split(":")
        )
    except (ValueError, TypeError):
        return notes, {}
    if months not in DIRECT_FINANCING_TERMS or down_payment < 0 or monthly <= 0:
        return notes, {}
    return user_notes, {
        "down_payment_iqd": down_payment,
        "installment_months": months,
        "monthly_installment_iqd": monthly,
    }


def _quote_storage_values(payload: QuoteCreate) -> dict:
    values = payload.model_dump()
    if payload.financing:
        values["notes"] = (
            f"{payload.notes}{DIRECT_FINANCING_MARKER}"
            f"{payload.down_payment_iqd}:{payload.installment_months}:"
            f"{payload.monthly_installment_iqd}]]"
        )
    for key in ("down_payment_iqd", "installment_months", "monthly_installment_iqd"):
        values.pop(key)
    for key in ("panel_iqd", "inverter_iqd", "battery_iqd", "installation_iqd"):
        if values[key] is None:
            values[key] = 0
    return values


def _as_group(session: Session, request: QuoteRequest) -> dict:
    assignments = session.exec(
        select(QuoteRequestCompany).where(QuoteRequestCompany.request_id == request.id)
    ).all()
    companies = []
    for assignment in assignments:
        company = session.get(Company, assignment.company_id)
        quote = session.exec(
            select(CompanyQuote).where(CompanyQuote.request_company_id == assignment.id)
        ).first()
        payment = session.exec(
            select(DepositPayment).where(DepositPayment.assignment_id == assignment.id)
        ).first()
        completed_projects = session.exec(
            select(Project).where(
                Project.quote_request_id == request.id,
                Project.company_id == assignment.company_id,
                Project.status.in_(["completed", "featured"]),
            )
        ).all()
        companies.append({
            "id": assignment.id,
            "company_id": assignment.company_id,
            "company_name": company.name if company else None,
            "company_verification_status": company.verification_status if company else None,
            "status": assignment.status,
            "green_verification_id": assignment.green_verification_id,
            "quote": _serialize_quote(quote) if quote else None,
            "payment": (
                payment.model_dump(mode="json", exclude={"id", "assignment_id", "phone_number"})
                if payment is not None
                else None
            ),
            "completed_projects": [
                {
                    "id": project.id,
                    "title": project.title,
                    "company_id": project.company_id,
                    "company_name": company.name if company else "",
                    "system_kwp": project.system_kwp,
                    "battery_kwh": project.battery_kwh,
                    "location_governorate": project.location_governorate,
                    "location_district": project.location_district,
                    "completed_at": project.completed_at.isoformat() if project.completed_at else None,
                    "status": project.status,
                    "company_verification_status": company.verification_status if company else None,
                    "review_eligible": (
                        project.status == "completed"
                        and assignment.status == "selected"
                        and company is not None
                        and company.verification_status == "verified"
                    ),
                    "reviewed": session.exec(
                        select(Review).where(Review.project_id == project.id)
                    ).first() is not None,
                    "review": (
                        {
                            "rating": review.rating,
                            "client_name": review.client_name,
                            "comment": review.comment,
                            "is_verified": review.is_verified,
                        }
                        if (review := session.exec(
                            select(Review).where(
                                Review.project_id == project.id,
                                Review.is_verified.is_(True),
                            )
                        ).first()) is not None
                        and project.status == "completed"
                        and company is not None
                        and company.verification_status == "verified"
                        else None
                    ),
                }
                for project in completed_projects
            ],
        })

    status = (
        "completed"
        if any(
            company["status"] == "selected" and company["completed_projects"]
            for company in companies
        )
        else "in_progress"
        if any(
            company["payment"]
            and company["payment"]["payment_status"] in ACTIVE_DEPOSIT_STATUSES
            for company in companies
        )
        else "accepted"
        if any(company["status"] == "selected" for company in companies)
        else "quotes_received"
        if any(company["quote"] is not None for company in companies)
        else "pending"
    )
    return {
        "group_id": request.group_id,
        "status": status,
        "created_at": request.created_at.isoformat(),
        "customer_name": request.customer_name,
        "customer_phone": request.customer_phone,
        "system_kwp": request.system_kwp,
        "battery_kwh": request.battery_kwh,
        "panel_count": request.panel_count,
        "is_green_initiative": request.is_green_initiative,
        "green_initiative_budget_iqd": request.green_initiative_budget_iqd,
        "details": json.loads(request.details_json),
        "companies": companies,
    }


@router.post("", response_model=QuoteRequestCreatedRead, status_code=201)
def create_quote_request(
    payload: QuoteRequestCreate,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    if isinstance(current_user, User) and current_user.role != "client":
        raise HTTPException(status_code=403, detail="Only client accounts can create quote requests")
    company_ids = list(dict.fromkeys(payload.company_ids))
    companies = session.exec(select(Company).where(Company.id.in_(company_ids))).all()
    by_id = {company.id: company for company in companies}
    if len(by_id) != len(company_ids):
        raise HTTPException(status_code=422, detail="One or more selected companies do not exist")
    if any(by_id[company_id].verification_status == "rejected" for company_id in company_ids):
        raise HTTPException(status_code=422, detail="Rejected companies cannot receive quote requests")

    access_token = secrets.token_urlsafe(32)
    request = QuoteRequest(
        group_id=f"UTU-{datetime.now(timezone.utc).year}-{secrets.token_hex(4).upper()}",
        customer_name=payload.customer_name.strip(),
        customer_phone=payload.customer_phone.strip(),
        system_kwp=payload.system_kwp,
        battery_kwh=payload.battery_kwh,
        panel_count=payload.panel_count,
        is_green_initiative=payload.is_green_initiative,
        green_initiative_budget_iqd=payload.green_initiative_budget_iqd,
        details_json=json.dumps({
            key: value for key, value in payload.details.items()
            if key in REQUEST_DETAIL_KEYS
        }),
        access_token_hash=_token_hash(access_token),
        user_id=current_user.id if isinstance(current_user, User) else None,
    )
    session.add(request)
    session.flush()

    for company_id in company_ids:
        session.add(QuoteRequestCompany(request_id=request.id, company_id=company_id))
    session.commit()
    session.refresh(request)
    return {**_as_group(session, request), "access_token": access_token}


@router.get("/mine", response_model=list[QuoteRequestRead])
def list_my_quote_requests(
    is_green_initiative: Optional[bool] = Query(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(["client"])),
):
    statement = select(QuoteRequest).where(QuoteRequest.user_id == current_user.id)
    if is_green_initiative is not None:
        statement = statement.where(QuoteRequest.is_green_initiative == is_green_initiative)
    requests = session.exec(statement.order_by(QuoteRequest.created_at.desc())).all()
    return [_as_group(session, request) for request in requests]


@router.patch("/{group_id}", response_model=QuoteRequestRead)
def update_quote_request(
    group_id: str,
    payload: QuoteRequestUpdate,
    access_token: Optional[str] = Query(default=None, min_length=32, max_length=128),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    if isinstance(current_user, User):
        if current_user.role != "client":
            raise HTTPException(status_code=403, detail="Only clients can edit quote requests")
        request = session.exec(
            select(QuoteRequest).where(
                QuoteRequest.group_id == group_id,
                QuoteRequest.user_id == current_user.id,
            )
        ).first()
    elif access_token:
        request = session.exec(
            select(QuoteRequest).where(
                QuoteRequest.group_id == group_id,
                QuoteRequest.access_token_hash == _token_hash(access_token),
            )
        ).first()
    else:
        raise HTTPException(
            status_code=401,
            detail="Client authentication or request access token is required",
        )
    if request is None:
        raise HTTPException(status_code=404, detail="Request not found")

    changes = payload.model_dump(exclude_unset=True)
    for field in ("customer_name", "customer_phone", "system_kwp", "battery_kwh", "panel_count"):
        if field in changes:
            value = changes[field]
            if value is None:
                raise HTTPException(status_code=422, detail=f"{field} cannot be null")
            setattr(request, field, value.strip() if isinstance(value, str) else value)
    if "details" in changes:
        if changes["details"] is None:
            raise HTTPException(status_code=422, detail="details cannot be null")
        details = json.loads(request.details_json)
        if any(value is None for value in changes["details"].values()):
            raise HTTPException(status_code=422, detail="Request detail values cannot be null")
        details.update(changes["details"])
        request.details_json = json.dumps(details)

    session.add(request)
    session.commit()
    session.refresh(request)
    return _as_group(session, request)


@router.post("/claim-guest", status_code=200)
def claim_guest_quote_requests(
    payload: ClaimGuestRequests,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(["client"])),
):
    if not payload.access_tokens:
        return {"claimed": 0}

    token_hashes = list({_token_hash(token) for token in payload.access_tokens})
    guest_requests = session.exec(
        select(QuoteRequest).where(
            QuoteRequest.access_token_hash.in_(token_hashes),
            QuoteRequest.user_id.is_(None),
        )
    ).all()
    for request in guest_requests:
        request.user_id = current_user.id
        session.add(request)
    session.commit()
    return {"claimed": len(guest_requests)}


@router.get("", response_model=list[QuoteRequestRead])
def list_quote_requests(
    access_token: str = Query(min_length=32, max_length=128),
    session: Session = Depends(get_session),
):
    request = session.exec(
        select(QuoteRequest).where(QuoteRequest.access_token_hash == _token_hash(access_token))
    ).first()
    if request is None:
        raise HTTPException(status_code=404, detail="No request found for this access token")
    return [_as_group(session, request)]


@router.get("/{group_id}", response_model=QuoteRequestRead)
def get_quote_request(
    group_id: str,
    access_token: str = Query(min_length=32, max_length=128),
    session: Session = Depends(get_session),
):
    request = session.exec(
        select(QuoteRequest).where(
            QuoteRequest.group_id == group_id,
            QuoteRequest.access_token_hash == _token_hash(access_token),
        )
    ).first()
    if request is None:
        raise HTTPException(status_code=404, detail="Request not found")
    return _as_group(session, request)


@router.post("/{group_id}/choose/{company_id}", response_model=QuoteRequestRead)
def choose_company_quote(
    group_id: str,
    company_id: int,
    access_token: Optional[str] = Query(default=None, min_length=32, max_length=128),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    if isinstance(current_user, User):
        if current_user.role != "client":
            raise HTTPException(status_code=403, detail="Only client accounts can accept quotes")
        request = session.exec(
            select(QuoteRequest).where(
                QuoteRequest.group_id == group_id,
                QuoteRequest.user_id == current_user.id,
            )
        ).first()
    elif access_token:
        request = session.exec(
            select(QuoteRequest).where(
                QuoteRequest.group_id == group_id,
                QuoteRequest.access_token_hash == _token_hash(access_token),
            )
        ).first()
    else:
        raise HTTPException(status_code=401, detail="Client authentication or request access token is required")
    if request is None:
        raise HTTPException(status_code=404, detail="Request not found")

    assignment = session.exec(
        select(QuoteRequestCompany).where(
            QuoteRequestCompany.request_id == request.id,
            QuoteRequestCompany.company_id == company_id,
        )
    ).first()
    if assignment is None:
        raise HTTPException(status_code=404, detail="This company was not selected for the request")

    quote = session.exec(
        select(CompanyQuote).where(CompanyQuote.request_company_id == assignment.id)
    ).first()
    if quote is None:
        raise HTTPException(status_code=409, detail="This company has not submitted a quote")

    selected = session.exec(
        select(QuoteRequestCompany).where(
            QuoteRequestCompany.request_id == request.id,
            QuoteRequestCompany.status == "selected",
        )
    ).first()
    if selected is not None and selected.company_id != company_id:
        raise HTTPException(status_code=409, detail="A company has already been selected for this request")

    assignment.status = "selected"
    if request.is_green_initiative and quote.green_initiative_supported:
        assignment.green_verification_id = (
            assignment.green_verification_id or secrets.token_urlsafe(24)
        )
    session.add(assignment)
    session.commit()
    return _as_group(session, request)


@router.post(
    "/{group_id}/choose/{company_id}/deposit",
    response_model=QuoteRequestRead,
)
def confirm_deposit_payment(
    group_id: str,
    company_id: int,
    payload: DepositPaymentCreate,
    access_token: Optional[str] = Query(default=None, min_length=32, max_length=128),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    if isinstance(current_user, User):
        if current_user.role != "client":
            raise HTTPException(status_code=403, detail="Only client accounts can pay a deposit")
        request = session.exec(
            select(QuoteRequest).where(
                QuoteRequest.group_id == group_id,
                QuoteRequest.user_id == current_user.id,
            )
        ).first()
    elif access_token:
        request = session.exec(
            select(QuoteRequest).where(
                QuoteRequest.group_id == group_id,
                QuoteRequest.access_token_hash == _token_hash(access_token),
            )
        ).first()
    else:
        raise HTTPException(
            status_code=401,
            detail="Client authentication or request access token is required",
        )
    if request is None:
        raise HTTPException(status_code=404, detail="Request not found")

    assignment = session.exec(
        select(QuoteRequestCompany).where(
            QuoteRequestCompany.request_id == request.id,
            QuoteRequestCompany.company_id == company_id,
        )
    ).first()
    if assignment is None:
        raise HTTPException(status_code=404, detail="This company was not selected for the request")
    quote = session.exec(
        select(CompanyQuote).where(CompanyQuote.request_company_id == assignment.id)
    ).first()
    if quote is None:
        raise HTTPException(status_code=409, detail="This company has not submitted a quote")

    existing_payment = session.exec(
        select(DepositPayment).where(DepositPayment.assignment_id == assignment.id)
    ).first()
    if existing_payment is not None:
        if existing_payment.payment_status == "refunded":
            raise HTTPException(status_code=409, detail="This deposit has already been refunded")
        return _as_group(session, request)

    selected = session.exec(
        select(QuoteRequestCompany).where(
            QuoteRequestCompany.request_id == request.id,
            QuoteRequestCompany.status == "selected",
        )
    ).first()
    if selected is not None and selected.company_id != company_id:
        raise HTTPException(status_code=409, detail="A company has already been selected for this request")

    total_iqd = quote.total_iqd
    deposit_iqd = min(
        total_iqd,
        max(50_000, int((Decimal(total_iqd) * Decimal("0.05")).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        ))),
    )
    assignment.status = "selected"
    if request.is_green_initiative and quote.green_initiative_supported:
        assignment.green_verification_id = (
            assignment.green_verification_id or secrets.token_urlsafe(24)
        )
    session.add(assignment)
    session.add(DepositPayment(
        assignment_id=assignment.id,
        transaction_id=f"UTU-{secrets.token_hex(8).upper()}",
        payment_method=payload.payment_method,
        phone_number=payload.phone_number,
        total_iqd=total_iqd,
        deposit_iqd=deposit_iqd,
        remaining_iqd=total_iqd - deposit_iqd,
        commission_iqd=round(total_iqd * 0.05),
        # Demo deposit: no gateway is called, so nothing is marked paid or collected.
        payment_status="simulated",
        commission_status="simulated",
    ))
    session.commit()
    return _as_group(session, request)


@router.post("/{group_id}/quotes/{company_id}", response_model=QuoteRead)
def submit_company_quote(
    group_id: str,
    company_id: int,
    payload: QuoteCreate,
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
):
    company_id_from_token = _authenticated_company_id(authorization, session)
    if company_id_from_token != company_id:
        raise HTTPException(status_code=403, detail="This account cannot submit for that company")
    request = session.exec(select(QuoteRequest).where(QuoteRequest.group_id == group_id)).first()
    if request is None:
        raise HTTPException(status_code=404, detail="Request not found")
    assignment = session.exec(
        select(QuoteRequestCompany).where(
            QuoteRequestCompany.request_id == request.id,
            QuoteRequestCompany.company_id == company_id,
        )
    ).first()
    if assignment is None:
        raise HTTPException(status_code=404, detail="This request was not sent to your company")
    company = session.get(Company, company_id)
    if company is None or not can_submit_quotes(company.verification_status):
        raise HTTPException(status_code=403, detail="Identity verification is required to submit quotes")
    # Once the customer has chosen a company, quotes on that request are frozen:
    # the accepted price cannot change, and other companies cannot re-quote.
    if assignment.status == "selected":
        raise HTTPException(
            status_code=409,
            detail="This quote was accepted by the customer and can no longer be changed",
        )
    other_selected = session.exec(
        select(QuoteRequestCompany).where(
            QuoteRequestCompany.request_id == request.id,
            QuoteRequestCompany.status == "selected",
            QuoteRequestCompany.company_id != company_id,
        )
    ).first()
    if other_selected is not None:
        raise HTTPException(
            status_code=409,
            detail="The customer has already chosen another company for this request",
        )
    if payload.green_initiative_supported and not request.is_green_initiative:
        raise HTTPException(
            status_code=422,
            detail="Green Initiative documentation support can only be offered for a Green Initiative request",
        )

    breakdown = (
        payload.panel_iqd,
        payload.inverter_iqd,
        payload.battery_iqd,
        payload.installation_iqd,
    )
    if any(value is not None for value in breakdown):
        if any(value is None for value in breakdown):
            raise HTTPException(status_code=422, detail="All itemized quote prices are required together")
        if sum(value for value in breakdown if value is not None) != payload.total_iqd:
            raise HTTPException(status_code=422, detail="Itemized quote prices must equal the total price")

    quote = session.exec(
        select(CompanyQuote).where(CompanyQuote.request_company_id == assignment.id)
    ).first()
    values = _quote_storage_values(payload)
    if quote is None:
        quote = CompanyQuote(request_company_id=assignment.id, **values)
    else:
        for key, value in values.items():
            setattr(quote, key, value)
    assignment.status = "quoted"
    session.add(quote)
    session.add(assignment)
    session.commit()
    session.refresh(quote)
    return _serialize_quote(quote, exclude_id=False)


@router.get("/verify/{verification_id}", response_model=GreenInitiativeVerificationRead)
def get_green_initiative_verification(
    verification_id: str,
    session: Session = Depends(get_session),
):
    assignment = session.exec(
        select(QuoteRequestCompany).where(
            QuoteRequestCompany.green_verification_id == verification_id,
            QuoteRequestCompany.status == "selected",
        )
    ).first()
    if assignment is None:
        raise HTTPException(status_code=404, detail="Green Initiative verification not found")
    request = session.get(QuoteRequest, assignment.request_id)
    quote = session.exec(
        select(CompanyQuote).where(CompanyQuote.request_company_id == assignment.id)
    ).first()
    company = session.get(Company, assignment.company_id)
    verification = session.get(CompanyVerification, assignment.company_id)
    if (
        request is None
        or not request.is_green_initiative
        or quote is None
        or not quote.green_initiative_supported
        or company is None
        or company.verification_status != "verified"
        or verification is None
    ):
        raise HTTPException(status_code=404, detail="Green Initiative verification not found")
    details = json.loads(request.details_json)
    return GreenInitiativeVerificationRead(
        reference=request.group_id,
        system_kwp=quote.capacity_kwp,
        battery_kwh=request.battery_kwh,
        panel_count=request.panel_count,
        governorate=str(details.get("governorate") or ""),
        district=str(details.get("district") or ""),
        company_name=company.name,
        company_verification_status=company.verification_status,
        business_license_number=(
            verification.business_license_number
            if verification.license_checked and company.verification_status == "verified"
            else None
        ),
        tax_registration_number=(
            verification.tax_registration_number
            if verification.tax_record_checked and company.verification_status == "verified"
            else None
        ),
        license_checked=verification.license_checked,
        tax_record_checked=verification.tax_record_checked,
        projects_checked=verification.projects_checked,
        reviewed_at=verification.reviewed_at,
    )


@router.post("/{group_id}/complete", response_model=ProjectRead, status_code=201)
def complete_company_installation(
    group_id: str,
    payload: CompletedInstallation,
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
):
    company_id = _authenticated_company_id(authorization, session)
    request = session.exec(select(QuoteRequest).where(QuoteRequest.group_id == group_id)).first()
    if request is None:
        raise HTTPException(status_code=404, detail="Request not found")
    assignment = session.exec(
        select(QuoteRequestCompany).where(
            QuoteRequestCompany.request_id == request.id,
            QuoteRequestCompany.company_id == company_id,
        )
    ).first()
    if assignment is None:
        raise HTTPException(status_code=404, detail="This request was not sent to your company")
    if assignment.status != "selected":
        raise HTTPException(status_code=409, detail="The customer must accept this company's quote before completing an installation")
    company = session.get(Company, company_id)
    if company is None or not can_submit_quotes(company.verification_status):
        raise HTTPException(status_code=403, detail="Identity verification is required to complete installations")
    existing = session.exec(
        select(Project).where(
            Project.quote_request_id == request.id,
            Project.company_id == company_id,
        )
    ).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="This request already has a completed installation")

    quote = session.exec(
        select(CompanyQuote).where(CompanyQuote.request_company_id == assignment.id)
    ).first()
    details = json.loads(request.details_json)
    governorate_names = {
        "baghdad": "Baghdad",
        "basra": "Basra",
        "erbil": "Erbil",
        "nineveh": "Nineveh",
        "sulaymaniyah": "Sulaymaniyah",
        "duhok": "Duhok",
        "kirkuk": "Kirkuk",
        "najaf": "Najaf",
        "karbala": "Karbala",
        "babil": "Babil",
        "anbar": "Anbar",
        "diyala": "Diyala",
        "dhiqar": "Dhi Qar",
        "maysan": "Maysan",
        "muthanna": "Muthanna",
        "qadisiyyah": "Qadisiyyah",
        "salahaldin": "Salah al-Din",
        "wasit": "Wasit",
    }
    governorate = details.get("governorate", "")
    project = Project(
        title=payload.title.strip(),
        description=payload.description.strip(),
        company_id=company_id,
        quote_request_id=request.id,
        client_name=_mask_client_name(request.customer_name),
        location_governorate=governorate_names.get(governorate, governorate or "Iraq"),
        location_district=str(details.get("district") or "Not provided"),
        system_kwp=quote.capacity_kwp if quote else request.system_kwp,
        battery_kwh=request.battery_kwh,
        installation_type=payload.installation_type.strip(),
        rating=0,
        image_url=payload.image_url.strip(),
        gallery_urls_json=json.dumps(payload.gallery_urls),
        status="completed",
        completed_at=datetime.now(timezone.utc),
        panel_count=request.panel_count,
        roof_type=str(details.get("roofType") or ""),
        inverter_details=quote.inverter_brand if quote else None,
        testimonial=None,
    )
    session.add(project)
    company.projects_count += 1
    session.add(company)
    session.commit()
    session.refresh(project)
    return _project_payload(project, company, session)


def _authenticated_company_id(authorization: Optional[str], session: Session) -> int:
    return company_id_from_authorization(authorization, session)


def _mask_client_name(name: str) -> str:
    parts = name.strip().split()
    if len(parts) < 2:
        return parts[0] if parts else "Customer"
    return f"{parts[0]} {parts[-1][0]}."


def _chat_participant(
    group_id: str,
    company_id: int,
    access_token: Optional[str],
    authorization: Optional[str],
    current_user: Optional[User],
    session: Session,
) -> tuple[QuoteRequestCompany, Literal["client", "company"], Optional[int], str]:
    request = session.exec(
        select(QuoteRequest).where(QuoteRequest.group_id == group_id)
    ).first()
    if request is None:
        raise HTTPException(status_code=404, detail="Request not found")

    role: Literal["client", "company"]
    sender_user_id: Optional[int] = None
    if isinstance(current_user, User):
        if current_user.role == "client":
            if current_user.id != request.user_id:
                raise HTTPException(status_code=403, detail="This request belongs to another client")
            role = "client"
            sender_user_id = current_user.id
            sender_name = current_user.full_name
        elif current_user.role == "company" and current_user.company_id is not None:
            role = "company"
            sender_user_id = current_user.id
            company_id = current_user.company_id
            company = session.get(Company, company_id)
            sender_name = company.name if company is not None else current_user.full_name
        else:
            raise HTTPException(status_code=403, detail="Only clients and assigned companies can chat")
    elif authorization:
        company_id = _authenticated_company_id(authorization, session)
        role = "company"
        company = session.get(Company, company_id)
        if company is None:
            raise HTTPException(status_code=404, detail="Company not found")
        sender_name = company.name
        company_user = session.exec(
            select(User).where(User.company_id == company_id)
        ).first()
        sender_user_id = company_user.id if company_user is not None else None
    elif access_token:
        token_request = session.exec(
            select(QuoteRequest).where(
                QuoteRequest.id == request.id,
                QuoteRequest.access_token_hash == _token_hash(access_token),
            )
        ).first()
        if token_request is None:
            raise HTTPException(status_code=403, detail="Request access token is invalid")
        role = "client"
        sender_name = request.customer_name
    else:
        raise HTTPException(status_code=401, detail="Client or company authentication is required")

    assignment = session.exec(
        select(QuoteRequestCompany).where(
            QuoteRequestCompany.request_id == request.id,
            QuoteRequestCompany.company_id == company_id,
        )
    ).first()
    if assignment is None:
        raise HTTPException(status_code=404, detail="Company is not assigned to this request")
    return assignment, role, sender_user_id, sender_name


@router.get(
    "/{group_id}/companies/{company_id}/messages",
    response_model=list[ChatMessageRead],
)
def list_chat_messages(
    group_id: str,
    company_id: int,
    access_token: Optional[str] = Query(default=None, min_length=32, max_length=128),
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    assignment, _, _, _ = _chat_participant(
        group_id, company_id, access_token, authorization, current_user, session
    )
    return session.exec(
        select(ChatMessage)
        .where(ChatMessage.request_company_id == assignment.id)
        .order_by(ChatMessage.created_at, ChatMessage.id)
    ).all()


@router.post(
    "/{group_id}/companies/{company_id}/messages",
    response_model=ChatMessageRead,
    status_code=201,
)
def create_chat_message(
    group_id: str,
    company_id: int,
    payload: ChatMessageCreate,
    access_token: Optional[str] = Query(default=None, min_length=32, max_length=128),
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    assignment, sender_role, sender_user_id, sender_name = _chat_participant(
        group_id, company_id, access_token, authorization, current_user, session
    )
    violation_type = detect_contact_violation(content)
    stored_content = BLOCKED_MESSAGE if violation_type else content
    message = ChatMessage(
        request_company_id=assignment.id,
        sender_user_id=sender_user_id,
        sender_role=sender_role,
        sender_name=sender_name[:160],
        content=stored_content,
        violation_type=violation_type,
    )
    session.add(message)
    if violation_type:
        report = PolicyReport(
            reporter_id=sender_user_id,
            subject=f"{violation_type} — {sender_role}: {sender_name}"[:160],
            description=(
                f"RFQ {group_id}; sender: {sender_role} ({sender_name}); "
                f"message snippet: {BLOCKED_MESSAGE}"
            )[:2000],
            status="pending",
        )
        session.add(report)
    session.commit()
    session.refresh(message)
    return message