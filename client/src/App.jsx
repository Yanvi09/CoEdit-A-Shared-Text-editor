import { useState } from 'react'
import './App.css'

function App() {
  const [view, setView] = useState('landing')

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-bg-white flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl text-center">
          <h1 className="text-6xl font-bold text-text-primary mb-6">CoEdit</h1>
          <p className="text-xl text-text-muted mb-12">
            Two people editing the same document at once — watch it always merge correctly, even if someone loses connection.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setView('demo')}
              className="px-8 py-4 bg-primary-blue hover:bg-primary-blue-hover text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Watch It Work
            </button>
            <button
              onClick={() => setView('real')}
              className="px-8 py-4 bg-bg-surface hover:bg-bg-surface-hover text-text-primary border border-border-subtle rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Start a Real Session
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'demo') {
    return (
      <div className="min-h-screen bg-bg-white p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setView('landing')}
            className="mb-6 text-text-muted hover:text-text-primary transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold text-text-primary mb-8">Demo</h1>
          <p className="text-text-muted">Demo page coming soon...</p>
        </div>
      </div>
    )
  }

  if (view === 'real') {
    return (
      <div className="min-h-screen bg-bg-white p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setView('landing')}
            className="mb-6 text-text-muted hover:text-text-primary transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold text-text-primary mb-8">Real Session</h1>
          <p className="text-text-muted">Real session page coming soon...</p>
        </div>
      </div>
    )
  }
}

export default App
