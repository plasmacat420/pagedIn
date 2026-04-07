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
 *  'generating' → Full-page loading (AI parsing + both themes generated in parallel)
 *  'preview'    → ThemeSelector + PreviewPanel + optional DeployOptions
 *  'deploying'  → Full-page loading (GitHub Pages deploy in progress)
 *  'success'    → SuccessScreen
 */
export default function App() {
  const [appState, setAppState] = useState('landing')
  const [parsedData, setParsedData] = useState(null)

  // sites holds both generated themes: { minimal_light: {html, token}, modern_dark: {html, token} }
  const [sites, setSites] = useState({})
  const [theme, setTheme] = useState('minimal_light')

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

  // Called after ResumeInput successfully parses the resume.
  // Generates both themes in parallel — theme switching is then instant.
  const handleParsed = async (data) => {
    setParsedData(data)
    setError(null)

    try {
      const [light, dark] = await Promise.all([
        generateSite(data, 'minimal_light'),
        generateSite(data, 'modern_dark'),
      ])

      setSites({
        minimal_light: { html: light.html, token: light.deploy_token },
        modern_dark:   { html: dark.html,  token: dark.deploy_token  },
      })
      setTheme('minimal_light')
      setAppState('preview')
      setShowDeployOptions(false)
    } catch (err) {
      setError(err.message || 'Site generation failed. Please try again.')
      setAppState('landing')
    }
  }

  // Instant — no API call needed, both themes are pre-generated
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    setShowDeployOptions(false)
  }

  const handleDeploy = () => {
    setShowDeployOptions(true)
    setError(null)
    setTimeout(() => {
      document.getElementById('deploy-options')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleDeployStart = () => {
    setAppState('deploying')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeployed = (url) => {
    setLiveUrl(url)
    setAppState('success')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeployError = (msg) => {
    setError(msg)
    setAppState('preview')
    setShowDeployOptions(true)
  }

  const handleStartOver = () => {
    setAppState('landing')
    setParsedData(null)
    setSites({})
    setShowDeployOptions(false)
    setLiveUrl(null)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeSite = sites[theme] || {}

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
      {appState === 'preview' && activeSite.html && (
        <div className="pt-20">
          <ThemeSelector theme={theme} onChange={handleThemeChange} />

          <PreviewPanel
            html={activeSite.html}
            onDeploy={handleDeploy}
          />

          {showDeployOptions && (
            <div id="deploy-options" className="animate-slide-up">
              <DeployOptions
                html={activeSite.html}
                deployToken={activeSite.token}
                parsedName={parsedData?.name || parsedData?.company_name || 'site'}
                firstName={parsedData?.name?.split(' ')[0] || parsedData?.company_name || 'my'}
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
