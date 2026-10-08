import os

from sqlalchemy import inspect
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlmodel import SQLModel, Session, create_engine, select

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./solar.db")
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine_options = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, **engine_options)


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(connection, _record) -> None:
    if connection.__class__.__module__.startswith("sqlite3"):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    migrate_review_columns()
    migrate_auth_columns()
    migrate_quote_breakdown_columns()
    migrate_green_initiative_columns()
    migrate_company_support_phone_column()
    with Session(engine) as session:
        migrate_company_verification(session)


def migrate_review_columns() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        company_columns = {column["name"] for column in inspector.get_columns("company")}
        if "rating" not in company_columns:
            connection.exec_driver_sql("ALTER TABLE company ADD COLUMN rating FLOAT NOT NULL DEFAULT 0")
        if "reviews_count" not in company_columns:
            connection.exec_driver_sql("ALTER TABLE company ADD COLUMN reviews_count INTEGER NOT NULL DEFAULT 0")

        project_columns = {column["name"] for column in inspector.get_columns("project")}
        if "quote_request_id" not in project_columns:
            connection.exec_driver_sql(
                "ALTER TABLE project ADD COLUMN quote_request_id INTEGER REFERENCES quoterequest(id)"
            )
        connection.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_project_quote_request_id ON project (quote_request_id)"
        )


def migrate_auth_columns() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        tables = set(inspector.get_table_names())
        if "user" in tables:
            user_columns = {column["name"] for column in inspector.get_columns("user")}
            if "token_version" not in user_columns:
                connection.exec_driver_sql("ALTER TABLE user ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0")
            if "company_id" not in user_columns:
                connection.exec_driver_sql("ALTER TABLE user ADD COLUMN company_id INTEGER REFERENCES company(id)")
                connection.exec_driver_sql("CREATE UNIQUE INDEX IF NOT EXISTS ix_user_company_id ON user (company_id)")
            if "phone" not in user_columns:
                connection.exec_driver_sql("ALTER TABLE user ADD COLUMN phone VARCHAR")
                connection.exec_driver_sql("CREATE UNIQUE INDEX IF NOT EXISTS ix_user_phone ON user (phone)")
        if "quoterequest" in tables:
            quote_columns = {column["name"] for column in inspector.get_columns("quoterequest")}
            if "user_id" not in quote_columns:
                connection.exec_driver_sql(
                    "ALTER TABLE quoterequest ADD COLUMN user_id INTEGER REFERENCES user(id)"
                )
            connection.exec_driver_sql(
                "CREATE INDEX IF NOT EXISTS ix_quoterequest_user_id ON quoterequest (user_id)"
            )


def migrate_quote_breakdown_columns() -> None:
    with engine.begin() as connection:
        tables = set(inspect(connection).get_table_names())
        if "companyquote" not in tables:
            return
        columns = {column["name"] for column in inspect(connection).get_columns("companyquote")}
        for name in ("panel_iqd", "inverter_iqd", "battery_iqd", "installation_iqd"):
            if name not in columns:
                connection.exec_driver_sql(
                    f"ALTER TABLE companyquote ADD COLUMN {name} INTEGER NOT NULL DEFAULT 0"
                )


def migrate_green_initiative_columns() -> None:
    with engine.begin() as connection:
        tables = set(inspect(connection).get_table_names())
        if "quoterequest" in tables:
            columns = {column["name"] for column in inspect(connection).get_columns("quoterequest")}
            if "is_green_initiative" not in columns:
                connection.exec_driver_sql(
                    "ALTER TABLE quoterequest ADD COLUMN is_green_initiative BOOLEAN NOT NULL DEFAULT 0"
                )
            if "green_initiative_budget_iqd" not in columns:
                connection.exec_driver_sql(
                    "ALTER TABLE quoterequest ADD COLUMN green_initiative_budget_iqd INTEGER"
                )
        if "companyquote" in tables:
            columns = {column["name"] for column in inspect(connection).get_columns("companyquote")}
            if "green_initiative_supported" not in columns:
                connection.exec_driver_sql(
                    "ALTER TABLE companyquote ADD COLUMN green_initiative_supported BOOLEAN NOT NULL DEFAULT 0"
                )
        if "quoterequestcompany" in tables:
            columns = {column["name"] for column in inspect(connection).get_columns("quoterequestcompany")}
            if "green_verification_id" not in columns:
                connection.exec_driver_sql(
                    "ALTER TABLE quoterequestcompany ADD COLUMN green_verification_id VARCHAR"
                )
            connection.exec_driver_sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_quoterequestcompany_green_verification_id "
                "ON quoterequestcompany (green_verification_id)"
            )


def migrate_company_support_phone_column() -> None:
    with engine.begin() as connection:
        tables = set(inspect(connection).get_table_names())
        if "company" in tables:
            columns = {column["name"] for column in inspect(connection).get_columns("company")}
            if "support_phone" not in columns:
                connection.exec_driver_sql(
                    "ALTER TABLE company ADD COLUMN support_phone VARCHAR"
                )


def migrate_company_verification(session: Session) -> None:
    from models import Company, CompanyVerification

    companies = session.exec(select(Company)).all()
    for company in companies:
        if session.get(CompanyVerification, company.id) is not None:
            continue
        session.add(CompanyVerification(company_id=company.id))
    session.commit()


def get_session():
    with Session(engine) as session:
        yield session