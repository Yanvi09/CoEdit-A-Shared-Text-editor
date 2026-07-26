import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { io } from 'socket.io-client';
import { createDocument, applyOperation, render, generateId } from '../crdt';

const CollabEditor = forwardRef(({ userName, roomId, onOperation, onRemoteCursor, isDemoMode = false, isHost = false }, ref) => {
  const [doc, setDoc] = useState(createDocument());
  const [text, setText] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [operationQueue, setOperationQueue] = useState([]);
  const [mergeHighlight, setMergeHighlight] = useState(false);
  const [showInternals, setShowInternals] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState('');
  const typingTimeoutRef = useRef(null);
  const simulationTimerRef = useRef(null);
  const socketRef = useRef(null);
  const textareaRef = useRef(null);
  const onOperationRef = useRef(onOperation);
  const onRemoteCursorRef = useRef(onRemoteCursor);

  // Update refs when callbacks change
  useEffect(() => {
    onOperationRef.current = onOperation;
    onRemoteCursorRef.current = onRemoteCursor;
  }, [onOperation, onRemoteCursor]);

  // Handle typing indicator for other user
  useEffect(() => {
    if (isDemoMode && onRemoteCursorRef.current) {
      const allCursors = onRemoteCursorRef.current;
      if (allCursors && typeof allCursors === 'object') {
        const otherUserName = userName === 'Anvi' ? 'Ekaksh' : 'Anvi';
        const otherCursor = allCursors[otherUserName];
        setOtherUserTyping(otherCursor?.isTyping || false);
      }
    }
  }, [onRemoteCursor, userName, isDemoMode]);

  useImperativeHandle(ref, () => ({
    resetDocument: () => {
      setDoc(createDocument());
    },
    simultaneousInsert: async (char) => {
      // Insert a single character with the current document state
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
      
      const cursorPos = sortedDoc.length;
      const afterPos = cursorPos > 0 ? sortedDoc[cursorPos - 1]?.position ?? [0] : [0];
      const beforePos = cursorPos < sortedDoc.length ? sortedDoc[cursorPos]?.position ?? [1] : [1];
      
      const operation = {
        type: 'insert',
        id: generateId(),
        afterPosition: afterPos,
        beforePosition: beforePos,
        char: char,
        author: userName
      };
      
      setDoc(prevDoc => {
        const newDoc = [...prevDoc];
        applyOperation(newDoc, operation);
        return newDoc;
      });
      
      // Emit operation
      if (!isOffline && socketRef.current) {
        socketRef.current.emit('operation', { roomId, operation });
      }
      
      // Add delay for visible animation
      await new Promise(resolve => setTimeout(resolve, 150));
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
      
      // In real session mode, emit user-joined so others know about this user
      if (!isDemoMode) {
        socketRef.current.emit('user-joined', { roomId, user: userName });
      }
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

    // Listen for typing indicator updates
    socketRef.current.on('typing-indicator', (data) => {
      console.log(`${userName} received typing indicator:`, data);
      if (onRemoteCursorRef.current) {
        onRemoteCursorRef.current(data);
      }
      // Update local state for typing indicator
      if (data.author !== userName) {
        setOtherUserTyping(data.isTyping);
        setTypingUserName(data.author);
      }
    });

    // Listen for user leave events in real session mode
    if (!isDemoMode) {
      socketRef.current.on('user-left', (socketId) => {
        console.log('User left the room');
        // Clear the typing indicator when user leaves
        setOtherUserTyping(false);
        setTypingUserName('');
      });
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (simulationTimerRef.current) {
        clearTimeout(simulationTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userName, roomId, isDemoMode]);

  // Update rendered text when document changes
  useEffect(() => {
    const renderedText = render(doc);
    setText(renderedText);
  }, [doc]);

  // Get color for a user based on join order
  const getUserColor = (author) => {
    if (isDemoMode) {
      // Demo mode uses hardcoded colors for Anvi and Ekaksh
      return author === 'Anvi' ? '#4285F4' : '#F9A825';
    }
    
    // Real session mode: host (first joiner) gets blue, guest gets gold
    if (author === userName) {
      // Current user: host gets blue, guest gets gold
      return isHost ? '#4285F4' : '#F9A825';
    } else {
      // Other user: if current is host, other is guest (gold), else other is host (blue)
      return isHost ? '#F9A825' : '#4285F4';
    }
  };

  // Render text with author colors
  const renderColoredText = () => {
    const activeChars = doc.filter(c => !c.deleted);
    activeChars.sort((a, b) => {
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
    
    return activeChars.map((char) => {
      const color = getUserColor(char.author);
      return <span key={char.id} style={{ color }}>{char.char}</span>;
    });
  };

  const handleInputChange = (e) => {
    const newText = e.target.value;
    const oldText = text;
    
    // Emit typing indicator
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (!isOffline && socketRef.current) {
        socketRef.current.emit('typing-indicator', { roomId, author: userName, isTyping: false });
      }
    }, 1000);
    
    if (!isOffline && socketRef.current) {
      socketRef.current.emit('typing-indicator', { roomId, author: userName, isTyping: true });
    }
    
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
        id: generateId(),
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
      // Deletion
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
  };

  const toggleOffline = () => {
    if (!isOffline && socketRef.current) {
      socketRef.current.disconnect();
    }
    setIsOffline(!isOffline);
  };

  const reconnect = () => {
    setIsOffline(false);
    if (socketRef.current) {
      socketRef.current.connect();
      
      if (operationQueue.length > 0) {
        operationQueue.forEach(op => {
          socketRef.current.emit('operation', { roomId, operation: op });
        });
        setOperationQueue([]);
        
        setMergeHighlight(true);
        setTimeout(() => setMergeHighlight(false), 1000);
      }
    }
  };

  const getOtherUserName = () => {
    if (isDemoMode) {
      return userName === 'Anvi' ? 'Ekaksh' : 'Anvi';
    }
    // In real session mode, use the actual typing user name
    return typingUserName || 'Someone';
  };

  return (
    <div className={`flex-1 flex flex-col bg-bg-surface rounded-2xl shadow-sm border border-border-subtle overflow-hidden relative transition-all duration-300 ${
      mergeHighlight ? 'ring-2 ring-success-green ring-offset-2' : ''
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-white">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-text-primary">{userName}</h3>
          {otherUserTyping && (
            <span className="text-xs text-primary-blue font-medium">
              {getOtherUserName()} is typing...
            </span>
          )}
        </div>
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
          style={{ color: 'transparent', caretColor: 'text-primary', backgroundColor: 'transparent' }}
        />
        <div 
          className="absolute top-4 left-4 w-full h-full pointer-events-none font-mono whitespace-pre-wrap overflow-hidden"
          style={{ color: 'text-primary' }}
        >
          {renderColoredText()}
        </div>
      </div>
      <div className="p-2 border-t border-border-subtle text-xs text-text-muted">
        {isOffline ? `${operationQueue.length} queued ops` : 'Synced'}
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
