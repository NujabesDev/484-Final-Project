export function DashboardIntroScreen({ onGetStarted, onBack }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <div className="max-w-7xl w-full text-center space-y-16">
        <div className="space-y-8 animate-fade-in-up">
          <h2 className="text-7xl font-medium text-white tracking-tight text-balance leading-tight">
            How To Use
          </h2>
          <p className="text-2xl text-neutral-500 leading-relaxed max-w-3xl mx-auto">
            Four simple steps to reclaim your reading time
          </p>
        </div>

        {/* Screenshot Display */}
        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-neutral-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <img
              src="/images/how-to-use.png"
              alt="How to use guide"
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onBack}
            className="px-8 py-4 bg-transparent text-white rounded-full text-lg font-medium border border-white hover:bg-white hover:text-black transition-colors"
          >
            Back
          </button>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-white text-black rounded-full text-lg font-medium hover:bg-neutral-200 transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}

