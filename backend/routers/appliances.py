from typing import List
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from database import get_session
from models import Appliance, ApplianceRead

router = APIRouter(prefix="/api/appliances", tags=["Appliances"])


@router.get("", response_model=List[ApplianceRead])
def get_appliances(session: Session = Depends(get_session)):
    appliances = session.exec(select(Appliance)).all()
    return appliances