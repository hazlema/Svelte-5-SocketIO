#!/usr/bin/env node

import { createServer } from 'http';
import { Server } from 'socket.io';
import process from 'process'; // Importing process for stdin handling – because who doesn't love a good process?

/**
 * Socket.IO CLI Server
 * A standalone server for testing Socket.IO connections. Now with CLI superpowers!
 * Press 'P' to ping all clients (expect a pong back, like a game of socket tennis),
 * 'B' to broadcast a message (spread the word, server-style),
 * or 'Q' to quit (when you've had enough socket fun).
 */

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Create HTTP server – the foundation of our socket empire
const httpServer = createServer();

// Create Socket.IO server with CORS enabled – because sharing is caring, across origins
const io = new Server(httpServer, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"]
	}
});

// Store connected users – our VIP list of socket celebrities
const connectedUsers = new Map();
let messageCounter = 0;

/**
 * Logs a message with timestamp – because every log deserves its moment in time
 * @param {string} message - The message to log
 * @param {string} [level='INFO'] - Log level (INFO, ERROR, or whatever floats your boat)
 */
function log(message, level = 'INFO') {
	const timestamp = new Date().toISOString();
	console.log(`[${timestamp}] [${level}] ${message}`);
}

/**
 * Broadcasts a message to all connected clients – like a server-wide announcement
 * @param {string} event - Event name (the headline)
 * @param {any} data - Data to broadcast (the juicy details)
 * @param {string} [excludeSocketId] - Socket ID to exclude (for that one socket who doesn't need to know)
 */
function broadcast(event, data, excludeSocketId = null) {
	if (excludeSocketId) {
		io.except(excludeSocketId).emit(event, data);
	} else {
		io.emit(event, data);
	}
}

/**
 * Handles new socket connections – welcome to the party!
 * @param {import('socket.io').Socket} socket - The connected socket (our new guest)
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

	// Send welcome message to the new client – roll out the red carpet
	socket.emit('message', {
		text: 'Welcome to the Socket.IO server!',
		from: 'Server',
		timestamp: new Date(),
		type: 'welcome'
	});

	// Notify other clients about new user – "Hey everyone, we've got a newbie!"
	socket.broadcast.emit('user-joined', {
		username: `User-${socket.id.substring(0, 6)}`,
		timestamp: new Date()
	});

	/**
	 * Handles incoming messages from clients – the chit-chat handler
	 */
	socket.on('message', (data) => {
		messageCounter++;

		log(`Message #${messageCounter} from ${socket.id}: ${JSON.stringify(data)}`);

		// Echo the message back to all clients including sender – because echoes are fun in sockets too
		const messageData = {
			id: messageCounter,
			text: data.text || data,
			from: `User-${socket.id.substring(0, 6)}`,
			timestamp: new Date(),
			originalTimestamp: data.timestamp,
			type: 'chat'
		};

		// Broadcast to all clients – share the love
		io.emit('message', messageData);
	});

	/**
	 * Handles chat messages specifically – for those dedicated conversationalists
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

		// Broadcast to all clients – let the chat flow
		io.emit('chat', chatData);
	});

	/**
	 * Handles ping requests for connection testing – ping-pong, server edition
	 */
	socket.on('ping', (data) => {
		log(`Ping received from ${socket.id}`);
		socket.emit('pong', {
			timestamp: new Date(),
			originalData: data
		});
	});

	/**
	 * Handles pong responses from clients – the return serve in our ping-pong game
	 */
	socket.on('pong', (data) => {
		log(`Pong received from ${socket.id}: ${JSON.stringify(data)}`);
	});

	/**
	 * Handles custom events – for when standard events just aren't quirky enough
	 */
	socket.on('custom-event', (data) => {
		log(`Custom event from ${socket.id}: ${JSON.stringify(data)}`);

		// Echo back with server timestamp – adding our server flair
		socket.emit('custom-response', {
			...data,
			serverTimestamp: new Date(),
			processedBy: 'Socket.IO Server'
		});
	});

	/**
	 * Handles client disconnection – goodbye, old friend
	 */
	socket.on('disconnect', (reason) => {
		const userInfo = connectedUsers.get(socket.id);
		connectedUsers.delete(socket.id);

		log(`Client disconnected: ${socket.id} (${reason})`);
		log(`Total connected clients: ${connectedUsers.size}`);

		// Notify other clients about user leaving – "One less socket in the sea"
		socket.broadcast.emit('user-left', {
			username: `User-${socket.id.substring(0, 6)}`,
			reason,
			timestamp: new Date()
		});
	});

	/**
	 * Handles connection errors – because even sockets have bad days
	 */
	socket.on('error', (error) => {
		log(`Socket error from ${socket.id}: ${error.message}`, 'ERROR');
	});
}

// Set up Socket.IO event handlers – the main event listener
io.on('connection', handleConnection);

/**
 * Starts the server – liftoff!
 */
function startServer() {
	httpServer.listen(PORT, HOST, () => { });
}

/**
 * Graceful shutdown handler – because every server deserves a proper farewell
 */
function handleShutdown() {
	log('Shutting down server...');

	// Notify all clients about server shutdown – "Party's over, folks!"
	io.emit('server-shutdown', {
		message: 'Server is shutting down',
		timestamp: new Date()
	});

	// Close all connections – wave goodbye
	io.close(() => {
		log('All connections closed');
		httpServer.close(() => {
			log('Server stopped');
			process.exit(0);
		});
	});
}

/**
 * Pings all connected clients – let's see who's awake!
 */
function pingClients() {
	if (connectedUsers.size === 0) {
		log('No clients connected to ping. Lonely server is lonely.');
		return;
	}

	log(`Pinging ${connectedUsers.size} clients...`);
	broadcast('ping', {
		from: 'Server',
		timestamp: new Date(),
		type: 'server-ping'
	});
}

/**
 * Broadcasts a message to all clients – server says what?
 * @param {string} message - The message to send (your words of wisdom)
 */
function broadcastMessage(message) {
	if (connectedUsers.size === 0) {
		log('No clients connected to broadcast to. Echo... echo...');
		return;
	}

	log(`Broadcasting message: "${message}" to ${connectedUsers.size} clients`);
	broadcast('message', {
		text: message,
		from: 'Server',
		timestamp: new Date(),
		type: 'broadcast'
	});
}

/**
 * Sets up CLI input handling – turning your terminal into a command center
 */
function setupCLIInput() {
	let inputBuffer = ''; // For collecting multi-char input, but we're mostly single-key here

	process.stdin.setRawMode(true); // Raw mode for key-by-key input – no Enter required!
	process.stdin.resume();
	process.stdin.setEncoding('utf8');

	process.stdin.on('data', (key) => {
		const upperKey = key.toUpperCase(); // Case-insensitive, because typos happen

		if (upperKey === 'Q') {
			log('Quit command received. Shutting down...');
			handleShutdown();
		} else if (upperKey === 'P') {
			pingClients();
		} else if (upperKey === 'B') {
			// For broadcast, we need to collect a message. Switch to line input mode temporarily.
			process.stdin.setRawMode(false); // Back to buffered input for the message
			console.log('Enter message to broadcast (press Enter to send):');

			// Listen for the next line of input
			const messageListener = (input) => {
				const message = input.trim();
				if (message) {
					broadcastMessage(message);
				} else {
					log('Empty message. Nothing broadcasted.');
				}
				// Restore raw mode after input
				process.stdin.setRawMode(true);
				process.stdin.removeListener('data', messageListener); // Clean up this temp listener
				log('Back to CLI mode. P/B/Q at your service!');
			};

			process.stdin.once('data', messageListener);
		} else if (key === '\u0003') { // Ctrl+C
			handleShutdown();
		}
	});
}

// Start the server – and the CLI magic
startServer();
setupCLIInput();

// Display server info – because knowledge is power (and puns are fun)
console.clear();
log('='.repeat(50));
log('Socket.IO CLI Server - Now with CLI Commands!');
log('='.repeat(50));
log(`Server: http://${HOST}:${PORT}`);
log('CLI: P for ping, B for broadcast, Q to quit.');
log('='.repeat(50));
