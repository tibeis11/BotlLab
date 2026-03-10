'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

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
    console.error('Admin Dashboard Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="bg-(--surface)/50 border border-red-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-(--error-bg) text-(--error) rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Fehler beim Laden</h2>
          <p className="text-(--text-secondary) mb-4">
            Beim Laden dieser Komponente ist ein Fehler aufgetreten.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 bg-(--brand) text-black font-bold rounded-lg hover:opacity-90 transition"
          >
            Erneut versuchen
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
