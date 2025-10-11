export function WelcomeScreen({ onNext }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-3xl text-center space-y-16">
        <div className="space-y-8 animate-fade-in-up">
          <h1 className="text-8xl md:text-9xl font-serif text-white tracking-tight text-balance leading-[0.9]">
            Read Later,
            <br />
            Randomly
          </h1>
          <p className="text-lg md:text-xl text-neutral-500 leading-relaxed max-w-md mx-auto text-pretty font-light">
            Save links from distracting sites. Get one random article at a time. No endless scrolling.
          </p>
        </div>
      </div>
    </div>
  )
}
