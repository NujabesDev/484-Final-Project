export function WelcomeScreen({ onNext }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-7xl text-center space-y-20">
        <div className="space-y-12 animate-fade-in-up">
          <h1 className="text-[16rem] font-serif text-white tracking-tight text-balance leading-[0.85]">
            One Link <br></br>
            Please
          </h1>
          <p className="text-5xl text-neutral-500 leading-relaxed max-w-4xl mx-auto text-pretty font-light">
            Read your bookmarks for once.
          </p>
        </div>
      </div>
    </div>
  )
}