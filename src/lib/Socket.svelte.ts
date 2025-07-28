/**
 * Socket Class for Svelte and Socket.IO
 * ------------------------------------
 * This class provides a reactive wrapper around Socket.IO client connections, designed for seamless integration with Svelte applications.
 * It manages connection state, reconnection logic, and event/message handling, exposing a reactive status object and message log for real-time UI updates.
 * Svelte context is used to share socket instances across components, eliminating the need for repeated imports and connections.
 *
 * Usage Example:
 *   // In a parent component (e.g., +layout.svelte):
 *   import { Socket } from '$lib/Socket.ts';
 *   import socketConfig from '$lib/socketConfig.ts'; // Config: { socketContext: 'mySocket', ... }
 *   
 *   const socket = new Socket('http://localhost:3000', socketConfig);
 *   await socket.connect(); // Initializes and sets context
 *   
 *   // In a child component (during initialization):
 *   import { Socket } from '$lib/Socket.ts';
 *   import socketConfig from '$lib/socketConfig.ts';
 *   
 *   let socketInstance: Socket = Socket.getSocketContext(socketConfig); // Retrieve during <script> init
 *   socketInstance.on('message', (data) => { ... }); // Safe in handlers
 *   socketInstance.send('event', { foo: 'bar' });
 *   // Access socketInstance.status for reactive updates
 *
 * Note: Set the socket in a parent component's initialization phase. Retrieve using `Socket.getSocketContext` during child component initialization (top-level <script>). Assign to a variable for use in event handlers to comply with Svelte's lifecycle constraints.
 *
 * Features:
 *   - Reactive status tracking for connection state, errors, and reconnection attempts
 *   - Message and event logging for debugging, with automatic pruning to prevent memory issues
 *   - Support for custom and one-time event listeners
 *   - Resource cleanup on component destruction
 *   - Svelte context-based sharing for efficient instance reuse across components
 *
 * Designed for Svelte applications requiring real-time communication with a Socket.IO server, with full TypeScript support for type safety.
 */

import { io } from 'socket.io-client';
import { setContext, getContext } from 'svelte';

type SocketStatus = {
	connected: boolean;
	connecting: boolean;
	disconnected: boolean;
	error: string | null;
	reconnectAttempts: number;
	lastConnected: Date | null;
	lastDisconnected: Date | null;
};

type SocketMessage = {
	event: string;
	data: any;
	timestamp: Date;
};

type Config = Partial<import('socket.io-client').ManagerOptions & import('socket.io-client').SocketOptions> & {
	socketContext?: string;
};

/**
 * Socket class for managing Socket.IO connections with Svelte reactivity
 * Provides real-time status tracking and message handling capabilities.
 */
export class Socket {
	private socket: import('socket.io-client').Socket | null = null;
	private url: string;
	private options: Config;
	status: SocketStatus;
	messages: SocketMessage[];
	private eventListeners: Map<string, Array<(data: any) => void>> = new Map();

	/**
	 * Creates a new Socket instance and sets it in Svelte context if key provided
	 * @param url - The Socket.IO server URL
	 * @param config - Combined Socket.IO options and custom socketContext
	 */
	constructor(url: string, config: Config = {}) {
		this.url = url;

		this.options = {
			autoConnect: false,
			reconnection: true,
			reconnectionAttempts: 5,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			timeout: 20000,
			socketContext: 'socket',
			...config
		};

		this.status = $state({
			connected: false,
			connecting: false,
			disconnected: true,
			error: null,
			reconnectAttempts: 0,
			lastConnected: null,
			lastDisconnected: null
		});

		this.messages = $state([]);

		this._initializeSocket();

		setContext(this.options.socketContext, this); // TODO: Don't change me!
	}

	/**
	 * Initializes the Socket.IO connection and sets up event handlers
	 * @private
	 */
	private _initializeSocket(): void {
		this.socket = io(this.url, this.options as Partial<import('socket.io-client').ManagerOptions & import('socket.io-client').SocketOptions>);
		this._setupEventHandlers();
	}

	/**
	 * Sets up internal Socket.IO event handlers for status tracking
	 * @private
	 */
	private _setupEventHandlers(): void {
		if (!this.socket) return;

		this.socket.on('connect', () => {
			this.status.connected = true;
			this.status.connecting = false;
			this.status.disconnected = false;
			this.status.error = null;
			this.status.reconnectAttempts = 0;
			this.status.lastConnected = new Date();

			this._emitCustomEvent('connected', { timestamp: new Date() });
		});

		this.socket.on('disconnect', (reason: string) => {
			this.status.connected = false;
			this.status.connecting = false;
			this.status.disconnected = true;
			this.status.lastDisconnected = new Date();

			if (reason === 'io server disconnect') {
				this.status.error = 'Server disconnected the client';
			}

			this._emitCustomEvent('disconnected', { reason, timestamp: new Date() });
		});

		this.socket.on('connect_error', (error: Error) => {
			this.status.connected = false;
			this.status.connecting = false;
			this.status.disconnected = true;
			this.status.error = error.message || 'Connection error';

			this._emitCustomEvent('connectError', { error: error.message || 'Connection error', timestamp: new Date() });
		});

		this.socket.on('reconnect', (attemptNumber: number) => {
			this.status.reconnectAttempts = attemptNumber;

			this._emitCustomEvent('reconnected', { attemptNumber, timestamp: new Date() });
		});

		this.socket.on('reconnect_attempt', (attemptNumber: number) => {
			this.status.connecting = true;
			this.status.reconnectAttempts = attemptNumber;

			this._emitCustomEvent('tryConnect', { attemptNumber, timestamp: new Date() });
		});

		this.socket.on('reconnect_error', (error: Error) => {
			this.status.error = error.message || 'Reconnection error';

			this._emitCustomEvent('reconnectError', { error: error.message || 'Reconnection error', timestamp: new Date() });
		});

		this.socket.on('reconnect_failed', () => {
			this.status.connecting = false;
			this.status.error = 'Failed to reconnect after maximum attempts';

			this._emitCustomEvent('reconnectFailed', { timestamp: new Date() });
		});
	}

	/**
	 * Connects to the Socket.IO server
	 * @returns Promise that resolves when connected
	 */
	async connect(): Promise<void> {
		if (this.status.connected || this.status.connecting) {
			return;
		}

		this.status.connecting = true;
		this.status.disconnected = false;
		this.status.error = null;

		return new Promise((resolve, reject) => {
			if (!this.socket) return reject(new Error('No socket instance'));

			const onConnect = () => {
				this.socket?.off('connect', onConnect);
				this.socket?.off('connect_error', onError);
				resolve();
			};

			const onError = (error: Error) => {
				this.socket?.off('connect', onConnect);
				this.socket?.off('connect_error', onError);
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
	disconnect(): void {
		if (this.socket) {
			this.socket.disconnect();
		}
	}

	/**
	 * Emits custom events to registered listeners
	 * @private
	 * @param eventName - The custom event name
	 * @param data - Data to pass to listeners
	 */
	private _emitCustomEvent(eventName: string, data: any): void {
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
	 * @param event - The event name to emit
	 * @param data - The data to send with the event
	 * @param callback - Optional callback for acknowledgment
	 * @returns True if message was sent, false if not connected
	 */
	send(event: string, data?: any, callback?: (ack: any) => void): boolean {
		if (!this.status.connected) {
			console.warn('Socket not connected. Message not sent:', { event, data });
			return false;
		}

		if (this.socket) {
			if (callback && typeof callback === 'function') {
				this.socket.emit(event, data, callback);
			} else {
				this.socket.emit(event, data);
			}
		}

		return true;
	}

	/**
	 * Adds an event listener for incoming messages
	 * @param event - The event name to listen for
	 * @param callback - The callback function to execute
	 */
	on(event: string, callback: (data: any) => void): void {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, []);
		}

		this.eventListeners.get(event)!.push(callback);

		this.socket?.on(event, (data: any) => {
			this.messages.push({
				event,
				data,
				timestamp: new Date()
			});

			if (this.messages.length > 100) {
				this.messages.shift();
			}

			callback(data);
		});
	}

	/**
	 * Removes an event listener
	 * @param event - The event name
	 * @param callback - Specific callback to remove, or all if not provided
	 */
	off(event: string, callback?: (data: any) => void): void {
		if (callback) {
			const listeners = this.eventListeners.get(event) || [];
			const index = listeners.indexOf(callback);
			if (index > -1) {
				listeners.splice(index, 1);
			}
			this.socket?.off(event, callback);
		} else {
			this.eventListeners.delete(event);
			this.socket?.off(event);
		}
	}

	/**
	 * Adds a one-time event listener
	 * @param event - The event name to listen for
	 * @param callback - The callback function to execute once
	 */
	once(event: string, callback: (data: any) => void): void {
		this.socket?.once(event, (data: any) => {
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
	clearMessages(): void {
		this.messages.length = 0;
	}

	/**
	 * Gets the current connection status
	 * @returns The current status object
	 */
	getStatus(): SocketStatus {
		return this.status;
	}

	/**
	 * Checks if the socket is currently connected
	 * @returns True if connected, false otherwise
	 */
	isConnected(): boolean {
		return this.status.connected;
	}

	/**
	 * Gets the Socket.IO instance for advanced usage
	 * @returns The underlying Socket.IO instance
	 */
	getSocket(): import('socket.io-client').Socket | null {
		return this.socket;
	}

	/**
	 * Destroys the socket connection and cleans up resources
	 */
	destroy(): void {
		if (this.socket) {
			this.socket.disconnect();
			this.socket.removeAllListeners();
			this.socket = null;
		}

		this.eventListeners.clear();
		this.messages.length = 0;
	}

	/**
	 * Retrieves the socket instance from Svelte context using the config's key
	 * Must be called during component initialization (e.g., in <script> top-level)!
	 * Assign to a let var for use in handlers to avoid lifecycle errors.
	 * @param config - The config object with socketContext (defaults to 'socket')
	 * @returns The Socket instance – typed for safety!
	 */
	static getSocketContext(config: Config = {}): Socket {
		const name = config.socketContext ?? 'socket';
		return getContext<Socket>(name);
	}
}