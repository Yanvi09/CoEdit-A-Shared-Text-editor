import { useState, useRef } from 'react'
import EditorPane from './components/EditorPane'
import './App.css'

function App() {
  const [view, setView] = useState('landing')
  const [anviCursor, setAnviCursor] = useState(null)
  const [ekakshCursor, setEkakshCursor] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const anviRef = useRef(null)
  const ekakshRef = useRef(null)

  const runSimultaneousEditTest = () => {
    setTestResult(null)
    
    // Reset both documents
    if (anviRef.current && ekakshRef.current) {
      anviRef.current.resetDocument()
      ekakshRef.current.resetDocument()
      
      // Wait a moment for reset to complete
      setTimeout(() => {
        // Trigger simultaneous inserts at position 0
        if (anviRef.current && ekakshRef.current) {
          anviRef.current.simultaneousInsert('A')
          ekakshRef.current.simultaneousInsert('B')
          
          // Check results after a short delay
          setTimeout(() => {
            const anviText = anviRef.current.getText()
            const ekakshText = ekakshRef.current.getText()
            
            if (anviText === ekakshText) {
              setTestResult({ success: true, message: 'both edits merged — texts match' })
            } else {
              setTestResult({ success: false, message: 'texts diverged — CRDT bug detected' })
            }
          }, 500)
        }
      }, 100)
    }
  }

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
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setView('landing')}
            className="mb-6 text-text-muted hover:text-text-primary transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold text-text-primary mb-8">Watch It Work</h1>
          <p className="text-text-muted mb-8">
            Type in either pane — changes will sync instantly. Both panes are connected to the same demo room.
          </p>
          
          <button
            onClick={runSimultaneousEditTest}
            className="mb-6 px-6 py-3 bg-primary-blue hover:bg-primary-blue-hover text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Simulate Simultaneous Edit
          </button>
          
          {testResult && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              testResult.success ? 'bg-success-green/10 text-success-green' : 'bg-error-red/10 text-error-red'
            }`}>
              {testResult.success ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="font-medium">{testResult.message}</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-6 h-[600px]">
            <EditorPane 
              ref={anviRef}
              name="Anvi" 
              roomId="demo-room" 
              onCursorPosition={setAnviCursor}
              remoteCursor={ekakshCursor}
            />
            <EditorPane 
              ref={ekakshRef}
              name="Ekaksh" 
              roomId="demo-room" 
              onCursorPosition={setEkakshCursor}
              remoteCursor={anviCursor}
            />
          </div>
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
