import React, { Component, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

interface EBState { error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#E5E7EB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>ZedVevo — Something went wrong</h1>
          <p style={{ color: '#9CA3AF', marginBottom: 24, maxWidth: 480, textAlign: 'center' }}>An unexpected error occurred. Please refresh the page to try again.</p>
          <pre style={{ background: '#111827', padding: 16, borderRadius: 8, fontSize: 12, color: '#F87171', maxWidth: 640, overflow: 'auto' }}>
            {this.state.error.message}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 24, padding: '10px 24px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
