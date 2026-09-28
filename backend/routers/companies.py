import os
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from database import get_session
from models import (
    Company,
    CompanyCreate,
    CompanyDocument,
    CompanyDocumentRead,
    CompanyRead,
    Product,
    ProductRead,
    Project,
    ProjectRead,
    Review,
    ReviewRead,
    Warranty,
    WarrantyRead,
)

UPLOAD_DIR = "uploads"

# An uploaded licence is a document, not a program. Anything outside this set is
# refused rather than written to disk.
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

router = APIRouter(prefix="/api/companies", tags=["Companies"])


def _to_read(company: Company, session: Session) -> CompanyRead:
    """Attach the review average a company card shows.

    Without this the frontend would need one extra request per company just to
    draw a star rating — 25 requests to render a page of 24 companies.
    """
    ratings = session.exec(
        select(Review.rating).where(Review.company_id == company.id)
    ).all()

    return CompanyRead(
        **company.model_dump(),
        rating=round(sum(ratings) / len(ratings), 1) if ratings else 0.0,
        reviews_count=len(ratings),
    )


@router.get("", response_model=List[CompanyRead])
def get_companies(session: Session = Depends(get_session)):
    companies = session.exec(select(Company)).all()
    return [_to_read(c, session) for c in companies]


@router.get("/{company_id}", response_model=CompanyRead)
def get_company(company_id: int, session: Session = Depends(get_session)):
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return _to_read(company, session)


@router.post("", response_model=CompanyRead, status_code=201)
def create_company(company_in: CompanyCreate, session: Session = Depends(get_session)):
    company = Company.model_validate(company_in)
    session.add(company)
    session.commit()
    session.refresh(company)
    return _to_read(company, session)


@router.post("/{company_id}/documents", response_model=CompanyDocumentRead)
def upload_document(
    company_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    # The uploader's filename never touches the path. Joining it directly let a
    # name like "../../main.py" climb out of the uploads folder and overwrite
    # the application's own source.
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Allowed file types: {', '.join(sorted(ALLOWED_UPLOAD_EXTENSIONS))}",
        )

    contents = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 10 MB.")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    stored_name = f"{uuid4().hex}{extension}"
    with open(os.path.join(UPLOAD_DIR, stored_name), "wb") as buffer:
        buffer.write(contents)

    document = CompanyDocument(
        company_id=company_id,
        document_type=document_type,
        file_url=f"/{UPLOAD_DIR}/{stored_name}",
    )

    session.add(document)
    session.commit()
    session.refresh(document)

    return document


@router.get("/{company_id}/documents", response_model=List[CompanyDocumentRead])
def get_company_documents(company_id: int, session: Session = Depends(get_session)):
    _require_company(company_id, session)
    return session.exec(
        select(CompanyDocument).where(CompanyDocument.company_id == company_id)
    ).all()


@router.get("/{company_id}/warranties", response_model=List[WarrantyRead])
def get_company_warranties(company_id: int, session: Session = Depends(get_session)):
    _require_company(company_id, session)
    return session.exec(
        select(Warranty).where(Warranty.company_id == company_id)
    ).all()


@router.get("/{company_id}/projects", response_model=List[ProjectRead])
def get_company_projects(company_id: int, session: Session = Depends(get_session)):
    _require_company(company_id, session)
    return session.exec(select(Project).where(Project.company_id == company_id)).all()


@router.get("/{company_id}/reviews", response_model=List[ReviewRead])
def get_company_reviews(company_id: int, session: Session = Depends(get_session)):
    _require_company(company_id, session)
    return session.exec(select(Review).where(Review.company_id == company_id)).all()


@router.get("/{company_id}/products", response_model=List[ProductRead])
def get_company_products(company_id: int, session: Session = Depends(get_session)):
    _require_company(company_id, session)
    return session.exec(select(Product).where(Product.company_id == company_id)).all()


def _require_company(company_id: int, session: Session) -> Company:
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company
