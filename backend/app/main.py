import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.compliance import router as compliance_router
from app.api.routes.health import router as health_router
from app.api.routes.legal import router as legal_router
from app.api.routes.plans import router as plans_router
from app.core.config import get_settings
from app.db.session import engine

logger = logging.getLogger("revizzio")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info(
        "Revizzio API rulează în mediul %s și este pregătit.",
        settings.environment,
    )
    yield
    await engine.dispose()
    logger.info("Revizzio API a fost oprit.")


app = FastAPI(
    title="Revizzio API",
    description="API pentru aplicatia Revizzio.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "X-Revizzio-Form-Intent"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(compliance_router)
app.include_router(legal_router)
app.include_router(plans_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": "Revizzio API",
        "docs": "/docs",
    }
