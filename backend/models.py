from typing import Optional
from sqlmodel import SQLModel, Field, Relationship

from datetime import datetime, timezone
from uuid import uuid4


def utcnow() -> datetime:
    """`datetime.utcnow` is deprecated from Python 3.12 and returns a naive
    value. This keeps the timestamps timezone-aware."""
    return datetime.now(timezone.utc)


class CompanyBase(SQLModel):
    name: str
    logo_url: Optional[str] = None
    founded_year: int
    projects_count: int = 0
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    verification_status: str = "pending"

class CompanyCreate(SQLModel):
    name: str
    logo_url: Optional[str] = None
    founded_year: int
    projects_count: int = 0
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None


class CompanyRead(CompanyBase):
    """What the API actually returns for a company.

    `CompanyBase` has no `id` — it is declared on `Company` — so using the base
    as a response_model silently stripped the primary key from every response,
    leaving the frontend with a list of companies it could not link to or
    request a quote from. The rating fields are computed from the company's
    reviews so a card can be drawn in one request instead of one per company.
    """

    id: int
    rating: float = 0.0
    reviews_count: int = 0


class Company(CompanyBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    documents: list["CompanyDocument"] = Relationship(back_populates="company")
    warranties: list["Warranty"] = Relationship(back_populates="company")
    projects: list["Project"] = Relationship(back_populates="company")
    reviews: list["Review"] = Relationship(back_populates="company")
    products: list["Product"] = Relationship(back_populates="company")
    quote_requests: list["QuoteRequest"] = Relationship(back_populates="company")


class CompanyDocumentBase(SQLModel):
    company_id: int = Field(foreign_key="company.id")
    document_type: str
    file_url: str
    review_status: str = "pending"
    uploaded_at: datetime = Field(default_factory=utcnow)


class CompanyDocument(CompanyDocumentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company: "Company" = Relationship(back_populates="documents")

class CompanyDocumentRead(CompanyDocumentBase):
    id: int

class CompanyDocumentCreate(SQLModel):
    document_type: str

class WarrantyBase(SQLModel):
    company_id: int = Field(foreign_key="company.id")
    category: str
    duration_years: int
    description: Optional[str] = None


class Warranty(WarrantyBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company: "Company" = Relationship(back_populates="warranties") 


class WarrantyRead(WarrantyBase):
    id: int


class WarrantyCreate(SQLModel):
    company_id: int
    category: str
    duration_years: int
    description: Optional[str] = None

class ProjectBase(SQLModel):
    company_id: int = Field(foreign_key="company.id")
    title: str
    description: str
    image_url: str
    created_at: datetime = Field(default_factory=utcnow)


class Project(ProjectBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company: "Company" = Relationship(back_populates="projects")


class ProjectRead(ProjectBase):
    id: int

class ProjectCreate(SQLModel):
    company_id: int
    title: str
    description: str
    image_url: str


class ReviewBase(SQLModel):
    company_id: int = Field(foreign_key="company.id")
    reviewer_name: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)


class Review(ReviewBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company: "Company" = Relationship(back_populates="reviews")


class ReviewRead(ReviewBase):
    id: int


class ReviewCreate(SQLModel):
    company_id: int
    reviewer_name: str
    rating: int
    comment: Optional[str] = None 

class ProductBase(SQLModel):
    company_id: int = Field(foreign_key="company.id")
    category: str
    brand: str
    model: str
    power_or_capacity: str
    price: float
    warranty_years: int


class Product(ProductBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company: "Company" = Relationship(back_populates="products")


class ProductRead(ProductBase):
    id: int


class ProductCreate(SQLModel):
    company_id: int
    category: str
    brand: str
    model: str
    power_or_capacity: str
    price: float
    warranty_years: int

class ApplianceBase(SQLModel):
    name: str
    default_power_watts: int
    category: str


class Appliance(ApplianceBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assessment_links: list["AssessmentAppliance"] = Relationship(back_populates="appliance")


class ApplianceRead(ApplianceBase):
    id: int

class AssessmentBase(SQLModel):
    location: str
    property_type: str
    national_electricity_hours: int
    night_hours: int
    budget: float
    daily_consumption: float
    night_consumption: float
    peak_load: float
    inverter_size: float
    panel_count: int
    battery_capacity: float
    estimated_min_price: float
    estimated_max_price: float
    created_at: datetime = Field(default_factory=utcnow)


class Assessment(AssessmentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    appliances: list["AssessmentAppliance"] = Relationship(back_populates="assessment")
    acs: list["AssessmentAC"] = Relationship(back_populates="assessment")
    quote_requests: list["QuoteRequest"] = Relationship(back_populates="assessment")


class AssessmentRead(AssessmentBase):
    id: int

class AssessmentApplianceBase(SQLModel):
    assessment_id: int = Field(foreign_key="assessment.id")
    appliance_id: int = Field(foreign_key="appliance.id")
    quantity: int
    hours_at_night: float


class AssessmentAppliance(AssessmentApplianceBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assessment: "Assessment" = Relationship(back_populates="appliances")
    appliance: "Appliance" = Relationship(back_populates="assessment_links")
    


class AssessmentApplianceRead(AssessmentApplianceBase):
    id: int

class AssessmentACBase(SQLModel):
    assessment_id: int = Field(foreign_key="assessment.id")
    capacity_ton: float
    ac_type: str
    quantity: int
    hours_at_night: float


class AssessmentAC(AssessmentACBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assessment: "Assessment" = Relationship(back_populates="acs")


class AssessmentACRead(AssessmentACBase):
    id: int

class ApplianceInput(SQLModel):
    appliance_id: int
    quantity: int
    hours_at_night: float


class ACInput(SQLModel):
    capacity_ton: float
    ac_type: str
    quantity: int
    hours_at_night: float


class AssessmentCalculateRequest(SQLModel):
    location: str
    property_type: str
    national_electricity_hours: int
    night_hours: int
    budget: float
    appliances: list[ApplianceInput]
    acs: list[ACInput]


class AssessmentCalculateResponse(AssessmentRead):
    ac_warning: Optional[str] = None    

QUOTE_STATUSES = ("sent", "viewed", "quoted", "declined")


class QuoteRequestBase(SQLModel):
    """One company's copy of a request.

    A customer fills the form once and picks up to four companies, so the rows
    that came out of a single submission share a `group_id`. Without it the
    tracking screen would show the same request four times instead of one
    request with four replies.

    `assessment_id` is optional on purpose: the sizing shown in the form can be
    typed by hand, so a request must be able to exist without a stored
    calculator run. The three numbers below are copied onto the row, which also
    keeps them as they were quoted on even if the assessment is edited later.
    """

    group_id: str = Field(index=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    assessment_id: Optional[int] = Field(default=None, foreign_key="assessment.id")

    customer_name: str
    customer_phone: str = Field(index=True)

    system_kwp: float
    battery_kwh: float
    panel_count: int

    # The rest of the form — governorate, roof, budget, timeline, notes — as
    # JSON. A prototype changes these fields weekly; one column absorbs that
    # churn without a migration each time. Promote a field to its own column
    # once you need to filter or sort on it.
    details: str = "{}"

    status: str = "sent"
    created_at: datetime = Field(default_factory=utcnow)


class QuoteRequest(QuoteRequestBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assessment: Optional["Assessment"] = Relationship(back_populates="quote_requests")
    company: "Company" = Relationship(back_populates="quote_requests")


class QuoteRequestRead(QuoteRequestBase):
    id: int
    company_name: Optional[str] = None


class QuoteRequestCreate(SQLModel):
    """One submission, aimed at several companies."""

    company_ids: list[int]
    customer_name: str
    customer_phone: str
    system_kwp: float
    battery_kwh: float
    panel_count: int
    assessment_id: Optional[int] = None
    details: dict = {}


class QuoteRequestGroupRead(SQLModel):
    """A submission as the customer sees it on the tracking screen."""

    group_id: str
    created_at: datetime
    customer_name: str
    customer_phone: str
    system_kwp: float
    battery_kwh: float
    panel_count: int
    details: dict
    companies: list[QuoteRequestRead]


def new_group_id() -> str:
    return uuid4().hex[:12]








