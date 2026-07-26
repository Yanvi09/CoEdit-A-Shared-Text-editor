import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import CollabEditor from './CollabEditor';

export default function RealSession() {
  const [view, setView] = useState('join'); // 'join', 'create', 'waiting', 'editing'
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [roomLink, setRoomLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Check if there's a room ID in the URL
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'room' && pathParts[2]) {
      setRoomId(pathParts[2]);
      setIsHost(false);
      setView('join');
    } else {
      // If no room ID, this is the host creating a new room
      setIsHost(true);
      setView('join');
    }
  }, []);

  const handleBack = () => {
    // Cleanly disconnect from socket if connected
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    window.location.href = '/';
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    const userName = name.trim() || 'Anvi';
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    setIsHost(true);
    setRoomLink(`${window.location.origin}/room/${newRoomId}`);
    setView('waiting');
    // Connect to socket as host
    connectToRoom(newRoomId, userName);
  };

  const handleJoinRoom = () => {
    const userName = name.trim() || 'Ekaksh';
    setView('editing');
    connectToRoom(roomId, userName);
  };

  const connectToRoom = (roomId, userName) => {
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('connect', () => {
      console.log(`${userName} connected to room ${roomId}`);
      socketRef.current.emit('join-room', roomId);
      // Emit user-joined to register this user in the server's participants map
      socketRef.current.emit('user-joined', { roomId, user: userName });
    });

    socketRef.current.on('user-joined', (user) => {
      console.log(`${user} joined the room`);
      setOtherUser(user);
      if (isHost) {
        setView('editing');
      }
    });

    socketRef.current.on('room-participants', (participants) => {
      console.log('Received room participants:', participants);
      // Find the other participant (not the current user)
      const otherParticipant = participants.find(p => p !== userName);
      if (otherParticipant) {
        setOtherUser(otherParticipant);
      }
    });

    socketRef.current.on('user-left', (socketId) => {
      console.log('User left the room');
      setOtherUser(null);
      if (isHost) {
        setView('waiting');
      } else {
        // Guest sees disconnected state
        alert('The host has disconnected. Returning to home...');
        window.location.href = '/';
      }
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Effect to handle connection when view changes to editing
  useEffect(() => {
    if (view === 'editing' && name && roomId && !socketRef.current) {
      connectToRoom(roomId, name);
    }
  }, [view, name, roomId]);

  const copyLink = () => {
    navigator.clipboard.writeText(roomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (view === 'join') {
    return (
      <div className="min-h-screen bg-bg-white flex flex-col items-center justify-center p-8">
        <button
          onClick={handleBack}
          className="mb-6 text-text-muted hover:text-text-primary transition-colors"
        >
          ← Back
        </button>
        <div className="max-w-md w-full bg-bg-surface rounded-2xl shadow-sm border border-border-subtle p-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">
            {isHost ? 'Create a Room' : 'Join Room'}
          </h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-muted mb-2">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isHost ? 'Anvi' : 'Ekaksh'}
              className="w-full px-4 py-3 rounded-xl border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-text-primary bg-bg-white"
            />
          </div>
          <button
            onClick={isHost ? handleCreateRoom : handleJoinRoom}
            className="w-full py-3 bg-primary-blue hover:bg-primary-blue-hover text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isHost ? 'Create Room' : 'Join Room'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'waiting') {
    return (
      <div className="min-h-screen bg-bg-white flex flex-col items-center justify-center p-8">
        <button
          onClick={handleBack}
          className="mb-6 text-text-muted hover:text-text-primary transition-colors"
        >
          ← Back
        </button>
        <div className="max-w-md w-full bg-bg-surface rounded-2xl shadow-sm border border-border-subtle p-8 text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            Waiting for someone to join...
          </h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-muted mb-2">
              Share this link:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomLink}
                readOnly
                className="flex-1 px-4 py-3 rounded-xl border border-border-subtle bg-bg-white text-text-muted font-mono text-sm"
              />
              <button
                onClick={copyLink}
                className="px-4 py-3 bg-primary-blue hover:bg-primary-blue-hover text-white rounded-xl font-medium transition-all duration-200"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="animate-pulse">
            <div className="w-3 h-3 bg-primary-blue rounded-full mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'editing') {
    return (
      <div className="min-h-screen bg-bg-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {name} {otherUser && `+ ${otherUser}`}
              </h1>
              <p className="text-sm text-text-muted">Room: {roomId}</p>
            </div>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-bg-surface hover:bg-bg-surface-hover text-text-primary border border-border-subtle rounded-xl font-medium transition-all duration-200"
            >
              Leave Room
            </button>
          </div>
          
          <div className="h-[600px]">
            <CollabEditor 
              userName={name}
              roomId={roomId}
              isDemoMode={false}
              isHost={isHost}
            />
          </div>
          
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
    );
  }
}
