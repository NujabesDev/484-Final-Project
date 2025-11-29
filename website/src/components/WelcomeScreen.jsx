export function WelcomeScreen({ onNext }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <div className="max-w-7xl text-center space-y-12">
        <div className="space-y-8 animate-fade-in-up">
          <h1 className="text-8xl font-medium text-white tracking-tight text-balance leading-tight">
            One Link <br></br>
            Please
          </h1>
          <p className="text-2xl text-neutral-500 leading-relaxed max-w-3xl mx-auto">
            Read your bookmarks for once.
          </p>
        </div>
      </div>
    </div>
  )
}