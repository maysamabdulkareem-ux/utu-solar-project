from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field as PydanticField
from sqlmodel import Session, select

from database import get_session
from companies import CompanyRead
from models import Company, CompanyVerification, DepositPayment, QuoteRequest, QuoteRequestCompany, User
from quote_requests import (
    ACTIVE_DEPOSIT_STATUSES,
    QuoteRequestRead,
    _as_group,
    _authenticated_company_id,
)
from verification import can_submit_quotes, verification_tier

router = APIRouter(prefix="/api/company", tags=["Company portal"])


class VerificationApplicationUpdate(BaseModel):
    business_license_number: Optional[str] = PydanticField(default=None, min_length=2, max_length=100)
    tax_registration_number: Optional[str] = PydanticField(default=None, min_length=2, max_length=100)
    projects_count: Optional[int] = PydanticField(default=None, ge=0, le=100000)


class CompanyProfileUpdate(BaseModel):
    phone: Optional[str] = PydanticField(default=None, min_length=11, max_length=11, pattern=r"^07\d{9}$")
    support_phone: Optional[str] = PydanticField(
        default=None,
        max_length=11,
        pattern=r"^(?:07\d{9}|\d{3,6}|\d{7,11})$",
    )


class VerificationRead(BaseModel):
    company_id: int
    business_license_number: str
    tax_registration_number: str
    license_checked: bool
    tax_record_checked: bool
    projects_checked: bool
    reviewed_at: Optional[datetime]


class CompanyProfileRead(CompanyRead):
    verification: Optional[VerificationRead]


class VerificationStatusRead(BaseModel):
    verification_status: str


class CompanySupportPhoneRead(BaseModel):
    support_phone: Optional[str]


class CompanyProfileContactsRead(BaseModel):
    phone: Optional[str]
    support_phone: Optional[str]


@router.get("/requests", response_model=list[QuoteRequestRead])
def company_requests(
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
    is_green_initiative: Optional[bool] = None,
):
    company_id = _authenticated_company_id(authorization, session)
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    if not can_submit_quotes(company.verification_status):
        raise HTTPException(
            status_code=403,
            detail="Identity verification is required to access quote requests",
        )
    assignments = session.exec(
        select(QuoteRequestCompany).where(QuoteRequestCompany.company_id == company_id)
    ).all()
    results = []
    for assignment in assignments:
        request = session.get(QuoteRequest, assignment.request_id)
        if request is None:
            continue
        if is_green_initiative is not None and request.is_green_initiative != is_green_initiative:
            continue
        result = _as_group(session, request)
        result["companies"] = [
            company for company in result["companies"] if company["company_id"] == company_id
        ]
        # The customer's phone is shared only after the customer has placed a
        # deposit with this company; until then contact stays on the platform.
        if not _has_active_deposit(session, assignment.id):
            result["customer_phone"] = None
        results.append(result)
    # Reading the inbox does not change any status; see mark_request_viewed.
    return sorted(results, key=lambda item: item["created_at"], reverse=True)


def _has_active_deposit(session: Session, assignment_id: int) -> bool:
    payment = session.exec(
        select(DepositPayment).where(DepositPayment.assignment_id == assignment_id)
    ).first()
    return payment is not None and payment.payment_status in ACTIVE_DEPOSIT_STATUSES


class RequestViewedRead(BaseModel):
    status: str


@router.post("/requests/{group_id}/viewed", response_model=RequestViewedRead)
def mark_request_viewed(
    group_id: str,
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
):
    """Record that the company actually opened this request."""
    company_id = _authenticated_company_id(authorization, session)
    company = session.get(Company, company_id)
    if company is None or not can_submit_quotes(company.verification_status):
        raise HTTPException(
            status_code=403,
            detail="Identity verification is required to access quote requests",
        )
    request = session.exec(select(QuoteRequest).where(QuoteRequest.group_id == group_id)).first()
    assignment = (
        session.exec(
            select(QuoteRequestCompany).where(
                QuoteRequestCompany.request_id == request.id,
                QuoteRequestCompany.company_id == company_id,
            )
        ).first()
        if request is not None
        else None
    )
    if assignment is None:
        raise HTTPException(status_code=404, detail="This request was not sent to your company")
    if assignment.status == "sent":
        assignment.status = "viewed"
        session.add(assignment)
        session.commit()
    return {"status": assignment.status}


@router.get("/profile", response_model=CompanyProfileRead)
def company_profile(
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
):
    company_id = _authenticated_company_id(authorization, session)
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    verification = session.get(CompanyVerification, company_id)
    return {
        **company.model_dump(),
        "verification": verification.model_dump() if verification else None,
    }


@router.put("/profile/support-phone", response_model=CompanySupportPhoneRead)
def update_company_support_phone(
    payload: CompanyProfileUpdate,
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
):
    company_id = _authenticated_company_id(authorization, session)
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    company.support_phone = payload.support_phone.strip() if payload.support_phone else None
    session.add(company)
    session.commit()
    session.refresh(company)
    return {"support_phone": company.support_phone}


@router.put("/profile", response_model=CompanyProfileContactsRead)
def update_company_profile_contacts(
    payload: CompanyProfileUpdate,
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
):
    company_id = _authenticated_company_id(authorization, session)
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    if "phone" in payload.model_fields_set:
        company.phone = payload.phone.strip() if payload.phone else ""
    if "support_phone" in payload.model_fields_set:
        company.support_phone = payload.support_phone.strip() if payload.support_phone else None
    session.add(company)
    session.commit()
    session.refresh(company)
    return {"phone": company.phone or None, "support_phone": company.support_phone}


@router.put("/verification-application", response_model=VerificationStatusRead)
def update_verification_application(
    payload: VerificationApplicationUpdate,
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
):
    company_id = _authenticated_company_id(authorization, session)
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    verification = session.get(CompanyVerification, company_id)
    if verification is None:
        verification = CompanyVerification(company_id=company_id)
    if payload.business_license_number is not None and payload.business_license_number.strip():
        verification.business_license_number = payload.business_license_number.strip()
    if payload.tax_registration_number is not None and payload.tax_registration_number.strip():
        verification.tax_registration_number = payload.tax_registration_number.strip()
    if verification_tier(company.verification_status) == 0:
        verification.license_checked = False
        verification.tax_record_checked = False
        verification.projects_checked = False
        verification.reviewed_at = None
    if payload.projects_count is not None:
        company.projects_count = payload.projects_count
    if verification_tier(company.verification_status) == 0:
        company.verification_status = "pending"
    linked_user = session.exec(select(User).where(User.company_id == company_id)).first()
    if linked_user is not None:
        linked_user.is_verified = verification_tier(company.verification_status) >= 1
        session.add(linked_user)
    session.add(verification)
    session.add(company)
    session.commit()
    return {"verification_status": company.verification_status}