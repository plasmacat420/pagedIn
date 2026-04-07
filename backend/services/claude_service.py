"""
Resume parsing via Groq API (fast open-source model inference).
Extracts structured data from raw resume text.
"""
import json
import logging
import os
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

PARSE_SYSTEM_PROMPT = """You are an expert resume parser. Extract structured data from the provided resume text and return it as valid JSON.

Always return a JSON object with exactly these fields (use empty string or empty array if data is missing):
{
  "name": "Full Name",
  "title": "Professional Title / Current Role",
  "summary": "2-4 sentence professional summary",
  "email": "email@example.com",
  "phone": "phone number or empty string",
  "location": "City, State or empty string",
  "linkedin": "LinkedIn URL or empty string",
  "github": "GitHub URL or empty string",
  "website": "personal website URL or empty string",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "start": "Month Year",
      "end": "Month Year or Present",
      "location": "City, State or Remote",
      "bullets": ["achievement 1", "achievement 2", ...]
    }
  ],
  "education": [
    {
      "institution": "School Name",
      "degree": "Degree and Field",
      "start": "Year",
      "end": "Year or Present",
      "gpa": "GPA or empty string",
      "notes": "honors, activities, or empty string"
    }
  ],
  "certifications": ["Certification Name (Year)", ...]
}

Rules:
- Keep bullets concise and impactful — max 120 characters each
- Extract ALL skills mentioned anywhere in the resume
- Sort experience from most recent to oldest
- If a summary is not in the resume, write a compelling one based on the content
- Return ONLY the JSON object, no markdown, no explanation
"""


async def parse_resume(text: str) -> dict:
    """Use Grok to extract structured resume data from raw text."""
    logger.info(f"Parsing resume ({len(text)} chars) via Groq/Llama")

    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=4096,
        messages=[
            {"role": "system", "content": PARSE_SYSTEM_PROMPT},
            {"role": "user", "content": f"Parse this resume:\n\n{text}"},
        ],
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if Grok wrapped the JSON
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude response as JSON: {e}\nRaw: {raw[:500]}")
        raise ValueError("Failed to parse resume structure from AI response. Please try again.")

    # Ensure required fields exist with defaults
    defaults = {
        "name": "Your Name",
        "title": "",
        "summary": "",
        "email": "",
        "phone": "",
        "location": "",
        "linkedin": "",
        "github": "",
        "website": "",
        "skills": [],
        "experience": [],
        "education": [],
        "certifications": [],
    }
    for key, default in defaults.items():
        if key not in data:
            data[key] = default

    logger.info(f"Parsed resume for: {data.get('name', 'Unknown')}")
    return data
