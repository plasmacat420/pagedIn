import { useState, useEffect } from 'react'

const STEPS = {
  generating: [
    { id: 'parse',    label: 'Resume parsed ✓',      done: true },
    { id: 'generate', label: 'Building your site…',  detail: 'Applying theme and generating HTML' },
  ],
  deploying: [
    { id: 'parse',    label: 'Resume parsed ✓',       done: true },
    { id: 'generate', label: 'Site generated ✓',      done: true },
    { id: 'repo',     label: 'Creating GitHub repo…', detail: 'Setting up your repository' },
    { id: 'pages',    label: 'Enabling GitHub Pages…', detail: 'Almost there — GitHub Pages takes ~30 seconds' },
  ],
}

// After this many seconds, show the Render cold-start notice
const COLD_START_WARN_AFTER = 12

export default function LoadingSteps({ phase }) {
  const steps = STEPS[phase] || []
  const activeIndex = steps.findIndex(s => !s.done)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    setElapsed(0)
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  const showColdStartNotice = phase === 'generating' && elapsed >= COLD_START_WARN_AFTER

  return (
    <div className="flex flex-col items-center justify-center py-28 px-4 animate-fade-in">

      {/* Deploying header */}
      {phase === 'deploying' && (
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Deploying your site…</h2>
          <p className="text-slate-400 text-sm">Creating your GitHub Pages repo. Usually takes 30–60 seconds.</p>
        </div>
      )}

      {/* Step list */}
      <div className="space-y-4 w-full max-w-sm">
        {steps.map((step, i) => {
          const isActive = !step.done && i === activeIndex
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {step.done ? (
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </span>
                ) : isActive ? (
                  <span className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"/>
                  </span>
                )}
              </div>
              <div>
                <p className={`font-medium text-sm ${
                  step.done ? 'text-emerald-400' : isActive ? 'text-white' : 'text-slate-500'
                }`}>
                  {step.label}
                </p>
                {step.detail && isActive && (
                  <p className="text-xs text-slate-500 mt-0.5">{step.detail}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Render cold-start notice — shown after ~12s while generating */}
      {showColdStartNotice && (
        <div className="mt-8 max-w-sm w-full bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <span className="text-amber-400 text-base shrink-0 mt-0.5">☕</span>
            <div>
              <p className="text-sm font-medium text-amber-200">Server is waking up…</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                The backend runs on Render's free tier and sleeps after inactivity.
                First request can take up to 30 seconds. Hang tight — it only happens once.
              </p>
            </div>
          </div>
        </div>
      )}

      {phase === 'deploying' && (
        <p className="mt-10 text-xs text-slate-600 text-center max-w-xs">
          Don't close this tab. You'll be redirected automatically when your site is live.
        </p>
      )}
    </div>
  )
}
