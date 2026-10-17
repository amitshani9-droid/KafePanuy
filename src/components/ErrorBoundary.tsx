import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Last line of defense: an unexpected error shows a friendly screen instead of a blank page. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('קפה פנוי crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 bg-cream p-8 text-center">
        <div className="text-6xl" aria-hidden="true">
          ☕💥
        </div>
        <h1 className="font-display text-2xl font-bold text-forest">אופס, משהו השתבש</h1>
        <p className="max-w-xs text-ink/70">נשפך לנו קצת קפה על הקוד. טעינה מחדש בדרך כלל מסדרת את זה.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded-full bg-forest px-6 py-3 font-display font-bold text-cream hover:bg-forest-light"
        >
          טען מחדש
        </button>
      </div>
    )
  }
}
