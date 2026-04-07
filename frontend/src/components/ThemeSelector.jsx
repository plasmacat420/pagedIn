const THEMES = [
  {
    id: 'minimal_light',
    name: 'Minimal Light',
    description: 'Clean white, serif headings, subtle shadows',
    preview: {
      bg: '#fafaf8',
      text: '#1a1a1a',
      accent: '#2563eb',
      surface: '#ffffff',
    },
  },
  {
    id: 'modern_dark',
    name: 'Modern Dark',
    description: 'Dark background, code aesthetic, accent highlights',
    preview: {
      bg: '#0d1117',
      text: '#e6edf3',
      accent: '#58a6ff',
      surface: '#161b22',
    },
  },
]

export default function ThemeSelector({ theme, onChange }) {
  return (
    <div className="max-w-3xl mx-auto px-4 mb-6">
      <p className="text-xs font-mono text-slate-500 mb-3 uppercase tracking-wider">Choose a theme</p>
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative rounded-xl border-2 p-3 text-left transition-all ${
              theme === t.id
                ? 'border-brand-500 shadow-lg shadow-brand-500/10'
                : 'border-slate-800 hover:border-slate-600'
            }`}
          >
            {/* Mini preview */}
            <div
              className="w-full h-16 rounded-lg mb-2.5 overflow-hidden flex flex-col gap-1 p-2"
              style={{ background: t.preview.bg }}
            >
              <div className="h-2 rounded-full w-16" style={{ background: t.preview.text, opacity: 0.8 }} />
              <div className="h-1.5 rounded-full w-10" style={{ background: t.preview.accent }} />
              <div className="flex gap-1 mt-0.5">
                <div className="h-1.5 rounded-full w-6" style={{ background: t.preview.text, opacity: 0.3 }} />
                <div className="h-1.5 rounded-full w-8" style={{ background: t.preview.text, opacity: 0.3 }} />
                <div className="h-1.5 rounded-full w-4" style={{ background: t.preview.text, opacity: 0.3 }} />
              </div>
              <div
                className="h-5 rounded mt-0.5 w-full"
                style={{ background: t.preview.surface, border: `1px solid ${t.preview.text}18` }}
              />
            </div>

            <p className="font-semibold text-sm text-white">{t.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>

            {theme === t.id && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
