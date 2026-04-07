"""
Jinja2-based HTML generation for resume sites.
Templates are self-contained single HTML files with embedded CSS.
"""
import logging
import os
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

logger = logging.getLogger(__name__)

# Resolve the /templates directory relative to this file
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


def generate_html(resume_data: dict, theme: str) -> str:
    """Render a self-contained resume HTML file from structured data and theme."""
    if theme not in VALID_THEMES:
        raise ValueError(f"Unknown theme '{theme}'. Valid themes: {', '.join(VALID_THEMES)}")

    template_name = f"{theme}.html"
    env = _get_env()

    try:
        template = env.get_template(template_name)
    except Exception as e:
        logger.error(f"Template load error: {e}")
        raise ValueError(f"Failed to load template '{template_name}'")

    html = template.render(**resume_data)
    logger.info(f"Generated HTML ({len(html)} chars) using theme={theme} for {resume_data.get('name', '?')}")
    return html
