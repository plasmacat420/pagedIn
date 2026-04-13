"""
Document parsing + enhancement via Groq (Llama-3.3-70b).

Handles 4 document families, each with its own template:
  - resume    : CV, professional history
  - business  : company, brand, agency, startup
  - portfolio : developer/designer/creative project showcase
  - landing   : personal brand, nonprofit, event, musician, athlete, coach, other

Safety gate runs first — inappropriate content is rejected before any extraction.
"""
import json
import logging
import os
import time
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

SYSTEM_PROMPT = """You are PagedIn — an AI that reads any professional document and transforms it into structured data for a beautiful public webpage.

━━━ STEP 1: SAFETY CHECK ━━━
Determine if this content is safe to publish publicly.
Reject (safe: false) if the input is ANY of the following:
• Instructions or prompts telling you what to generate ("make me a page", "create a website about", "write content for", "generate a page where", "build me a site") — these are not documents, they are prompts
• NSFW, sexual, or adult content
• Hate speech, discrimination, or harassment
• Instructions for illegal activity
• Spam, phishing, or scam content
• Complete gibberish with zero real information

For instruction-style input, use this rejection_reason exactly:
"Looks like you typed instructions instead of pasting a real document. PagedIn reads your actual content — paste your real resume, bio, business profile, or any professional document and we'll build the page from it."

Everything else is acceptable: resumes, businesses, portfolios, musicians, athletes, coaches, nonprofits, events, personal brands, freelancers, students, creators — all welcome.

If rejected, return ONLY:
{"safe": false, "rejection_reason": "Short, friendly explanation of why this can't be published."}

━━━ STEP 2: CLASSIFY ━━━
Pick the best doc_type:
• "resume"    — personal CV, professional history, job seeker
• "business"  — company, agency, startup, product, service business, brand
• "portfolio" — showcase of work: developer, designer, photographer, artist, writer, filmmaker
• "landing"   — everything else: personal brand, musician, athlete, coach, speaker, nonprofit, event, influencer, freelancer without a portfolio focus

━━━ STEP 3: EXTRACT + ENHANCE ━━━
Extract all relevant information and write compelling copy. Do NOT just copy text verbatim — rewrite it to sound professional and engaging.

══════════════════════════════════════
RESUME schema:
══════════════════════════════════════
{
  "safe": true,
  "doc_type": "resume",
  "name": "Full Name",
  "title": "Professional Title (e.g. Senior Software Engineer)",
  "summary": "Compelling 2–3 sentence professional summary. Never start with 'I'. Lead with strongest trait, mention key technologies/domains, end with the value they bring.",
  "email": "", "phone": "", "location": "City, Country", "linkedin": "", "github": "", "website": "",
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
        "Strong rewritten bullet: action verb → specific contribution → measurable result. Max 140 chars."
      ]
    }
  ],
  "education": [
    {"institution": "", "degree": "Degree, Field", "start": "Year", "end": "Year", "gpa": "", "notes": ""}
  ],
  "certifications": ["Cert Name (Issuer, Year)"]
}
Resume rules: Group skills into logical categories (Languages, Frameworks, Tools, Cloud & DevOps, etc). Rewrite every bullet with strong action verb + impact. Sort experience newest first.

══════════════════════════════════════
BUSINESS schema:
══════════════════════════════════════
{
  "safe": true,
  "doc_type": "business",
  "company_name": "",
  "tagline": "Punchy benefit-led value prop. Max 10 words. Never generic.",
  "industry": "e.g. SaaS, Healthcare, Consulting",
  "about": "Write 3–4 compelling sentences: what they do, who they serve, what makes them different, their mission.",
  "services": [
    {"name": "Service Name", "description": "2 sentences: what it is + the value it delivers.", "icon": "single emoji"}
  ],
  "highlights": [{"stat": "10K+", "label": "Customers Served"}],
  "contact": {"email": "", "phone": "", "website": "", "location": "", "linkedin": "", "twitter": ""},
  "team": [{"name": "", "role": ""}]
}
Business rules: tagline must be specific and punchy. Write about section fresh. Group features into logical service offerings.

══════════════════════════════════════
PORTFOLIO schema:
══════════════════════════════════════
{
  "safe": true,
  "doc_type": "portfolio",
  "name": "Full Name",
  "title": "e.g. Full Stack Developer · UI Designer · Photographer",
  "tagline": "One punchy line about what you create or stand for. Max 12 words.",
  "about": "2–3 sentences: who you are, what you build or create, what drives you.",
  "email": "", "location": "", "github": "", "linkedin": "", "website": "", "twitter": "",
  "projects": [
    {
      "name": "Project Name",
      "description": "2 sentences: what it is and why it matters or what you built.",
      "tags": ["React", "Python", "AI"],
      "url": "",
      "year": "2024"
    }
  ],
  "skills": {"Category": ["skill1", "skill2"]},
  "experience": [{"company": "", "role": "", "start": "", "end": ""}]
}
Portfolio rules: extract ALL projects — apps, sites, designs, photos, artwork, writing samples. tags = technologies or creative mediums used. Make tagline memorable.

══════════════════════════════════════
LANDING schema (personal brand, nonprofit, event, musician, athlete, coach, speaker, etc.):
══════════════════════════════════════
{
  "safe": true,
  "doc_type": "landing",
  "title": "Name or Organization Name",
  "headline": "Bold 5–8 word statement capturing their identity or mission.",
  "subheadline": "1–2 sentences expanding the headline. Specific and compelling.",
  "about": "3–4 sentence paragraph. Who they are, what they do, what makes them remarkable.",
  "features": [
    {"icon": "single emoji", "title": "Offering or Strength", "description": "1–2 sentences of value."}
  ],
  "highlights": [{"stat": "500+", "label": "Shows Performed"}],
  "team": [{"name": "", "role": ""}],
  "contact": {"email": "", "phone": "", "website": "", "location": "", "linkedin": "", "twitter": "", "instagram": ""},
  "cta_text": "Compelling action phrase (e.g. Book a Session, See My Work, Join the Mission)",
  "cta_url": ""
}
Landing rules: headline must be bold and memorable — not generic. features = their main offerings, skills, or reasons to care. highlights = any numbers or achievements worth showcasing.

Return ONLY the JSON object. No markdown. No explanation."""


async def parse_resume(text: str) -> dict:
    """
    Parse and enhance any professional document using Groq.
    Returns structured JSON with doc_type field.
    Raises ValueError if content is unsafe or parsing fails.
    """
    logger.info(f"Groq/Llama request: {len(text)} chars input")

    t0 = time.perf_counter()
    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=4096,
            temperature=0.3,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": f"Parse and enhance this document:\n\n{text}"},
            ],
        )
    except Exception as e:
        elapsed = int((time.perf_counter() - t0) * 1000)
        logger.error(f"Groq API error after {elapsed}ms: {type(e).__name__}: {e}")
        raise
    elapsed = int((time.perf_counter() - t0) * 1000)

    raw = response.choices[0].message.content.strip()
    usage = response.usage
    logger.info(
        f"Groq response: {elapsed}ms | "
        f"tokens in={usage.prompt_tokens} out={usage.completion_tokens} | "
        f"raw={len(raw)} chars"
    )

    # Strip accidental markdown fences
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e} | Raw response preview: {raw[:500]}")
        raise ValueError("Failed to parse AI response. Please try again.")

    # Safety gate — raised as ValueError so parse router returns 422
    if not data.get("safe", True):
        reason = data.get("rejection_reason", "This content can't be published.")
        logger.warning(f"Content rejected by safety gate: {reason}")
        raise ValueError(reason)

    doc_type = data.get("doc_type", "resume")
    _apply_defaults(data, doc_type)

    label = (data.get("name") or data.get("company_name") or
             data.get("title") or "unknown")
    logger.info(f"Parsed doc_type='{doc_type}' label='{label}'")
    return data


def _apply_defaults(data: dict, doc_type: str) -> None:
    if doc_type == "resume":
        _apply_resume_defaults(data)
    elif doc_type == "business":
        _apply_business_defaults(data)
    elif doc_type == "portfolio":
        _apply_portfolio_defaults(data)
    else:
        _apply_landing_defaults(data)


def _apply_resume_defaults(data: dict) -> None:
    defaults = {
        "name": "Your Name", "title": "", "summary": "",
        "email": "", "phone": "", "location": "",
        "linkedin": "", "github": "", "website": "",
        "skills": {}, "experience": [], "education": [], "certifications": [],
    }
    for k, v in defaults.items():
        data.setdefault(k, v)
    if isinstance(data["skills"], list):
        data["skills"] = {"Skills": data["skills"]}


def _apply_business_defaults(data: dict) -> None:
    defaults = {
        "company_name": "Company Name", "tagline": "", "industry": "",
        "about": "", "services": [], "highlights": [], "contact": {}, "team": [],
    }
    for k, v in defaults.items():
        data.setdefault(k, v)
    for f in ("email", "phone", "website", "location", "linkedin", "twitter"):
        data["contact"].setdefault(f, "")


def _apply_portfolio_defaults(data: dict) -> None:
    defaults = {
        "name": "Your Name", "title": "", "tagline": "", "about": "",
        "email": "", "location": "", "github": "", "linkedin": "",
        "website": "", "twitter": "",
        "projects": [], "skills": {}, "experience": [],
    }
    for k, v in defaults.items():
        data.setdefault(k, v)
    if isinstance(data["skills"], list):
        data["skills"] = {"Skills": data["skills"]}


def _apply_landing_defaults(data: dict) -> None:
    defaults = {
        "title": "My Page", "headline": "", "subheadline": "",
        "about": "", "features": [], "highlights": [],
        "team": [], "contact": {}, "cta_text": "", "cta_url": "",
    }
    for k, v in defaults.items():
        data.setdefault(k, v)
    for f in ("email", "phone", "website", "location", "linkedin", "twitter", "instagram"):
        data["contact"].setdefault(f, "")
