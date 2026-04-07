"""
Jinja2-based HTML generation.
Routes to resume or business templates based on doc_type in the data.
Templates are fully self-contained HTML files with embedded CSS.
"""
import logging
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent.parent / "templates"
VALID_THEMES = {"minimal_light", "modern_dark"}

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
    Routes to business templates when doc_type == 'business'.
    """
    if theme not in VALID_THEMES:
        raise ValueError(f"Unknown theme '{theme}'. Valid: {', '.join(VALID_THEMES)}")

    doc_type = data.get("doc_type", "resume")
    suffix = theme.split("_")[1]   # 'light' or 'dark'

    if doc_type == "business":
        template_name = f"business_{suffix}.html"
    else:
        template_name = f"{theme}.html"

    env = _get_env()
    try:
        template = env.get_template(template_name)
    except Exception as e:
        logger.error(f"Template load error [{template_name}]: {e}")
        raise ValueError(f"Failed to load template '{template_name}'")

    html = template.render(**data)
    label = data.get("name") or data.get("company_name", "?")
    logger.info(f"Generated HTML ({len(html)} chars) theme={template_name} for '{label}'")
    return html
