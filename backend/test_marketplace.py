import os
import unittest
import base64
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from companies import (
    CompanyLogin,
    CompanyPublic,
    CompanyRegistration,
    CompanyVerificationReview,
    PolicyReportCreate,
    PolicyReportStatusUpdate,
    VerificationDocumentUpload,
    admin_policy_reports,
    admin_revenue,
    create_policy_report,
    get_verification_document,
    list_pending_companies,
    get_companies,
    get_company,
    get_company_projects,
    login_company,
    logout_company,
    PasswordResetConfirm,
    PasswordResetRequest,
    confirm_password_reset,
    register_company,
    request_password_reset,
    review_company,
    refund_deposit,
    update_policy_report_status,
    upload_verification_document,
)
from auth import router as auth_router
from company_portal import (
    VerificationApplicationUpdate,
    company_requests,
    router as company_portal_router,
    update_verification_application,
)
from database import (
    get_session,
    migrate_company_support_phone_column,
    migrate_company_verification,
    migrate_green_initiative_columns,
)
from models import (
    ChatMessage,
    Company,
    CompanyLoginSession,
    CompanyPasswordResetToken,
    CompanyProject,
    CompanyQuote,
    CompanyVerification,
    DepositPayment,
    PolicyReport,
    Project,
    QuoteRequest,
    QuoteRequestCompany,
    User,
    VerificationDocument,
)
from quote_requests import (
    ChatMessageCreate,
    CompletedInstallation,
    QuoteCreate,
    QuoteRequestCreate,
    create_quote_request,
    complete_company_installation,
    choose_company_quote,
    create_chat_message,
    list_chat_messages,
    list_quote_requests,
    submit_company_quote,
    _authenticated_company_id,
    _token_hash,
    router as quote_requests_router,
)
from companies import router as companies_router


class MarketplaceTests(unittest.TestCase):
    def setUp(self):
        jwt_env = patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "unit-test-jwt-secret-key-which-is-long-enough"},
        )
        jwt_env.start()
        self.addCleanup(jwt_env.stop)
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_green_schema_migration_preserves_existing_rows_and_defaults_new_flags(self):
        legacy_engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        with legacy_engine.begin() as connection:
            connection.exec_driver_sql(
                "CREATE TABLE quoterequest (id INTEGER PRIMARY KEY, group_id VARCHAR NOT NULL)"
            )
            connection.exec_driver_sql(
                "CREATE TABLE companyquote (id INTEGER PRIMARY KEY, total_iqd INTEGER NOT NULL)"
            )
            connection.exec_driver_sql(
                "CREATE TABLE quoterequestcompany (id INTEGER PRIMARY KEY, request_id INTEGER NOT NULL)"
            )
            connection.exec_driver_sql(
                "INSERT INTO quoterequest (id, group_id) VALUES (1, 'legacy-request')"
            )
            connection.exec_driver_sql("INSERT INTO companyquote (id, total_iqd) VALUES (1, 1000)")
            connection.exec_driver_sql(
                "INSERT INTO quoterequestcompany (id, request_id) VALUES (1, 1)"
            )

        with patch("database.engine", legacy_engine):
            migrate_green_initiative_columns()

        with legacy_engine.connect() as connection:
            request = connection.exec_driver_sql(
                "SELECT group_id, is_green_initiative, green_initiative_budget_iqd "
                "FROM quoterequest WHERE id=1"
            ).one()
            quote = connection.exec_driver_sql(
                "SELECT total_iqd, green_initiative_supported FROM companyquote WHERE id=1"
            ).one()
            assignment = connection.exec_driver_sql(
                "SELECT request_id, green_verification_id FROM quoterequestcompany WHERE id=1"
            ).one()
        self.assertEqual(request, ("legacy-request", 0, None))
        self.assertEqual(quote, (1000, 0))
        self.assertEqual(assignment, (1, None))
        legacy_engine.dispose()

    def test_support_phone_migration_preserves_existing_company_rows(self):
        legacy_engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        with legacy_engine.begin() as connection:
            connection.exec_driver_sql(
                "CREATE TABLE company (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL)"
            )
            connection.exec_driver_sql(
                "INSERT INTO company (id, name) VALUES (1, 'Existing Solar')"
            )

        with patch("database.engine", legacy_engine):
            migrate_company_support_phone_column()

        with legacy_engine.connect() as connection:
            company = connection.exec_driver_sql(
                "SELECT id, name, support_phone FROM company WHERE id=1"
            ).one()
        self.assertEqual(company, (1, "Existing Solar", None))
        legacy_engine.dispose()

    def register(self, email="solar@example.com", projects_count=3):
        return register_company(
            CompanyRegistration(
                name="Test Solar",
                founded_year=2015,
                phone="07700000000",
                email=email,
                password="a-long-test-password",
                address="Baghdad",
                business_license_number="LIC-12345",
                tax_registration_number="TAX-12345",
                projects_count=projects_count,
            ),
            self.session,
        )

    def approve(self, company_id):
        with patch.dict(os.environ, {"UTU_ADMIN_TOKEN": "test-admin-token"}):
            review_company(
                company_id,
                CompanyVerificationReview(
                    decision="verified",
                    license_checked=True,
                    tax_record_checked=True,
                    projects_checked=True,
                ),
                "test-admin-token",
                self.session,
            )

    def request_for(self, company_id):
        return create_quote_request(
            QuoteRequestCreate(
                company_ids=[company_id],
                customer_name="Test Customer",
                customer_phone="07711111111",
                system_kwp=8.4,
                battery_kwh=10.2,
                panel_count=12,
                details={"governorate": "baghdad"},
            ),
            self.session,
        )

    def test_company_registration_starts_pending_and_admin_can_verify(self):
        result = self.register()
        self.assertEqual(result["verification_status"], "pending")
        self.approve(result["id"])
        self.assertEqual(self.session.get(Company, result["id"]).verification_status, "verified")

    def test_identity_verified_company_can_submit_quotes_but_pending_company_cannot(self):
        company = self.register()
        request = self.request_for(company["id"])
        company_token = "tier-one-quote-test-token"
        self.session.add(CompanyLoginSession(
            company_id=company["id"],
            token_hash=_token_hash(company_token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        ))
        self.session.commit()
        payload = QuoteCreate(
            total_iqd=10_000_000,
            panel_iqd=4_000_000,
            inverter_iqd=2_000_000,
            battery_iqd=2_000_000,
            installation_iqd=2_000_000,
            capacity_kwp=8.4,
            panel_brand="Panel Co",
            inverter_brand="Inverter Co",
            battery_brand="Battery Co",
            warranty="10 years",
            install_days=5,
        )
        authorization = f"Bearer {company_token}"

        with self.assertRaises(HTTPException) as error:
            submit_company_quote(
                request["group_id"],
                company["id"],
                payload,
                authorization,
                self.session,
            )
        self.assertEqual(error.exception.status_code, 403)

        self.session.add(VerificationDocument(
            company_id=company["id"],
            document_type="national_id",
            file_name="national-id.pdf",
            content_type="application/pdf",
            data_base64=base64.b64encode(b"%PDF-1.4 test").decode("ascii"),
        ))
        self.session.commit()
        with patch.dict(os.environ, {"UTU_ADMIN_TOKEN": "test-admin-token"}):
            review_company(
                company["id"],
                CompanyVerificationReview(
                    decision="identity_verified",
                    identity_document_checked=True,
                ),
                "test-admin-token",
                self.session,
            )

        submitted = submit_company_quote(
            request["group_id"],
            company["id"],
            payload,
            authorization,
            self.session,
        )
        self.assertEqual(submitted["total_iqd"], 10_000_000)
        self.assertEqual(self.session.get(Company, company["id"]).verification_status, "identity_verified")

    def test_jwt_client_registration_login_profile_and_role_guard(self):
        app = FastAPI()
        app.include_router(auth_router)

        def override_session():
            yield self.session

        app.dependency_overrides[get_session] = override_session
        with patch.dict(os.environ, {"JWT_SECRET_KEY": "unit-test-jwt-secret-key-which-is-long-enough"}):
            with TestClient(app) as client:
                registered = client.post("/api/auth/register/client", json={
                    "email": "client@example.com",
                    "password": "a-long-client-password",
                    "full_name": "Test Client",
                })
                self.assertEqual(registered.status_code, 201)
                self.assertEqual(registered.json()["user"]["role"], "client")

                invalid_login = client.post("/api/auth/login", json={
                    "email": "client@example.com",
                    "password": "wrong-password",
                })
                self.assertEqual(invalid_login.status_code, 401)

                login = client.post("/api/auth/login", json={
                    "email": "client@example.com",
                    "password": "a-long-client-password",
                })
                self.assertEqual(login.status_code, 200)
                token = login.json()["access_token"]
                profile = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
                self.assertEqual(profile.status_code, 200)
                self.assertEqual(profile.json()["email"], "client@example.com")
                forbidden = client.get("/api/auth/admin/users", headers={"Authorization": f"Bearer {token}"})
                self.assertEqual(forbidden.status_code, 403)

    def test_authenticated_client_rfq_ownership_verified_company_quote_and_acceptance(self):
        app = FastAPI()
        app.include_router(auth_router)
        app.include_router(quote_requests_router)
        app.include_router(company_portal_router)

        def override_session():
            yield self.session

        app.dependency_overrides[get_session] = override_session
        with patch.dict(os.environ, {"JWT_SECRET_KEY": "unit-test-jwt-secret-key-which-is-long-enough"}):
            with TestClient(app) as client:
                company_response = client.post("/api/auth/register/company", json={
                    "name": "Verified Solar",
                    "email": "verified@example.com",
                    "password": "a-long-company-password",
                    "phone": "07712345678",
                })
                self.assertEqual(company_response.status_code, 201)
                company_body = company_response.json()
                company_id = company_body["user"]["company_id"]
                company_headers = {"Authorization": f"Bearer {company_body['access_token']}"}

                client_response = client.post("/api/auth/register/client", json={
                    "email": "owner@example.com",
                    "password": "a-long-client-password",
                    "full_name": "Request Owner",
                })
                self.assertEqual(client_response.status_code, 201)
                owner_headers = {"Authorization": f"Bearer {client_response.json()['access_token']}"}

                guest_request = client.post("/api/quote-requests", json={
                    "company_ids": [company_id],
                    "customer_name": "Request Owner",
                    "customer_phone": "07711111111",
                    "system_kwp": 5,
                    "battery_kwh": 0,
                    "panel_count": 8,
                })
                self.assertEqual(guest_request.status_code, 201)
                guest_group_id = guest_request.json()["group_id"]
                guest_access_token = guest_request.json()["access_token"]

                unauthenticated_claim = client.post(
                    "/api/quote-requests/claim-guest",
                    json={"access_tokens": [guest_access_token]},
                )
                self.assertEqual(unauthenticated_claim.status_code, 401)
                company_claim = client.post(
                    "/api/quote-requests/claim-guest",
                    headers=company_headers,
                    json={"access_tokens": [guest_access_token]},
                )
                self.assertEqual(company_claim.status_code, 403)
                unclaimed = client.get("/api/quote-requests/mine", headers=owner_headers)
                self.assertEqual(unclaimed.status_code, 200)
                self.assertEqual(unclaimed.json(), [])
                claimed = client.post(
                    "/api/quote-requests/claim-guest",
                    headers=owner_headers,
                    json={"access_tokens": [guest_access_token]},
                )
                self.assertEqual(claimed.status_code, 200)
                self.assertEqual(claimed.json()["claimed"], 1)
                self.assertEqual(
                    client.post(
                        "/api/quote-requests/claim-guest",
                        headers=owner_headers,
                        json={"access_tokens": [guest_access_token]},
                    ).json()["claimed"],
                    0,
                )
                self.assertEqual(
                    [item["group_id"] for item in client.get(
                        "/api/quote-requests/mine", headers=owner_headers
                    ).json()],
                    [guest_group_id],
                )

                forbidden_request = client.post("/api/quote-requests", headers=company_headers, json={
                    "company_ids": [company_id],
                    "customer_name": "Request Owner",
                    "customer_phone": "07711111111",
                    "system_kwp": 8.4,
                    "battery_kwh": 10.2,
                    "panel_count": 12,
                })
                self.assertEqual(forbidden_request.status_code, 403)

                created = client.post("/api/quote-requests", headers=owner_headers, json={
                    "company_ids": [company_id],
                    "customer_name": "Request Owner",
                    "customer_phone": "07711111111",
                    "system_kwp": 8.4,
                    "battery_kwh": 10.2,
                    "panel_count": 12,
                    "is_green_initiative": True,
                    "green_initiative_budget_iqd": 12_000_000,
                    "details": {
                        "governorate": "Baghdad",
                        "district": "Al-Jadriya",
                        "budget": "20m IQD",
                        "notes": "Include installation",
                        "email": "private@example.com",
                    },
                })
                self.assertEqual(created.status_code, 201)
                body = created.json()
                self.assertNotIn("email", body["details"])
                self.assertEqual(body["details"]["notes"], "Include installation")
                self.assertTrue(body["is_green_initiative"])
                self.assertEqual(body["green_initiative_budget_iqd"], 12_000_000)
                group_id = body["group_id"]
                persisted_request = self.session.exec(
                    select(QuoteRequest).where(QuoteRequest.group_id == group_id)
                ).one()
                self.assertTrue(persisted_request.is_green_initiative)
                self.assertEqual(persisted_request.green_initiative_budget_iqd, 12_000_000)

                mine = client.get("/api/quote-requests/mine", headers=owner_headers)
                self.assertEqual(mine.status_code, 200)
                self.assertEqual(
                    {request["group_id"] for request in mine.json()},
                    {guest_group_id, group_id},
                )
                green_requests = client.get(
                    "/api/quote-requests/mine?is_green_initiative=true",
                    headers=owner_headers,
                )
                self.assertEqual(
                    [request["group_id"] for request in green_requests.json()],
                    [group_id],
                )

                quote_body = {
                    "total_iqd": 12_000_000,
                    "panel_iqd": 4_000_000,
                    "inverter_iqd": 3_000_000,
                    "battery_iqd": 2_000_000,
                    "installation_iqd": 3_000_000,
                    "capacity_kwp": 8.4,
                    "panel_brand": "Test Panel",
                    "inverter_brand": "Test Inverter",
                    "battery_brand": "Test Battery",
                    "warranty": "10 years",
                    "install_days": 5,
                    "financing": True,
                    "down_payment_iqd": 3_000_000,
                    "installment_months": 6,
                    "monthly_installment_iqd": 1_600_000,
                    "notes": "Direct installment option",
                    "green_initiative_supported": True,
                }
                pending_quote = client.post(
                    f"/api/quote-requests/{group_id}/quotes/{company_id}",
                    headers=company_headers,
                    json=quote_body,
                )
                self.assertEqual(pending_quote.status_code, 403)

                company = self.session.get(Company, company_id)
                company.verification_status = "verified"
                self.session.add(company)
                self.session.commit()
                unsupported_quote = client.post(
                    f"/api/quote-requests/{guest_group_id}/quotes/{company_id}",
                    headers=company_headers,
                    json=quote_body,
                )
                self.assertEqual(unsupported_quote.status_code, 422)
                mismatch = client.post(
                    f"/api/quote-requests/{group_id}/quotes/{company_id}",
                    headers=company_headers,
                    json={**quote_body, "total_iqd": 12_000_001},
                )
                self.assertEqual(mismatch.status_code, 422)
                submitted = client.post(
                    f"/api/quote-requests/{group_id}/quotes/{company_id}",
                    headers=company_headers,
                    json=quote_body,
                )
                self.assertEqual(submitted.status_code, 200)
                self.assertEqual(submitted.json()["panel_iqd"], 4_000_000)
                self.assertEqual(submitted.json()["down_payment_iqd"], 3_000_000)
                self.assertEqual(submitted.json()["installment_months"], 6)
                self.assertEqual(submitted.json()["monthly_installment_iqd"], 1_600_000)
                self.assertEqual(submitted.json()["notes"], "Direct installment option")
                updated_quote_body = {
                    **quote_body,
                    "down_payment_iqd": 2_000_000,
                    "installment_months": 3,
                    "monthly_installment_iqd": None,
                }
                updated_quote = client.post(
                    f"/api/quote-requests/{group_id}/quotes/{company_id}",
                    headers=company_headers,
                    json=updated_quote_body,
                )
                self.assertEqual(updated_quote.status_code, 200)
                self.assertEqual(updated_quote.json()["down_payment_iqd"], 2_000_000)
                self.assertEqual(updated_quote.json()["installment_months"], 3)
                self.assertEqual(updated_quote.json()["monthly_installment_iqd"], 3_333_333)
                self.assertEqual(updated_quote.json()["notes"], "Direct installment option")
                invalid_schedule = client.post(
                    f"/api/quote-requests/{group_id}/quotes/{company_id}",
                    headers=company_headers,
                    json={**quote_body, "down_payment_iqd": 12_000_000},
                )
                self.assertEqual(invalid_schedule.status_code, 422)
                stored_request = client.get(
                    "/api/quote-requests/mine",
                    headers=owner_headers,
                ).json()
                stored_green_quote = next(
                    request for request in stored_request if request["group_id"] == group_id
                )["companies"][0]["quote"]
                self.assertEqual(stored_green_quote["monthly_installment_iqd"], 3_333_333)
                self.assertNotIn("UTU-DIRECT-FINANCING", stored_green_quote["notes"])
                cash_quote = client.post(
                    f"/api/quote-requests/{guest_group_id}/quotes/{company_id}",
                    headers=company_headers,
                    json={
                        **quote_body,
                        "financing": False,
                        "down_payment_iqd": None,
                        "installment_months": None,
                        "monthly_installment_iqd": None,
                        "green_initiative_supported": False,
                        "notes": "Cash quote",
                    },
                )
                self.assertEqual(cash_quote.status_code, 200)
                self.assertFalse(cash_quote.json()["financing"])
                self.assertIsNone(cash_quote.json()["down_payment_iqd"])
                self.assertIsNone(cash_quote.json()["installment_months"])
                self.assertIsNone(cash_quote.json()["monthly_installment_iqd"])
                self.assertEqual(cash_quote.json()["notes"], "Cash quote")

                edit_after_quote = client.patch(
                    f"/api/quote-requests/{group_id}",
                    headers=owner_headers,
                    json={
                        "customer_phone": "07722223333",
                        "system_kwp": 9.6,
                        "battery_kwh": 12,
                        "panel_count": 14,
                        "details": {
                            "governorate": "basra",
                            "district": "Ashar",
                            "notes": "Please call before visiting",
                        },
                    },
                )
                self.assertEqual(edit_after_quote.status_code, 200)
                self.assertEqual(edit_after_quote.json()["customer_phone"], "07722223333")
                self.assertEqual(edit_after_quote.json()["details"]["notes"], "Please call before visiting")
                invalid_edit = client.patch(
                    f"/api/quote-requests/{group_id}",
                    headers=owner_headers,
                    json={"customer_phone": "123"},
                )
                self.assertEqual(invalid_edit.status_code, 422)

                other_client = client.post("/api/auth/register/client", json={
                    "email": "other@example.com",
                    "password": "a-long-client-password",
                    "full_name": "Other Client",
                })
                self.assertEqual(other_client.status_code, 201)
                other_headers = {"Authorization": f"Bearer {other_client.json()['access_token']}"}
                self.assertEqual(client.get("/api/quote-requests/mine", headers=other_headers).json(), [])
                stolen_edit = client.patch(
                    f"/api/quote-requests/{group_id}",
                    headers=other_headers,
                    json={"details": {"notes": "not the owner"}},
                )
                self.assertEqual(stolen_edit.status_code, 404)
                stolen_claim = client.post(
                    "/api/quote-requests/claim-guest",
                    headers=other_headers,
                    json={"access_tokens": [guest_access_token]},
                )
                self.assertEqual(stolen_claim.status_code, 200)
                self.assertEqual(stolen_claim.json()["claimed"], 0)
                forbidden_acceptance = client.post(
                    f"/api/quote-requests/{group_id}/choose/{company_id}",
                    headers=other_headers,
                )
                self.assertEqual(forbidden_acceptance.status_code, 404)
                accepted = client.post(
                    f"/api/quote-requests/{group_id}/choose/{company_id}",
                    headers=owner_headers,
                )
                self.assertEqual(accepted.status_code, 200)
                self.assertEqual(accepted.json()["status"], "accepted")
                payment_response = client.post(
                    f"/api/quote-requests/{group_id}/choose/{company_id}/deposit",
                    headers=owner_headers,
                    json={"payment_method": "fib", "phone_number": "07711111111"},
                )
                self.assertEqual(payment_response.status_code, 200)
                payment_group = payment_response.json()
                self.assertEqual(payment_group["status"], "in_progress")
                payment = payment_group["companies"][0]["payment"]
                self.assertEqual(payment["payment_method"], "fib")
                self.assertEqual(payment["deposit_iqd"], 600_000)
                self.assertEqual(payment["remaining_iqd"], 11_400_000)
                self.assertEqual(payment["commission_iqd"], 600_000)
                retry_payment = client.post(
                    f"/api/quote-requests/{group_id}/choose/{company_id}/deposit",
                    headers=owner_headers,
                    json={"payment_method": "fib", "phone_number": "07711111111"},
                )
                self.assertEqual(
                    retry_payment.json()["companies"][0]["payment"]["transaction_id"],
                    payment["transaction_id"],
                )
                company_inbox = client.get("/api/company/requests", headers=company_headers)
                self.assertEqual(company_inbox.status_code, 200)
                company_paid_request = next(
                    item for item in company_inbox.json() if item["group_id"] == group_id
                )
                self.assertEqual(
                    company_paid_request["companies"][0]["payment"]["payment_status"],
                    "paid",
                )
                with patch.dict(os.environ, {"UTU_ADMIN_TOKEN": "test-admin-token"}):
                    revenue_rows = admin_revenue("test-admin-token", self.session, None)
                    paid_revenue = next(row for row in revenue_rows if row["request_id"] == persisted_request.id)
                    self.assertEqual(paid_revenue["commission_status"], "collected")
                    self.assertEqual(paid_revenue["deposit_iqd"], 600_000)
                    refund_result = refund_deposit(
                        paid_revenue["assignment_id"],
                        "test-admin-token",
                        self.session,
                        None,
                    )
                    self.assertEqual(refund_result["payment_status"], "refunded")
                    self.assertEqual(refund_result["commission_status"], "reversed")
                    stored_payment = self.session.exec(
                        select(DepositPayment).where(
                            DepositPayment.assignment_id == paid_revenue["assignment_id"]
                        )
                    ).one()
                    self.assertEqual(stored_payment.project_status, "cancelled")
                verification_id = accepted.json()["companies"][0]["green_verification_id"]
                self.assertTrue(verification_id)
                company_verification = self.session.get(CompanyVerification, company_id)
                company_verification.business_license_number = "LIC-VERIFIED"
                company_verification.tax_registration_number = "TAX-VERIFIED"
                company_verification.license_checked = True
                company_verification.tax_record_checked = True
                company_verification.projects_checked = True
                self.session.add(company_verification)
                self.session.commit()
                verification_response = client.get(
                    f"/api/quote-requests/verify/{verification_id}"
                )
                self.assertEqual(verification_response.status_code, 200)
                verification_data = verification_response.json()
                self.assertEqual(verification_data["reference"], group_id)
                self.assertEqual(verification_data["company_name"], "Verified Solar")
                self.assertEqual(verification_data["system_kwp"], 8.4)
                self.assertEqual(verification_data["business_license_number"], "LIC-VERIFIED")
                self.assertEqual(verification_data["tax_registration_number"], "TAX-VERIFIED")
                self.assertNotIn("customer_name", verification_data)
                self.assertNotIn("customer_phone", verification_data)
                edit_after_acceptance = client.patch(
                    f"/api/quote-requests/{group_id}",
                    headers=owner_headers,
                    json={"details": {"notes": "Updated after accepting"}},
                )
                self.assertEqual(edit_after_acceptance.status_code, 200)
                self.assertEqual(
                    edit_after_acceptance.json()["details"]["notes"],
                    "Updated after accepting",
                )
                company_inbox = client.get("/api/company/requests", headers=company_headers)
                self.assertEqual(company_inbox.status_code, 200)
                company_request = next(
                    item for item in company_inbox.json() if item["group_id"] == group_id
                )
                self.assertEqual(company_request["customer_phone"], "07722223333")
                self.assertEqual(
                    company_request["details"]["notes"],
                    "Updated after accepting",
                )
                self.assertTrue(company_request["is_green_initiative"])
                self.assertTrue(
                    company_request["companies"][0]["quote"]["green_initiative_supported"]
                )
                company_green_requests = client.get(
                    "/api/company/requests?is_green_initiative=true",
                    headers=company_headers,
                )
                self.assertEqual(
                    [request["group_id"] for request in company_green_requests.json()],
                    [group_id],
                )

    def test_jwt_company_registration_links_pending_company(self):
        app = FastAPI()
        app.include_router(auth_router)

        def override_session():
            yield self.session

        app.dependency_overrides[get_session] = override_session
        with patch.dict(os.environ, {"JWT_SECRET_KEY": "unit-test-jwt-secret-key-which-is-long-enough"}):
            with TestClient(app) as client:
                response = client.post("/api/auth/register/company", json={
                    "name": "JWT Solar",
                    "email": "jwt-company@example.com",
                    "password": "a-long-company-password",
                    "phone": "07712345678",
                    "business_license_number": "LIC-1",
                    "tax_registration_number": "TAX-1",
                    "projects_count": 0,
                })
                self.assertEqual(response.status_code, 201)
                body = response.json()
                self.assertEqual(body["user"]["role"], "company")
                self.assertFalse(body["user"]["is_verified"])
                company = self.session.get(Company, body["user"]["company_id"])
                self.assertEqual(company.verification_status, "pending")

    def test_company_can_register_before_submitting_verification_details(self):
        result = register_company(
            CompanyRegistration(
                name="Incomplete Solar",
                email="incomplete@example.com",
                password="a-long-test-password",
            ),
            self.session,
        )
        company = self.session.get(Company, result["id"])
        self.assertEqual(company.verification_status, "pending")
        self.assertEqual(company.projects_count, 0)
        self.assertEqual(company.phone, "")
        self.assertIn(company.id, {item.id for item in get_companies(self.session)})

    def test_company_and_customer_phone_numbers_require_eleven_iraqi_digits(self):
        with self.assertRaises(ValidationError):
            CompanyRegistration(
                name="Wrong Phone",
                email="wrong-phone@example.com",
                password="a-long-test-password",
                phone="0771234567",
            )
        with self.assertRaises(ValidationError):
            QuoteRequestCreate(
                company_ids=[1],
                customer_name="Test Customer",
                customer_phone="0771234567",
                system_kwp=8,
                battery_kwh=0,
                panel_count=12,
            )

    def test_green_initiative_request_requires_a_valid_budget(self):
        with self.assertRaises(ValidationError):
            QuoteRequestCreate(
                company_ids=[1],
                customer_name="Test Customer",
                customer_phone="07712345678",
                system_kwp=8,
                battery_kwh=0,
                panel_count=12,
                is_green_initiative=True,
            )

    def test_admin_can_review_uploaded_verification_document_without_changing_company_records(self):
        company_result = self.register()
        company = self.session.get(Company, company_result["id"])
        company_token = "test-company-document-token"
        self.session.add(CompanyLoginSession(
            company_id=company.id,
            token_hash=_token_hash(company_token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        ))
        self.session.commit()
        document_data = b"%PDF-1.4\nminimal test document"
        upload = VerificationDocumentUpload(
            document_type="license",
            file_name="C:\\uploads\\business-license.pdf",
            content_type="application/pdf",
            data_base64=base64.b64encode(document_data).decode("ascii"),
        )
        upload_verification_document(
            upload,
            f"Bearer {company_token}",
            self.session,
        )
        admin = User(
            id=999,
            email="admin@example.com",
            hashed_password="not-used",
            full_name="Platform Admin",
            role="admin",
            is_active=True,
        )

        pending = list_pending_companies(session=self.session, current_user=admin)
        self.assertTrue(pending[0]["has_license_document"])
        self.assertFalse(pending[0]["has_tax_document"])
        viewed = get_verification_document(
            company.id,
            "license",
            session=self.session,
            current_user=admin,
        )
        self.assertEqual(viewed["file_name"], "business-license.pdf")
        self.assertEqual(base64.b64decode(viewed["data_base64"]), document_data)
        self.assertEqual(company.verification_status, "pending")
        self.assertEqual(company.projects_count, 3)
        self.assertEqual(self.session.exec(select(VerificationDocument)).one().company_id, company.id)

    def test_admin_revenue_calculates_commission_for_accepted_and_completed_quotes(self):
        company_result = self.register()
        company_id = company_result["id"]
        request = QuoteRequest(
            group_id="UTU-2026-REVENUE",
            customer_name="Test Customer",
            customer_phone="07711111111",
            system_kwp=8.4,
            battery_kwh=10,
            panel_count=12,
            access_token_hash="revenue-test-token-hash",
        )
        self.session.add(request)
        self.session.commit()
        self.session.refresh(request)
        assignment = QuoteRequestCompany(
            request_id=request.id,
            company_id=company_id,
            status="selected",
        )
        self.session.add(assignment)
        self.session.commit()
        self.session.refresh(assignment)
        self.session.add(CompanyQuote(
            request_company_id=assignment.id,
            total_iqd=10_000_000,
            capacity_kwp=8.4,
            panel_brand="Test Panel",
            inverter_brand="Test Inverter",
            battery_brand="Test Battery",
            warranty="10 years",
            install_days=5,
        ))
        self.session.add(Project(
            title="Completed revenue installation",
            company_id=company_id,
            quote_request_id=request.id,
            location_governorate="Baghdad",
            location_district="Mansour",
            system_kwp=8.4,
            installation_type="Hybrid rooftop",
            image_url="https://example.test/project.jpg",
            status="completed",
            completed_at=datetime.now(timezone.utc),
        ))
        accepted_request = QuoteRequest(
            group_id="UTU-2026-ACCEPTED",
            customer_name="Second Customer",
            customer_phone="07722222222",
            system_kwp=5,
            battery_kwh=0,
            panel_count=8,
            access_token_hash="accepted-test-token-hash",
        )
        self.session.add(accepted_request)
        self.session.commit()
        self.session.refresh(accepted_request)
        accepted_assignment = QuoteRequestCompany(
            request_id=accepted_request.id,
            company_id=company_id,
            status="selected",
        )
        self.session.add(accepted_assignment)
        self.session.commit()
        self.session.refresh(accepted_assignment)
        self.session.add(CompanyQuote(
            request_company_id=accepted_assignment.id,
            total_iqd=4_000_000,
            capacity_kwp=5,
            panel_brand="Test Panel",
            inverter_brand="Test Inverter",
            battery_brand="Test Battery",
            warranty="10 years",
            install_days=5,
        ))
        self.session.commit()
        admin = User(
            id=999,
            email="admin@example.com",
            hashed_password="not-used",
            full_name="Platform Admin",
            role="admin",
            is_active=True,
        )

        rows = admin_revenue(session=self.session, current_user=admin)

        self.assertEqual(len(rows), 2)
        completed = next(row for row in rows if row["request_id"] == request.id)
        accepted = next(row for row in rows if row["request_id"] == accepted_request.id)
        self.assertEqual(completed["company_name"], "Test Solar")
        self.assertEqual(completed["project_title"], "Completed revenue installation")
        self.assertEqual(completed["total_agreed_price_iqd"], 10_000_000)
        self.assertEqual(completed["commission_rate"], 0.05)
        self.assertEqual(completed["commission_fee_iqd"], 500_000)
        self.assertEqual(completed["status"], "completed")
        self.assertEqual(accepted["total_agreed_price_iqd"], 4_000_000)
        self.assertEqual(accepted["commission_fee_iqd"], 200_000)
        self.assertEqual(accepted["status"], "accepted")
        self.assertFalse(completed["is_estimate"])

    def test_admin_revenue_includes_completed_projects_without_quote_using_estimate(self):
        company_result = self.register()
        company_id = company_result["id"]
        project = Project(
            title="Portfolio completion without quote",
            company_id=company_id,
            location_governorate="Baghdad",
            location_district="Mansour",
            system_kwp=2.5,
            installation_type="Hybrid rooftop",
            image_url="https://example.test/project.jpg",
            status="completed",
        )
        self.session.add(project)
        self.session.commit()
        admin = User(
            id=999,
            email="admin@example.com",
            hashed_password="not-used",
            full_name="Platform Admin",
            role="admin",
            is_active=True,
        )

        rows = admin_revenue(session=self.session, current_user=admin)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["project_title"], "Portfolio completion without quote")
        self.assertEqual(rows[0]["total_agreed_price_iqd"], 2_500_000)
        self.assertEqual(rows[0]["commission_fee_iqd"], 125_000)
        self.assertTrue(rows[0]["is_estimate"])

    def test_user_policy_report_can_be_reviewed_by_admin(self):
        reporter = User(
            email="reporter@example.com",
            hashed_password="not-used",
            full_name="Test Reporter",
            role="client",
            is_active=True,
        )
        self.session.add(reporter)
        self.session.commit()
        self.session.refresh(reporter)
        report = create_policy_report(
            PolicyReportCreate(
                subject="Inappropriate chat message",
                description="A reported message needs moderation.",
            ),
            session=self.session,
            current_user=reporter,
        )
        admin = User(
            id=999,
            email="admin@example.com",
            hashed_password="not-used",
            full_name="Platform Admin",
            role="admin",
            is_active=True,
        )

        self.assertEqual(admin_policy_reports(session=self.session, current_user=admin)[0].id, report.id)
        updated = update_policy_report_status(
            report.id,
            PolicyReportStatusUpdate(status="resolved"),
            session=self.session,
            current_user=admin,
        )
        self.assertEqual(updated.status, "resolved")
        self.assertEqual(self.session.get(PolicyReport, report.id).status, "resolved")

    def test_request_chat_delivers_messages_masks_contact_and_logs_admin_report(self):
        company = self.register()
        request = self.request_for(company["id"])
        company_token = "legacy-company-chat-session-token"
        self.session.add(CompanyLoginSession(
            company_id=company["id"],
            token_hash=_token_hash(company_token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        ))
        self.session.commit()

        normal = create_chat_message(
            request["group_id"],
            company["id"],
            ChatMessageCreate(content="Hello, I can prepare the requested solar system."),
            request["access_token"],
            None,
            self.session,
            None,
        )
        company_inbox = list_chat_messages(
            request["group_id"],
            company["id"],
            None,
            f"Bearer {company_token}",
            self.session,
            None,
        )
        self.assertEqual(normal.content, "Hello, I can prepare the requested solar system.")
        self.assertEqual(len(company_inbox), 1)
        self.assertEqual(company_inbox[0].sender_role, "client")

        blocked = create_chat_message(
            request["group_id"],
            company["id"],
            ChatMessageCreate(content="Please call 077 123 45678"),
            request["access_token"],
            None,
            self.session,
            None,
        )
        stored_messages = self.session.exec(
            select(ChatMessage).where(ChatMessage.request_company_id == normal.request_company_id)
        ).all()
        reports = self.session.exec(select(PolicyReport)).all()

        self.assertEqual(blocked.content, "[تم حجب معلومات التواصل المباشر لحماية الاتفاقية]")
        self.assertEqual(blocked.violation_type, "Attempted phone number sharing in chat")
        self.assertNotIn("077", " ".join(message.content for message in stored_messages))
        self.assertEqual(len(reports), 1)
        self.assertIn("sender: client", reports[0].description)
        self.assertIn("Pending", reports[0].status.title())

    def test_chat_http_flow_exposes_blocked_attempt_in_admin_reports(self):
        company = self.register()
        request = self.request_for(company["id"])
        company_token = "legacy-company-http-chat-session-token"
        self.session.add(CompanyLoginSession(
            company_id=company["id"],
            token_hash=_token_hash(company_token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        ))
        self.session.commit()

        app = FastAPI()
        app.include_router(quote_requests_router)
        app.include_router(companies_router)

        def override_session():
            yield self.session

        app.dependency_overrides[get_session] = override_session
        path = (
            f"/api/quote-requests/{request['group_id']}/companies/"
            f"{company['id']}/messages"
        )
        with patch.dict(os.environ, {"UTU_ADMIN_TOKEN": "test-admin-token"}):
            with TestClient(app) as client:
                delivered = client.post(
                    f"{path}?access_token={request['access_token']}",
                    json={"content": "Your request is received; we will prepare a quote."},
                )
                company_history = client.get(
                    path,
                    headers={"Authorization": f"Bearer {company_token}"},
                )
                blocked = client.post(
                    f"{path}?access_token={request['access_token']}",
                    json={"content": "My WhatsApp is 078-123-45678"},
                )
                admin_reports = client.get(
                    "/api/companies/admin/reports",
                    headers={"X-Admin-Token": "test-admin-token"},
                )

        self.assertEqual(delivered.status_code, 201)
        self.assertEqual(company_history.status_code, 200)
        self.assertEqual(len(company_history.json()), 1)
        self.assertEqual(blocked.status_code, 201)
        self.assertEqual(
            blocked.json()["content"],
            "[تم حجب معلومات التواصل المباشر لحماية الاتفاقية]",
        )
        self.assertEqual(admin_reports.status_code, 200)
        self.assertEqual(len(admin_reports.json()), 1)
        self.assertIn("Attempted phone number sharing in chat", admin_reports.json()[0]["subject"])
        self.assertIn("[تم حجب معلومات التواصل المباشر", admin_reports.json()[0]["description"])

    def test_chat_filter_detects_spelled_iraqi_phone_social_handles_and_external_domains(self):
        from chat_moderation import detect_contact_violation

        self.assertEqual(
            detect_contact_violation("صفر سبعة سبعة واحد اثنين ثلاثة أربعة خمسة ستة سبعة ثمانية"),
            "Attempted phone number sharing in chat",
        )
        self.assertEqual(
            detect_contact_violation("Contact me on Telegram @solar_team"),
            "Attempted social media contact sharing in chat",
        )
        self.assertEqual(
            detect_contact_violation("See solar-example.com for details"),
            "External link detected",
        )
        self.assertEqual(
            detect_contact_violation("https://example.net/contact"),
            "External link detected",
        )

    def test_admin_reporting_routes_are_protected_and_return_empty_data_cleanly(self):
        app = FastAPI()
        app.include_router(companies_router)

        def override_session():
            yield self.session

        app.dependency_overrides[get_session] = override_session
        with patch.dict(os.environ, {"UTU_ADMIN_TOKEN": "test-admin-token"}):
            with TestClient(app) as client:
                self.assertEqual(client.get("/api/companies/admin/revenue").status_code, 401)
                headers = {"X-Admin-Token": "test-admin-token"}
                revenue = client.get("/api/companies/admin/revenue", headers=headers)
                reports = client.get("/api/companies/admin/reports", headers=headers)
        self.assertEqual(revenue.status_code, 200)
        self.assertEqual(revenue.json(), [])
        self.assertEqual(reports.status_code, 200)
        self.assertEqual(reports.json(), [])

    def test_public_company_profile_exposes_verified_business_phone_but_not_email(self):
        company_result = self.register()
        company = self.session.get(Company, company_result["id"])
        public_profile = CompanyPublic.model_validate(
            get_company(company.id, self.session), from_attributes=True
        )
        public_fields = public_profile.model_dump().keys()
        self.assertIn("phone", public_fields)
        self.assertIsNone(public_profile.phone)
        self.assertNotIn("email", public_fields)
        self.assertEqual(public_profile.verification_status, "pending")

        self.approve(company.id)
        public_profile = get_company(company.id, self.session)
        self.assertEqual(public_profile.phone, "07700000000")

        project = Project(
            company_id=company.id,
            title="Test rooftop installation",
            description="A completed hybrid home system",
            system_kwp=8.4,
            location_governorate="Baghdad",
            location_district="Mansour",
            installation_type="Hybrid rooftop",
            image_url="/projects/test.jpg",
            status="completed",
        )
        self.session.add(project)
        self.session.commit()
        public_projects = get_company_projects(company.id, self.session)
        self.assertEqual(public_projects[0]["title"], "Test rooftop installation")
        self.assertEqual(public_projects[0]["location"], "Baghdad · Mansour")

    def test_public_company_directory_includes_phone_only_after_verification(self):
        pending_company = self.register()
        verified_company = self.register(email="verified@example.com")
        self.approve(verified_company["id"])

        listed = {
            item.id: item
            for item in get_companies(self.session)
        }
        self.assertIsNone(listed[pending_company["id"]].phone)
        self.assertEqual(listed[verified_company["id"]].phone, "07700000000")

    def test_company_cannot_be_verified_without_all_checks_and_three_projects(self):
        company = self.register(projects_count=2)
        with patch.dict(os.environ, {"UTU_ADMIN_TOKEN": "test-admin-token"}):
            with self.assertRaises(HTTPException) as error:
                review_company(
                    company["id"],
                    CompanyVerificationReview(
                        decision="verified",
                        license_checked=True,
                        tax_record_checked=True,
                        projects_checked=True,
                    ),
                    "test-admin-token",
                    self.session,
                )
        self.assertEqual(error.exception.status_code, 422)

    def test_admin_must_check_each_evidence_category(self):
        company = self.register()
        with patch.dict(os.environ, {"UTU_ADMIN_TOKEN": "test-admin-token"}):
            queue = list_pending_companies("test-admin-token", self.session)
            self.assertEqual(queue[0]["business_license_number"], "LIC-12345")
            self.assertEqual(queue[0]["tax_registration_number"], "TAX-12345")
            with self.assertRaises(HTTPException) as error:
                review_company(
                    company["id"],
                    CompanyVerificationReview(
                        decision="verified",
                        license_checked=True,
                        tax_record_checked=True,
                        projects_checked=False,
                    ),
                    "test-admin-token",
                    self.session,
                )
        self.assertEqual(error.exception.status_code, 422)

    def test_legacy_verified_company_retains_status_without_evidence(self):
        company = Company(
            name="Legacy Solar",
            founded_year=2010,
            projects_count=0,
            phone="+9647700000000",
            verification_status="verified",
        )
        self.session.add(company)
        self.session.commit()
        self.session.refresh(company)

        migrate_company_verification(self.session)

        self.session.refresh(company)
        self.assertEqual(company.verification_status, "verified")
        self.assertIsNotNone(self.session.get(CompanyVerification, company.id))
        company.verification_status = "verified"
        self.session.add(company)
        self.session.commit()
        migrate_company_verification(self.session)
        self.session.refresh(company)
        self.assertEqual(company.verification_status, "verified")

    def test_company_can_resubmit_verification_evidence(self):
        company = self.register()
        self.approve(company["id"])
        login = login_company(
            CompanyLogin(email="solar@example.com", password="a-long-test-password"),
            self.session,
        )
        result = update_verification_application(
            VerificationApplicationUpdate(
                business_license_number="LIC-NEW",
                tax_registration_number="TAX-NEW",
                projects_count=4,
            ),
            f"Bearer {login['access_token']}",
            self.session,
        )
        self.assertEqual(result["verification_status"], "verified")
        self.assertEqual(self.session.get(Company, company["id"]).projects_count, 4)

    def test_request_access_token_is_required_to_retrieve_request(self):
        company = self.register()
        self.approve(company["id"])
        request = self.request_for(company["id"])
        self.assertEqual(list_quote_requests(request["access_token"], self.session)[0]["group_id"], request["group_id"])
        with self.assertRaises(HTTPException) as error:
            list_quote_requests("x" * 40, self.session)
        self.assertEqual(error.exception.status_code, 404)

    def test_company_login_can_read_inbox_and_submit_real_quote(self):
        company = self.register()
        self.approve(company["id"])
        login = login_company(CompanyLogin(email="solar@example.com", password="a-long-test-password"), self.session)
        request = self.request_for(company["id"])
        authorization = f"Bearer {login['access_token']}"
        inbox = company_requests(authorization, self.session)
        self.assertEqual(inbox[0]["companies"][0]["status"], "viewed")

        submit_company_quote(
            request["group_id"],
            company["id"],
            QuoteCreate(
                total_iqd=12_000_000,
                panel_iqd=4_000_000,
                inverter_iqd=3_000_000,
                battery_iqd=2_000_000,
                installation_iqd=3_000_000,
                capacity_kwp=8.4,
                panel_brand="Test Panel",
                inverter_brand="Test Inverter",
                battery_brand="Test Battery",
                warranty="10 years",
                install_days=5,
            ),
            authorization,
            self.session,
        )
        customer_view = list_quote_requests(request["access_token"], self.session)[0]
        self.assertEqual(customer_view["companies"][0]["status"], "quoted")
        self.assertEqual(customer_view["companies"][0]["quote"]["total_iqd"], 12_000_000)
        self.assertEqual(customer_view["companies"][0]["quote"]["panel_iqd"], 4_000_000)

    def test_company_login_normalizes_email_case_and_surrounding_whitespace(self):
        registered = self.register()

        login = login_company(
            CompanyLogin(email="  SOLAR@EXAMPLE.COM  ", password="a-long-test-password"),
            self.session,
        )

        self.assertEqual(login["company"].id, registered["id"])
        self.assertTrue(login["access_token"])

    def test_pending_company_is_public_and_can_receive_requests(self):
        company = self.register()
        listings = get_companies(self.session)
        self.assertIn(company["id"], {item.id for item in listings})
        self.assertEqual(self.request_for(company["id"])["companies"][0]["status"], "sent")

    def test_quote_request_api_returns_validated_created_and_private_read_shapes(self):
        company = self.register()
        app = FastAPI()
        app.include_router(quote_requests_router)

        def override_session():
            yield self.session

        app.dependency_overrides[get_session] = override_session
        with TestClient(app) as client:
            created = client.post("/api/quote-requests", json={
                "company_ids": [company["id"]],
                "customer_name": "Test Customer",
                "customer_phone": "07711111111",
                "system_kwp": 8.4,
                "battery_kwh": 10.2,
                "panel_count": 12,
                "details": {"governorate": "baghdad"},
            })
            self.assertEqual(created.status_code, 201)
            created_body = created.json()
            self.assertTrue(created_body["access_token"])
            self.assertEqual(created_body["companies"][0]["status"], "sent")
            self.assertEqual(len(created_body["companies"]), 1)

            fetched = client.get(
                "/api/quote-requests",
                params={"access_token": created_body["access_token"]},
            )
            self.assertEqual(fetched.status_code, 200)
            self.assertNotIn("access_token", fetched.json()[0])
            self.assertEqual(fetched.json()[0]["group_id"], created_body["group_id"])

    def test_company_with_no_portfolio_projects_returns_empty_list(self):
        company = self.register()
        app = FastAPI()
        app.include_router(companies_router)

        def override_session():
            yield self.session

        app.dependency_overrides[get_session] = override_session
        with TestClient(app) as client:
            response = client.get(f"/api/companies/{company['id']}/projects")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_pending_company_receives_selected_request_but_cannot_submit_quote(self):
        company = self.register()
        visible_companies = {item.id: item for item in get_companies(self.session)}
        self.assertIn(company["id"], visible_companies)
        self.assertEqual(visible_companies[company["id"]].verification_status, "pending")
        login = login_company(
            CompanyLogin(email="solar@example.com", password="a-long-test-password"),
            self.session,
        )
        request = self.request_for(company["id"])
        authorization = f"Bearer {login['access_token']}"
        inbox = company_requests(authorization, self.session)
        self.assertEqual(len(inbox), 1)
        self.assertEqual(inbox[0]["group_id"], request["group_id"])
        self.assertEqual(inbox[0]["customer_name"], "Test Customer")
        self.assertEqual(inbox[0]["details"]["governorate"], "baghdad")
        with self.assertRaises(HTTPException) as error:
            submit_company_quote(
                request["group_id"],
                company["id"],
                QuoteCreate(
                    total_iqd=11_000_000,
                    capacity_kwp=8.4,
                    panel_brand="Pending Panel",
                    inverter_brand="Pending Inverter",
                    battery_brand="Pending Battery",
                    warranty="5 years",
                    install_days=7,
                ),
                authorization,
                self.session,
            )
        self.assertEqual(error.exception.status_code, 403)
        result = list_quote_requests(request["access_token"], self.session)[0]
        self.assertEqual(result["companies"][0]["status"], "viewed")
        self.assertEqual(self.session.get(Company, company["id"]).verification_status, "pending")

    def test_customer_can_select_only_a_submitted_quote(self):
        company = self.register()
        self.approve(company["id"])
        login = login_company(
            CompanyLogin(email="solar@example.com", password="a-long-test-password"),
            self.session,
        )
        request = self.request_for(company["id"])
        submit_company_quote(
            request["group_id"],
            company["id"],
            QuoteCreate(
                total_iqd=10_000_000,
                capacity_kwp=8.4,
                panel_brand="Panel",
                inverter_brand="Inverter",
                battery_brand="Battery",
                warranty="5 years",
                install_days=5,
            ),
            f"Bearer {login['access_token']}",
            self.session,
        )

        chosen = choose_company_quote(
            request["group_id"], company["id"], request["access_token"], self.session
        )
        self.assertEqual(chosen["companies"][0]["status"], "selected")
        with self.assertRaises(HTTPException) as error:
            choose_company_quote(
                request["group_id"], company["id"], "x" * 40, self.session
            )
        self.assertEqual(error.exception.status_code, 404)

    def test_company_can_mark_a_quoted_request_completed_and_link_customer_project(self):
        company_result = self.register()
        self.approve(company_result["id"])
        login = login_company(
            CompanyLogin(email="solar@example.com", password="a-long-test-password"),
            self.session,
        )
        request = self.request_for(company_result["id"])
        authorization = f"Bearer {login['access_token']}"
        submit_company_quote(
            request["group_id"],
            company_result["id"],
            QuoteCreate(
                total_iqd=12_000_000,
                capacity_kwp=8.4,
                panel_brand="Test Panel",
                inverter_brand="Test Inverter",
                battery_brand="Test Battery",
                warranty="10 years",
                install_days=5,
            ),
            authorization,
            self.session,
        )
        with self.assertRaises(HTTPException) as unaccepted:
            complete_company_installation(
                request["group_id"],
                CompletedInstallation(
                    title="Premature completion",
                    installation_type="Hybrid rooftop",
                ),
                authorization,
                self.session,
            )
        self.assertEqual(unaccepted.exception.status_code, 409)
        choose_company_quote(request["group_id"], company_result["id"], request["access_token"], self.session)

        completed = complete_company_installation(
            request["group_id"],
            CompletedInstallation(
                title="Completed customer system",
                description="Installed and commissioned.",
                installation_type="Hybrid rooftop",
                image_url="/projects/customer-installed.jpg",
            ),
            authorization,
            self.session,
        )

        self.assertEqual(completed["status"], "completed")
        self.assertEqual(completed["quote_request_id"], self.session.exec(
            select(QuoteRequest).where(QuoteRequest.group_id == request["group_id"])
        ).first().id)
        self.assertEqual(completed["client_name"], "Test C.")

    def test_rejected_company_is_hidden_and_cannot_receive_requests(self):
        company = self.register()
        with patch.dict(os.environ, {"UTU_ADMIN_TOKEN": "test-admin-token"}):
            review_company(
                company["id"],
                CompanyVerificationReview(decision="rejected"),
                "test-admin-token",
                self.session,
            )
        listings = get_companies(self.session)
        self.assertNotIn(company["id"], {item.id for item in listings})
        with self.assertRaises(HTTPException) as error:
            self.request_for(company["id"])
        self.assertEqual(error.exception.status_code, 422)

    def test_company_logout_revokes_the_session(self):
        self.register()
        login = login_company(
            CompanyLogin(email="solar@example.com", password="a-long-test-password"),
            self.session,
        )
        authorization = f"Bearer {login['access_token']}"
        logout_company(authorization, self.session)
        with self.assertRaises(HTTPException) as error:
            company_requests(authorization, self.session)
        self.assertEqual(error.exception.status_code, 401)

    def test_company_session_expiry_handles_sqlite_naive_datetime(self):
        company = self.register()
        token = "a-valid-company-session-token"
        self.session.add(CompanyLoginSession(
            company_id=company["id"],
            token_hash=_token_hash(token),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        ))
        self.session.commit()

        self.assertEqual(_authenticated_company_id(f"Bearer {token}", self.session), company["id"])

        login_session = self.session.exec(select(CompanyLoginSession)).one()
        login_session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.session.add(login_session)
        self.session.commit()
        with self.assertRaises(HTTPException) as error:
            _authenticated_company_id(f"Bearer {token}", self.session)
        self.assertEqual(error.exception.status_code, 401)

    def test_password_reset_requires_email_configuration(self):
        self.register()
        with patch("companies.smtp_is_configured", return_value=False):
            with self.assertRaises(HTTPException) as error:
                request_password_reset(PasswordResetRequest(email="solar@example.com"), self.session)
        self.assertEqual(error.exception.status_code, 503)
        self.assertEqual(error.exception.detail, "Company password recovery email is not configured")

    def test_expired_password_reset_link_is_rejected(self):
        self.register()
        with patch("companies.smtp_is_configured", return_value=True), patch(
            "companies.send_password_reset_email"
        ) as send_email:
            request_password_reset(PasswordResetRequest(email="solar@example.com"), self.session)
        reset_token = send_email.call_args.args[1]
        reset = self.session.exec(select(CompanyPasswordResetToken)).one()
        reset.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.session.add(reset)
        self.session.commit()
        with self.assertRaises(HTTPException) as error:
            confirm_password_reset(
                PasswordResetConfirm(token=reset_token, new_password="another-long-password"),
                self.session,
            )
        self.assertEqual(error.exception.status_code, 400)

    def test_password_reset_is_generic_one_time_and_revokes_sessions(self):
        self.register()
        original_login = login_company(
            CompanyLogin(email="solar@example.com", password="a-long-test-password"),
            self.session,
        )
        with patch("companies.smtp_is_configured", return_value=True), patch(
            "companies.send_password_reset_email"
        ) as send_email:
            unknown = request_password_reset(
                PasswordResetRequest(email="unknown@example.com"), self.session
            )
            accepted = request_password_reset(
                PasswordResetRequest(email="solar@example.com"), self.session
            )
        self.assertEqual(unknown, accepted)
        reset_token = send_email.call_args.args[1]

        confirm_password_reset(
            PasswordResetConfirm(token=reset_token, new_password="another-long-password"),
            self.session,
        )
        with self.assertRaises(HTTPException) as expired:
            confirm_password_reset(
                PasswordResetConfirm(token=reset_token, new_password="third-long-password"),
                self.session,
            )
        self.assertEqual(expired.exception.status_code, 400)

        with self.assertRaises(HTTPException) as old_session:
            company_requests(f"Bearer {original_login['access_token']}", self.session)
        self.assertEqual(old_session.exception.status_code, 401)
        login_company(
            CompanyLogin(email="solar@example.com", password="another-long-password"),
            self.session,
        )


if __name__ == "__main__":
    unittest.main()
