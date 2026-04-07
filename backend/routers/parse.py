"""
POST /parse — accepts resume text or PDF, returns structured JSON.
"""
import io
import logging
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from pypdf import PdfReader
from services.claude_service import parse_resume

logger = logging.getLogger(__name__)
router = APIRouter()


class ParseTextRequest(BaseModel):
    text: str
    honeypot: str = ""  # must always be empty — bots fill this


@router.post("/parse")
async def parse_endpoint(
    # Support both JSON body (text paste) and form/file upload
    text: Optional[str] = Form(None),
    honeypot: Optional[str] = Form(""),
    file: Optional[UploadFile] = File(None),
):
    """
    Parse a resume from raw text or a PDF upload.
    Returns structured JSON with name, title, skills, experience, etc.
    """
    # Honeypot check — bots that fill this field are silently rejected
    if honeypot:
        logger.warning(f"HONEYPOT_TRIGGERED path=/parse")
        # Return fake success — don't reveal to bots that we blocked them
        return JSONResponse(content={"name": "Processing complete", "skills": []})

    resume_text = ""

    # Extract text from PDF upload
    if file is not None:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are supported. Please upload a .pdf file."
            )
        try:
            pdf_bytes = await file.read()
            reader = PdfReader(io.BytesIO(pdf_bytes))
            pages_text = [page.extract_text() or "" for page in reader.pages]
            resume_text = "\n\n".join(pages_text).strip()
        except Exception as e:
            logger.error(f"PDF parse error: {e}")
            raise HTTPException(
                status_code=400,
                detail="Could not read the PDF file. Try copying and pasting your resume text instead."
            )
    elif text:
        resume_text = text.strip()
    else:
        raise HTTPException(
            status_code=400,
            detail="Please provide resume text or upload a PDF file."
        )

    if len(resume_text) < 50:
        raise HTTPException(
            status_code=400,
            detail="Resume text is too short. Please provide more content."
        )

    try:
        data = await parse_resume(resume_text)
        return JSONResponse(content=data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Parse error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Resume parsing failed. Please try again in a moment."
        )
