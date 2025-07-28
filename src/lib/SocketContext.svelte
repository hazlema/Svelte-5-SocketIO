<script lang="ts">
    import { Socket } from "./Socket.svelte"; 
    let testSocket = Socket.getSocketContext();

    function getStatusColor(status: { connected: boolean }): string {
        return status.connected ? '#10b981' : '#ef4444'; // Green for go, red for whoa
    }
</script>

<!-- Main wrapper – centered, responsive, with a clean card vibe -->
<div class="flex items-center justify-center bg-base-100" data-theme="dark">
    <div class="card w-full max-w-md bg-base-100 shadow-xl">
        <div class="card-body">
            <!-- Header – playful yet pro -->
            <h2 class="card-title text-2xl font-bold text-primary">
                Component Test (Another Page) 🚀
            </h2>
            <!-- Status display – dynamic, reactive, and visually poppin' -->
            <div class="flex items-center gap-3 mt-4">
                <!-- Status dot – glows with connection state -->
                <div
                    class="w-4 h-4 rounded-full"
                    style="background-color: {getStatusColor(testSocket.status)}"
                    title="Connection beacon activated!"
                ></div>
                <!-- Status text – bold and clear -->
                <span class="text-lg font-semibold">
                    You are {testSocket.status.connected ? 'Connected' : 'Disconnected'}!
                </span>
            </div>
            <!-- Context info – subtle, informative -->
            <p class="mt-2 text-base-content/70">
                This is another page thats using the same connection as the main page.
            </p>
            <p class="mt-2 text-base-content/70">
                Using <code class="font-mono text-sm text-accent">Socket.getSocketContext()</code> – no reconnection needed, just pure socket sorcery!
            </p>
            <p class="mt-2 text-base-content/70">
                Still responsive, thank you Svelte 5!
            </p>
        </div>
    </div>
</div>

<style>
    /* Custom styles – minimal, Tailwind handles most! */
    .card {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
</style>