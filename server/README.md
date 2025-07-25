# Socket.IO CLI Server

A standalone Node.js server with Socket.IO for testing real-time communication.

## Features

- Real-time message handling
- Connection status tracking
- Multiple event types support
- CORS enabled for web clients
- Graceful shutdown handling
- Detailed logging with timestamps

## Installation

```bash
cd server
npm install
```

## Usage

### Start the server
```bash
npm start
```

### Development mode (with auto-restart)
```bash
npm run dev
```

### Environment Variables
- `PORT`: Server port (default: 3002)
- `HOST`: Server host (default: localhost)

## Supported Events

### Client to Server
- `message`: General messages
- `chat`: Chat messages with username
- `ping`: Connection testing
- `custom-event`: Custom events

### Server to Client
- `message`: Broadcasted messages
- `chat`: Chat messages
- `pong`: Ping responses
- `custom-response`: Custom event responses
- `user-joined`: User connection notifications
- `user-left`: User disconnection notifications
- `server-shutdown`: Server shutdown notification

## Example Usage

The server automatically handles connections from the Svelte Socket class and will:

1. Log all connections and disconnections
2. Echo messages to all connected clients
3. Handle ping/pong for connection testing
4. Broadcast user join/leave events
5. Provide detailed console logging

## Testing

Connect your Svelte application to `http://localhost:3002` and start sending messages. The server will log all activity and broadcast messages to all connected clients.