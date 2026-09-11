import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f8faff] p-4 text-center">
          <div className="w-full max-w-md rounded-3xl border border-[#ece8f6] bg-white p-6 shadow-xl sm:p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-sm">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Algo salió mal</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Ocurrió un error inesperado en la interfaz. Hemos registrado el incidente para solucionarlo.
            </p>
            {this.state.error?.message && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-left font-mono text-[11px] text-slate-600 break-words">
                {this.state.error.message}
              </div>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#9d31ff] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#9d31ff]/25 hover:bg-[#8b26e3] transition active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar aplicación
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
