import os
from datetime import datetime, timezone

from sqlmodel import Session, select

from database import engine, create_db_and_tables
from companies import _password_hash as hash_legacy_company_password
from models import Company, CompanyCredential, CompanyVerification, Project, Review, User
from security import hash_password

DEMO_PASSWORD = os.getenv("UTU_DEMO_PASSWORD", "DemoOnly2026!")


DEMO_COMPANIES = [
    {
        "name": "Rafidain Solar Systems",
        "logo_url": None,
        "founded_year": 2015,
        "projects_count": 120,
        "phone": "07700000001",
        "email": "info@rafidain-solar.example",
        "address": "Baghdad, Iraq (Demo)",
        "verification_status": "verified",
    },
    {
        "name": "Tigris Energy Works",
        "logo_url": None,
        "founded_year": 2019,
        "projects_count": 78,
        "phone": "07700000002",
        "email": "contact@tigris-energy.example",
        "address": "Baghdad, Iraq (Demo)",
        "verification_status": "verified",
    },
    {
        "name": "Al-Nahrain Renewables",
        "logo_url": None,
        "founded_year": 2021,
        "projects_count": 35,
        "phone": "07700000003",
        "email": "hello@alnahrain-renewables.example",
        "address": "Basra, Iraq (Demo)",
        "verification_status": "pending",
    },
]

DEMO_PROJECTS = [
    {
        "title": "Residential Solar System",
        "description": "An 8.4 kWp rooftop system sized for a Baghdad home, with grid-tied solar generation and monitoring.",
        "company": "Rafidain Solar Systems",
        "client_name": "Ahmed M.",
        "governorate": "Baghdad",
        "district": "Al-Jadriya",
        "system_kwp": 8.4,
        "battery_kwh": 0,
        "installation_type": "On-grid rooftop",
        "rating": 4.9,
        "image_url": "/projects/residential-baghdad.jpg",
        "completed_at": datetime(2024, 8, 18, tzinfo=timezone.utc),
        "panel_count": 14,
        "roof_type": "Concrete flat roof",
        "inverter_details": "8 kW three-phase grid-tied inverter",
        "annual_generation_kwh": 15120,
        "testimonial": "The installation was tidy and the system has been reliable through the summer.",
    },
    {
        "title": "Commercial Solar Installation",
        "description": "A 64 kWp flat-roof array serving an industrial facility in Erbil, designed to offset daytime demand.",
        "company": "Tigris Energy Works",
        "client_name": "Erbil Business Park",
        "governorate": "Erbil",
        "district": "Industrial Zone",
        "system_kwp": 64,
        "battery_kwh": None,
        "installation_type": "Flat-roof array",
        "rating": 4.7,
        "image_url": "/projects/commercial-erbil.jpg",
        "completed_at": datetime(2024, 11, 6, tzinfo=timezone.utc),
        "panel_count": 100,
        "roof_type": "Commercial flat roof",
        "inverter_details": "2 x 30 kW three-phase string inverters",
        "annual_generation_kwh": 108800,
        "testimonial": "The project was delivered on schedule with a clear handover and monitoring setup.",
    },
    {
        "title": "Hybrid Solar System",
        "description": "A 12.6 kWp hybrid home system with battery storage to support essential loads during grid outages.",
        "company": "Al-Nahrain Renewables",
        "client_name": "Basra Homeowner",
        "governorate": "Basra",
        "district": "Al-Zubair",
        "system_kwp": 12.6,
        "battery_kwh": 20,
        "installation_type": "Hybrid",
        "rating": 4.8,
        "image_url": "/projects/hybrid-basra.jpg",
        "completed_at": datetime(2025, 2, 12, tzinfo=timezone.utc),
        "panel_count": 21,
        "roof_type": "Reinforced concrete roof",
        "inverter_details": "12 kW hybrid inverter with 20 kWh lithium battery",
        "annual_generation_kwh": 22680,
        "testimonial": "The battery backup makes evening outages much easier to manage.",
    },
]

DEMO_REVIEWS = [
    {
        "project_title": "Residential Solar System",
        "client_name": "Ahmed M.",
        "rating": 4.9,
        "communication_rating": 5,
        "work_quality_rating": 5,
        "comment": "The installation was tidy and the system has been reliable through the summer.",
    },
    {
        "project_title": "Commercial Solar Installation",
        "client_name": "Erbil Business Park",
        "rating": 4.7,
        "communication_rating": 5,
        "work_quality_rating": 5,
        "comment": "The project was delivered on schedule with a clear handover and monitoring setup.",
    },
    {
        "project_title": "Hybrid Solar System",
        "client_name": "Basra Homeowner",
        "rating": 4.8,
        "communication_rating": 5,
        "work_quality_rating": 5,
        "comment": "The battery backup makes evening outages much easier to manage.",
    },
]


def seed_companies():
    create_db_and_tables()

    with Session(engine) as session:
        companies_by_name = {
            company.name: company
            for company in session.exec(select(Company)).all()
        }
        for values in DEMO_COMPANIES:
            company = companies_by_name.get(values["name"])
            if company is None:
                company = Company(**values)
                session.add(company)
                session.flush()
                companies_by_name[company.name] = company
            verification = session.get(CompanyVerification, company.id)
            if verification is None:
                verification = CompanyVerification(company_id=company.id)
            company.verification_status = values["verification_status"]
            if values["verification_status"] == "verified":
                verification.business_license_number = f"DEMO-{company.id}-LIC"
                verification.tax_registration_number = f"DEMO-{company.id}-TAX"
                verification.license_checked = True
                verification.tax_record_checked = True
                verification.projects_checked = True
                verification.reviewed_at = datetime.now(timezone.utc)
            session.add(verification)

        session.flush()
        for values in DEMO_PROJECTS:
            company = companies_by_name[values["company"]]
            project_exists = session.exec(
                select(Project).where(
                    Project.company_id == company.id,
                    Project.title == values["title"],
                )
            ).first()
            if project_exists is not None:
                continue
            project_values = {
                key: value
                for key, value in values.items()
                if key not in {"company", "governorate", "district"}
            }
            session.add(Project(
                **project_values,
                company_id=company.id,
                location_governorate=values["governorate"],
                location_district=values["district"],
                status="completed",
                gallery_urls_json=f'["{values["image_url"]}"]',
            ))
        session.flush()
        for values in DEMO_REVIEWS:
            project = session.exec(
                select(Project).where(Project.title == values["project_title"])
            ).first()
            if project is None or session.exec(
                select(Review).where(Review.project_id == project.id)
            ).first() is not None:
                continue
            session.add(Review(
                company_id=project.company_id,
                project_id=project.id,
                client_name=values["client_name"],
                rating=values["rating"],
                communication_rating=values["communication_rating"],
                work_quality_rating=values["work_quality_rating"],
                comment=values["comment"],
                is_verified=True,
                created_at=project.completed_at or datetime.now(timezone.utc),
            ))
        session.commit()
        for company in companies_by_name.values():
            company_reviews = session.exec(
                select(Review).where(Review.company_id == company.id, Review.is_verified.is_(True))
            ).all()
            if company_reviews:
                company.rating = round(sum(review.rating for review in company_reviews) / len(company_reviews), 2)
                company.reviews_count = len(company_reviews)
                session.add(company)
        _seed_auth_users(session, companies_by_name)
        session.commit()
        print(
            f"Seeded {len(DEMO_COMPANIES)} demo companies, {len(DEMO_PROJECTS)} projects, "
            f"and {len(DEMO_REVIEWS)} verified reviews."
        )


def _seed_auth_users(session: Session, companies_by_name: dict[str, Company]) -> None:
    demo_users = [
        {
            "email": "admin@solar.iq",
            "full_name": "Solar Platform Admin",
            "role": "admin",
            "is_verified": True,
            "company": None,
        },
        {
            "email": "tech@solar.iq",
            "full_name": "Tigris Energy Works",
            "role": "company",
            "is_verified": companies_by_name["Tigris Energy Works"].verification_status == "verified",
            "company": companies_by_name["Tigris Energy Works"],
        },
        {
            "email": "client@solar.iq",
            "full_name": "Demo Client",
            "role": "client",
            "is_verified": False,
            "company": None,
        },
    ]
    for values in demo_users:
        user = session.exec(select(User).where(User.email == values["email"])).first()
        company = values["company"]
        if user is None:
            user = User(
                email=values["email"],
                hashed_password=hash_password(DEMO_PASSWORD),
                full_name=values["full_name"],
                role=values["role"],
                is_active=True,
                is_verified=values["is_verified"],
                company_id=company.id if company else None,
            )
            session.add(user)
            session.flush()
        else:
            user.hashed_password = hash_password(DEMO_PASSWORD)
            user.full_name = values["full_name"]
            user.role = values["role"]
            user.is_active = True
            user.is_verified = values["is_verified"]
            user.company_id = company.id if company else None
            session.add(user)
        if company is not None and user.company_id is None:
            user.company_id = company.id
            user.role = "company"
            user.is_verified = company.verification_status == "verified"
            session.add(user)

        if company is not None:
            credential = session.exec(
                select(CompanyCredential).where(CompanyCredential.company_id == company.id)
            ).first()
            if credential is None:
                credential = CompanyCredential(
                    company_id=company.id,
                    email=values["email"],
                    password_hash=hash_legacy_company_password(DEMO_PASSWORD),
                )
            else:
                credential.email = values["email"]
                credential.password_hash = hash_legacy_company_password(DEMO_PASSWORD)
            session.add(credential)

    claimed_company_ids = {
        user.company_id
        for user in session.exec(select(User).where(User.company_id.is_not(None))).all()
        if user.company_id is not None
    }
    for company in companies_by_name.values():
        if company.id in claimed_company_ids:
            continue
        email = (company.email or f"company-{company.id}@solar.iq").strip().lower()
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing is None:
            session.add(User(
                email=email,
                hashed_password=hash_password(DEMO_PASSWORD),
                full_name=company.name,
                role="company",
                is_active=True,
                is_verified=company.verification_status == "verified",
                company_id=company.id,
            ))
            session.flush()
        elif existing.company_id is None:
            existing.company_id = company.id
            existing.role = "company"
            existing.is_verified = company.verification_status == "verified"
            session.add(existing)
        credential = session.exec(
            select(CompanyCredential).where(CompanyCredential.company_id == company.id)
        ).first()
        if credential is None:
            session.add(CompanyCredential(
                company_id=company.id,
                email=email,
                password_hash=hash_legacy_company_password(DEMO_PASSWORD),
            ))


if __name__ == "__main__":
    seed_companies()