"""
PagedIn Backend — FastAPI
Paste your resume. Get a live website. Free, forever.
"""
import logging
import os
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
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
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

# ── CORS ────────────────────────────────────────────────────────────────────
# Hardcoded allowed origins — avoids env var parsing issues on Render
ALLOWED_ORIGINS = [
    "https://plasmacat420.github.io",   # production frontend
    "http://localhost:5173",             # local dev (Vite)
    "http://localhost:3000",             # local dev (alt port)
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Security & Rate Limiting (order matters — security runs first) ───────────
app.add_middleware(SecurityMiddleware)
app.add_middleware(RateLimitMiddleware)

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
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "Something went wrong on our end. Please try again.",
        },
    )
