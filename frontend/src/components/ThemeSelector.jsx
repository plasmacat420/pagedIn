const THEMES = [
  {
    id: 'minimal_light',
    name: 'Minimal Light',
    description: 'Clean, classic, ATS-optimized',
    colors: {
      bg: '#f9fafb',
      header: '#1e293b',
      accent: '#3b82f6',
      card: '#ffffff',
      text: '#111827',
      tag: '#eff6ff',
    },
  },
  {
    id: 'modern_dark',
    name: 'Modern Dark',
    description: 'Dark, technical, code aesthetic',
    colors: {
      bg: '#0d1117',
      header: '#161b22',
      accent: '#58a6ff',
      card: '#161b22',
      text: '#e6edf3',
      tag: 'rgba(88,166,255,.15)',
    },
  },
]

export default function ThemeSelector({ theme, onChange }) {
  return (
    <div className="max-w-3xl mx-auto px-4 mb-6">
      <p className="text-xs font-mono text-slate-500 mb-3 uppercase tracking-wider">
        Choose a theme — switching is instant
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
                {/* Header bar */}
                <div
                  className="w-full flex-shrink-0 px-2 py-1.5 flex items-center gap-1.5"
                  style={{ background: t.colors.header }}
                >
                  <div className="w-4 h-4 rounded-full opacity-80" style={{ background: t.colors.accent }} />
                  <div className="h-1.5 rounded-full w-12 opacity-70" style={{ background: '#fff' }} />
                  <div className="ml-auto h-1 rounded-full w-8 opacity-30" style={{ background: '#fff' }} />
                </div>
                {/* Content area */}
                <div className="flex flex-1 gap-1.5 p-1.5">
                  {/* Main col */}
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="h-1.5 rounded-full w-4/5" style={{ background: t.colors.text, opacity: .25 }} />
                    <div className="h-1 rounded-full w-3/5" style={{ background: t.colors.accent, opacity: .6 }} />
                    <div
                      className="flex-1 rounded mt-0.5"
                      style={{ background: t.colors.card, border: `1px solid ${t.colors.text}18` }}
                    />
                  </div>
                  {/* Sidebar col */}
                  <div className="w-10 flex flex-col gap-1">
                    <div
                      className="h-2 rounded-sm"
                      style={{ background: t.colors.tag }}
                    />
                    <div
                      className="h-2 rounded-sm"
                      style={{ background: t.colors.tag, opacity: .7 }}
                    />
                    <div
                      className="h-2 rounded-sm"
                      style={{ background: t.colors.tag, opacity: .5 }}
                    />
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
