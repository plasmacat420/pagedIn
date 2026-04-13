"""
Jinja2-based HTML generation.
Routes to the best template based on doc_type + light/dark preference.
Injects a curated Unsplash cover image based on content keywords.
Templates are fully self-contained HTML files with embedded CSS.
"""
import logging
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent.parent / "templates"
VALID_THEMES = {"minimal_light", "modern_dark"}

TEMPLATE_MAP = {
    "resume":    {"light": "minimal_light.html",  "dark": "modern_dark.html"},
    "business":  {"light": "business_light.html", "dark": "business_dark.html"},
    "portfolio": {"light": "portfolio_light.html","dark": "portfolio_dark.html"},
    "landing":   {"light": "landing_light.html",  "dark": "landing_dark.html"},
}

# Curated Unsplash photo IDs — specific photos that won't change or expire
# Format: https://images.unsplash.com/photo-{id}?w=1400&h=500&fit=crop&q=80
_PHOTO_MAP = {
    "gaming":       "1542751371-adc38448a05e",
    "game":         "1542751371-adc38448a05e",
    "esport":       "1542751371-adc38448a05e",
    "tech":         "1555066931-bf19f8fd1085",
    "software":     "1555066931-bf19f8fd1085",
    "developer":    "1461749280684-dccba630e2f6",
    "engineering":  "1461749280684-dccba630e2f6",
    "design":       "1558655146-9f40138edfeb",
    "creative":     "1558655146-9f40138edfeb",
    "ui":           "1558655146-9f40138edfeb",
    "ux":           "1558655146-9f40138edfeb",
    "music":        "1493225457124-a3eb161ffa5f",
    "band":         "1493225457124-a3eb161ffa5f",
    "artist":       "1493225457124-a3eb161ffa5f",
    "studio":       "1493225457124-a3eb161ffa5f",
    "fitness":      "1534438327276-14e5300c3a48",
    "gym":          "1534438327276-14e5300c3a48",
    "sports":       "1461896836934-ffe607ba8211",
    "athlete":      "1461896836934-ffe607ba8211",
    "coach":        "1571019613914-85f342c6a11f",
    "food":         "1414235077428-338989a2e8c0",
    "restaurant":   "1414235077428-338989a2e8c0",
    "chef":         "1414235077428-338989a2e8c0",
    "health":       "1559757148-5c350d0d3c56",
    "medical":      "1559757148-5c350d0d3c56",
    "education":    "1524178232363-1fb2b075b655",
    "school":       "1524178232363-1fb2b075b655",
    "finance":      "1554224155-6726b3ff858f",
    "consulting":   "1497366412874-3415097a27fe",
    "agency":       "1497366412874-3415097a27fe",
    "marketing":    "1432888622747-4eb9a8f2c293",
    "photography":  "1495745966610-2a67f2297e5e",
    "photo":        "1495745966610-2a67f2297e5e",
    "travel":       "1488085061387-422e29b40080",
    "nonprofit":    "1593113630400-ea4288922497",
    "community":    "1593113630400-ea4288922497",
    "startup":      "1486312338219-ce68d2c6f44d",
    "saas":         "1486312338219-ce68d2c6f44d",
    "architecture": "1486325212027-8081e485255e",
    "legal":        "1436450412741-6b59eaa45d6c",
    "law":          "1436450412741-6b59eaa45d6c",
    "fashion":      "1558769132-cb1aea153262",
    "retail":       "1441986300917-64674bd600d8",
}

# Fallback images per doc_type
_DEFAULT_PHOTOS = {
    "resume":    "1486312338219-ce68d2c6f44d",  # person at laptop
    "business":  "1497366216548-37526070297c",  # modern office
    "portfolio": "1558655146-9f40138edfeb",     # creative workspace
    "landing":   "1486406146926-c627a92ad1ab",  # city / abstract
}

_env: Environment | None = None


def _get_env() -> Environment:
    global _env
    if _env is None:
        _env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=select_autoescape(["html"]),
        )
    return _env


def _pick_cover_image(data: dict) -> str:
    """Pick a relevant Unsplash cover photo based on content keywords."""
    doc_type = data.get("doc_type", "resume")

    # Build a text blob from every relevant string field
    blobs = [
        data.get("industry", ""),
        data.get("title", ""),
        data.get("company_name", ""),
        data.get("name", ""),
        data.get("tagline", ""),
        data.get("headline", ""),
    ]
    # Add service names if present
    for svc in data.get("services", []):
        blobs.append(svc.get("name", "") if isinstance(svc, dict) else "")
    for feat in data.get("features", []):
        blobs.append(feat.get("title", "") if isinstance(feat, dict) else "")

    text = " ".join(blobs).lower()

    photo_id = None
    for keyword, pid in _PHOTO_MAP.items():
        if keyword in text:
            photo_id = pid
            break

    if not photo_id:
        photo_id = _DEFAULT_PHOTOS.get(doc_type, "1486406146926-c627a92ad1ab")

    return f"https://images.unsplash.com/photo-{photo_id}?w=1400&h=500&fit=crop&q=80&auto=format"


def generate_html(data: dict, theme: str) -> str:
    """
    Render a self-contained HTML page from structured document data.
    Template is chosen by doc_type + light/dark mode.
    A relevant cover image URL is injected automatically.
    """
    if theme not in VALID_THEMES:
        raise ValueError(f"Unknown theme '{theme}'. Valid: {', '.join(VALID_THEMES)}")

    doc_type = data.get("doc_type", "resume")
    mode = "dark" if "dark" in theme else "light"

    templates = TEMPLATE_MAP.get(doc_type, TEMPLATE_MAP["resume"])
    template_name = templates[mode]

    env = _get_env()
    try:
        template = env.get_template(template_name)
    except Exception as e:
        logger.error(f"Template load error [{template_name}]: {e}")
        raise ValueError(f"Failed to load template '{template_name}'")

    # Inject cover image — templates use {{ cover_image }} in hero sections
    cover_image = _pick_cover_image(data)

    html = template.render(**data, cover_image=cover_image)
    label = (data.get("name") or data.get("company_name") or
             data.get("title") or "?")
    logger.info(f"Generated HTML ({len(html):,} chars) template={template_name} for '{label}'")
    return html
