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
from utils import counter

_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, _LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def _check_env() -> None:
    """Log which critical env vars are present/missing at startup."""
    required = ["GROQ_API_KEY", "GITHUB_TOKEN", "GITHUB_ORG", "HMAC_SECRET"]
    optional = ["REDIS_URL", "BASE_PAGES_DEPLOYED", "LOG_LEVEL"]
    missing = [k for k in required if not os.getenv(k)]
    present = [k for k in required if os.getenv(k)]
    if present:
        logger.info(f"ENV ok: {', '.join(present)}")
    if missing:
        logger.warning(f"ENV missing: {', '.join(missing)} — some features may not work")
    for k in optional:
        v = os.getenv(k)
        if v:
            logger.info(f"ENV {k}={'***' if 'KEY' in k or 'SECRET' in k or 'TOKEN' in k else v}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"PagedIn backend starting (log_level={_LOG_LEVEL})")
    _check_env()
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
    import time
    t0 = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    rid = getattr(request.state, "request_id", "-")
    ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "?")
    status = response.status_code
    log = logger.warning if status >= 400 else logger.info
    log(
        f"[{rid}] {request.method} {request.url.path} → {status} | {elapsed_ms}ms | ip={ip.split(',')[0].strip()}"
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


# ── Stats (public — used by frontend counter) ─────────────────────────────────
@app.get("/stats")
async def stats():
    return {"pages_deployed": counter.total()}


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
