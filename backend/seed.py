from sqlmodel import Session, select

from database import engine, create_db_and_tables
from models import *


def seed_companies():
    create_db_and_tables()

    with Session(engine) as session:
        existing = session.exec(select(Company)).first()
        if existing:
            print("Companies already exist. Skipping.")
            return

        # Names/addresses/status here must stay identical to the sample
        # companies in the frontend (src/data/content.ts: 'rafidain',
        # 'tigris', 'nahrain') — the UI falls back to that sample list
        # whenever this API is unreachable, so if the two ever diverge the
        # cards would visibly swap identities the moment the backend comes
        # online.
        companies = [
            Company(
                name="الرافدين للأنظمة الشمسية",
                logo_url="https://example.com/logos/rafidain.png",
                founded_year=2017,
                projects_count=120,
                phone="+964 770 100 0001",
                email="info@rafidain-solar.example",
                address="بغداد · المنصور",
                verification_status="verified",
            ),
            Company(
                name="دجلة لأعمال الطاقة",
                logo_url="https://example.com/logos/tigris.png",
                founded_year=2020,
                projects_count=78,
                phone="+964 770 100 0002",
                email="contact@tigris-energy.example",
                address="بغداد · الكرادة",
                verification_status="verified",
            ),
            Company(
                name="النهرين للطاقة المتجددة",
                logo_url="https://example.com/logos/nahrain.png",
                founded_year=2023,
                projects_count=35,
                phone="+964 770 100 0003",
                email="hello@nahrain-renewables.example",
                address="البصرة · العشار",
                verification_status="pending",
            ),
        ]

        session.add_all(companies)
        session.commit()
        print(f"Added {len(companies)} demo companies.")

        for company in companies:
            session.refresh(company)

        documents = [
            CompanyDocument(
                company_id=companies[0].id,
                document_type="Company License",
                file_url="/uploads/demo-license-a.pdf",
                review_status="approved",
            ),
            CompanyDocument(
                company_id=companies[0].id,
                document_type="Registration Document",
                file_url="/uploads/demo-registration-a.pdf",
                review_status="pending",
            ),
            CompanyDocument(
                company_id=companies[1].id,
                document_type="Company License",
                file_url="/uploads/demo-license-b.pdf",
                review_status="pending",
            ),
        ]

        session.add_all(documents)
        session.commit()

        print(f"Added {len(companies)} demo companies and {len(documents)} demo documents.")

        warranties = [
            Warranty(
                company_id=companies[0].id,
                category="ألواح شمسية",
                duration_years=10,
                description="ضمان يغطي كفاءة الألواح ضد التلف والانخفاض في الأداء.",
            ),
            Warranty(
                company_id=companies[0].id,
                category="انفرتر",
                duration_years=5,
                description="ضمان يشمل استبدال الانفرتر عند حدوث عطل فني.",
            ),
            Warranty(
                company_id=companies[1].id,
                category="بطاريات",
                duration_years=3,
                description=None,
            ),
        ]

        session.add_all(warranties)
        session.commit()

        print(f"Added {len(warranties)} demo warranties.")

        projects = [
            Project(
                company_id=companies[0].id,
                title="منظومة منزلية 5 كيلوواط",
                description="تركيب منظومة طاقة شمسية كاملة لمنزل سكني في بغداد.",
                image_url="https://example.com/projects/demo-project-1.jpg",
            ),
            Project(
                company_id=companies[0].id,
                title="منظومة تجارية لمحل تجاري",
                description="تركيب ألواح وانفرتر لمحل تجاري صغير.",
                image_url="https://example.com/projects/demo-project-2.jpg",
            ),
            Project(
                company_id=companies[1].id,
                title="منظومة فيلا في أربيل",
                description="تركيب منظومة طاقة شمسية مع بطاريات تخزين.",
                image_url="https://example.com/projects/demo-project-3.jpg",
            ),
        ]

        session.add_all(projects)
        session.commit()

        print(f"Added {len(projects)} demo projects.")

        reviews = [
            Review(company_id=companies[0].id, reviewer_name="أحمد كريم", rating=5,
                comment="تركيب احترافي والتزام بالمواعيد."),
            Review(company_id=companies[0].id, reviewer_name="سارة علي", rating=4,
                comment="خدمة جيدة بس التسليم تأخر يومين."),
            Review(company_id=companies[1].id, reviewer_name="محمد جاسم", rating=5, comment=None),
        ]
        session.add_all(reviews)
        session.commit()
        print(f"Added {len(reviews)} demo reviews.")

        products = [
            Product(company_id=companies[0].id, category="ألواح شمسية", brand="Jinko",
                    model="JKM-550", power_or_capacity="550W", price=180.0, warranty_years=12),
            Product(company_id=companies[0].id, category="انفرتر", brand="Growatt",
                    model="SPF-5000", power_or_capacity="5kW", price=650.0, warranty_years=5),
            Product(company_id=companies[1].id, category="بطاريات", brand="Pylontech",
                    model="US3000", power_or_capacity="3.5kWh", price=900.0, warranty_years=7),
        ]
        session.add_all(products)
        session.commit()
        print(f"Added {len(products)} demo products.")

        appliances = [
            Appliance(name="ثلاجة", default_power_watts=200, category="تبريد"),
            Appliance(name="فريزر", default_power_watts=250, category="تبريد"),
            Appliance(name="مبردة", default_power_watts=350, category="تبريد"),
            Appliance(name="غسالة", default_power_watts=500, category="غسيل"),
            Appliance(name="تلفزيون", default_power_watts=100, category="ترفيه"),
            Appliance(name="إضاءة", default_power_watts=15, category="إضاءة"),
            Appliance(name="مضخة ماء", default_power_watts=750, category="مياه"),
        ]
        session.add_all(appliances)
        session.commit()
        print(f"Added {len(appliances)} demo appliances.")
        for appliance in appliances:
            session.refresh(appliance)

        assessment = Assessment(
            location="بغداد",
            property_type="منزل",
            national_electricity_hours=10,
            night_hours=8,
            budget=3000.0,
            daily_consumption=4500.0,
            night_consumption=1800.0,
            peak_load=2200.0,
            inverter_size=2750.0,
            panel_count=8,
            battery_capacity=2.25,
            estimated_min_price=2500.0,
            estimated_max_price=3200.0,
        )
        session.add(assessment)
        session.commit()
        session.refresh(assessment)
        print("Added 1 demo assessment.")

        assessment_appliances = [
            AssessmentAppliance(assessment_id=assessment.id, appliance_id=appliances[0].id,
                    quantity=1, hours_at_night=8),
            AssessmentAppliance(assessment_id=assessment.id, appliance_id=appliances[4].id,
                    quantity=6, hours_at_night=5),
        ]
        session.add_all(assessment_appliances)
        session.commit()
        print(f"Added {len(assessment_appliances)} demo assessment appliances.")

        assessment_acs = [
            AssessmentAC(assessment_id=assessment.id, capacity_ton=1.5, ac_type="عادي",
                    quantity=1, hours_at_night=6),
        ]
        session.add_all(assessment_acs)
        session.commit()
        print(f"Added {len(assessment_acs)} demo assessment ACs.")

        # One submission aimed at two companies, so the tracking screen has a
        # real group to draw rather than two look-alike requests.
        demo_group = new_group_id()
        quote_requests = [
            QuoteRequest(
                group_id=demo_group,
                company_id=companies[0].id,
                assessment_id=assessment.id,
                customer_name="زياد محمود",
                customer_phone="07700000000",
                system_kwp=8.4,
                battery_kwh=10.2,
                panel_count=12,
                details='{"governorate": "baghdad", "district": "الجادرية", "timeline": "month"}',
                status="quoted",
            ),
            QuoteRequest(
                group_id=demo_group,
                company_id=companies[2].id,
                assessment_id=assessment.id,
                customer_name="زياد محمود",
                customer_phone="07700000000",
                system_kwp=8.4,
                battery_kwh=10.2,
                panel_count=12,
                details='{"governorate": "baghdad", "district": "الجادرية", "timeline": "month"}',
                status="viewed",
            ),
        ]
        session.add_all(quote_requests)
        session.commit()
        print(f"Added {len(quote_requests)} demo quote requests.")


if __name__ == "__main__":
    seed_companies()