# 🔌 Socket.IO Integration with Svelte 5 and Runes

A powerful Socket class that integrates Socket.IO with Svelte's reactivity system for real-time communication.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the Socket.IO server:**
   ```bash
   cd server
   npm install
   npm start
   ```

3. **Start the Svelte development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser** and see the real-time Socket.IO demo in action! 🎉

## ✨ Features

- 🔄 **Automatic Reconnection** - Handles connection drops gracefully
- 📊 **Reactive Status Tracking** - Real-time connection state updates  
- 🎯 **Event-Driven Architecture** - Clean separation of concerns
- 🛡️ **Error Handling** - Comprehensive error management
- 📝 **Message History** - Built-in message logging for debugging
- 🎮 **Easy API** - Simple methods for common operations
- 🔌 **Auto-Connect** - Automatically connects and reconnects when server is available

## 📁 Project Structure

```
├── src/
│   ├── lib/
│   │   ├── Socket.svelte.js      # 🔌 Main Socket class
│   │   └── SocketExample.svelte  # 🎨 Demo component
│   ├── App.svelte               # 📱 Main app component
│   └── main.js                  # 🚀 App entry point
├── server/
│   ├── server.js                # 🖥️ Socket.IO server
│   └── package.json             # 📦 Server dependencies
└── README.md                    # 📖 This file
```

## 🎯 Usage Example

```javascript
import { Socket } from './lib/Socket.svelte.js';

// Create socket - it will auto-connect and handle reconnections
const socket = new Socket('http://localhost:3001');

// Listen for messages
socket.on('message', (data) => {
  console.log('📨 Received:', data);
});

// Send messages
socket.send('message', { text: 'Hello World! 👋' });

// Listen for connection events
socket.on('connected', () => {
  console.log('🟢 Connected to server!');
});

socket.on('tryConnect', (data) => {
  console.log(`🔄 Trying to reconnect (attempt #${data.attemptNumber})`);
});
```

## 🎨 Demo Features

The included demo shows:

- 🚦 **Real-time status indicator** - Visual connection status
- 💬 **Live chat** - Send and receive messages in real-time
- 🔄 **Reconnection demo** - Stop/start server to see auto-reconnection
- 🐛 **Debug panel** - View message history and connection details
- 📊 **Status tracking** - Monitor connection state and errors

## 📚 Documentation

- 🔧 Configuration options
- 📊 Status tracking details  
- 🎯 All available events
- 🛠️ Complete API reference
- 🎨 Svelte integration examples
- 🐛 Debugging and troubleshooting
- 🎯 Best practices

## 🛠️ Technologies Used

- **Svelte 5** - Reactive UI framework with runes
- **Socket.IO** - Real-time bidirectional communication
- **Vite** - Fast build tool and dev server
- **Node.js** - Server runtime

## 🤝 Contributing

Feel free to submit issues and pull requests! This project demonstrates:

- Clean architecture patterns
- Reactive state management
- Real-time communication
- Error handling and reconnection logic
- Modern JavaScript/Svelte practices

## 📄 License

MIT License - feel free to use this code in your own projects!

---
