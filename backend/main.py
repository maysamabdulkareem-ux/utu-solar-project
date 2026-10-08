from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import create_db_and_tables
import models  # noqa: F401
from companies import router
from auth import router as auth_router
from company_portal import router as company_portal_router
from quote_requests import router as quote_requests_router
from projects import router as projects_router
from reviews import router as reviews_router
from security import validate_jwt_configuration

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_jwt_configuration()
    create_db_and_tables()
    yield


app = FastAPI(title="Solar Platform API", lifespan=lifespan)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled API error for %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "UTU_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,"
            "http://localhost:5174,http://127.0.0.1:5174",
        ).split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
    allow_headers=["*", "authorization", "x-admin-token"],
)

app.include_router(router)
app.include_router(auth_router)
app.include_router(company_portal_router)
app.include_router(quote_requests_router)
app.include_router(projects_router)
app.include_router(reviews_router)