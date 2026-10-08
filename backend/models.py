from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field


class UserRole(str, Enum):
    client = "client"
    company = "company"
    admin = "admin"


class CompanyBase(SQLModel):
    name: str
    logo_url: Optional[str] = None
    founded_year: int
    projects_count: int = 0
    phone: str
    support_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    verification_status: str = "pending"


class Company(CompanyBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    rating: float = 0
    reviews_count: int = 0


class CompanyVerification(SQLModel, table=True):
    company_id: int = Field(foreign_key="company.id", primary_key=True)
    business_license_number: str = ""
    tax_registration_number: str = ""
    license_checked: bool = False
    tax_record_checked: bool = False
    projects_checked: bool = False
    reviewed_at: Optional[datetime] = None


class VerificationDocument(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    document_type: str = Field(index=True)
    file_name: str
    content_type: str
    data_base64: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PolicyReport(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    reporter_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    subject: str
    description: str
    status: str = Field(default="pending", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    request_company_id: int = Field(foreign_key="quoterequestcompany.id", index=True)
    sender_user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    sender_role: str
    sender_name: str
    content: str
    violation_type: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)


class CompanyProject(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    title: str
    description: str = ""
    system_kwp: Optional[float] = None
    location: str = ""
    completed_at: Optional[datetime] = None


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str = ""
    company_id: int = Field(foreign_key="company.id", index=True)
    client_name: Optional[str] = None
    location_governorate: str
    location_district: str
    system_kwp: float
    battery_kwh: Optional[float] = None
    installation_type: str
    rating: float = 4.9
    image_url: str
    gallery_urls_json: str = "[]"
    status: str = Field(default="in_progress", index=True)
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    panel_count: Optional[int] = None
    roof_type: Optional[str] = None
    inverter_details: Optional[str] = None
    annual_generation_kwh: Optional[float] = None
    testimonial: Optional[str] = None
    quote_request_id: Optional[int] = Field(default=None, foreign_key="quoterequest.id", index=True)


class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    project_id: int = Field(foreign_key="project.id", unique=True, index=True)
    client_name: str
    rating: float
    communication_rating: float
    work_quality_rating: float
    comment: str
    is_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class QuoteRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: str = Field(index=True, unique=True)
    customer_name: str
    customer_phone: str = Field(index=True)
    system_kwp: float
    battery_kwh: float
    panel_count: int
    details_json: str = "{}"
    is_green_initiative: bool = False
    green_initiative_budget_iqd: Optional[int] = None
    access_token_hash: str = Field(index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class QuoteRequestCompany(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    request_id: int = Field(foreign_key="quoterequest.id", index=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    status: str = "sent"
    green_verification_id: Optional[str] = Field(default=None, unique=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CompanyQuote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    request_company_id: int = Field(foreign_key="quoterequestcompany.id", index=True, unique=True)
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
    financing: bool = False
    green_initiative_supported: bool = False
    valid_days: int = 14
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DepositPayment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(foreign_key="quoterequestcompany.id", unique=True, index=True)
    transaction_id: str = Field(unique=True, index=True)
    payment_method: str
    phone_number: str
    total_iqd: int
    deposit_iqd: int
    remaining_iqd: int
    commission_iqd: int
    payment_status: str = Field(default="paid", index=True)
    commission_status: str = Field(default="collected", index=True)
    project_status: str = Field(default="in_progress", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    refunded_at: Optional[datetime] = None


class CompanyCredential(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", unique=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str


class CompanyLoginSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    token_hash: str = Field(unique=True, index=True)
    expires_at: datetime


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    phone: Optional[str] = Field(default=None, unique=True, index=True)
    hashed_password: str
    full_name: str
    role: str = Field(default=UserRole.client.value, index=True)
    is_active: bool = True
    is_verified: bool = False
    token_version: int = 0
    company_id: Optional[int] = Field(default=None, foreign_key="company.id", unique=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CompanyPasswordResetToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    token_hash: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    used_at: Optional[datetime] = None