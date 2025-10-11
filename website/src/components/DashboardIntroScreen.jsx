export function DashboardIntroScreen({ onGetStarted, onBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-16">
        <div className="space-y-8 animate-fade-in-up">
          <h2 className="text-7xl md:text-8xl font-serif text-white tracking-tight leading-[0.9]">Save Anything</h2>
          <p className="text-lg md:text-xl text-neutral-500 leading-relaxed max-w-md mx-auto text-pretty font-light">
            Capture links, articles, and ideas instantly. Access them randomly when you need inspiration or just want to
            rediscover something interesting.
          </p>
        </div>
      </div>
    </div>
  )
}
