"""
Jinja2-based HTML generation.
Routes to the best template based on doc_type + light/dark preference.
Templates are fully self-contained HTML files with embedded CSS.
"""
import logging
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent.parent / "templates"
VALID_THEMES = {"minimal_light", "modern_dark"}

# Each doc_type maps to a light and dark template.
# "minimal_light" → light mode, "modern_dark" → dark mode.
TEMPLATE_MAP = {
    "resume":    {"light": "minimal_light.html",  "dark": "modern_dark.html"},
    "business":  {"light": "business_light.html", "dark": "business_dark.html"},
    "portfolio": {"light": "portfolio_light.html","dark": "portfolio_dark.html"},
    "landing":   {"light": "landing_light.html",  "dark": "landing_dark.html"},
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


def generate_html(data: dict, theme: str) -> str:
    """
    Render a self-contained HTML page from structured document data.
    Template is chosen by doc_type + light/dark mode from theme string.
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

    html = template.render(**data)
    label = (data.get("name") or data.get("company_name") or
             data.get("title") or "?")
    logger.info(f"Generated HTML ({len(html):,} chars) template={template_name} for '{label}'")
    return html
