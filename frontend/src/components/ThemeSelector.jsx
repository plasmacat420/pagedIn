const THEMES = [
  {
    id: 'minimal_light',
    name: 'Light Mode',
    description: 'Clean, bright, professional',
    colors: { bg: '#f8fafc', header: '#0f172a', accent: '#6366f1', card: '#ffffff', text: '#0f172a', tag: '#eff6ff' },
  },
  {
    id: 'modern_dark',
    name: 'Dark Mode',
    description: 'Bold, dark, high contrast',
    colors: { bg: '#09090b', header: '#111113', accent: '#8b5cf6', card: '#111113', text: '#fafafa', tag: 'rgba(139,92,246,.15)' },
  },
]

export default function ThemeSelector({ theme, onChange }) {
  return (
    <div className="max-w-3xl mx-auto px-4 mb-6">
      <p className="text-xs font-mono text-slate-500 mb-3 uppercase tracking-wider">
        Choose a style — the layout adapts to your document automatically
      </p>
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((t) => {
          const active = theme === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                active
                  ? 'border-brand-500 shadow-lg shadow-brand-500/10'
                  : 'border-slate-800 hover:border-slate-600'
              }`}
            >
              {/* Mini page preview */}
              <div
                className="w-full h-20 rounded-lg mb-2.5 overflow-hidden flex flex-col"
                style={{ background: t.colors.bg }}
              >
                {/* Header */}
                <div className="w-full flex-shrink-0 px-2 py-1.5 flex items-center gap-1.5"
                  style={{ background: t.colors.header }}>
                  <div className="w-4 h-4 rounded-full" style={{ background: t.colors.accent, opacity: .9 }} />
                  <div className="h-1.5 rounded-full w-12" style={{ background: '#fff', opacity: .6 }} />
                  <div className="ml-auto h-1 rounded-full w-6" style={{ background: '#fff', opacity: .25 }} />
                </div>
                {/* Content */}
                <div className="flex flex-1 gap-1.5 p-1.5">
                  <div className="flex-1 flex flex-col gap-1 justify-center">
                    <div className="h-2 rounded-full w-4/5" style={{ background: t.colors.text, opacity: .2 }} />
                    <div className="h-1.5 rounded-full w-2/5" style={{ background: t.colors.accent, opacity: .7 }} />
                    <div className="h-1 rounded-full w-3/5" style={{ background: t.colors.text, opacity: .12 }} />
                  </div>
                  <div className="w-12 flex flex-col gap-1 justify-center">
                    {[1, .7, .5].map((o, i) => (
                      <div key={i} className="h-2 rounded" style={{ background: t.colors.tag, opacity: o }} />
                    ))}
                  </div>
                </div>
              </div>

              <p className="font-semibold text-sm text-white">{t.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>

              {active && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
