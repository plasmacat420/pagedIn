"""
Sliding window rate limiter with Redis (production) and in-memory (dev) backends.
Limits are per IP address, tracked separately per endpoint.
"""
import time
import logging
import os
from collections import defaultdict, deque
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# --- Rate limit config per route path ---
RATE_LIMITS = {
    "/parse":           {"max_requests": 3,  "window_seconds": 3600},   # 3/hour
    "/generate":        {"max_requests": 3,  "window_seconds": 3600},   # 3/hour
    "/deploy/pagedin":  {"max_requests": 2,  "window_seconds": 86400},  # 2/day
    "/deploy/self":     {"max_requests": 3,  "window_seconds": 86400},  # 3/day
}


def _format_retry_after(window_seconds: int, oldest_timestamp: float) -> str:
    """Return a human-readable retry-after string."""
    retry_at = oldest_timestamp + window_seconds
    remaining = max(0, int(retry_at - time.time()))
    hours, remainder = divmod(remaining, 3600)
    minutes, seconds = divmod(remainder, 60)
    parts = []
    if hours:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if minutes:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    if not parts:
        parts.append(f"{seconds} second{'s' if seconds != 1 else ''}")
    return " and ".join(parts)


# ── In-memory backend (dev / fallback) ─────────────────────────────────────

class InMemoryRateLimiter:
    def __init__(self):
        # key: (ip, path) → deque of timestamps
        self._windows: dict[tuple, deque] = defaultdict(deque)

    def check(self, ip: str, path: str, limit: dict) -> tuple[bool, Optional[str]]:
        """Returns (allowed, retry_after_message). Mutates state on allowed."""
        max_req = limit["max_requests"]
        window = limit["window_seconds"]
        now = time.time()
        key = (ip, path)
        q = self._windows[key]

        # Evict timestamps outside the window
        cutoff = now - window
        while q and q[0] <= cutoff:
            q.popleft()

        if len(q) >= max_req:
            retry_msg = _format_retry_after(window, q[0])
            return False, retry_msg

        q.append(now)
        return True, None


# ── Redis backend ───────────────────────────────────────────────────────────

class RedisRateLimiter:
    def __init__(self, redis_client):
        self._redis = redis_client

    def check(self, ip: str, path: str, limit: dict) -> tuple[bool, Optional[str]]:
        max_req = limit["max_requests"]
        window = limit["window_seconds"]
        now = time.time()
        key = f"rl:{ip}:{path}"

        pipe = self._redis.pipeline()
        cutoff = now - window
        pipe.zremrangebyscore(key, 0, cutoff)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window)
        results = pipe.execute()

        count_after_evict = results[1]

        if count_after_evict >= max_req:
            # We added an extra entry — remove it
            self._redis.zrem(key, str(now))
            # Get the oldest entry to compute retry-after
            oldest = self._redis.zrange(key, 0, 0, withscores=True)
            oldest_ts = oldest[0][1] if oldest else now
            retry_msg = _format_retry_after(window, oldest_ts)
            return False, retry_msg

        return True, None


# ── Middleware ──────────────────────────────────────────────────────────────

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._limiter = self._init_limiter()

    def _init_limiter(self):
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                import redis
                client = redis.from_url(redis_url, decode_responses=True)
                client.ping()
                logger.info("Rate limiter: using Redis backend")
                return RedisRateLimiter(client)
            except Exception as e:
                logger.warning(f"Redis unavailable ({e}), falling back to in-memory rate limiter")
        logger.info("Rate limiter: using in-memory backend")
        return InMemoryRateLimiter()

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        limit = RATE_LIMITS.get(path)

        if limit and request.method == "POST":
            ip = self._get_client_ip(request)
            allowed, retry_msg = self._limiter.check(ip, path, limit)

            if not allowed:
                logger.warning(
                    f"RATE_LIMIT ip={ip} path={path} retry_in={retry_msg}"
                )
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "rate_limit_exceeded",
                        "message": f"You've hit the limit for this action. You can try again in {retry_msg}.",
                        "retry_after": retry_msg,
                    },
                )

        return await call_next(request)

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        # Respect X-Forwarded-For set by Render / Cloudflare
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
