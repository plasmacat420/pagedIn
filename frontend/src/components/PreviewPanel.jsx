import { useEffect, useRef, useState } from 'react'

export default function PreviewPanel({ html, rebuildUsed, onRebuild, rebuilding, onDeploy }) {
  const iframeRef = useRef(null)
  const [blobUrl, setBlobUrl] = useState(null)

  // Render the HTML into the iframe via a blob URL (avoids any cross-origin issues)
  useEffect(() => {
    if (!html) return

    // Revoke previous blob URL to avoid memory leaks
    if (blobUrl) URL.revokeObjectURL(blobUrl)

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setBlobUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [html])

  useEffect(() => {
    if (iframeRef.current && blobUrl) {
      iframeRef.current.src = blobUrl
    }
  }, [blobUrl])

  return (
    <section className="max-w-5xl mx-auto px-4 pb-8">

      {/* Rebuild notice — only shown if rebuild is still available */}
      {!rebuildUsed && (
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-amber-400 text-lg">✦</span>
            <p className="text-sm text-amber-200">
              <span className="font-semibold">Not satisfied?</span>{' '}
              You can rebuild once with a different theme — after that, only Deploy is available.
            </p>
          </div>
          <button
            onClick={onRebuild}
            disabled={rebuilding}
            className="ml-4 shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30
                       text-amber-300 text-sm font-medium transition-all
                       disabled:opacity-50 disabled:pointer-events-none"
          >
            {rebuilding ? (
              <>
                <Spinner />
                Rebuilding…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Rebuild
              </>
            )}
          </button>
        </div>
      )}

      {/* Preview frame */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-2xl shadow-black/40 bg-slate-900">

        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 border-b border-slate-700">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-amber-500/70" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
          <div className="flex-1 mx-4 bg-slate-700/60 rounded-md px-3 py-1 text-xs font-mono text-slate-400">
            your-site.github.io
          </div>
        </div>

        {/* iframe */}
        <iframe
          ref={iframeRef}
          title="Resume site preview"
          className="w-full"
          style={{ height: '520px' }}
          sandbox="allow-same-origin allow-popups"
        />
      </div>

      {/* Deploy button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={onDeploy}
          className="btn-primary text-base px-10 py-3.5 shadow-lg shadow-brand-500/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Deploy My Site
        </button>
      </div>

    </section>
  )
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
