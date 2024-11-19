<script>
  import { onMount } from 'svelte';
  import { createLibp2p } from 'libp2p'
  import { gossipsub } from '@chainsafe/libp2p-gossipsub'
  import { webSockets } from '@libp2p/websockets'
  import { webRTC } from '@libp2p/webrtc'
  import { noise } from '@chainsafe/libp2p-noise'
  import { yamux } from '@chainsafe/libp2p-yamux'
  import { bootstrap } from '@libp2p/bootstrap'
  import { identify } from '@libp2p/identify'
  import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
  import { autoNAT } from '@libp2p/autonat'

  let messages = [];
  let messageInput = '';
  let topic = 'my-chat-room';
  let peerId = '';
  let error = null;
  let connectionStatus = 'Initializing...';
  let node;

  onMount(async () => {
    try {
      connectionStatus = 'Creating node...';
      console.log('Creating Libp2p node...');

      node = await createLibp2p({
        transports: [
          webSockets(),
          webRTC(),
          circuitRelayTransport()
        ],
        connectionEncryption: [noise()],
        streamMuxers: [yamux()],
        services: {
          identify: identify(),
          autoNAT: autoNAT(),
          pubsub: gossipsub({
            emitSelf: false,
            allowPublishToZeroPeers: true
          })
        },
        peerDiscovery: [
          bootstrap({
            list: [
              '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
              '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
            ]
          })
        ],
        connectionManager: {
          minConnections: 0
        }
      })

      peerId = node.peerId.toString()
      console.log('Node created. Peer ID:', peerId)

      connectionStatus = 'Subscribing to topic...';
      console.log(`Subscribing to topic: ${topic}`);

      await node.services.pubsub.subscribe(topic, (message) => {
        try {
          const decoder = new TextDecoder()
          const content = decoder.decode(message.data)
          console.log('Received message:', { from: message.from, content })
          messages = [...messages, {
            from: message.from,
            content,
            timestamp: new Date().toLocaleTimeString()
          }]
        } catch (decodeError) {
          console.error('Failed to decode message:', decodeError)
          error = `Failed to decode message: ${decodeError.message}`
        }
      })

      // Log connected peers periodically
      setInterval(async () => {
        const peers = node.getPeers()
        console.log(`Connected to ${peers.length} peers`)
        peers.forEach(peer => console.log('Connected to:', peer.toString()))
      }, 5000)

      connectionStatus = 'Connected';
      console.log('Successfully connected and subscribed');

    } catch (err) {
      console.error('Failed to initialize:', err);
      connectionStatus = 'Failed to connect';
      error = `Initialization failed: ${err.message}`;
    }

    return () => {
      if (node) {
        node.stop().catch(err => {
          console.error('Error stopping node:', err);
        });
      }
    };
  });

  async function sendMessage() {
    if (!messageInput.trim()) return;
    
    try {
      console.log('Sending message:', messageInput);
      const encoder = new TextEncoder();
      await node.services.pubsub.publish(topic, encoder.encode(messageInput));
      console.log('Message sent successfully');
      messageInput = '';
    } catch (err) {
      console.error('Failed to send message:', err);
      error = `Failed to send message: ${err.message}`;
    }
  }
</script>

<main class="p-4">
  <h1 class="text-2xl mb-4">P2P Chat</h1>
  
  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {error}
    </div>
  {/if}

  <p class="mb-4">Status: {connectionStatus}</p>
  
  {#if peerId}
    <p class="mb-4">Your ID: {peerId}</p>
  {/if}

  <div class="border rounded p-4 h-96 overflow-y-auto mb-4">
    {#each messages as message}
      <div class="mb-2">
        <span class="text-sm text-gray-500">{message.timestamp}</span>
        <span class="font-bold">{message.from.slice(0, 8)}...</span>: 
        <span>{message.content}</span>
      </div>
    {/each}
  </div>

  <form on:submit|preventDefault={sendMessage} class="flex gap-2">
    <input
      type="text"
      bind:value={messageInput}
      placeholder="Type your message..."
      class="flex-1 border rounded px-2 py-1"
      disabled={!node}
    />
    <button 
      type="submit" 
      class="bg-blue-500 text-white px-4 py-1 rounded disabled:bg-gray-400"
      disabled={!node}
    >
      Send
    </button>
  </form>
</main>
