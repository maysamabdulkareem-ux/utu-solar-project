from typing import List

from fastapi import APIRouter, Depends,HTTPException
from sqlmodel import Session, select

from database import get_session
from models import Company, CompanyRead

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# NOTE: these endpoints have no authentication. Anyone who can reach the server
# can mark any company as verified — and verification is what this marketplace
# sells. Fine on localhost; put a key or a login in front of this router before
# it is reachable from anywhere else.


@router.get("/companies/pending", response_model=List[CompanyRead])
def get_pending_companies(session: Session = Depends(get_session)):
    companies = session.exec(
        select(Company).where(Company.verification_status == "pending")
    ).all()
    return companies


@router.patch("/companies/{company_id}/verify", response_model=CompanyRead)
def verify_company(
    company_id: int,
    session: Session = Depends(get_session),
):
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    company.verification_status = "verified"

    session.add(company)
    session.commit()
    session.refresh(company)

    return company