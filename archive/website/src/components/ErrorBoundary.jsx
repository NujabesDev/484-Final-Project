import { Component } from 'react'

/**
 * Error Boundary to catch React errors and prevent app crashes
 *
 * Catches errors during:
 * - Rendering
 * - Lifecycle methods
 * - Constructors of the whole tree below them
 *
 * Does NOT catch errors in:
 * - Event handlers (use try-catch)
 * - Async code (use try-catch)
 * - Server-side rendering
 * - Errors thrown in the error boundary itself
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details to console
    console.error('Error caught by boundary:', error, errorInfo)

    // Store error details in state
    this.setState({
      error: error,
      errorInfo: errorInfo
    })

    // TODO: Send error to logging service (e.g., Sentry, LogRocket)
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen dot-grid-bg flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-4xl font-serif text-white">Something went wrong</h1>
            <p className="text-neutral-400 text-lg">
              The app encountered an unexpected error. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Refresh Page
            </button>

            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-neutral-500 hover:text-neutral-300">
                  Error Details (Dev Only)
                </summary>
                <div className="mt-4 p-4 bg-neutral-900 rounded-lg text-sm font-mono text-red-400 overflow-auto max-h-64">
                  <p className="font-bold">{this.state.error.toString()}</p>
                  <pre className="mt-2 text-neutral-500 text-xs">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
