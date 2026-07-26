import { useState, useRef, useEffect } from 'react'
import CollabEditor from './components/CollabEditor'
import RealSession from './components/RealSession'
import './App.css'

function App() {
  const [view, setView] = useState('landing')
  const [testResult, setTestResult] = useState(null)
  const [operationLog, setOperationLog] = useState([])
  const [showExplainer, setShowExplainer] = useState(false)
  const [remoteCursors, setRemoteCursors] = useState({
    'Anvi': null,
    'Ekaksh': null
  })
  const anviRef = useRef(null)
  const ekakshRef = useRef(null)

  // Check URL for room routing
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'room' && pathParts[2]) {
      setView('real');
    }
  }, [])

  const runSimultaneousEditTest = () => {
    setTestResult(null)
    
    // Reset both documents
    if (anviRef.current && ekakshRef.current) {
      anviRef.current.resetDocument()
      ekakshRef.current.resetDocument()
      
      // Wait a moment for reset to complete, then run simulation
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

  const logOperation = (operation) => {
    const newLog = {
      time: new Date().toLocaleTimeString(),
      author: operation.author,
      type: operation.type,
      character: operation.char || operation.removedChar || '-',
      position: operation.afterPosition ? operation.afterPosition.join('.') : (operation.position ? operation.position.join('.') : '-')
    }
    setOperationLog(prev => [newLog, ...prev].slice(0, 50))
  }

  const handleRemoteCursor = (cursorData) => {
    if (cursorData && cursorData.userName) {
      setRemoteCursors(prev => ({
        ...prev,
        [cursorData.userName]: cursorData
      }))
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
            <CollabEditor 
              ref={anviRef}
              userName="Anvi" 
              roomId="demo-room" 
              onOperation={logOperation}
              onRemoteCursor={handleRemoteCursor}
              isDemoMode={true}
            />
            <CollabEditor 
              ref={ekakshRef}
              userName="Ekaksh" 
              roomId="demo-room" 
              onOperation={logOperation}
              onRemoteCursor={handleRemoteCursor}
              isDemoMode={true}
            />
          </div>
          
          {operationLog.length > 0 && (
            <div className="mt-6 bg-bg-surface rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
              <div className="p-4 border-b border-border-subtle bg-bg-white">
                <h3 className="font-medium text-text-primary">Operation Log</h3>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-muted">
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">Author</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Character</th>
                      <th className="pb-2 font-medium">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationLog.map((op, index) => (
                      <tr key={index} className="border-t border-border-subtle">
                        <td className="py-2 font-mono text-xs">{op.time}</td>
                        <td className="py-2">{op.author}</td>
                        <td className="py-2">{op.type}</td>
                        <td className="py-2 font-mono">{op.character}</td>
                        <td className="py-2 font-mono text-xs">{op.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="mt-6 bg-bg-surface rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
            <button
              onClick={() => setShowExplainer(!showExplainer)}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-bg-surface-hover transition-colors"
            >
              <span className="font-medium text-text-primary">How this works</span>
              <span className="text-text-muted">{showExplainer ? '▼' : '▶'}</span>
            </button>
            {showExplainer && (
              <div className="p-4 border-t border-border-subtle text-sm text-text-muted space-y-2">
                <p>
                  <strong>CRDTs (Conflict-free Replicated Data Types)</strong> use fractional positions to order characters, so simultaneous edits always converge to the same result without a central authority.
                </p>
                <p>
                  <strong>Tombstones</strong> mark deleted characters instead of removing them, ensuring deletions sync correctly even when applied in different orders.
                </p>
                <p>
                  <strong>Zero server logic</strong> — the server only relays operations between clients. All conflict resolution happens client-side using deterministic mathematical rules.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'real') {
    return <RealSession />
  }
}

export default App
