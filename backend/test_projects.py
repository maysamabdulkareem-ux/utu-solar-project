import seed as seed_module
import pytest
from sqlalchemy.exc import IntegrityError
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from database import get_session
from models import Company, Project, Review
from projects import router


@pytest.fixture
def project_api():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    session = Session(engine)
    company = Company(
        name="Rafidain Solar Systems",
        logo_url="/projects/rafidain-logo.png",
        founded_year=2015,
        projects_count=120,
        phone="07700000000",
        verification_status="verified",
    )
    session.add(company)
    session.commit()
    session.refresh(company)
    project = Project(
        title="Residential Solar System",
        description="A rooftop solar installation in Baghdad.",
        company_id=company.id,
        location_governorate="Baghdad",
        location_district="Al-Jadriya",
        system_kwp=8.4,
        battery_kwh=0,
        installation_type="On-grid rooftop",
        image_url="/projects/residential-baghdad.jpg",
        gallery_urls_json='["/projects/residential-baghdad.jpg"]',
        status="in_progress",
    )
    session.add(project)
    session.commit()
    session.refresh(project)

    app = FastAPI()
    app.include_router(router)

    def override_session():
        yield session

    app.dependency_overrides[get_session] = override_session
    client = TestClient(app)
    yield client, session, company, project
    client.close()
    session.close()
    engine.dispose()


def test_list_and_detail_include_company_and_gallery(project_api):
    client, _, _, project = project_api
    response = client.get("/api/projects?status=in_progress")
    assert response.status_code == 200
    item = response.json()[0]
    assert item["title"] == "Residential Solar System"
    assert item["company"]["name"] == "Rafidain Solar Systems"
    assert item["gallery_urls"] == ["/projects/residential-baghdad.jpg"]

    detail = client.get(f"/api/projects/{project.id}")
    assert detail.status_code == 200
    assert detail.json()["location_district"] == "Al-Jadriya"
    assert detail.json()["company"]["verification_status"] == "verified"


def test_completed_projects_feed_returns_older_projects_after_new_ones(project_api):
    client, session, company, _ = project_api
    projects = []
    for index in range(5):
        project = Project(
            title=f"Completed installation {index}",
            company_id=company.id,
            location_governorate="Baghdad",
            location_district=f"District {index}",
            system_kwp=5 + index,
            installation_type="Hybrid",
            image_url="",
            status="completed",
        )
        session.add(project)
        projects.append(project)
    session.commit()

    response = client.get("/api/projects?status=completed")

    assert response.status_code == 200
    returned_ids = [item["id"] for item in response.json()]
    assert len(returned_ids) == 5
    assert set(returned_ids) == {project.id for project in projects}


def test_admin_can_complete_project_and_completed_feed_includes_it(project_api, monkeypatch):
    client, _, _, project = project_api
    monkeypatch.setenv("UTU_ADMIN_TOKEN", "test-admin-token")
    updated = client.patch(
        f"/api/projects/{project.id}/status",
        headers={"X-Admin-Token": "test-admin-token"},
        json={"status": "completed"},
    )
    assert updated.status_code == 200
    assert updated.json()["completed_at"] is not None
    feed = client.get("/api/projects?status=completed")
    assert feed.status_code == 200
    assert [item["id"] for item in feed.json()] == [project.id]


def test_project_status_update_requires_admin_token(project_api, monkeypatch):
    client, _, _, project = project_api
    monkeypatch.setenv("UTU_ADMIN_TOKEN", "test-admin-token")
    response = client.patch(
        f"/api/projects/{project.id}/status",
        json={"status": "completed"},
    )
    assert response.status_code == 401


def test_admin_can_create_completed_project_with_gallery(project_api, monkeypatch):
    client, _, company, _ = project_api
    monkeypatch.setenv("UTU_ADMIN_TOKEN", "test-admin-token")
    payload = {
        "title": "New completed installation",
        "company_id": company.id,
        "location_governorate": "Baghdad",
        "location_district": "Al-Mansour",
        "system_kwp": 10,
        "installation_type": "Hybrid",
        "image_url": "/projects/new-installation.jpg",
        "gallery_urls": ["/projects/new-installation-detail.jpg"],
    }
    response = client.post(
        "/api/projects",
        headers={"X-Admin-Token": "test-admin-token"},
        json=payload,
    )
    assert response.status_code == 201
    assert response.json()["gallery_urls"] == payload["gallery_urls"]
    assert response.json()["completed_at"] is not None


def test_project_status_patch_preflight_allows_web_origin():
    from fastapi.testclient import TestClient
    from main import app

    response = TestClient(app).options(
        "/api/projects/1/status",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "PATCH",
            "Access-Control-Request-Headers": "x-admin-token,content-type",
        },
    )
    assert response.status_code == 200
    assert "PATCH" in response.headers["access-control-allow-methods"]


def test_sqlite_enforces_project_company_foreign_key(project_api):
    _, session, _, _ = project_api
    session.add(Project(
        title="Orphan project",
        company_id=9999,
        location_governorate="Baghdad",
        location_district="Invalid",
        system_kwp=1,
        installation_type="Hybrid",
        image_url="/projects/orphan.jpg",
    ))

    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_unhandled_api_errors_return_structured_json():
    from main import unhandled_exception_handler

    app = FastAPI()
    app.add_exception_handler(Exception, unhandled_exception_handler)

    @app.get("/unexpected")
    def unexpected():
        raise RuntimeError("internal details must not be exposed")

    response = TestClient(app, raise_server_exceptions=False).get("/unexpected")

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}


def test_seed_adds_named_companies_and_completed_projects_idempotently(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    def create_test_tables():
        SQLModel.metadata.create_all(engine)

    monkeypatch.setattr(seed_module, "DEMO_PASSWORD", "test-demo-password")
    monkeypatch.setattr(seed_module, "engine", engine)
    monkeypatch.setattr(seed_module, "create_db_and_tables", create_test_tables)
    seed_module.seed_companies()
    seed_module.seed_companies()

    with Session(engine) as session:
        companies = session.exec(select(Company)).all()
        projects = session.exec(select(Project)).all()
        reviews = session.exec(select(Review)).all()
    engine.dispose()

    assert len(companies) == 3
    assert len(projects) == 3
    assert len(reviews) == 3
    assert all(project.status == "completed" for project in projects)
    assert all(review.is_verified for review in reviews)
    assert {company.name for company in companies} == {
        "Rafidain Solar Systems",
        "Tigris Energy Works",
        "Al-Nahrain Renewables",
    }