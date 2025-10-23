import { useState, useEffect } from 'react'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { StorageChoiceScreen } from '@/components/StorageChoiceScreen'
import { DashboardIntroScreen } from '@/components/DashboardIntroScreen'
import { DashboardScreen } from '@/components/DashboardScreen'
import { onAuthChange } from '@/lib/auth'
import { sendUserToExtension, clearUserFromExtension } from '@/lib/extensionMessaging'

function App() {
  const [currentScreen, setCurrentScreen] = useState(0)
  const [storageChoice, setStorageChoice] = useState(null)

  // Sync auth state changes with extension
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        // User signed in - send to extension
        console.log('Auth state: user signed in, syncing with extension')
        const result = await sendUserToExtension(user)
        if (!result.success) {
          console.warn('Failed to sync user with extension:', result.error)
        }
      } else {
        // User signed out - clear from extension
        console.log('Auth state: user signed out, clearing from extension')
        const result = await clearUserFromExtension()
        if (!result.success) {
          console.warn('Failed to clear user from extension:', result.error)
        }
      }
    })

    return () => unsubscribe()
  }, [])

  const screens = [
    <WelcomeScreen key="welcome" onNext={() => setCurrentScreen(1)} />,
    <DashboardIntroScreen key="intro" onGetStarted={() => setCurrentScreen(2)} onBack={() => setCurrentScreen(0)} />,
    <StorageChoiceScreen
      key="storage"
      onNext={() => setCurrentScreen(3)}
      onBack={() => setCurrentScreen(1)}
      onChoose={(choice) => setStorageChoice(choice)}
    />,
    <DashboardScreen key="dashboard" storageChoice={storageChoice} />,
  ]

  return (
    <div className="min-h-screen dot-grid-bg relative">
      {currentScreen > 0 && currentScreen < 3 && (
        <button
          onClick={() => setCurrentScreen(currentScreen - 1)}
          className="fixed left-8 top-1/2 -translate-y-1/2 z-50 text-neutral-600 hover:text-white transition-all duration-500 hover:scale-110 group"
        >
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="sr-only">Back</span>
        </button>
      )}

      {currentScreen < 2 && (
        <button
          onClick={() => setCurrentScreen(currentScreen + 1)}
          className="fixed right-8 top-1/2 -translate-y-1/2 z-50 text-neutral-600 hover:text-white transition-all duration-500 hover:scale-110 group"
        >
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
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
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                index === currentScreen ? "bg-white w-8" : "bg-neutral-700 w-1.5"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default App
