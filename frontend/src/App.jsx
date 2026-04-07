import { useState, useRef, useEffect } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ResumeInput from './components/ResumeInput'
import ThemeSelector from './components/ThemeSelector'
import PreviewPanel from './components/PreviewPanel'
import DeployOptions from './components/DeployOptions'
import SuccessScreen from './components/SuccessScreen'
import LoadingSteps from './components/LoadingSteps'
import { generateSite } from './api/client'

/**
 * App state machine:
 *  'landing'    → Hero + ResumeInput
 *  'generating' → Full-page loading (building site)
 *  'preview'    → ThemeSelector + PreviewPanel + optional DeployOptions
 *  'deploying'  → Full-page loading (GitHub Pages deploy in progress)
 *  'success'    → SuccessScreen
 */
export default function App() {
  const [appState, setAppState] = useState('landing')
  const [parsedData, setParsedData] = useState(null)
  const [generatedHtml, setGeneratedHtml] = useState(null)
  const [deployToken, setDeployToken] = useState(null)
  const [theme, setTheme] = useState('minimal_light')
  const [rebuildUsed, setRebuildUsed] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [showDeployOptions, setShowDeployOptions] = useState(false)
  const [liveUrl, setLiveUrl] = useState(null)
  const [error, setError] = useState(null)

  const inputSectionRef = useRef(null)

  // Handle GitHub OAuth popup callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code && window.opener) {
      window.opener.postMessage({ type: 'github_oauth', code }, window.location.origin)
      window.close()
    }
  }, [])

  const scrollToInput = () => {
    inputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Called after ResumeInput successfully parses the resume
  const handleParsed = async (data) => {
    setParsedData(data)
    setError(null)
    try {
      const result = await generateSite(data, theme)
      setGeneratedHtml(result.html)
      setDeployToken(result.deploy_token)
      setAppState('preview')
      setShowDeployOptions(false)
      setRebuildUsed(false)
    } catch (err) {
      setError(err.message || 'Site generation failed. Please try again.')
      setAppState('landing')
    }
  }

  const handleRebuild = async () => {
    if (rebuildUsed || !parsedData) return
    setRebuilding(true)
    setError(null)
    try {
      const result = await generateSite(parsedData, theme)
      setGeneratedHtml(result.html)
      setDeployToken(result.deploy_token)
      setRebuildUsed(true)
    } catch (err) {
      setError(err.message || 'Rebuild failed. Please try again.')
    } finally {
      setRebuilding(false)
    }
  }

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme)
    if (!parsedData || appState !== 'preview') return
    setRebuilding(true)
    try {
      const result = await generateSite(parsedData, newTheme)
      setGeneratedHtml(result.html)
      setDeployToken(result.deploy_token)
    } catch (err) {
      setError(err.message || 'Theme switch failed.')
    } finally {
      setRebuilding(false)
    }
  }

  const handleDeploy = () => {
    setShowDeployOptions(true)
    setError(null)
    setTimeout(() => {
      document.getElementById('deploy-options')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // Called by DeployOptions the moment a deploy kicks off
  const handleDeployStart = () => {
    setAppState('deploying')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeployed = (url) => {
    setLiveUrl(url)
    setAppState('success')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // If deploy fails, come back to preview with error showing
  const handleDeployError = (msg) => {
    setError(msg)
    setAppState('preview')
    setShowDeployOptions(true)
  }

  const handleStartOver = () => {
    setAppState('landing')
    setParsedData(null)
    setGeneratedHtml(null)
    setDeployToken(null)
    setRebuildUsed(false)
    setShowDeployOptions(false)
    setLiveUrl(null)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ── Global error banner ─────────────────────────────────── */}
      {error && (
        <div className="fixed top-14 left-0 right-0 z-40 flex justify-center px-4 pt-3 pointer-events-none">
          <div className="bg-red-950/90 border border-red-500/30 text-red-300 text-sm rounded-xl px-5 py-3 shadow-lg max-w-xl w-full flex items-start gap-3 pointer-events-auto animate-slide-up">
            <span className="text-red-400 text-base shrink-0">⚠</span>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto shrink-0 text-red-500 hover:text-red-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── SUCCESS ─────────────────────────────────────────────── */}
      {appState === 'success' && (
        <div className="pt-14">
          <SuccessScreen url={liveUrl} onStartOver={handleStartOver} />
        </div>
      )}

      {/* ── FULL-PAGE LOADING (generating or deploying) ─────────── */}
      {(appState === 'generating' || appState === 'deploying') && (
        <div className="pt-14">
          <LoadingSteps phase={appState === 'deploying' ? 'deploying' : 'generating'} />
        </div>
      )}

      {/* ── LANDING + INPUT ─────────────────────────────────────── */}
      {appState === 'landing' && (
        <>
          <Hero onGetStarted={scrollToInput} />
          <div ref={inputSectionRef} className="pt-8">
            <ResumeInput
              onParsed={(data) => {
                setAppState('generating')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                handleParsed(data)
              }}
              onError={setError}
            />
          </div>
        </>
      )}

      {/* ── PREVIEW ─────────────────────────────────────────────── */}
      {appState === 'preview' && generatedHtml && (
        <div className="pt-20">
          <ThemeSelector theme={theme} onChange={handleThemeChange} />

          <PreviewPanel
            html={generatedHtml}
            rebuildUsed={rebuildUsed}
            onRebuild={handleRebuild}
            rebuilding={rebuilding}
            onDeploy={handleDeploy}
          />

          {showDeployOptions && (
            <div id="deploy-options" className="animate-slide-up">
              <DeployOptions
                html={generatedHtml}
                deployToken={deployToken}
                parsedName={parsedData?.name || 'resume'}
                firstName={parsedData?.name?.split(' ')[0] || 'my'}
                onDeployStart={handleDeployStart}
                onDeployed={handleDeployed}
                onError={handleDeployError}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
