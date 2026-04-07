"""
Security middleware:
- Rejects requests with no User-Agent or known bot patterns
- Enforces request body size limits on POST endpoints
- Logs abuse attempts
"""
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)

# Endpoints where we enforce a max body size
SIZE_LIMITED_PATHS = {"/parse", "/generate"}
MAX_BODY_BYTES = {
    "/parse":    500 * 1024,   # 500 KB — PDFs and long resumes can be large
    "/generate": 100 * 1024,   # 100 KB — structured JSON + theme
}

# Bot UA patterns (case-insensitive substrings)
BOT_UA_PATTERNS = [
    "python-requests",
    "curl/",
    "wget/",
    "scrapy",
    "bot",
    "spider",
    "crawler",
    "libwww",
    "go-http-client",
    "axios/0",   # raw axios without browser info
    "java/",
    "perl ",
    "ruby",
    "php/",
    "httpclient",
    "okhttp",
]

# Allowed bots (don't block these even if they match above)
ALLOWED_BOT_PATTERNS = ["googlebot", "bingbot", "uptimerobot", "render-healthcheck"]


def _is_bad_ua(ua: str) -> bool:
    if not ua:
        return True
    ua_lower = ua.lower()
    if any(p in ua_lower for p in ALLOWED_BOT_PATTERNS):
        return False
    return any(p in ua_lower for p in BOT_UA_PATTERNS)


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip security checks for health / GET endpoints
        if request.method != "POST":
            return await call_next(request)

        ip = self._get_ip(request)
        path = request.url.path

        # ── User-Agent check ────────────────────────────────────────────
        ua = request.headers.get("User-Agent", "")
        if _is_bad_ua(ua):
            logger.warning(f"BLOCKED_UA ip={ip} path={path} ua={repr(ua)}")
            return JSONResponse(
                status_code=400,
                content={"error": "bad_request", "message": "Request not accepted."},
            )

        # ── Body size check ─────────────────────────────────────────────
        if path in SIZE_LIMITED_PATHS:
            content_length = request.headers.get("Content-Length")
            limit = MAX_BODY_BYTES.get(path, 100 * 1024)
            if content_length and int(content_length) > limit:
                logger.warning(
                    f"OVERSIZED_REQUEST ip={ip} path={path} size={content_length}"
                )
                return JSONResponse(
                    status_code=413,
                    content={
                        "error": "payload_too_large",
                        "message": "Request body exceeds the 50 KB limit. Please trim your resume text.",
                    },
                )

        return await call_next(request)

    @staticmethod
    def _get_ip(request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
