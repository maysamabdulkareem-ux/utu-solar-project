from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables
from models import * 
from routers import  companies, admin, assessments, quote_requests, appliances



@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="Solar Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    # The browser sends a preflight before every POST and PATCH. Listing only
    # GET here made it refuse them before they ever reached this app — while
    # curl and Swagger, which ignore CORS, kept working and hid the cause.
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router)
app.include_router(admin.router)
app.include_router(assessments.router)
app.include_router(quote_requests.router)
app.include_router(appliances.router)