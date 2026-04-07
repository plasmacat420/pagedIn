import { useState, useEffect } from 'react'
import { deployPagedin, deploySelf, exchangeGithubCode } from '../api/client'

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID

export default function DeployOptions({
  html,
  deployToken,
  parsedName,
  firstName,
  onDeployStart,   // called immediately when a deploy kicks off → triggers full-page loading
  onDeployed,
  onError,
}) {
  const [deploying, setDeploying] = useState(null)
  const [githubToken, setGithubToken] = useState(null)
  const [loadingOAuth, setLoadingOAuth] = useState(false)

  // Listen for OAuth popup callback
  useEffect(() => {
    function handleMessage(event) {
      // Only accept messages from our own origin
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'github_oauth' && event.data?.code) {
        handleGithubCode(event.data.code)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [html, deployToken, firstName])

  const handleGithubCode = async (code) => {
    setLoadingOAuth(true)
    try {
      const { access_token } = await exchangeGithubCode(code)
      setGithubToken(access_token)
      await runSelfDeploy(access_token)
    } catch (err) {
      onError(err.message || 'GitHub authentication failed. Please try again.')
    } finally {
      setLoadingOAuth(false)
    }
  }

  const runPagedinDeploy = async () => {
    if (deploying) return
    setDeploying('pagedin')
    onDeployStart()   // ← switches App to full-page deploying screen immediately
    try {
      const { url } = await deployPagedin(html, deployToken, parsedName)
      onDeployed(url)
    } catch (err) {
      // onError restores the preview screen so the user can retry
      onError(err.message || 'Deployment failed. Please try again.')
      setDeploying(null)
    }
  }

  const runSelfDeploy = async (token) => {
    const tok = token || githubToken
    if (!tok) { connectGitHub(); return }
    if (deploying) return
    setDeploying('self')
    onDeployStart()
    try {
      const { url } = await deploySelf(html, tok, firstName)
      onDeployed(url)
    } catch (err) {
      onError(err.message || 'Deployment to your GitHub failed. Please try again.')
      setDeploying(null)
    }
  }

  const connectGitHub = () => {
    if (!GITHUB_CLIENT_ID) {
      onError('Self-deploy is not configured on this instance. Please use PagedIn hosting instead.')
      return
    }
    const redirect = `${window.location.origin}/pagedIn/oauth/github/`
    const oauthUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${encodeURIComponent(GITHUB_CLIENT_ID)}` +
      `&scope=repo,user:email` +
      `&redirect_uri=${encodeURIComponent(redirect)}`

    const popup = window.open(oauthUrl, 'github_oauth', 'width=600,height=700,left=200,top=100')
    if (!popup) {
      onError('Popup was blocked. Please allow popups for this site and try again.')
    }
  }

  const isDeploying = deploying !== null || loadingOAuth

  return (
    <section className="max-w-3xl mx-auto px-4 pb-24">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Choose where to deploy</h2>
        <p className="text-slate-400 text-sm">
          Both options create a real GitHub Pages site — no expiration, no ads, no watermark.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">

        {/* Option 1: PagedIn hosted */}
        <div className={`card border-2 transition-all flex flex-col ${
          deploying === 'pagedin' ? 'border-brand-500' : 'border-slate-800 hover:border-slate-600'
        }`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="inline-block text-xs font-semibold font-mono px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/20 mb-2">
                RECOMMENDED
              </span>
              <h3 className="font-bold text-white text-lg leading-tight">Deploy via PagedIn</h3>
            </div>
            <span className="text-2xl">🚀</span>
          </div>

          <ul className="space-y-1.5 text-sm text-slate-400 mb-6 flex-1">
            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> No GitHub account needed</li>
            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> One click deploy</li>
            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> URL: plasmacat420.github.io/your-name</li>
            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Free forever</li>
          </ul>

          <button
            onClick={runPagedinDeploy}
            disabled={isDeploying}
            className="btn-primary w-full justify-center"
          >
            Deploy instantly →
          </button>
        </div>

        {/* Option 2: Self-hosted */}
        <div className={`card border-2 transition-all flex flex-col ${
          deploying === 'self' ? 'border-slate-500' : 'border-slate-800 hover:border-slate-600'
        }`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="inline-block text-xs font-semibold font-mono px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 border border-slate-600 mb-2">
                SELF-HOSTED
              </span>
              <h3 className="font-bold text-white text-lg leading-tight">Deploy to my GitHub</h3>
            </div>
            <span className="text-2xl">⚡</span>
          </div>

          <ul className="space-y-1.5 text-sm text-slate-400 mb-6 flex-1">
            <li className="flex items-center gap-2"><span className="text-slate-400">✓</span> Your own GitHub account</li>
            <li className="flex items-center gap-2"><span className="text-slate-400">✓</span> URL: yourusername.github.io/my-resume</li>
            <li className="flex items-center gap-2"><span className="text-slate-400">✓</span> Full ownership &amp; control</li>
            <li className="flex items-center gap-2"><span className="text-amber-500">!</span> Requires GitHub account</li>
          </ul>

          {githubToken ? (
            <button
              onClick={() => runSelfDeploy()}
              disabled={isDeploying}
              className="btn-secondary w-full justify-center"
            >
              Deploy to my GitHub →
            </button>
          ) : (
            <button
              onClick={connectGitHub}
              disabled={isDeploying}
              className="btn-secondary w-full justify-center"
            >
              {loadingOAuth ? (
                <><Spinner /> Connecting…</>
              ) : (
                <><GithubIcon /> Connect GitHub</>
              )}
            </button>
          )}
        </div>

      </div>
    </section>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  )
}
