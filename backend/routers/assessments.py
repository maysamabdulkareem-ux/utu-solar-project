from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import (
    Assessment, AssessmentRead,
    AssessmentAppliance, AssessmentAC, Appliance,
    AssessmentCalculateRequest, AssessmentCalculateResponse,
)
from calculation import calculate_assessment

router = APIRouter(prefix="/api/assessments", tags=["Assessments"])


@router.post("/calculate", response_model=AssessmentCalculateResponse, status_code=201)
def calculate_assessment_endpoint(
    data: AssessmentCalculateRequest,
    session: Session = Depends(get_session),
):
    # A load of nothing has no system to size. Saying so is better than
    # returning a row of zeroes the customer would then be quoted on.
    if not data.appliances and not data.acs:
        raise HTTPException(
            status_code=400,
            detail="Pick at least one appliance or air conditioner.",
        )

    appliance_ids = [item.appliance_id for item in data.appliances]
    appliance_power_lookup = {}
    appliance_category_lookup = {}

    if appliance_ids:
        appliances = session.exec(
            select(Appliance).where(Appliance.id.in_(appliance_ids))
        ).all()
        found_ids = {a.id for a in appliances}
        missing_ids = set(appliance_ids) - found_ids
        if missing_ids:
            raise HTTPException(
                status_code=404,
                detail=f"Appliance IDs not found: {sorted(missing_ids)}",
            )
        appliance_power_lookup = {a.id: a.default_power_watts for a in appliances}
        appliance_category_lookup = {a.id: a.category for a in appliances}

    # This sits outside the block above on purpose. Nested inside it, a request
    # carrying only air conditioners — the most common load in Iraq — left
    # `results` undefined and crashed with a 500 on the next line.
    try:
        results = calculate_assessment(
            appliances_input=[item.model_dump() for item in data.appliances],
            acs_input=[ac.model_dump() for ac in data.acs],
            national_electricity_hours=data.national_electricity_hours,
            night_hours=data.night_hours,
            appliance_power_lookup=appliance_power_lookup,
            appliance_category_lookup=appliance_category_lookup,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    assessment = Assessment(
        location=data.location,
        property_type=data.property_type,
        national_electricity_hours=data.national_electricity_hours,
        night_hours=data.night_hours,
        budget=data.budget,
        daily_consumption=results["daily_consumption"],
        night_consumption=results["night_consumption"],
        peak_load=results["peak_load"],
        inverter_size=results["inverter_size"],
        panel_count=results["panel_count"],
        battery_capacity=results["battery_capacity"],
        estimated_min_price=results["estimated_min_price"],
        estimated_max_price=results["estimated_max_price"],
    )
    session.add(assessment)
    session.commit()
    session.refresh(assessment)

    for item in data.appliances:
        session.add(AssessmentAppliance(
            assessment_id=assessment.id,
            appliance_id=item.appliance_id,
            quantity=item.quantity,
            hours_at_night=item.hours_at_night,
        ))

    for ac in data.acs:
        session.add(AssessmentAC(
            assessment_id=assessment.id,
            capacity_ton=ac.capacity_ton,
            ac_type=ac.ac_type,
            quantity=ac.quantity,
            hours_at_night=ac.hours_at_night,
        ))

    session.commit()
    session.refresh(assessment)

    return AssessmentCalculateResponse(
        **assessment.model_dump(),
        ac_warning=results["ac_warning"],
    )


@router.get("/{assessment_id}", response_model=AssessmentRead)
def get_assessment(assessment_id: int, session: Session = Depends(get_session)):
    assessment = session.get(Assessment, assessment_id)
    if assessment is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment