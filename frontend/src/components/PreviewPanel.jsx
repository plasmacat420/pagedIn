import { useEffect, useRef, useState } from 'react'

export default function PreviewPanel({ html, onDeploy }) {
  const iframeRef = useRef(null)
  const [blobUrl, setBlobUrl] = useState(null)

  useEffect(() => {
    if (!html) return
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

      {/* Preview frame */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-2xl shadow-black/40 bg-slate-900">

        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 border-b border-slate-700">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-amber-500/70" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
          <div className="flex-1 mx-4 bg-slate-700/60 rounded-md px-3 py-1 text-xs font-mono text-slate-400">
            your-name.github.io/PagedIn-…
          </div>
        </div>

        {/* iframe */}
        <iframe
          ref={iframeRef}
          title="Site preview"
          className="w-full"
          style={{ height: '540px' }}
          sandbox="allow-same-origin allow-scripts allow-popups"
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
