from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field as PydanticField
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from database import get_session
from models import Company, Project, QuoteRequest, QuoteRequestCompany, Review, User
from quote_requests import _token_hash
from security import get_optional_current_user, require_role

router = APIRouter(prefix="/api", tags=["Reviews"])
UNVERIFIED_REVIEW_MESSAGE = "You can only review companies after completing a project with them."


class ReviewCreate(BaseModel):
    project_id: int = PydanticField(gt=0)
    access_token: Optional[str] = PydanticField(default=None, min_length=32, max_length=128)
    rating: float = PydanticField(ge=1, le=5)
    communication_rating: float = PydanticField(ge=1, le=5)
    work_quality_rating: float = PydanticField(ge=1, le=5)
    comment: str = PydanticField(min_length=10, max_length=2000)


class ReviewUpdate(BaseModel):
    project_id: int = PydanticField(gt=0)
    rating: float = PydanticField(ge=1, le=5)
    communication_rating: float = PydanticField(ge=1, le=5)
    work_quality_rating: float = PydanticField(ge=1, le=5)
    comment: str = PydanticField(min_length=10, max_length=2000)


class ReviewRead(BaseModel):
    id: int
    company_id: int
    company_name: str
    project_id: int
    project_title: str
    system_kwp: float
    location_governorate: str
    location_district: str
    client_name: str
    rating: float
    communication_rating: float
    work_quality_rating: float
    comment: str
    is_verified: bool
    created_at: datetime


def _review_payload(review: Review, project: Project, company: Company) -> dict:
    return {
        "id": review.id,
        "company_id": review.company_id,
        "company_name": company.name,
        "project_id": review.project_id,
        "project_title": project.title,
        "system_kwp": project.system_kwp,
        "location_governorate": project.location_governorate,
        "location_district": project.location_district,
        "client_name": review.client_name,
        "rating": review.rating,
        "communication_rating": review.communication_rating,
        "work_quality_rating": review.work_quality_rating,
        "comment": review.comment,
        "is_verified": review.is_verified,
        "created_at": review.created_at,
    }


def _review_rows(session: Session, where_clause):
    return session.exec(
        select(Review, Project, Company)
        .join(Project, Review.project_id == Project.id)
        .join(Company, Review.company_id == Company.id)
        .where(
            Review.is_verified.is_(True),
            Project.status == "completed",
            Company.verification_status == "verified",
            where_clause,
        )
    ).all()


@router.get("/reviews", response_model=list[ReviewRead])
def list_reviews(session: Session = Depends(get_session)):
    rows = _review_rows(session, True)
    rows.sort(key=lambda row: (row[0].created_at, row[0].id or 0), reverse=True)
    return [_review_payload(review, project, company) for review, project, company in rows]


@router.get("/companies/{company_id}/reviews", response_model=list[ReviewRead])
def list_company_reviews(company_id: int, session: Session = Depends(get_session)):
    company = session.get(Company, company_id)
    if company is None or company.verification_status == "rejected":
        raise HTTPException(status_code=404, detail="Company not found")
    rows = _review_rows(session, Review.company_id == company_id)
    rows.sort(key=lambda row: row[0].created_at, reverse=True)
    return [_review_payload(review, project, installer) for review, project, installer in rows]


@router.get("/reviews/featured", response_model=list[ReviewRead])
def list_featured_reviews(
    limit: int = Query(default=6, ge=1, le=20),
    session: Session = Depends(get_session),
):
    rows = _review_rows(session, Review.rating >= 4)
    rows.sort(key=lambda row: (row[0].rating, row[0].created_at), reverse=True)
    return [_review_payload(review, project, company) for review, project, company in rows[:limit]]


@router.post("/reviews", response_model=ReviewRead, status_code=201)
def create_review(
    payload: ReviewCreate,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    project = session.get(Project, payload.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    request = _request_for_project(session, project, payload.access_token, current_user)
    company = _validate_review_eligibility(session, project, request)

    existing = session.exec(select(Review).where(Review.project_id == project.id)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="A review already exists for this completed project")

    review = Review(
        company_id=company.id,
        project_id=project.id,
        client_name=_masked_name(request.customer_name),
        rating=payload.rating,
        communication_rating=payload.communication_rating,
        work_quality_rating=payload.work_quality_rating,
        comment=payload.comment.strip(),
        is_verified=True,
    )
    session.add(review)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="A review already exists for this completed project")

    verified_reviews = session.exec(
        select(Review).where(Review.company_id == company.id, Review.is_verified.is_(True))
    ).all()
    average = sum((Decimal(str(item.rating)) for item in verified_reviews), Decimal(0)) / len(verified_reviews)
    company.rating = float(average.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    company.reviews_count = len(verified_reviews)
    session.add(company)
    session.commit()
    session.refresh(review)
    return _review_payload(review, project, company)


@router.get("/reviews/projects/{project_id}/mine", response_model=Optional[ReviewRead])
def get_my_project_review(
    project_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(["client"])),
):
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    request = _owned_request_for_project(session, project, current_user)
    _validate_review_eligibility(session, project, request)
    review = session.exec(select(Review).where(Review.project_id == project.id)).first()
    if review is None:
        return None
    company = session.get(Company, project.company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return _review_payload(review, project, company)


@router.put("/reviews/{project_id}", response_model=ReviewRead)
def update_review(
    project_id: int,
    payload: ReviewUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(["client"])),
):
    if payload.project_id != project_id:
        raise HTTPException(status_code=422, detail="Project ID does not match the request path")
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    request = _owned_request_for_project(session, project, current_user)
    company = _validate_review_eligibility(session, project, request)
    review = session.exec(select(Review).where(Review.project_id == project.id)).first()
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")

    review.rating = payload.rating
    review.communication_rating = payload.communication_rating
    review.work_quality_rating = payload.work_quality_rating
    review.comment = payload.comment.strip()
    session.add(review)

    verified_reviews = session.exec(
        select(Review).where(Review.company_id == company.id, Review.is_verified.is_(True))
    ).all()
    average = sum((Decimal(str(item.rating)) for item in verified_reviews), Decimal(0)) / len(verified_reviews)
    company.rating = float(average.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    company.reviews_count = len(verified_reviews)
    session.add(company)
    session.commit()
    session.refresh(review)
    return _review_payload(review, project, company)


def _request_for_project(
    session: Session,
    project: Project,
    access_token: Optional[str],
    current_user: Optional[User],
) -> QuoteRequest:
    if current_user is not None:
        if current_user.role != "client":
            raise HTTPException(status_code=403, detail="Only clients can submit reviews")
        return _owned_request_for_project(session, project, current_user)
    if not access_token:
        raise HTTPException(status_code=401, detail="Client authentication or request access token is required")
    request = session.exec(
        select(QuoteRequest).where(QuoteRequest.access_token_hash == _token_hash(access_token))
    ).first()
    if request is None:
        raise HTTPException(status_code=401, detail="Request access token is invalid")
    return request


def _owned_request_for_project(session: Session, project: Project, current_user: User) -> QuoteRequest:
    if project.quote_request_id is None:
        raise HTTPException(status_code=403, detail=UNVERIFIED_REVIEW_MESSAGE)
    request = session.exec(
        select(QuoteRequest).where(
            QuoteRequest.id == project.quote_request_id,
            QuoteRequest.user_id == current_user.id,
        )
    ).first()
    if request is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return request


def _validate_review_eligibility(
    session: Session,
    project: Project,
    request: QuoteRequest,
) -> Company:
    if project.status != "completed" or project.quote_request_id != request.id:
        raise HTTPException(status_code=403, detail=UNVERIFIED_REVIEW_MESSAGE)
    assignment = session.exec(
        select(QuoteRequestCompany).where(
            QuoteRequestCompany.request_id == request.id,
            QuoteRequestCompany.company_id == project.company_id,
        )
    ).first()
    company = session.get(Company, project.company_id)
    if assignment is None or assignment.status != "selected" or company is None or company.verification_status != "verified":
        raise HTTPException(status_code=403, detail=UNVERIFIED_REVIEW_MESSAGE)
    return company


def _masked_name(name: str) -> str:
    parts = name.strip().split()
    if len(parts) < 2:
        return parts[0] if parts else "Customer"
    return f"{parts[0]} {parts[-1][0]}."