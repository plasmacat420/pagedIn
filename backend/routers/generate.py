"""
POST /generate — generates resume HTML from structured data + theme.
Returns HTML + a signed deploy token.
"""
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from services.template_service import generate_html, VALID_THEMES
from utils.security import sign_html

logger = logging.getLogger(__name__)
router = APIRouter()


class GenerateRequest(BaseModel):
    resume: dict
    theme: str = "minimal_light"


@router.post("/generate")
async def generate_endpoint(body: GenerateRequest):
    """
    Generate a self-contained resume HTML site.
    Returns the rendered HTML and a signed token required for /deploy/pagedin.
    """
    if body.theme not in VALID_THEMES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid theme. Choose one of: {', '.join(VALID_THEMES)}"
        )

    doc_type = body.resume.get("doc_type", "resume")
    if doc_type == "business":
        if not body.resume.get("company_name"):
            raise HTTPException(status_code=400, detail="Business document must include a company name.")
    else:
        if not body.resume.get("name"):
            raise HTTPException(status_code=400, detail="Resume must include at least a name.")

    try:
        html = generate_html(body.resume, body.theme)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"HTML generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Site generation failed. Please try again."
        )

    # Sign the HTML so /deploy/pagedin can verify it came from us
    deploy_token = sign_html(html)

    return JSONResponse(content={
        "html": html,
        "deploy_token": deploy_token,
        "theme": body.theme,
    })
