const STEPS = {
  parsing: [
    { id: 'parse', label: 'Parsing your resume…', detail: 'AI is extracting your experience, skills, and more' },
  ],
  generating: [
    { id: 'parse', label: 'Resume parsed ✓', done: true },
    { id: 'generate', label: 'Building your site…', detail: 'Applying theme and generating HTML' },
  ],
  deploying: [
    { id: 'parse', label: 'Resume parsed ✓', done: true },
    { id: 'generate', label: 'Site generated ✓', done: true },
    { id: 'deploy', label: 'Deploying to GitHub…', detail: 'Creating repo and enabling GitHub Pages' },
  ],
}

export default function LoadingSteps({ phase }) {
  const steps = STEPS[phase] || []

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 animate-fade-in">
      <div className="space-y-4 w-full max-w-sm">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {step.done ? (
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              ) : (
                <span className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </span>
              )}
            </div>
            <div>
              <p className={`font-medium text-sm ${step.done ? 'text-emerald-400' : 'text-white'}`}>
                {step.label}
              </p>
              {step.detail && !step.done && (
                <p className="text-xs text-slate-500 mt-0.5">{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
