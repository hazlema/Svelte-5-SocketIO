#!/usr/bin/env node

import { createServer } from 'http';
import { Server } from 'socket.io';

/**
 * Socket.IO CLI Server
 * A standalone server for testing Socket.IO connections
 */

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server with CORS enabled
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store connected users
const connectedUsers = new Map();
let messageCounter = 0;

/**
 * Logs a message with timestamp
 * @param {string} message - The message to log
 * @param {string} [level='INFO'] - Log level
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

/**
 * Broadcasts a message to all connected clients
 * @param {string} event - Event name
 * @param {any} data - Data to broadcast
 * @param {string} [excludeSocketId] - Socket ID to exclude from broadcast
 */
function broadcast(event, data, excludeSocketId = null) {
  if (excludeSocketId) {
    io.except(excludeSocketId).emit(event, data);
  } else {
    io.emit(event, data);
  }
}

/**
 * Handles new socket connections
 * @param {import('socket.io').Socket} socket - The connected socket
 */
function handleConnection(socket) {
  const clientInfo = {
    id: socket.id,
    address: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    connectedAt: new Date()
  };

  connectedUsers.set(socket.id, clientInfo);
  
  log(`New client connected: ${socket.id} from ${clientInfo.address}`);
  log(`Total connected clients: ${connectedUsers.size}`);

  // Send welcome message to the new client
  socket.emit('message', {
    text: 'Welcome to the Socket.IO server!',
    from: 'Server',
    timestamp: new Date(),
    type: 'welcome'
  });

  // Notify other clients about new user
  socket.broadcast.emit('user-joined', {
    username: `User-${socket.id.substring(0, 6)}`,
    timestamp: new Date()
  });

  /**
   * Handles incoming messages from clients
   */
  socket.on('message', (data) => {
    messageCounter++;
    
    log(`Message #${messageCounter} from ${socket.id}: ${JSON.stringify(data)}`);
    
    // Echo the message back to all clients including sender
    const messageData = {
      id: messageCounter,
      text: data.text || data,
      from: `User-${socket.id.substring(0, 6)}`,
      timestamp: new Date(),
      originalTimestamp: data.timestamp,
      type: 'chat'
    };

    // Broadcast to all clients
    io.emit('message', messageData);
  });

  /**
   * Handles chat messages specifically
   */
  socket.on('chat', (data) => {
    messageCounter++;
    
    log(`Chat message #${messageCounter} from ${socket.id}: ${data.message}`);
    
    const chatData = {
      id: messageCounter,
      message: data.message,
      username: data.username || `User-${socket.id.substring(0, 6)}`,
      timestamp: new Date(),
      type: 'chat'
    };

    // Broadcast to all clients
    io.emit('chat', chatData);
  });

  /**
   * Handles ping requests for connection testing
   */
  socket.on('ping', (data) => {
    log(`Ping received from ${socket.id}`);
    socket.emit('pong', {
      timestamp: new Date(),
      originalData: data
    });
  });

  /**
   * Handles custom events
   */
  socket.on('custom-event', (data) => {
    log(`Custom event from ${socket.id}: ${JSON.stringify(data)}`);
    
    // Echo back with server timestamp
    socket.emit('custom-response', {
      ...data,
      serverTimestamp: new Date(),
      processedBy: 'Socket.IO Server'
    });
  });

  /**
   * Handles client disconnection
   */
  socket.on('disconnect', (reason) => {
    const userInfo = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);
    
    log(`Client disconnected: ${socket.id} (${reason})`);
    log(`Total connected clients: ${connectedUsers.size}`);

    // Notify other clients about user leaving
    socket.broadcast.emit('user-left', {
      username: `User-${socket.id.substring(0, 6)}`,
      reason,
      timestamp: new Date()
    });
  });

  /**
   * Handles connection errors
   */
  socket.on('error', (error) => {
    log(`Socket error from ${socket.id}: ${error.message}`, 'ERROR');
  });
}

// Set up Socket.IO event handlers
io.on('connection', handleConnection);

/**
 * Starts the server
 */
function startServer() {
  httpServer.listen(PORT, HOST, () => {
    log(`Socket.IO server running on http://${HOST}:${PORT}`);
    log('Waiting for client connections...');
    log('Press Ctrl+C to stop the server');
  });
}

/**
 * Graceful shutdown handler
 */
function handleShutdown() {
  log('Shutting down server...');
  
  // Notify all clients about server shutdown
  io.emit('server-shutdown', {
    message: 'Server is shutting down',
    timestamp: new Date()
  });

  // Close all connections
  io.close(() => {
    log('All connections closed');
    httpServer.close(() => {
      log('Server stopped');
      process.exit(0);
    });
  });
}

// Handle process signals for graceful shutdown
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'ERROR');
  log(error.stack, 'ERROR');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'ERROR');
});

// Start the server
startServer();

// Display server info
log('='.repeat(50));
log('Socket.IO CLI Server');
log('='.repeat(50));
log(`Server: http://${HOST}:${PORT}`);
log('Events handled:');
log('  - message: General messages');
log('  - chat: Chat messages');
log('  - ping: Connection testing');
log('  - custom-event: Custom events');
log('='.repeat(50));