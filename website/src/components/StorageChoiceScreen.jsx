import { useState } from 'react'
import { signInWithGoogle } from '@/lib/auth'

export function StorageChoiceScreen({ onNext, onBack, onChoose, extensionParams }) {
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const isExtensionFlow = extensionParams && extensionParams.extensionId

  // Send auth data to extension using window.postMessage (works in both Chrome and Firefox)
  const sendToExtension = async (user, token) => {
    return new Promise((resolve, reject) => {
      // Set up listener for response from content script
      const messageHandler = (event) => {
        // Only accept messages from our own window
        if (event.source !== window) {
          return;
        }

        // Check if this is the auth response from extension
        if (event.data && event.data.type === 'AUTH_FROM_EXTENSION') {
          // Clean up listener
          window.removeEventListener('message', messageHandler);

          // Resolve or reject based on response
          if (event.data.success) {
            resolve(event.data);
          } else {
            reject(new Error(event.data.error || 'Extension sync failed'));
          }
        }
      };

      // Add listener for response
      window.addEventListener('message', messageHandler);

      // Send auth data to content script via postMessage
      window.postMessage({
        type: 'AUTH_TO_EXTENSION',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        },
        token: token
      }, '*');

      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        reject(new Error('Extension sync timeout'));
      }, 10000);
    });
  }

  const handleGoogleSignIn = async () => {
    setSelected('google')
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Sign in with Google OAuth
      const result = await signInWithGoogle()
      const user = result.user

      if (isExtensionFlow) {
        // Extension-initiated flow - send token to extension
        const token = await user.getIdToken()

        try {
          await sendToExtension(user, token)
          setSuccess('✓ Successfully synced with extension! You can close this tab or continue to the dashboard.')
          setLoading(false)

          // Auto-close after 3 seconds (user can also continue to dashboard)
          setTimeout(() => {
            window.close()
          }, 3000)
        } catch (extensionError) {
          console.error('Failed to sync with extension:', extensionError)
          setError(`Extension sync failed: ${extensionError.message}. Continuing to dashboard...`)
          setLoading(false)

          // Continue to dashboard even if extension sync fails
          setTimeout(() => {
            onChoose('google')
            onNext()
          }, 2000)
        }
      } else {
        // Normal flow - continue to dashboard
        onChoose('google')
        setTimeout(() => onNext(), 400)
      }
    } catch (error) {
      console.error('Sign in failed:', error)
      setError('Sign in failed. Please try again.')
      setSelected(null)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-16">
        <div className="text-center space-y-6 animate-fade-in-up">
          <h2 className="text-6xl md:text-7xl font-serif text-white tracking-tight leading-[0.95] text-balance">
            {isExtensionFlow ? 'Sign in to Continue' : 'Choose your storage'}
          </h2>
          <p className="text-neutral-500 text-xl font-light leading-relaxed">
            {isExtensionFlow
              ? 'Sign in with your Google account to sync with the extension'
              : 'Sync across devices or keep it local'}
          </p>
        </div>

        {error && (
          <div className="text-center text-red-400 text-sm animate-fade-in-up">
            {error}
          </div>
        )}

        {success && (
          <div className="text-center text-green-400 text-sm animate-fade-in-up">
            {success}
          </div>
        )}

        <div className="flex justify-center animate-fade-in-up" style={{ animationDelay: "0.15s", opacity: 0 }}>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className={`max-w-md w-full p-6 bg-white text-black rounded-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/10 flex items-center justify-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
              selected === "google" ? "scale-[1.02] shadow-2xl shadow-white/10" : ""
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-lg font-medium">
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
