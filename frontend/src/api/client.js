/**
 * PagedIn API client
 * All calls go to the FastAPI backend on Render.
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PagedIn-Frontend/1.0 Mozilla/5.0' },
    ...options,
  })

  let data
  try {
    data = await res.json()
  } catch {
    data = { message: 'Unexpected server response. Please try again.' }
  }

  if (!res.ok) {
    const msg = data?.detail || data?.message || `Request failed (${res.status})`
    throw new ApiError(msg, res.status)
  }

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
