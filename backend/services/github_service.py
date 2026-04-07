"""
GitHub API integration for deploying resume sites.
Handles both owner-hosted (PagedIn account) and user self-hosted deployments.
"""
import asyncio
import base64
import logging
import os
import random
import re
import string
import time
import httpx

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"
PAGES_POLL_INTERVAL = 5   # seconds between GitHub Pages status polls
PAGES_POLL_TIMEOUT = 50   # max seconds to wait for Pages to go live


def _slugify(name: str) -> str:
    """Convert a name to a URL-safe slug: 'John Doe' → 'john-doe'"""
    slug = re.sub(r"[^\w\s-]", "", name.lower())
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug[:40]  # cap length


def _random_suffix(length: int = 4) -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


async def _github_request(
    method: str,
    path: str,
    token: str,
    **kwargs,
) -> httpx.Response:
    """Make an authenticated GitHub API request."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "PagedIn-App/1.0",
    }
    url = f"{GITHUB_API}{path}"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.request(method, url, headers=headers, **kwargs)
    return response


async def _create_repo(token: str, org_or_user: str, repo_name: str, is_org: bool) -> dict:
    """Create a new public GitHub repo. Returns repo data."""
    if is_org:
        path = f"/orgs/{org_or_user}/repos"
    else:
        path = "/user/repos"

    resp = await _github_request(
        "POST", path, token,
        json={
            "name": repo_name,
            "description": "My resume site — built with PagedIn 🚀",
            "private": False,
            "auto_init": False,
            "has_issues": False,
            "has_projects": False,
            "has_wiki": False,
        }
    )

    if resp.status_code == 422:
        # Repo likely already exists — caller should retry with different name
        raise ValueError(f"Repository '{repo_name}' already exists on this account.")
    if resp.status_code not in (200, 201):
        logger.error(f"Create repo failed: {resp.status_code} {resp.text[:300]}")
        raise RuntimeError(f"GitHub API error creating repository: {resp.status_code}")

    return resp.json()


async def _push_file(
    token: str,
    owner: str,
    repo: str,
    file_path: str,
    content: str,
    message: str = "Deploy resume site via PagedIn",
    sha: str | None = None,
) -> None:
    """Create or update a file in a GitHub repo."""
    encoded = base64.b64encode(content.encode()).decode()
    payload: dict = {"message": message, "content": encoded}
    if sha:
        payload["sha"] = sha

    resp = await _github_request(
        "PUT", f"/repos/{owner}/{repo}/contents/{file_path}", token, json=payload
    )

    if resp.status_code not in (200, 201):
        logger.error(f"Push file failed: {resp.status_code} {resp.text[:300]}")
        raise RuntimeError(f"GitHub API error pushing file: {resp.status_code}")


async def _enable_pages(token: str, owner: str, repo: str) -> None:
    """Enable GitHub Pages on the main branch."""
    resp = await _github_request(
        "POST", f"/repos/{owner}/{repo}/pages", token,
        json={"source": {"branch": "main", "path": "/"}}
    )
    # 201 = created, 409 = already enabled — both are fine
    if resp.status_code not in (201, 409):
        logger.error(f"Enable pages failed: {resp.status_code} {resp.text[:300]}")
        raise RuntimeError(f"GitHub API error enabling Pages: {resp.status_code}")


async def _wait_for_pages(token: str, owner: str, repo: str, expected_url: str) -> str:
    """
    Poll the GitHub Pages API until the site is active or timeout.
    Returns the final URL (expected_url) regardless, since Pages can take time.
    """
    deadline = time.monotonic() + PAGES_POLL_TIMEOUT
    while time.monotonic() < deadline:
        resp = await _github_request("GET", f"/repos/{owner}/{repo}/pages", token)
        if resp.status_code == 200:
            data = resp.json()
            status = data.get("status")
            url = data.get("html_url", expected_url)
            if status in ("built", "errored"):
                return url
        await asyncio.sleep(PAGES_POLL_INTERVAL)

    # Return the expected URL even if we timed out — Pages will catch up
    logger.info(f"Pages polling timed out for {owner}/{repo}, returning expected URL")
    return expected_url


# ── Public API ──────────────────────────────────────────────────────────────

async def deploy_as_owner(html_content: str, parsed_name: str) -> str:
    """
    Deploy a resume site using the PagedIn owner GitHub account.
    Returns the live GitHub Pages URL.
    """
    token = os.getenv("GITHUB_OWNER_TOKEN", "")
    org = os.getenv("GITHUB_OWNER_ORG", "")

    if not token or not org:
        raise RuntimeError("Owner GitHub credentials not configured on this server.")

    # Check if org is actually a user account (used for solo deployments)
    is_org = await _is_org(token, org)

    # Generate slug with random suffix to prevent collisions
    base_slug = _slugify(parsed_name) or "resume"
    suffix = _random_suffix()
    repo_name = f"{base_slug}-{suffix}"

    # Retry once with a different suffix if there's a collision (rare)
    try:
        await _create_repo(token, org, repo_name, is_org)
    except ValueError:
        repo_name = f"{base_slug}-{_random_suffix()}"
        await _create_repo(token, org, repo_name, is_org)

    await _push_file(token, org, repo_name, "index.html", html_content)
    await _enable_pages(token, org, repo_name)

    expected_url = f"https://{org}.github.io/{repo_name}"
    live_url = await _wait_for_pages(token, org, repo_name, expected_url)

    logger.info(f"Owner deploy complete: {live_url}")
    return live_url


async def deploy_as_user(html_content: str, user_token: str, first_name: str) -> str:
    """
    Deploy a resume site to a user's own GitHub account via OAuth token.
    Returns the live GitHub Pages URL.
    """
    # Get the authenticated user's login
    user_resp = await _github_request("GET", "/user", user_token)
    if user_resp.status_code != 200:
        raise RuntimeError("Failed to fetch GitHub user info. Please reconnect your account.")
    user_login = user_resp.json()["login"]

    # Build repo name
    base_name = _slugify(first_name or "my") + "-resume-site"
    repo_name = base_name

    # Handle existing repo — append number suffix
    for attempt in range(1, 6):
        try:
            await _create_repo(user_token, user_login, repo_name, is_org=False)
            break
        except ValueError:
            repo_name = f"{base_name}-{attempt}"
    else:
        raise RuntimeError("Could not create a unique repository name. Please check your GitHub account.")

    await _push_file(user_token, user_login, repo_name, "index.html", html_content)
    await _enable_pages(user_token, user_login, repo_name)

    expected_url = f"https://{user_login}.github.io/{repo_name}"
    live_url = await _wait_for_pages(user_token, user_login, repo_name, expected_url)

    logger.info(f"Self deploy complete for {user_login}: {live_url}")
    return live_url


async def _is_org(token: str, name: str) -> bool:
    """Check if a GitHub name is an org (vs personal account)."""
    resp = await _github_request("GET", f"/orgs/{name}", token)
    return resp.status_code == 200


async def exchange_code_for_token(code: str) -> str:
    """Exchange a GitHub OAuth code for an access token."""
    client_id = os.getenv("GITHUB_CLIENT_ID", "")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET", "")

    async with httpx.AsyncClient(timeout=15) as http:
        resp = await http.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )

    if resp.status_code != 200:
        raise RuntimeError("GitHub token exchange failed")

    data = resp.json()
    token = data.get("access_token")
    if not token:
        error = data.get("error_description", data.get("error", "Unknown error"))
        raise RuntimeError(f"GitHub OAuth error: {error}")

    return token
