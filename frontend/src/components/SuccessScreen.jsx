import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'

export default function SuccessScreen({ url, onStartOver }) {
  const [copied, setCopied] = useState(false)

  // Fire confetti on mount
  useEffect(() => {
    const end = Date.now() + 2000
    const colors = ['#2c5ff5', '#8b5cf6', '#10b981', '#f59e0b']

    function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      })
      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }, [])

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-24 text-center animate-slide-up">

      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h2 className="text-4xl font-bold text-white mb-3">Your site is live! 🎉</h2>
      <p className="text-slate-400 mb-10 max-w-sm">
        Your resume website is now live on GitHub Pages.
        Share it anywhere — it's yours forever.
      </p>

      {/* URL card */}
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6">
        <p className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">Your live URL</p>
        <div className="flex items-center gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-brand-400 font-mono text-sm truncate hover:text-brand-300 transition-colors"
          >
            {url}
          </a>
          <button
            onClick={copyUrl}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              copied
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                : 'bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Note about Pages delay */}
      <p className="text-xs text-slate-500 mb-10 max-w-xs">
        GitHub Pages can take 1–2 minutes to go live. If the link doesn't work yet, check back shortly.
      </p>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open my site
        </a>
        <button onClick={onStartOver} className="btn-secondary">
          Build another site
        </button>
      </div>

      {/* Share links */}
      <div className="mt-10 flex gap-4 text-sm text-slate-500">
        <span>Share:</span>
        <a
          href={`https://twitter.com/intent/tweet?text=Just+built+my+resume+site+with+@PagedIn+in+under+60+seconds!+Check+it+out:+${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-white transition-colors"
        >
          Twitter / X
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-white transition-colors"
        >
          LinkedIn
        </a>
      </div>

    </section>
  )
}
