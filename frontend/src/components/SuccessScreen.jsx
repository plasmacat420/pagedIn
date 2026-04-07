import { useEffect, useState, useRef } from 'react'
import confetti from 'canvas-confetti'

// GitHub Pages typically goes live in 60–120s after the API call.
// We poll the URL every 8s using no-cors (opaque response = server replied = probably live).
// Progress bar fills over PROGRESS_DURATION_MS regardless, as a fallback visual.
const PROGRESS_DURATION_MS = 90_000
const POLL_INTERVAL_MS = 8_000

export default function SuccessScreen({ url, onStartOver }) {
  const [copied, setCopied]   = useState(false)
  const [progress, setProgress] = useState(0)        // 0–100
  const [isLive, setIsLive]   = useState(false)
  const [elapsed, setElapsed] = useState(0)           // seconds since deploy
  const startRef = useRef(Date.now())
  const pollRef  = useRef(null)
  const rafRef   = useRef(null)

  // Brief confetti burst
  useEffect(() => {
    const end = Date.now() + 1800
    const colors = ['#2c5ff5', '#8b5cf6', '#10b981', '#f59e0b']
    const frame = () => {
      confetti({ particleCount: 3, angle: 60,  spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [])

  // Progress bar + elapsed timer
  useEffect(() => {
    const tick = () => {
      const ms = Date.now() - startRef.current
      setElapsed(Math.floor(ms / 1000))
      setProgress(Math.min(100, (ms / PROGRESS_DURATION_MS) * 100))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Poll the URL — no-cors fetch: opaque response means server replied (= Pages is up)
  useEffect(() => {
    const poll = async () => {
      try {
        await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
        // Opaque success — server responded. Pages is live.
        setIsLive(true)
        setProgress(100)
        clearInterval(pollRef.current)
      } catch {
        // Network error — still building, try again next interval
      }
    }

    // First poll after 20s (too early before that)
    const initialDelay = setTimeout(() => {
      poll()
      pollRef.current = setInterval(poll, POLL_INTERVAL_MS)
    }, 20_000)

    return () => {
      clearTimeout(initialDelay)
      clearInterval(pollRef.current)
    }
  }, [url])

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const steps = [
    { label: 'Repository created',    done: true,   delay: 0 },
    { label: 'GitHub Pages enabled',  done: true,   delay: 1 },
    { label: isLive ? 'Site is live!' : 'Building site…', done: isLive, delay: 2, active: !isLive },
  ]

  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-20 text-center animate-slide-up">

      {/* Icon */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-700 ${
        isLive
          ? 'bg-emerald-500/15 border border-emerald-500/30'
          : 'bg-brand-500/10 border border-brand-500/20'
      }`}>
        {isLive ? (
          <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-10 h-10 text-brand-400 animate-spin" style={{ animationDuration: '3s' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-80" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      <h2 className="text-3xl font-bold text-white mb-2">
        {isLive ? 'Your site is live! 🎉' : 'Deploying your site…'}
      </h2>
      <p className="text-slate-400 mb-8 max-w-sm text-sm">
        {isLive
          ? 'GitHub Pages is live. Share your link anywhere — it\'s yours forever.'
          : 'GitHub is building your page. This usually takes 60–90 seconds.'}
      </p>

      {/* Deploy steps */}
      <div className="w-full max-w-sm mb-6 text-left space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-500 ${
              step.done
                ? 'bg-emerald-500/20 border border-emerald-500/40'
                : step.active
                  ? 'bg-brand-500/20 border border-brand-500/40'
                  : 'bg-slate-800 border border-slate-700'
            }`}>
              {step.done ? (
                <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : step.active ? (
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-600" />
              )}
            </div>
            <span className={`text-sm transition-colors duration-500 ${
              step.done ? 'text-emerald-400' : step.active ? 'text-slate-300' : 'text-slate-600'
            }`}>
              {step.label}
            </span>
            {step.active && (
              <span className="text-xs text-slate-500 font-mono ml-auto">{elapsed}s</span>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {!isLive && (
        <div className="w-full max-w-sm mb-6">
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* URL card */}
      <div className={`w-full max-w-lg border rounded-xl p-4 mb-4 transition-all duration-700 ${
        isLive
          ? 'bg-emerald-950/30 border-emerald-500/30'
          : 'bg-slate-900 border-slate-700'
      }`}>
        <p className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Your URL</p>
        <div className="flex items-center gap-3">
          <span className="flex-1 text-brand-400 font-mono text-sm truncate text-left">{url}</span>
          <button
            onClick={copyUrl}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              copied
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                : 'bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300'
            }`}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Open site button — prominent once live, muted while building */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all mb-8 ${
          isLive
            ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        {isLive ? 'Open my site' : 'Preview (may show 404 yet)'}
      </a>

      {/* Start over + share */}
      <div className="flex flex-wrap gap-3 justify-center mb-8">
        <button onClick={onStartOver} className="btn-secondary text-sm">
          Build another site
        </button>
      </div>

      {isLive && (
        <div className="flex gap-4 text-sm text-slate-500">
          <span>Share:</span>
          <a
            href={`https://twitter.com/intent/tweet?text=Just+built+my+resume+site+with+PagedIn+in+under+60+seconds!+${encodeURIComponent(url)}`}
            target="_blank" rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >Twitter / X</a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
            target="_blank" rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >LinkedIn</a>
        </div>
      )}

    </section>
  )
}
