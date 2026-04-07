import { useState, useRef } from 'react'
import { parseResumeText, parseResumePdf } from '../api/client'

const PLACEHOLDER = `John Doe
Software Engineer | john@example.com | linkedin.com/in/johndoe

SUMMARY
Results-driven software engineer with 5+ years building scalable web applications...

EXPERIENCE
Senior Software Engineer — Acme Corp (2022 – Present)
• Led migration of monolith to microservices, reducing latency by 40%
• Mentored 3 junior engineers

SKILLS
React, Node.js, Python, PostgreSQL, Docker, AWS

EDUCATION
B.S. Computer Science — MIT (2019)`

export default function ResumeInput({ onParsed, onError }) {
  const [mode, setMode] = useState('text') // 'text' | 'pdf'
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  // Honeypot field (hidden from real users)
  const [honeypot] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    onError(null)

    try {
      let data
      if (mode === 'pdf' && file) {
        data = await parseResumePdf(file, honeypot)
      } else {
        if (!text.trim()) {
          onError('Please paste your resume text or upload a PDF.')
          return
        }
        data = await parseResumeText(text.trim(), honeypot)
      }
      onParsed(data)
    } catch (err) {
      onError(err.message || 'Failed to parse resume. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') {
      setFile(dropped)
      setMode('pdf')
    }
  }

  return (
    <section id="input-section" className="max-w-3xl mx-auto px-4 pb-24">

      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">
          Paste your resume
        </h2>
        <p className="text-slate-400">
          Plain text or PDF — we'll handle the rest.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg mb-4 w-fit mx-auto">
        <button
          onClick={() => setMode('text')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
            mode === 'text'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Paste text
        </button>
        <button
          onClick={() => setMode('pdf')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
            mode === 'pdf'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Upload PDF
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Hidden honeypot — never shown to real users */}
        <input
          type="text"
          name="website_url"
          tabIndex={-1}
          autoComplete="off"
          style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
          readOnly
          value={honeypot}
        />

        {mode === 'text' ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={16}
            className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600
                       focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50
                       rounded-xl p-4 text-sm font-mono text-slate-300 placeholder-slate-600
                       resize-none outline-none transition-all"
            disabled={loading}
          />
        ) : (
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className={`w-full min-h-[200px] border-2 border-dashed rounded-xl
                        flex flex-col items-center justify-center gap-3 cursor-pointer
                        transition-all ${
                          file
                            ? 'border-emerald-500/50 bg-emerald-500/5'
                            : 'border-slate-700 hover:border-slate-500 bg-slate-900'
                        }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
            {file ? (
              <>
                <div className="text-3xl">📄</div>
                <p className="text-sm font-medium text-emerald-400">{file.name}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <div className="text-4xl opacity-40">📎</div>
                <p className="text-slate-400 text-sm font-medium">
                  Drop your PDF here or click to browse
                </p>
                <p className="text-slate-600 text-xs">PDF files up to 50 KB</p>
              </>
            )}
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            type="submit"
            disabled={loading || (mode === 'pdf' && !file)}
            className="btn-primary px-8 py-3 text-base"
          >
            {loading ? (
              <>
                <Spinner />
                Parsing your resume…
              </>
            ) : (
              <>
                <span>Parse my resume</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>

      </form>
    </section>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
