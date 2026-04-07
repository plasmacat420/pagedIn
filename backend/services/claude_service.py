"""
Document parsing + enhancement via Groq (Llama-3.3-70b).

Handles two document types:
  - resume: extracts, categorises skills, rewrites bullets, writes summary
  - business: extracts brand info and writes compelling copy

Returns structured JSON with a `doc_type` field that drives template selection.
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

# ── Prompts ────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert content strategist, resume coach, and brand copywriter.

Your job is to read a document and return a single JSON object — no markdown, no explanation.

STEP 1 — Determine document type:
- "resume": a personal CV / resume listing work history, skills, education
- "business": a company brochure, pitch deck, one-pager, service menu, business profile

STEP 2 — Extract and ENHANCE based on type.

═══════════════════════════════════════════
IF RESUME — return exactly this shape:
═══════════════════════════════════════════
{
  "doc_type": "resume",
  "name": "Full Name",
  "title": "Professional Title (e.g. Senior Software Engineer)",
  "summary": "Write a compelling 2–3 sentence professional summary. Lead with their strongest trait, mention key technologies/domains, end with value they bring. Never start with 'I'.",
  "email": "email or empty string",
  "phone": "phone or empty string",
  "location": "City, Country or empty string",
  "linkedin": "full URL or empty string",
  "github": "full URL or empty string",
  "website": "full URL or empty string",
  "skills": {
    "CategoryName": ["skill1", "skill2"],
    "AnotherCategory": ["skill3"]
  },
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "start": "Month Year",
      "end": "Month Year or Present",
      "location": "City or Remote",
      "bullets": [
        "Strong rewritten bullet: action verb → specific contribution → measurable result. Max 140 chars.",
        "Another strong bullet"
      ]
    }
  ],
  "education": [
    {
      "institution": "School Name",
      "degree": "Degree, Field",
      "start": "Year",
      "end": "Year or Present",
      "gpa": "GPA or empty string",
      "notes": "Honors, relevant coursework, or empty"
    }
  ],
  "certifications": ["Cert Name (Issuer, Year)"]
}

RESUME enhancement rules:
- skills: group into logical categories (Languages, Frameworks, Tools, Cloud & DevOps, Databases, etc.). Never leave uncategorized.
- bullets: rewrite every bullet. Format = [Strong action verb] + [what you built/did] + [impact/result]. If no metric exists, imply scope or scale. Keep under 140 chars.
- summary: write it fresh if missing or weak. Make it genuinely compelling.
- Sort experience newest first.

═══════════════════════════════════════════
IF BUSINESS — return exactly this shape:
═══════════════════════════════════════════
{
  "doc_type": "business",
  "company_name": "Company Name",
  "tagline": "A punchy one-line value proposition. Max 10 words.",
  "industry": "e.g. SaaS, Healthcare, Retail, Consulting",
  "about": "Write 3–4 compelling sentences about this company. What they do, who they serve, what makes them different, their mission.",
  "services": [
    {
      "name": "Service or Product Name",
      "description": "2 sentence description of what it is and the value it delivers.",
      "icon": "single relevant emoji"
    }
  ],
  "highlights": [
    { "stat": "10K+", "label": "Customers Served" },
    { "stat": "5 years", "label": "In Business" }
  ],
  "contact": {
    "email": "or empty string",
    "phone": "or empty string",
    "website": "full URL or empty string",
    "location": "City, Country or empty string",
    "linkedin": "full URL or empty string",
    "twitter": "full URL or empty string"
  },
  "team": [
    { "name": "Person Name", "role": "Title" }
  ]
}

BUSINESS enhancement rules:
- tagline: punchy, benefit-led. Never generic ("Your trusted partner").
- about: write it — don't copy verbatim, make it flow.
- services: if the doc lists features, group them into logical service offerings. Write descriptions, don't just list names.
- highlights: extract any numbers/stats. If none exist, omit the array (empty []).
- team: only include if names+roles are clearly stated.

Return ONLY the JSON object. No markdown fences. No commentary."""


async def parse_resume(text: str) -> dict:
    """
    Parse and enhance a document (resume or business doc) using Groq.
    Returns structured JSON with doc_type field.
    """
    logger.info(f"Parsing document ({len(text)} chars) via Groq/Llama")

    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=4096,
        temperature=0.3,       # low temperature for structured extraction; slight warmth for copy
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Parse and enhance this document:\n\n{text}"},
        ],
    )

    raw = response.choices[0].message.content.strip()

    # Strip any accidental markdown fences
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e} | Raw: {raw[:400]}")
        raise ValueError("Failed to parse AI response. Please try again.")

    doc_type = data.get("doc_type", "resume")

    if doc_type == "resume":
        _apply_resume_defaults(data)
    else:
        _apply_business_defaults(data)

    logger.info(f"Parsed '{doc_type}' document: {data.get('name') or data.get('company_name', '?')}")
    return data


def _apply_resume_defaults(data: dict) -> None:
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
        "skills": {},
        "experience": [],
        "education": [],
        "certifications": [],
    }
    for k, v in defaults.items():
        data.setdefault(k, v)

    # Normalise skills: if it came back as a flat list, wrap it
    if isinstance(data["skills"], list):
        data["skills"] = {"Skills": data["skills"]}


def _apply_business_defaults(data: dict) -> None:
    defaults = {
        "company_name": "Company Name",
        "tagline": "",
        "industry": "",
        "about": "",
        "services": [],
        "highlights": [],
        "contact": {},
        "team": [],
    }
    for k, v in defaults.items():
        data.setdefault(k, v)
    data["contact"].setdefault("email", "")
    data["contact"].setdefault("phone", "")
    data["contact"].setdefault("website", "")
    data["contact"].setdefault("location", "")
    data["contact"].setdefault("linkedin", "")
    data["contact"].setdefault("twitter", "")
