import { signOut } from '@/lib/auth'

export function DashboardScreen({ storageChoice, user }) {
  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.reload() // Refresh to go back to welcome screen
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 animate-fade-in">
      <div className="max-w-4xl w-full">
        {/* Header with user info */}
        {user && (
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <img
                src={user.photoURL || 'https://via.placeholder.com/48'}
                alt="Profile"
                className="w-12 h-12 rounded-full border-2 border-neutral-700"
              />
              <div>
                <p className="text-white font-medium">{user.displayName || 'User'}</p>
                <p className="text-neutral-500 text-sm">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}

        <div className="text-center space-y-12">
          <div className="space-y-4">
            <h1 className="text-5xl font-serif text-white tracking-tight">Your Dashboard</h1>
            <p className="text-neutral-500 font-light">
              {storageChoice === 'google' ? 'Synced with Google' : 'Using local storage'}
            </p>
          </div>

          {/* Simple placeholder for now - just a big text box like requested */}
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-3xl p-8 border border-neutral-800 min-h-[400px] flex items-center justify-center">
            <p className="text-2xl text-neutral-600 font-light">Your content will appear here</p>
          </div>
        </div>
      </div>
    </div>
  )
}
