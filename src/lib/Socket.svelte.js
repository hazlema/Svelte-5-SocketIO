import { io } from 'socket.io-client';

/**
 * @typedef {Object} SocketStatus
 * @property {boolean} connected - Whether the socket is connected
 * @property {boolean} connecting - Whether the socket is currently connecting
 * @property {boolean} disconnected - Whether the socket is disconnected
 * @property {string|null} error - Last error message, if any
 * @property {number} reconnectAttempts - Number of reconnection attempts made
 * @property {Date|null} lastConnected - Timestamp of last successful connection
 * @property {Date|null} lastDisconnected - Timestamp of last disconnection
 */

/**
 * @typedef {Object} SocketMessage
 * @property {string} event - The event name
 * @property {any} data - The message data
 * @property {Date} timestamp - When the message was received
 */

/**
 * Socket class for managing Socket.IO connections with Svelte reactivity
 * Provides real-time status tracking and message handling capabilities
 */
export class Socket {
  /**
   * Creates a new Socket instance
   * @param {string} url - The Socket.IO server URL
   * @param {Object} [options={}] - Socket.IO connection options
   */
  constructor(url, options = {}) {
    /** @type {import('socket.io-client').Socket} */
    this.socket = null;
    
    /** @type {string} */
    this.url = url;
    
    /** @type {Object} */
    this.options = {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      ...options
    };

    /**
     * Reactive status object that tracks connection state
     * @type {SocketStatus}
     */
    this.status = $state({
      connected: false,
      connecting: false,
      disconnected: true,
      error: null,
      reconnectAttempts: 0,
      lastConnected: null,
      lastDisconnected: null
    });

    /**
     * Array of received messages for debugging/logging
     * @type {SocketMessage[]}
     */
    this.messages = $state([]);

    /**
     * Map of event listeners
     * @type {Map<string, Function[]>}
     */
    this.eventListeners = new Map();

    this._initializeSocket();
  }

  /**
   * Initializes the Socket.IO connection and sets up event handlers
   * @private
   */
  _initializeSocket() {
    this.socket = io(this.url, this.options);
    this._setupEventHandlers();
  }

  /**
   * Sets up internal Socket.IO event handlers for status tracking
   * @private
   */
  _setupEventHandlers() {
    // Connection events
    this.socket.on('connect', () => {
      this.status.connected = true;
      this.status.connecting = false;
      this.status.disconnected = false;
      this.status.error = null;
      this.status.reconnectAttempts = 0;
      this.status.lastConnected = new Date();
      
      // Emit custom event for successful connection
      this._emitCustomEvent('connected', {
        timestamp: new Date()
      });
    });

    this.socket.on('disconnect', (reason) => {
      this.status.connected = false;
      this.status.connecting = false;
      this.status.disconnected = true;
      this.status.lastDisconnected = new Date();
      
      if (reason === 'io server disconnect') {
        this.status.error = 'Server disconnected the client';
      }
      
      // Emit custom event for disconnection
      this._emitCustomEvent('disconnected', {
        reason,
        timestamp: new Date()
      });
    });

    this.socket.on('connect_error', (error) => {
      this.status.connected = false;
      this.status.connecting = false;
      this.status.disconnected = true;
      this.status.error = error.message || 'Connection error';
      
      // Emit custom event for connection error
      this._emitCustomEvent('connectError', {
        error: error.message || 'Connection error',
        timestamp: new Date()
      });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.status.reconnectAttempts = attemptNumber;
      
      // Emit custom event for successful reconnection
      this._emitCustomEvent('reconnected', {
        attemptNumber,
        timestamp: new Date()
      });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.status.connecting = true;
      this.status.reconnectAttempts = attemptNumber;
      
      // Emit custom event for reconnection attempt
      this._emitCustomEvent('tryConnect', {
        attemptNumber,
        timestamp: new Date()
      });
    });

    this.socket.on('reconnect_error', (error) => {
      this.status.error = error.message || 'Reconnection error';
      
      // Emit custom event for reconnection error
      this._emitCustomEvent('reconnectError', {
        error: error.message || 'Reconnection error',
        timestamp: new Date()
      });
    });

    this.socket.on('reconnect_failed', () => {
      this.status.connecting = false;
      this.status.error = 'Failed to reconnect after maximum attempts';
      
      // Emit custom event for reconnection failure
      this._emitCustomEvent('reconnectFailed', {
        timestamp: new Date()
      });
    });
  }

  /**
   * Connects to the Socket.IO server
   * @returns {Promise<void>} Promise that resolves when connected
   */
  async connect() {
    if (this.status.connected || this.status.connecting) {
      return;
    }

    this.status.connecting = true;
    this.status.disconnected = false;
    this.status.error = null;

    return new Promise((resolve, reject) => {
      const onConnect = () => {
        this.socket.off('connect', onConnect);
        this.socket.off('connect_error', onError);
        resolve();
      };

      const onError = (error) => {
        this.socket.off('connect', onConnect);
        this.socket.off('connect_error', onError);
        reject(error);
      };

      this.socket.on('connect', onConnect);
      this.socket.on('connect_error', onError);
      
      this.socket.connect();
    });
  }

  /**
   * Disconnects from the Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }


  /**
   * Emits custom events to registered listeners
   * @private
   */
  _emitCustomEvent(eventName, data) {
    const listeners = this.eventListeners.get(eventName) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in custom event listener for ${eventName}:`, error);
      }
    });
  }

  /**
   * Sends a message to the server
   * @param {string} event - The event name to emit
   * @param {any} [data] - The data to send with the event
   * @param {Function} [callback] - Optional callback for acknowledgment
   * @returns {boolean} True if message was sent, false if not connected
   */
  send(event, data, callback) {
    if (!this.status.connected) {
      console.warn('Socket not connected. Message not sent:', { event, data });
      return false;
    }

    if (callback && typeof callback === 'function') {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }

    return true;
  }

  /**
   * Adds an event listener for incoming messages
   * @param {string} event - The event name to listen for
   * @param {Function} callback - The callback function to execute
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event).push(callback);
    
    // Set up the actual socket listener
    this.socket.on(event, (data) => {
      // Add to messages array for debugging
      this.messages.push({
        event,
        data,
        timestamp: new Date()
      });

      // Keep only last 100 messages to prevent memory issues
      if (this.messages.length > 100) {
        this.messages.shift();
      }

      // Execute the callback
      callback(data);
    });
  }

  /**
   * Removes an event listener
   * @param {string} event - The event name
   * @param {Function} [callback] - Specific callback to remove, or all if not provided
   */
  off(event, callback) {
    if (callback) {
      const listeners = this.eventListeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
      this.socket.off(event, callback);
    } else {
      this.eventListeners.delete(event);
      this.socket.off(event);
    }
  }

  /**
   * Adds a one-time event listener
   * @param {string} event - The event name to listen for
   * @param {Function} callback - The callback function to execute once
   */
  once(event, callback) {
    this.socket.once(event, (data) => {
      // Add to messages array
      this.messages.push({
        event,
        data,
        timestamp: new Date()
      });

      callback(data);
    });
  }

  /**
   * Clears the message history
   */
  clearMessages() {
    this.messages.length = 0;
  }

  /**
   * Gets the current connection status
   * @returns {SocketStatus} The current status object
   */
  getStatus() {
    return this.status;
  }

  /**
   * Checks if the socket is currently connected
   * @returns {boolean} True if connected, false otherwise
   */
  isConnected() {
    return this.status.connected;
  }

  /**
   * Gets the Socket.IO instance for advanced usage
   * @returns {import('socket.io-client').Socket} The underlying Socket.IO instance
   */
  getSocket() {
    return this.socket;
  }

  /**
   * Destroys the socket connection and cleans up resources
   */
  destroy() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }
    
    this.eventListeners.clear();
    this.messages.length = 0;
  }
}