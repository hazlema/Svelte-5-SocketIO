<script>
  import SocketExample from './lib/SocketExample.svelte'
 </script>

<main>
  <h1>Socket.IO Integration Demo</h1>
  <p>This demo shows a Socket class that integrates with Socket.IO and leverages Svelte's reactivity.</p>

  <SocketExample />
|</main>

<style>
  main {
    padding: 2rem;
  }
  
  h1 {
    text-align: center;
    margin-bottom: 1rem;
	font-size: xx-large;
  }
  
  p {
    text-align: center;
    margin-bottom: 2rem;
    color: #6b7280;
	font-size: large;
  }
</style>
