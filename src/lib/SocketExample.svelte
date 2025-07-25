<!--
  Example component demonstrating how to use the Socket class
  This shows basic connection management, message sending, and status display
-->
<script>
  import { Socket } from './Socket.svelte.js';
  import { onDestroy } from 'svelte';

  // Create socket instance
  const socket = new Socket('http://localhost:3001');

  let message = $state('');
  let chatMessages = $state([]);

  // Auto-connect when component mounts (socket will handle reconnection automatically)
  socket.connect();

  // Set up event listeners
  socket.on('message', (data) => {
    chatMessages.push({
      text: data.text,
      timestamp: new Date(),
      from: data.from || 'Server'
    });
  });

  socket.on('user-joined', (data) => {
    chatMessages.push({
      text: `${data.username} joined the chat`,
      timestamp: new Date(),
      from: 'System',
      isSystem: true
    });
  });

  // Listen for custom socket connection events (just for logging/debugging)
  socket.on('connected', (data) => {
    console.log('Socket connected:', data);
  });

  socket.on('tryConnect', (data) => {
    console.log('Socket attempting to connect (attempt #' + data.attemptNumber + '):', data);
  });

  socket.on('disconnected', (data) => {
    console.log('Socket disconnected:', data);
  });

  socket.on('connectError', (data) => {
    console.error('Socket connection error:', data);
  });

  socket.on('reconnected', (data) => {
    console.log('Socket reconnected after', data.attemptNumber, 'attempts:', data);
  });

  /**
   * Sends a message through the socket
   */
  function sendMessage() {
    if (message.trim() && socket.isConnected()) {
      const success = socket.send('message', {
        text: message,
        timestamp: new Date()
      });
      
      if (success) {
        message = '';
      }
    }
  }

  /**
   * Handles Enter key press in message input
   */
  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  /**
   * Gets status color based on connection state
   */
  function getStatusColor(status) {
    if (status.connected) return '#10b981'; // green
    return '#ef4444'; // red for any non-connected state
  }

  // Cleanup on component destroy
  onDestroy(() => {
    socket.destroy();
  });
</script>

<div class="socket-demo">
  <div class="status-panel">
    <h3>Socket Status</h3>
    <div class="status-indicator" style="background-color: {getStatusColor(socket.status)}"></div>
    <div class="status-details">
      <p><strong>Connected:</strong> {socket.status.connected}</p>
      <p><strong>Connecting:</strong> {socket.status.connecting}</p>
      <p><strong>Reconnect Attempts:</strong> {socket.status.reconnectAttempts}</p>
      {#if socket.status.error}
        <p class="error"><strong>Error:</strong> {socket.status.error}</p>
      {/if}
      {#if socket.status.lastConnected}
        <p><strong>Last Connected:</strong> {socket.status.lastConnected.toLocaleTimeString()}</p>
      {/if}
    </div>
    
    <div class="controls">
      <button onclick={() => socket.connect()} disabled={socket.status.connected || socket.status.connecting}>
        Connect
      </button>
      <button onclick={() => socket.disconnect()} disabled={!socket.status.connected}>
        Disconnect
      </button>
    </div>
  </div>

  <div class="chat-panel">
    <h3>Messages</h3>
    <div class="messages">
      {#each chatMessages as msg}
        <div class="message" class:system={msg.isSystem}>
          <span class="timestamp">{msg.timestamp.toLocaleTimeString()}</span>
          <span class="from">{msg.from}:</span>
          <span class="text">{msg.text}</span>
        </div>
      {/each}
    </div>
    
    <div class="message-input">
      <input
        type="text"
        bind:value={message}
        onkeypress={handleKeyPress}
        placeholder="Type a message..."
        disabled={!socket.status.connected}
      />
      <button onclick={sendMessage} disabled={!socket.status.connected || !message.trim()}>
        Send
      </button>
    </div>
  </div>

  <div class="debug-panel">
    <h3>Debug Info</h3>
    <p><strong>Total Messages Received:</strong> {socket.messages.length}</p>
    <button onclick={() => socket.clearMessages()}>Clear Message History</button>
    
    <details>
      <summary>Recent Messages</summary>
      <div class="debug-messages">
        {#each socket.messages.slice(-10) as msg}
          <div class="debug-message">
            <strong>{msg.event}:</strong> {JSON.stringify(msg.data)} 
            <small>({msg.timestamp.toLocaleTimeString()})</small>
          </div>
        {/each}
      </div>
    </details>
  </div>
</div>

<style>
  .socket-demo {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }

  .status-panel {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
    margin-left: 0.5rem;
  }

  .status-details p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
  }

  .error {
    color: #ef4444;
  }

  .controls {
    margin-top: 1rem;
    display: flex;
    gap: 0.5rem;
  }

  .controls button {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }

  .controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chat-panel {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
  }

  .messages {
    flex: 1;
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 0.5rem;
    margin: 0.5rem 0;
    background: white;
  }

  .message {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .message.system {
    font-style: italic;
    color: #6b7280;
  }

  .timestamp {
    color: #9ca3af;
    font-size: 0.75rem;
  }

  .from {
    font-weight: 600;
    margin: 0 0.5rem;
  }

  .message-input {
    display: flex;
    gap: 0.5rem;
  }

  .message-input input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
  }

  .message-input button {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: #3b82f6;
    color: white;
    cursor: pointer;
  }

  .message-input button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .debug-panel {
    grid-column: 1 / -1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
  }

  .debug-messages {
    max-height: 200px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 0.75rem;
  }

  .debug-message {
    margin-bottom: 0.25rem;
    padding: 0.25rem;
    background: white;
    border-radius: 2px;
  }

  h3 {
    margin: 0 0 1rem 0;
    color: #374151;
  }
</style>