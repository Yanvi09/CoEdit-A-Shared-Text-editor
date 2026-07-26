import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { io } from 'socket.io-client';
import { createDocument, applyOperation, render, generateId } from '../crdt';

const CollabEditor = forwardRef(({ userName, roomId, onOperation, onRemoteCursor, isDemoMode = false }, ref) => {
  const [doc, setDoc] = useState(createDocument());
  const [text, setText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [operationQueue, setOperationQueue] = useState([]);
  const [mergeHighlight, setMergeHighlight] = useState(false);
  const [showInternals, setShowInternals] = useState(false);
  const [hasReceivedRemoteCursor, setHasReceivedRemoteCursor] = useState(false);
  const [cursorPositionPixels, setCursorPositionPixels] = useState({ x: 0, y: 0 });
  const [otherUserCursor, setOtherUserCursor] = useState(null);
  const socketRef = useRef(null);
  const textareaRef = useRef(null);
  const mirrorRef = useRef(null);
  const onOperationRef = useRef(onOperation);
  const onRemoteCursorRef = useRef(onRemoteCursor);

  // Update refs when callbacks change
  useEffect(() => {
    onOperationRef.current = onOperation;
    onRemoteCursorRef.current = onRemoteCursor;
  }, [onOperation, onRemoteCursor]);

  // Handle remote cursor data from parent
  useEffect(() => {
    if (onRemoteCursorRef.current) {
      const allCursors = onRemoteCursorRef.current;
      if (allCursors && typeof allCursors === 'object') {
        // Find cursor for the OTHER user (not ourselves)
        const otherUserName = userName === 'Anvi' ? 'Ekaksh' : 'Anvi';
        const otherCursor = allCursors[otherUserName];
        setOtherUserCursor(otherCursor);
      }
    }
  }, [onRemoteCursor, userName]);

  useImperativeHandle(ref, () => ({
    resetDocument: () => {
      setDoc(createDocument());
    },
    simultaneousInsert: (char) => {
      const operation = {
        type: 'insert',
        id: generateId(),
        afterPosition: [0],
        beforePosition: [1],
        char: char,
        author: userName
      };
      setDoc(prevDoc => {
        const newDoc = [...prevDoc];
        applyOperation(newDoc, operation);
        return newDoc;
      });
      // Emit to socket for actual sync during test
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
      console.log(`${userName} connected to room ${roomId}`);
      socketRef.current.emit('join-room', roomId);
    });

    // Listen for operations from other clients
    socketRef.current.on('operation', (operation) => {
      console.log(`${userName} received operation:`, operation);
      if (operation.type === 'remove') {
        console.log('[DELETE] received operation:', operation);
      }
      setDoc(prevDoc => {
        const newDoc = [...prevDoc];
        if (operation.type === 'remove') {
          const foundEntry = newDoc.find(c => c.id === operation.id);
          console.log('[DELETE] applying to doc, found matching entry:', foundEntry);
          if (!foundEntry) {
            console.log('[DELETE] WARNING: Character ID not found in local document:', operation.id);
            console.log('[DELETE] Current document IDs:', newDoc.map(c => c.id));
          }
        }
        applyOperation(newDoc, operation);
        return newDoc;
      });
      if (onOperationRef.current) {
        onOperationRef.current(operation);
      }
    });

    // Listen for cursor position updates
    socketRef.current.on('cursor-position', (data) => {
      console.log(`${userName} received cursor position:`, data);
      if (onRemoteCursorRef.current) {
        onRemoteCursorRef.current(data);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userName, roomId]);

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
        id: generateId(), // Only generate ID for local operations
        afterPosition: afterPos,
        beforePosition: beforePos,
        char: insertedChar,
        author: userName
      };
      
      setDoc(prevDoc => {
        const newDoc = [...prevDoc];
        applyOperation(newDoc, operation);
        return newDoc;
      });
      
      if (onOperationRef.current) {
        onOperationRef.current(operation);
      }
      
      if (!isOffline && socketRef.current) {
        socketRef.current.emit('operation', { roomId, operation });
      } else {
        setOperationQueue(prev => [...prev, operation]);
      }
    } else if (newText.length < oldText.length) {
      // Deletion - find which character was deleted and mark it as tombstone
      const cursorPos = e.target.selectionStart;
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
      
      // The character at cursorPos was deleted
      if (cursorPos < sortedDoc.length) {
        const deletedChar = sortedDoc[cursorPos];
        const operation = {
          type: 'remove',
          id: deletedChar.id,
          position: deletedChar.position,
          removedChar: deletedChar.char,
          author: userName
        };
        
        console.log('[DELETE] generated operation:', operation);
        
        setDoc(prevDoc => {
          const newDoc = [...prevDoc];
          applyOperation(newDoc, operation);
          return newDoc;
        });
        
        if (onOperationRef.current) {
          onOperationRef.current(operation);
        }
        
        if (!isOffline && socketRef.current) {
          console.log('[DELETE] emitting to server:', operation);
          socketRef.current.emit('operation', { roomId, operation });
        } else {
          setOperationQueue(prev => [...prev, operation]);
        }
      }
    }
    
    setCursorPosition(e.target.selectionStart);
    
    // Emit cursor position
    if (!isOffline && socketRef.current) {
      socketRef.current.emit('cursor-position', { roomId, position: e.target.selectionStart, userName });
    }
  };

  const handleCursorMove = (e) => {
    const newPos = e.target.selectionStart;
    if (newPos !== cursorPosition) {
      setCursorPosition(newPos);
      if (!isOffline && socketRef.current) {
        socketRef.current.emit('cursor-position', { roomId, position: newPos, userName });
      }
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
    return userName === 'Anvi' ? 'bg-blue-500' : 'bg-green-500';
  };

  const calculateCursorPosition = (charPosition) => {
    if (!mirrorRef.current || charPosition === null || charPosition === undefined) {
      return { x: 0, y: 0 };
    }

    // Use the mirror element to measure actual rendered position
    const textUpToCursor = text.substring(0, charPosition);
    mirrorRef.current.textContent = textUpToCursor;
    
    const rect = mirrorRef.current.getBoundingClientRect();
    const textareaRect = textareaRef.current.getBoundingClientRect();
    
    return {
      x: rect.width,
      y: rect.height
    };
  };

  // Update cursor position when remote cursor changes
  useEffect(() => {
    if (otherUserCursor && otherUserCursor.position !== null && otherUserCursor.position !== undefined) {
      setHasReceivedRemoteCursor(true);
      const newPos = calculateCursorPosition(otherUserCursor.position);
      setCursorPositionPixels(newPos);
    } else {
      setHasReceivedRemoteCursor(false);
    }
  }, [otherUserCursor, text]);

  return (
    <div className={`flex-1 flex flex-col bg-bg-surface rounded-2xl shadow-sm border border-border-subtle overflow-hidden relative transition-all duration-300 ${
      mergeHighlight ? 'ring-2 ring-success-green ring-offset-2' : ''
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-white">
        <h3 className="font-medium text-text-primary">{userName}</h3>
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
          onSelect={handleCursorMove}
          onClick={handleCursorMove}
          onKeyUp={handleCursorMove}
          className="w-full h-full p-4 resize-none focus:outline-none font-mono text-text-primary bg-bg-surface"
          placeholder="Start typing..."
        />
        {/* Hidden mirror element for cursor position calculation */}
        <div
          ref={mirrorRef}
          className="absolute opacity-0 pointer-events-none font-mono text-text-primary p-4 whitespace-pre"
          style={{ top: 0, left: 0 }}
        />
        {hasReceivedRemoteCursor && otherUserCursor && otherUserCursor.position !== null && otherUserCursor.position !== undefined && (
          <div 
            className="absolute pointer-events-none flex flex-col items-start transition-all duration-200"
            style={{ 
              left: `${cursorPositionPixels.x + 16}px`, 
              top: `${cursorPositionPixels.y + 16}px`
            }}
          >
            <div className={`px-2 py-1 rounded text-xs text-white font-medium mb-1 ${getCursorColor()}`}>
              {otherUserCursor.userName}
            </div>
            <div className={`w-0.5 h-5 ${getCursorColor()}`} />
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

CollabEditor.displayName = 'CollabEditor';

export default CollabEditor;
