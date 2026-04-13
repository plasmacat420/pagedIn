/**
 * PagedIn API client
 * All calls go to the FastAPI backend on Render.
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
const IS_DEV = import.meta.env.DEV

// ── Frontend logger ──────────────────────────────────────────────────────────
// Groups errors in the browser console with full context so you can see exactly
// what call failed, what the server returned, and how long it took.
const log = {
  info:  (...a) => IS_DEV && console.info('[PagedIn]', ...a),
  warn:  (...a) => console.warn('[PagedIn]', ...a),
  error: (...a) => console.error('[PagedIn]', ...a),
}

class ApiError extends Error {
  constructor(message, status, path) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.path = path
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const t0 = performance.now()

  let res
  try {
    res = await fetch(url, { ...options })
  } catch (networkErr) {
    const ms = Math.round(performance.now() - t0)
    log.error(`NETWORK_ERROR ${options.method || 'GET'} ${path} (${ms}ms)`, networkErr.message)
    throw new ApiError(
      'Could not reach the server. Check your connection or try again.',
      0,
      path,
    )
  }

  const ms = Math.round(performance.now() - t0)

  let data
  try {
    data = await res.json()
  } catch {
    data = { message: 'Unexpected server response. Please try again.' }
  }

  if (!res.ok) {
    const msg = data?.detail || data?.message || `Request failed (${res.status})`
    log.warn(`API_ERROR ${options.method || 'GET'} ${path} → ${res.status} (${ms}ms)`, msg)
    throw new ApiError(msg, res.status, path)
  }

  log.info(`${options.method || 'GET'} ${path} → ${res.status} (${ms}ms)`)
  return data
}

/**
 * Parse a resume from plain text.
 */
export async function parseResumeText(text, honeypot = '') {
  const formData = new FormData()
  formData.append('text', text)
  formData.append('honeypot', honeypot)

  return request('/parse', {
    method: 'POST',
    body: formData,
  })
}

/**
 * Parse a resume from a PDF File object.
 */
export async function parseResumePdf(file, honeypot = '') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('honeypot', honeypot)

  return request('/parse', {
    method: 'POST',
    body: formData,
  })
}

/**
 * Generate resume HTML from structured data + theme.
 * Returns { html, deploy_token, theme }
 */
export async function generateSite(resume, theme) {
  return request('/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'PagedIn-Frontend/1.0 Mozilla/5.0',
    },
    body: JSON.stringify({ resume, theme }),
  })
}

/**
 * Deploy using the PagedIn owner GitHub account.
 * Returns { url }
 */
export async function deployPagedin(html, deployToken, parsedName, honeypot = '') {
  return request('/deploy/pagedin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'PagedIn-Frontend/1.0 Mozilla/5.0',
    },
    body: JSON.stringify({
      html,
      deploy_token: deployToken,
      parsed_name: parsedName,
      honeypot,
    }),
  })
}

/**
 * Deploy to the user's own GitHub account.
 * Returns { url }
 */
export async function deploySelf(html, githubToken, firstName, honeypot = '') {
  return request('/deploy/self', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'PagedIn-Frontend/1.0 Mozilla/5.0',
    },
    body: JSON.stringify({
      html,
      github_token: githubToken,
      first_name: firstName,
      honeypot,
    }),
  })
}

/**
 * Fetch live deploy stats.
 * Returns { pages_deployed }
 */
export async function getStats() {
  return request('/stats', { method: 'GET' })
}

/**
 * Exchange a GitHub OAuth code for an access token.
 * Returns { access_token }
 */
export async function exchangeGithubCode(code) {
  return request('/auth/github', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'PagedIn-Frontend/1.0 Mozilla/5.0',
    },
    body: JSON.stringify({ code }),
  })
}
