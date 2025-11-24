import { useState, useEffect } from 'react'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { StorageChoiceScreen } from '@/components/StorageChoiceScreen'
import { DashboardIntroScreen } from '@/components/DashboardIntroScreen'
import { DashboardScreen } from '@/components/DashboardScreen'
import { onAuthChange, signOut } from '@/lib/auth'
import { auth } from '@/lib/firebase-config'
import { Toaster } from '@/components/ui/sonner'

function App() {
  const [currentScreen, setCurrentScreen] = useState(0)
  const [storageChoice, setStorageChoice] = useState(null)
  const [isLeftHovered, setIsLeftHovered] = useState(false)
  const [isRightHovered, setIsRightHovered] = useState(false)
  const [extensionParams, setExtensionParams] = useState(null)
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Check authentication state on mount
  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser)
      setAuthChecked(true)

      // Check if this is a reauth flow from extension
      const urlParams = new URLSearchParams(window.location.search)
      const isReauth = urlParams.get('reauth') === 'true'

      // If user is already authenticated AND not a reauth flow, go straight to dashboard
      if (currentUser && !isReauth) {
        setStorageChoice('google')
        setCurrentScreen(3)
      }
    })

    return () => unsubscribe()
  }, [])

  // Detect if this is an extension-initiated auth flow or reauth flow
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const source = urlParams.get('source')
    const extensionId = urlParams.get('extensionId')
    const reauth = urlParams.get('reauth')

    if (source === 'extension' && extensionId) {
      // Extension-initiated flow - store the params
      setExtensionParams({ extensionId })

      // Check if this is a reauth flow (user needs to log in again)
      if (reauth === 'true') {
        // Sign out if already logged in, then go to login screen
        if (auth.currentUser) {
          signOut().then(() => {
            setCurrentScreen(2) // Go directly to login screen
          })
        } else {
          setCurrentScreen(2) // Go directly to login screen
        }
      }
    }
  }, [])

  const screens = [
    <WelcomeScreen key="welcome" onNext={() => setCurrentScreen(1)} />,
    <DashboardIntroScreen key="intro" onGetStarted={() => setCurrentScreen(2)} onBack={() => setCurrentScreen(0)} />,
    <StorageChoiceScreen
      key="storage"
      onNext={() => setCurrentScreen(3)}
      onChoose={(choice) => setStorageChoice(choice)}
      extensionParams={extensionParams}
    />,
    <DashboardScreen key="dashboard" storageChoice={storageChoice} user={user} />,
  ]

  const handleLeftThirdClick = () => {
    if (currentScreen > 0 && currentScreen < 3) {
      setCurrentScreen(currentScreen - 1)
    }
  }

  const handleRightThirdClick = () => {
    if (currentScreen < 2) {
      setCurrentScreen(currentScreen + 1)
    }
  }

  return (
    <>
      <div className="min-h-screen dot-grid-bg relative">
        {currentScreen > 0 && currentScreen < 3 && (
          <button
            onClick={handleLeftThirdClick}
            onMouseEnter={() => setIsLeftHovered(true)}
            onMouseLeave={() => setIsLeftHovered(false)}
            className="fixed left-0 top-0 h-full w-1/3 z-40 cursor-pointer"
            aria-label="Go back"
          />
        )}

        {currentScreen < 2 && (
          <button
            onClick={handleRightThirdClick}
            onMouseEnter={() => setIsRightHovered(true)}
            onMouseLeave={() => setIsRightHovered(false)}
            className="fixed right-0 top-0 h-full w-1/3 z-40 cursor-pointer"
            aria-label="Go forward"
          />
        )}

        {currentScreen > 0 && currentScreen < 3 && (
          <button
            onClick={() => setCurrentScreen(currentScreen - 1)}
            className={`fixed left-8 top-1/2 -translate-y-1/2 z-50 transition-all duration-500 pointer-events-none ${isLeftHovered ? "text-white scale-110" : "text-neutral-500"
              }`}
          >
            <svg className="h-12 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="sr-only">Back</span>
          </button>
        )}

        {currentScreen < 2 && (
          <button
            onClick={() => setCurrentScreen(currentScreen + 1)}
            className={`fixed right-8 top-1/2 -translate-y-1/2 z-50 transition-all duration-500 pointer-events-none ${isRightHovered ? "text-white scale-110" : "text-neutral-500"
              }`}
          >
            <svg className="h-12 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="sr-only">Next</span>
          </button>
        )}

        {screens[currentScreen]}

        {currentScreen < 3 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${index === currentScreen ? "bg-white w-8" : "bg-neutral-700 w-1.5"
                  }`}
              />
            ))}
          </div>
        )}
      </div>
      <Toaster />
    </>
  )
}

export default App
