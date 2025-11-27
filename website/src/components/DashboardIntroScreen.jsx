export function DashboardIntroScreen({ onGetStarted, onBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-7xl w-full text-center space-y-24">
        <div className="space-y-12 animate-fade-in-up">
          <h2 className="text-[12rem] font-serif text-white tracking-tight text-balance leading-[0.85]">
            How To Use
          </h2>
          <p className="text-4xl text-neutral-500 leading-relaxed max-w-3xl mx-auto text-pretty font-light">
            Three simple steps to reclaim your reading time
          </p>
        </div>

        {/* Three numbered steps */}
        <div className="space-y-20 max-w-6xl mx-auto">
          {/* Step 1 */}
          <div className="flex items-center gap-12">
            <div className="w-28 h-28 rounded-full bg-white text-black flex items-center justify-center font-bold text-5xl flex-shrink-0">
              1
            </div>
            <div className="flex-1 text-left">
              <p className="text-neutral-300 text-4xl leading-tight">
                Save links you want to read later with one click
              </p>
              <div className="mt-6 text-neutral-500 text-2xl">
                [Image placeholder - browser extension saving a link]
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-12">
            <div className="w-28 h-28 rounded-full bg-white text-black flex items-center justify-center font-bold text-5xl flex-shrink-0">
              2
            </div>
            <div className="flex-1 text-left">
              <p className="text-neutral-300 text-4xl leading-tight">
                Get one random link at a time - no overwhelming lists
              </p>
              <div className="mt-6 text-neutral-500 text-2xl">
                [Image placeholder - single link display]
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-12">
            <div className="w-28 h-28 rounded-full bg-white text-black flex items-center justify-center font-bold text-5xl flex-shrink-0">
              3
            </div>
            <div className="flex-1 text-left">
              <p className="text-neutral-300 text-4xl leading-tight">
                Read, skip, or delete - stay focused and productive
              </p>
              <div className="mt-6 text-neutral-500 text-2xl">
                [Image placeholder - action buttons]
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}