"""
POST /generate — generates HTML from structured data + theme.
Returns HTML + a signed deploy token.
"""
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.template_service import generate_html, VALID_THEMES
from utils.security import sign_html

logger = logging.getLogger(__name__)
router = APIRouter()

# Required field per doc_type — used only to catch completely empty AI responses
_REQUIRED = {
    "resume":    "name",
    "business":  "company_name",
    "portfolio": "name",
    "landing":   "title",
}


class GenerateRequest(BaseModel):
    resume: dict
    theme: str = "minimal_light"


@router.post("/generate")
async def generate_endpoint(body: GenerateRequest):
    if body.theme not in VALID_THEMES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid theme. Choose one of: {', '.join(VALID_THEMES)}"
        )

    data = body.resume
    doc_type = data.get("doc_type", "resume")

    # Ensure the AI returned at least the primary identifier field
    required_field = _REQUIRED.get(doc_type, "name")
    if not data.get(required_field):
        # Apply a safe fallback rather than hard-erroring — keeps UX smooth
        fallbacks = {
            "name":         "My Page",
            "company_name": "My Company",
            "title":        "My Page",
        }
        data[required_field] = fallbacks.get(required_field, "My Page")
        logger.warning(f"Missing '{required_field}' for doc_type='{doc_type}' — applied fallback")

    try:
        html = generate_html(data, body.theme)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"HTML generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Site generation failed. Please try again.")

    deploy_token = sign_html(html)

    return JSONResponse(content={
        "html": html,
        "deploy_token": deploy_token,
        "theme": body.theme,
    })
