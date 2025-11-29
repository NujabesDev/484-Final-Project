export function DashboardIntroScreen({ onGetStarted, onBack }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-7xl w-full text-center space-y-16">
        <div className="space-y-8 animate-fade-in-up">
          <h2 className="text-7xl font-medium text-white tracking-tight text-balance leading-tight">
            How To Use
          </h2>
          <p className="text-2xl text-neutral-500 leading-relaxed max-w-3xl mx-auto">
            Three simple steps to reclaim your reading time
          </p>
        </div>

        {/* Three numbered steps */}
        <div className="space-y-12 max-w-5xl mx-auto">
          {/* Step 1 */}
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center font-bold text-3xl flex-shrink-0">
              1
            </div>
            <div className="flex-1 text-left">
              <p className="text-neutral-300 text-2xl leading-tight">
                Save links you want to read later with one click
              </p>
              <div className="mt-4 text-neutral-500 text-lg">
                [Image placeholder - browser extension saving a link]
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center font-bold text-3xl flex-shrink-0">
              2
            </div>
            <div className="flex-1 text-left">
              <p className="text-neutral-300 text-2xl leading-tight">
                Get one random link at a time - no overwhelming lists
              </p>
              <div className="mt-4 text-neutral-500 text-lg">
                [Image placeholder - single link display]
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center font-bold text-3xl flex-shrink-0">
              3
            </div>
            <div className="flex-1 text-left">
              <p className="text-neutral-300 text-2xl leading-tight">
                Read, skip, or delete - stay focused and productive
              </p>
              <div className="mt-4 text-neutral-500 text-lg">
                [Image placeholder - action buttons]
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}