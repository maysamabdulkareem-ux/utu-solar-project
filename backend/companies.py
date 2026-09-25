from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import Company, CompanyBase

router = APIRouter(prefix="/api/companies", tags=["Companies"])


@router.get("", response_model=List[CompanyBase])
def get_companies(session: Session = Depends(get_session)):
    companies = session.exec(select(Company)).all()
    return companies


@router.get("/{company_id}", response_model=CompanyBase)
def get_company(company_id: int, session: Session = Depends(get_session)):
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company