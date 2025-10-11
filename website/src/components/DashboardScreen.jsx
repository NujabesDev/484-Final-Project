export function DashboardScreen({ storageChoice }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 animate-fade-in">
      <div className="max-w-4xl w-full">
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
