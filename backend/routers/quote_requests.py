import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from database import get_session
from models import (
    Assessment,
    Company,
    QuoteRequest,
    QuoteRequestCreate,
    QuoteRequestGroupRead,
    QuoteRequestRead,
    QUOTE_STATUSES,
    new_group_id,
)

router = APIRouter(prefix="/api/quote-requests", tags=["QuoteRequests"])

MAX_COMPANIES_PER_REQUEST = 4


def _read(row: QuoteRequest, company_name: Optional[str] = None) -> QuoteRequestRead:
    return QuoteRequestRead(**row.model_dump(), company_name=company_name)


@router.post("", response_model=QuoteRequestGroupRead, status_code=201)
def create_quote_request(
    data: QuoteRequestCreate, session: Session = Depends(get_session)
):
    """One submission, fanned out to the companies the customer picked.

    The rows share a `group_id` so the customer sees a single request with
    several replies rather than the same request repeated per company.
    """
    if not data.company_ids:
        raise HTTPException(status_code=400, detail="Pick at least one company.")

    company_ids = list(dict.fromkeys(data.company_ids))  # keep order, drop repeats
    if len(company_ids) > MAX_COMPANIES_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"At most {MAX_COMPANIES_PER_REQUEST} companies per request.",
        )

    companies = session.exec(
        select(Company).where(Company.id.in_(company_ids))
    ).all()
    found = {c.id: c for c in companies}
    missing = [cid for cid in company_ids if cid not in found]
    if missing:
        raise HTTPException(
            status_code=404, detail=f"Company IDs not found: {missing}"
        )

    if data.assessment_id is not None:
        if session.get(Assessment, data.assessment_id) is None:
            raise HTTPException(status_code=404, detail="Assessment not found")

    group_id = new_group_id()
    rows = [
        QuoteRequest(
            group_id=group_id,
            company_id=cid,
            assessment_id=data.assessment_id,
            customer_name=data.customer_name,
            customer_phone=data.customer_phone,
            system_kwp=data.system_kwp,
            battery_kwh=data.battery_kwh,
            panel_count=data.panel_count,
            details=json.dumps(data.details, ensure_ascii=False),
        )
        for cid in company_ids
    ]

    session.add_all(rows)
    session.commit()
    for row in rows:
        session.refresh(row)

    first = rows[0]
    return QuoteRequestGroupRead(
        group_id=group_id,
        created_at=first.created_at,
        customer_name=first.customer_name,
        customer_phone=first.customer_phone,
        system_kwp=first.system_kwp,
        battery_kwh=first.battery_kwh,
        panel_count=first.panel_count,
        details=data.details,
        companies=[_read(r, found[r.company_id].name) for r in rows],
    )


@router.get("", response_model=List[QuoteRequestGroupRead])
def get_quote_requests(
    phone: Optional[str] = Query(default=None),
    company_id: Optional[int] = Query(default=None),
    session: Session = Depends(get_session),
):
    """Requests for one customer, or the ones sent to one company.

    A filter is required. Unfiltered, this endpoint returned every customer's
    name and phone number to anyone who knew the URL.
    """
    if phone is None and company_id is None:
        raise HTTPException(
            status_code=400,
            detail="Pass either ?phone= or ?company_id=.",
        )

    query = select(QuoteRequest)
    if phone is not None:
        query = query.where(QuoteRequest.customer_phone == phone)
    if company_id is not None:
        query = query.where(QuoteRequest.company_id == company_id)

    rows = session.exec(query).all()
    if not rows:
        return []

    names = {
        c.id: c.name
        for c in session.exec(
            select(Company).where(Company.id.in_({r.company_id for r in rows}))
        ).all()
    }

    groups: dict[str, list[QuoteRequest]] = {}
    for row in rows:
        groups.setdefault(row.group_id, []).append(row)

    out: list[QuoteRequestGroupRead] = []
    for members in groups.values():
        first = members[0]
        out.append(
            QuoteRequestGroupRead(
                group_id=first.group_id,
                created_at=first.created_at,
                customer_name=first.customer_name,
                customer_phone=first.customer_phone,
                system_kwp=first.system_kwp,
                battery_kwh=first.battery_kwh,
                panel_count=first.panel_count,
                details=json.loads(first.details or "{}"),
                companies=[_read(m, names.get(m.company_id)) for m in members],
            )
        )

    out.sort(key=lambda g: g.created_at, reverse=True)
    return out


@router.patch("/{request_id}/status", response_model=QuoteRequestRead)
def set_status(
    request_id: int,
    status: str = Query(...),
    session: Session = Depends(get_session),
):
    """Move one company's row along. Without this the status a customer sees
    could never change from the value it was created with."""
    if status not in QUOTE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"status must be one of: {', '.join(QUOTE_STATUSES)}",
        )

    row = session.get(QuoteRequest, request_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Quote request not found")

    row.status = status
    session.add(row)
    session.commit()
    session.refresh(row)

    company = session.get(Company, row.company_id)
    return _read(row, company.name if company else None)
