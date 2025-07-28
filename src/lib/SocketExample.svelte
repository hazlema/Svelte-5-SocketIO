<script>
    import { Socket } from "./Socket.svelte"
    import { onDestroy } from "svelte"
    import SocketConnect from "./SocketContext.svelte"

    // Create socket instance – our trusty connection wizard
    const socket = new Socket("http://localhost:3001")

    let message = $state("")
    let chatMessages = $state([])
    let showTestDialog = $state(false) // Reactive flag for our test modal – toggle for popup magic!

    // Auto-connect when component mounts (socket handles reconnection like a pro)
    socket.connect()

    // Set up event listeners – eavesdropping on socket chatter
    socket.on("message", (data) => {
        chatMessages.push({
            text: data.text,
            timestamp: new Date(),
            from: data.from || "Server",
        })
    })

	socket.on("ping", (data) => {
        chatMessages.push({
            text: "Server sent a ping! Reply with a PONG!",
            timestamp: new Date(),
            from: data.from || "Server",
        })

		const success = socket.send("pong", {
            text: "PONG!",
            timestamp: new Date(),
        })
    })

    socket.on("user-joined", (data) => {
        chatMessages.push({
            text: `${data.username} joined the chat`,
            timestamp: new Date(),
            from: "System",
            isSystem: true,
        })
    })

    // Listen for custom socket connection events (just for logging/debugging – because debugging is half the fun... or frustration)
    socket.on("connected", (data) => {
        console.log("Socket connected:", data)
    })

    socket.on("tryConnect", (data) => {
        console.log("Socket attempting to connect (attempt #" + data.attemptNumber + "):", data)
    })

    socket.on("disconnected", (data) => {
        console.log("Socket disconnected:", data)
    })

    socket.on("connectError", (data) => {
        console.error("Socket connection error:", data)
    })

    socket.on("reconnected", (data) => {
        console.log("Socket reconnected after", data.attemptNumber, "attempts:", data)
    })

    /**
     * Sends a message through the socket – zap it over!
     * @returns {void}
     */
    function sendMessage() {
        if (message.trim() && socket.isConnected()) {
            const success = socket.send("message", {
                text: message,
                timestamp: new Date(),
            })

            if (success) {
                message = ""
            }
        }
    }

    /**
     * Handles Enter key press in message input – no shift required, we're not dancing
     * @param {KeyboardEvent} event - The key press event
     * @returns {void}
     */
    function handleKeyPress(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            sendMessage()
        }
    }

    /**
     * Gets status color based on connection state – green for go, red for "oh no"
     * @param {Object} status - The socket status object
     * @returns {string} Hex color code
     */
    function getStatusColor(status) {
        if (status.connected) return "#10b981" // green
        return "#ef4444" // red for any non-connected state
    }

    /**
     * Opens the test dialog – popup time for SocketConnect demo!
     * @returns {void}
     */
    function openTestDialog() {
        showTestDialog = true;
    }

    // Cleanup on component destroy – always leave the socket party gracefully
    onDestroy(() => {
        socket.destroy()
    })

</script>

<div class="socket-demo">
    <div class="status-card">
        <div class="card-body">
            <h2 class="card-title">Socket Status</h2>
            <div class="status-indicator">
                <div class="status-dot" style="background-color: {getStatusColor(socket.status)}"></div>
                <span class="status-text">Connection: {socket.status.connected ? "Online" : "Offline"}</span>
            </div>
            <dl class="status-details">
                <dt>Connecting:</dt>
                <dd>{socket.status.connecting ? "Yes" : "No"}</dd>
                <dt>Reconnect Attempts:</dt>
                <dd>{socket.status.reconnectAttempts}</dd>
                {#if socket.status.error}
                    <dt class="status-error-label">Error:</dt>
                    <dd class="status-error">{socket.status.error}</dd>
                {/if}
                {#if socket.status.lastConnected}
                    <dt>Last Connected:</dt>
                    <dd>{socket.status.lastConnected.toLocaleTimeString()}</dd>
                {/if}
            </dl>
            <div class="card-actions justify-center mt-4">
                <button class="btn btn-primary" onclick={() => socket.connect()} disabled={socket.status.connected || socket.status.connecting}>
                    Connect
                </button>
                <button class="btn btn-secondary" onclick={() => socket.disconnect()} disabled={!socket.status.connected}> Disconnect </button>
                <button class="btn btn-info" onclick={openTestDialog}>Component Test </button> <!-- New test button – right next to disconnect for quick access! -->
            </div>
        </div>
    </div>

    <div class="chat-card">
        <div class="card-body">
            <h2 class="card-title">Messages</h2>
            <div class="messages">
                {#each chatMessages as msg}
                    <div class="message {msg.isSystem ? 'message-system' : ''}">
                        <span class="message-timestamp">{msg.timestamp.toLocaleTimeString()}</span>
                        <span class="message-from">{msg.from}:</span>
                        <span>{msg.text}</span>
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
                    class="input input-bordered flex-1"
                />
                <button onclick={sendMessage} disabled={!socket.status.connected || !message.trim()} class="btn btn-primary"> Send </button>
            </div>
        </div>
    </div>

    <div class="debug-card">
        <div class="card-body">
            <h2 class="card-title">Debug Info</h2>
            <div class="stats shadow mb-4">
                <div class="stat">
                    <div class="stat-title">Total Messages Received</div>
                    <div class="stat-value">{socket.messages.length}</div>
                </div>
            </div>
            <button onclick={() => socket.clearMessages()} class="btn btn-outline mb-4">Clear Message History</button>
            <div class="collapse collapse-arrow bg-base-200">
                <input type="checkbox" />
                <div class="collapse-title text-xl font-medium">Recent Messages</div>
                <div class="collapse-content">
                    <div class="debug-messages">
                        {#each socket.messages.slice(-10) as msg}
                            <div class="debug-message">
                                <pre data-prefix="$"><code><strong>{msg.event}:</strong> {JSON.stringify(msg.data, null, 2)}</code></pre>
                                <pre data-prefix=">" class="text-success"><code>({msg.timestamp.toLocaleTimeString()})</code></pre>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Test dialog popup – daisyUI modal for sleek UX, shows SocketConnect with close button! -->
{#if showTestDialog}
    <div class="modal modal-open"> <!-- Modal backdrop – click outside to close? Nah, we have a button for precision -->
        <div class="modal-box">
            <SocketConnect /> <!-- Embedded test component – pure socket demo goodness -->
            <div class="modal-action">
                <button class="btn" onclick={() => showTestDialog = false}>Close</button> <!-- Close button – escape the popup realm! -->
            </div>
        </div>
    </div>
{/if}