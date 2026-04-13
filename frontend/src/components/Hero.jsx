import { useEffect, useState } from 'react'
import { getStats } from '../api/client'

export default function Hero({ onGetStarted }) {
  const [count, setCount] = useState(null)

  useEffect(() => {
    getStats()
      .then(d => setCount(d.pages_deployed))
      .catch(() => {}) // silently ignore — counter is non-critical
  }, [])

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">

      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono mb-8 animate-fade-in">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-slow" />
        Free forever · No account needed · Under 60 seconds
      </div>

      {/* Headline */}
      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 animate-slide-up leading-[1.1]">
        Paste any document.
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-violet-400">
          Get a live website.
        </span>
      </h1>

      {/* Subheadline */}
      <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 animate-slide-up leading-relaxed">
        Resume, portfolio, business profile, band bio — PagedIn reads your document,
        figures out what it is, and builds the right page. Live on the internet in under 60 seconds.
      </p>

      {/* CTA */}
      <button
        onClick={onGetStarted}
        className="btn-primary text-base px-8 py-3.5 animate-slide-up shadow-lg shadow-brand-500/20"
      >
        <span>Build my page</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Live counter */}
      {count !== null && (
        <p className="mt-5 text-sm text-slate-500 animate-fade-in">
          <span className="text-white font-semibold tabular-nums">
            {count.toLocaleString()}
          </span>
          {' '}page{count !== 1 ? 's' : ''} built and counting
        </p>
      )}

      {/* Trust signals */}
      <div className="mt-14 flex flex-wrap justify-center gap-8 text-slate-500 text-sm animate-fade-in">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          Resumes &amp; portfolios
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          Business &amp; brand pages
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          AI-powered · Mobile ready
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          Your link, forever
        </div>
      </div>

      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full bg-brand-500/10 blur-[120px]" />
        <div className="absolute -bottom-60 -left-60 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-brand-600/5 blur-[100px]" />
      </div>

    </section>
  )
}
