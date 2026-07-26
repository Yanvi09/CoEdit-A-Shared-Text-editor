const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Pure relay server - no conflict resolution logic
// Simply broadcasts any operation to other clients in the same room
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  // Relay any operation to other clients in the room
  socket.on('operation', (data) => {
    const { roomId, operation } = data;
    socket.to(roomId).emit('operation', operation);
  });

  // Relay cursor position updates
  socket.on('cursor-position', (data) => {
    const { roomId, position } = data;
    socket.to(roomId).emit('cursor-position', position);
  });

  // Relay user join/leave notifications
  socket.on('user-joined', (data) => {
    const { roomId, user } = data;
    socket.to(roomId).emit('user-joined', user);
  });

  socket.on('disconnecting', () => {
    const rooms = socket.rooms;
    rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit('user-left', socket.id);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
