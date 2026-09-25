from sqlmodel import Session, select

from database import engine, create_db_and_tables
from models import Company


def seed_companies():
    create_db_and_tables()

    with Session(engine) as session:
        existing = session.exec(select(Company)).first()
        if existing:
            print("Companies already exist. Skipping.")
            return

        companies = [
            Company(
                name="Demo Solar Company A",
                logo_url="https://example.com/logos/demo-a.png",
                founded_year=2015,
                projects_count=120,
                phone="+964 000 000 0001",
                email="info@demo-a.example",
                address="Baghdad, Iraq (Demo)",
                verification_status="verified",
            ),
            Company(
                name="Demo Solar Company B",
                logo_url="https://example.com/logos/demo-b.png",
                founded_year=2019,
                projects_count=45,
                phone="+964 000 000 0002",
                email="contact@demo-b.example",
                address="Erbil, Iraq (Demo)",
                verification_status="pending",
            ),
            Company(
                name="Demo Solar Company C",
                logo_url="https://example.com/logos/demo-c.png",
                founded_year=2021,
                projects_count=12,
                phone="+964 000 000 0003",
                email="hello@demo-c.example",
                address="Basra, Iraq (Demo)",
                verification_status="verified",
            ),
        ]

        session.add_all(companies)
        session.commit()
        print(f"Added {len(companies)} demo companies.")


if __name__ == "__main__":
    seed_companies()