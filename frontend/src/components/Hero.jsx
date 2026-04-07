export default function Hero({ onGetStarted }) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">

      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono mb-8 animate-fade-in">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-slow" />
        Free forever · No account needed · Under 60 seconds
      </div>

      {/* Headline */}
      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 animate-slide-up leading-[1.1]">
        Paste your resume.
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-violet-400">
          Get a live website.
        </span>
      </h1>

      {/* Subheadline */}
      <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 animate-slide-up leading-relaxed">
        Turn your resume into a beautiful GitHub Pages site in under 60 seconds.
        No GitHub account needed. No credit card. No catch.
      </p>

      {/* CTA */}
      <button
        onClick={onGetStarted}
        className="btn-primary text-base px-8 py-3.5 animate-slide-up shadow-lg shadow-brand-500/20"
      >
        <span>Paste my resume</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Trust signals */}
      <div className="mt-16 flex flex-wrap justify-center gap-8 text-slate-500 text-sm animate-fade-in">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          Deployed on GitHub Pages
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          AI-powered parsing
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          Mobile responsive
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          Your link, forever
        </div>
      </div>

      {/* Decorative gradient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

    </section>
  )
}
