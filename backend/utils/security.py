"""HMAC token utilities for validating deploy requests."""
import hmac
import hashlib
import time
import json
import os
import logging

logger = logging.getLogger(__name__)

HMAC_SECRET = os.getenv("HMAC_SECRET", "dev-secret-change-in-production")
TOKEN_TTL_SECONDS = 3600  # tokens expire after 1 hour


def sign_html(html_content: str) -> str:
    """
    Create a short-lived signed token that proves this HTML was generated
    by our backend. Prevents arbitrary HTML from being deployed via /deploy/pagedin.
    Token format: {timestamp}.{signature}
    """
    timestamp = int(time.time())
    content_hash = hashlib.sha256(html_content.encode()).hexdigest()
    payload = f"{timestamp}:{content_hash}"
    signature = hmac.new(
        HMAC_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{timestamp}.{signature}"


def verify_deploy_token(token: str, html_content: str) -> tuple[bool, str]:
    """
    Verify a deploy token against the provided HTML content.
    Returns (is_valid, error_message).
    """
    try:
        parts = token.split(".", 1)
        if len(parts) != 2:
            return False, "Malformed token"

        timestamp_str, provided_signature = parts
        timestamp = int(timestamp_str)

        # Check expiry
        age = time.time() - timestamp
        if age > TOKEN_TTL_SECONDS:
            return False, "Deploy token has expired. Please regenerate your site."
        if age < 0:
            return False, "Invalid token timestamp"

        # Recompute expected signature
        content_hash = hashlib.sha256(html_content.encode()).hexdigest()
        payload = f"{timestamp}:{content_hash}"
        expected_signature = hmac.new(
            HMAC_SECRET.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()

        # Constant-time comparison to prevent timing attacks
        if not hmac.compare_digest(provided_signature, expected_signature):
            return False, "Token signature mismatch. The HTML content may have been tampered with."

        return True, ""

    except (ValueError, AttributeError) as e:
        logger.warning(f"Token verification error: {e}")
        return False, "Invalid token format"
