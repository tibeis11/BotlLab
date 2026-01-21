'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="bg-zinc-900/50 border border-red-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Fehler beim Laden</h2>
          <p className="text-zinc-400 mb-4">
            Beim Laden dieser Komponente ist ein Fehler aufgetreten.
          </p>
          {this.state.error && (
            <details className="text-left bg-zinc-950 rounded-lg p-4 mb-4">
              <summary className="cursor-pointer text-sm text-zinc-500 mb-2">
                Technische Details
              </summary>
              <pre className="text-xs text-red-400 overflow-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            Erneut versuchen
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
