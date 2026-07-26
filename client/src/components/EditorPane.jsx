import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { io } from 'socket.io-client';
import { createDocument, applyOperation, render } from '../crdt';

const EditorPane = forwardRef(({ name, roomId, onCursorPosition, remoteCursor, onOperation }, ref) => {
  const [doc, setDoc] = useState(createDocument());
  const [text, setText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [operationQueue, setOperationQueue] = useState([]);
  const [mergeHighlight, setMergeHighlight] = useState(false);
  const [showInternals, setShowInternals] = useState(false);
  const socketRef = useRef(null);
  const textareaRef = useRef(null);

  useImperativeHandle(ref, () => ({
    resetDocument: () => {
      setDoc(createDocument());
    },
    simultaneousInsert: (char) => {
      const operation = {
        type: 'insert',
        afterPosition: [0],
        beforePosition: [1],
        char: char,
        author: name
      };
      setDoc(prevDoc => {
        const newDoc = [...prevDoc];
        applyOperation(newDoc, operation);
        return newDoc;
      });
      if (!isOffline && socketRef.current) {
        socketRef.current.emit('operation', { roomId, operation });
      }
    },
    getText: () => {
      return text;
    },
    getDoc: () => {
      return doc;
    }
  }));

  useEffect(() => {
    // Connect to Socket.IO server
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('connect', () => {
      console.log(`${name} connected`);
      socketRef.current.emit('join-room', roomId);
    });

    // Listen for operations from other clients
    socketRef.current.on('operation', (operation) => {
      setDoc(prevDoc => {
        const newDoc = [...prevDoc];
        applyOperation(newDoc, operation);
        return newDoc;
      });
      if (onOperation) {
        onOperation(operation);
      }
    });

    // Listen for cursor position updates
    socketRef.current.on('cursor-position', (position) => {
      if (onCursorPosition) {
        onCursorPosition(position);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [name, roomId, onCursorPosition, onOperation]);

  // Update rendered text when document changes
  useEffect(() => {
    const renderedText = render(doc);
    setText(renderedText);
  }, [doc]);

  const handleInputChange = (e) => {
    const newText = e.target.value;
    const oldText = text;
    
    // Simple diff to detect insertions/deletions
    if (newText.length > oldText.length) {
      // Insertion
      const cursorPos = e.target.selectionStart;
      const insertedChar = newText[cursorPos - 1];
      
      // Find position in document
      const sortedDoc = [...doc].filter(c => !c.deleted).sort((a, b) => {
        const posA = a.position;
        const posB = b.position;
        for (let i = 0; i < Math.max(posA.length, posB.length); i++) {
          const valA = posA[i] ?? 0;
          const valB = posB[i] ?? 0;
          if (valA < valB) return -1;
          if (valA > valB) return 1;
        }
        return 0;
      });
      
      const afterPos = cursorPos > 0 ? sortedDoc[cursorPos - 1]?.position ?? [0] : [0];
      const beforePos = cursorPos < sortedDoc.length ? sortedDoc[cursorPos]?.position ?? [1] : [1];
      
      const operation = {
        type: 'insert',
        afterPosition: afterPos,
        beforePosition: beforePos,
        char: insertedChar,
        author: name
      };
      
      setDoc(prevDoc => {
        const newDoc = [...prevDoc];
        applyOperation(newDoc, operation);
        return newDoc;
      });
      
      if (onOperation) {
        onOperation(operation);
      }
      
      if (!isOffline && socketRef.current) {
        socketRef.current.emit('operation', { roomId, operation });
      } else {
        setOperationQueue(prev => [...prev, operation]);
      }
    } else if (newText.length < oldText.length) {
      // Deletion - simplified for demo, just rebuild document from new text
      setDoc(createDocument());
      for (let i = 0; i < newText.length; i++) {
        const char = newText[i];
        const afterPos = i > 0 ? [i] : [0];
        const beforePos = [i + 1];
        const operation = {
          type: 'insert',
          afterPosition: afterPos,
          beforePosition: beforePos,
          char: char,
          author: name
        };
        setDoc(prevDoc => {
          const newDoc = [...prevDoc];
          applyOperation(newDoc, operation);
          return newDoc;
        });
      }
      
      if (!isOffline && socketRef.current) {
        // Send the entire text as a sync operation (simplified)
        socketRef.current.emit('operation', { roomId, operation: { type: 'sync', text: newText, author: name } });
      }
    }
    
    setCursorPosition(e.target.selectionStart);
    
    // Emit cursor position
    if (!isOffline && socketRef.current) {
      socketRef.current.emit('cursor-position', { roomId, position: e.target.selectionStart });
    }
  };

  const toggleOffline = () => {
    if (!isOffline && socketRef.current) {
      // Disconnect socket when going offline
      socketRef.current.disconnect();
    }
    setIsOffline(!isOffline);
  };

  const reconnect = () => {
    setIsOffline(false);
    if (socketRef.current) {
      // Reconnect socket
      socketRef.current.connect();
      
      // Send queued operations when coming back online
      if (operationQueue.length > 0) {
        operationQueue.forEach(op => {
          socketRef.current.emit('operation', { roomId, operation: op });
        });
        setOperationQueue([]);
        
        // Show merge highlight
        setMergeHighlight(true);
        setTimeout(() => setMergeHighlight(false), 1000);
      }
    }
  };

  const getCursorColor = () => {
    return name === 'Anvi' ? 'bg-blue-500' : 'bg-green-500';
  };

  const getRemoteCursorColor = () => {
    return name === 'Anvi' ? 'bg-green-500' : 'bg-blue-500';
  };

  return (
    <div className={`flex-1 flex flex-col bg-bg-surface rounded-2xl shadow-sm border border-border-subtle overflow-hidden relative transition-all duration-300 ${
      mergeHighlight ? 'ring-2 ring-success-green ring-offset-2' : ''
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-white">
        <h3 className="font-medium text-text-primary">{name}</h3>
        <div className="flex gap-2">
          <button
            onClick={toggleOffline}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              isOffline 
                ? 'bg-warning-amber text-white' 
                : 'bg-success-green text-white'
            }`}
          >
            {isOffline ? 'Offline' : 'Online'}
          </button>
          {isOffline && (
            <button
              onClick={reconnect}
              className="px-3 py-1 rounded-lg text-sm font-medium bg-primary-blue hover:bg-primary-blue-hover text-white transition-colors"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInputChange}
          className="w-full h-full p-4 resize-none focus:outline-none font-mono text-text-primary bg-bg-surface"
          placeholder="Start typing..."
        />
        {remoteCursor !== undefined && remoteCursor !== null && (
          <div 
            className="absolute pointer-events-none flex flex-col items-center transition-all duration-200"
            style={{ left: `${remoteCursor * 8 + 16}px`, top: '16px' }}
          >
            <div className={`px-2 py-1 rounded text-xs text-white font-medium mb-1 ${getRemoteCursorColor()}`}>
              {name === 'Anvi' ? 'Ekaksh' : 'Anvi'}
            </div>
            <div className={`w-0.5 h-5 ${getRemoteCursorColor()}`} />
          </div>
        )}
      </div>
      <div className="p-2 border-t border-border-subtle text-xs text-text-muted">
        Cursor: {cursorPosition} | {isOffline ? `${operationQueue.length} queued ops` : 'Synced'}
      </div>
      
      {showInternals && (
        <div className="border-t border-border-subtle bg-bg-white">
          <div className="p-3 border-b border-border-subtle">
            <button
              onClick={() => setShowInternals(false)}
              className="text-sm font-medium text-text-primary hover:text-primary-blue transition-colors"
            >
              ▼ Under the hood
            </button>
          </div>
          <div className="p-3 max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-muted">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Position</th>
                  <th className="pb-2 font-medium">Char</th>
                  <th className="pb-2 font-medium">Deleted</th>
                  <th className="pb-2 font-medium">Author</th>
                </tr>
              </thead>
              <tbody>
                {doc.map((char, index) => (
                  <tr key={index} className="border-t border-border-subtle font-mono">
                    <td className="py-1 text-xs text-text-muted">{char.id.slice(-8)}</td>
                    <td className="py-1 text-xs">{char.position.join('.')}</td>
                    <td className="py-1">{char.char}</td>
                    <td className="py-1">{char.deleted ? '✓' : '-'}</td>
                    <td className="py-1">{char.author}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {!showInternals && (
        <button
          onClick={() => setShowInternals(true)}
          className="w-full p-2 border-t border-border-subtle text-xs text-text-muted hover:text-text-primary hover:bg-bg-surface-hover transition-colors"
        >
          ▶ Under the hood
        </button>
      )}
    </div>
  );
});

EditorPane.displayName = 'EditorPane';

export default EditorPane;
