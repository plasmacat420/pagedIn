"""
PagedIn Backend — FastAPI
Paste your resume. Get a live website. Free, forever.
"""
import logging
import os
import uuid
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from routers import parse, generate, deploy
from middleware.rate_limit import RateLimitMiddleware
from middleware.security import SecurityMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PagedIn backend starting up ✓")
    yield
    logger.info("PagedIn backend shutting down")


app = FastAPI(
    title="PagedIn API",
    description="Resume to live GitHub Pages site in under 60 seconds.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)


# ── Request ID middleware (attaches a unique ID to every request for log tracing)
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# ── Access logging ────────────────────────────────────────────────────────────
@app.middleware("http")
async def access_log_middleware(request: Request, call_next):
    response = await call_next(request)
    rid = getattr(request.state, "request_id", "-")
    ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "?")
    logger.info(
        f"[{rid}] {request.method} {request.url.path} → {response.status_code} | ip={ip.split(',')[0].strip()}"
    )
    return response


# ── Security & Rate Limiting ─────────────────────────────────────────────────
app.add_middleware(SecurityMiddleware)
app.add_middleware(RateLimitMiddleware)

# ── CORS — added LAST so it is outermost and wraps every response ─────────────
# Starlette applies middleware in reverse add order: last added = first to run.
ALLOWED_ORIGINS = [
    "https://plasmacat420.github.io",
    "http://localhost:5173",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(parse.router)
app.include_router(generate.router)
app.include_router(deploy.router)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "pagedin-backend", "version": "1.0.0"}


# ── Global error handler ─────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    rid = getattr(request.state, "request_id", "-")
    logger.error(
        f"[{rid}] Unhandled {type(exc).__name__} on {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "Something went wrong on our end. Please try again.",
        },
    )
