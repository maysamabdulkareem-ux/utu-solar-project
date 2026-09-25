from typing import Optional

from sqlmodel import SQLModel, Field


class CompanyBase(SQLModel):
    name: str
    logo_url: Optional[str] = None
    founded_year: int
    projects_count: int = 0
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    verification_status: str = "pending"


class Company(CompanyBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)