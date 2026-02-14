#!/usr/bin/env node
/**
 * aitap Client v0.0.1alpha
 * Terminal client for relay messaging
 * 
 * Modes:
 *   tap                    - Connect to relay (default ws://localhost:3000)
 *   tap ws://relay.url     - Connect to specific relay
 *   tap --p2p [port]       - Start in P2P mode
 */

const { OpenTapClient } = require('./client');
const { P2PClient } = require('./p2p-client');
const { TerminalUI } = require('./ui');
const { getIdentity } = require('./identity');
const { parseGUID } = require('./guid');

// Parse arguments
const args = process.argv.slice(2);
const isP2PMode = args.includes('--p2p');

async function main() {
  // Handle P2P mode
  if (isP2PMode) {
    await runP2PMode();
    return;
  }

  // Default relay mode
  await runRelayMode();
}

// ============================================================================
// RELAY MODE (Original)
// ============================================================================
async function runRelayMode() {
  // Default relay (local, from env, or from argument)
  let RELAY_URL = process.env.AITAP_RELAY || 'ws://localhost:3000';

  // Check for relay URL in arguments (non-flag argument)
  const urlArg = args.find(arg => arg.startsWith('ws://') || arg.startsWith('wss://'));
  if (urlArg) {
    RELAY_URL = urlArg;
  }

  const ui = new TerminalUI();
  const client = new OpenTapClient(RELAY_URL);

  let targetClient = null;
  let lastPeer = null;

  ui.print('\n╔════════════════════════════════════════╗');
  ui.print('║        aitap Client v0.0.1alpha        ║');
  ui.print('║                                        ║');
  ui.print(`║  Identity: ${getIdentity().slice(0, 16)}...       ║`);
  ui.print(`║  Relay: ${RELAY_URL.slice(0, 28).padEnd(28)}  ║`);
  ui.print('╚════════════════════════════════════════╝\n');

  // Setup message handler
  client.onMessage((msg) => {
    switch (msg.type) {
      case 'message':
        lastPeer = msg.from;
        ui.receive(msg.from, msg.payload);
        break;
      case 'ack':
        ui.system(msg.delivered ? `Delivered to ${msg.target}` : `Target ${msg.target} not found`);
        break;
      case 'error':
        ui.system(`Relay error: ${msg.message}`);
        break;
    }
  });

  // Register commands
  ui.command('to', '<clientId> <message> - Send message', (args, full) => {
    if (args.length < 2) {
      ui.system('Usage: /to <clientId> <message>');
      return;
    }
    targetClient = args[0];
    const message = full.slice(targetClient.length + 1);
    
    try {
      client.send(targetClient, message);
    } catch (err) {
      ui.system(`Send failed: ${err.message}`);
    }
  });

  ui.command('broadcast', '<message> - Send to all', (args, full) => {
    if (!full) {
      ui.system('Usage: /broadcast <message>');
      return;
    }
    try {
      client.broadcast(full);
      ui.system('Broadcast sent');
    } catch (err) {
      ui.system(`Broadcast failed: ${err.message}`);
    }
  });

  ui.command('target', '[clientId] - Set default target', (args) => {
    if (args.length === 0) {
      ui.system(targetClient ? `Current target: ${targetClient}` : 'No target set');
      return;
    }
    targetClient = args[0];
    ui.system(`Target set to: ${targetClient}`);
  });

  ui.command('send', '<message> - Send to current target', (args, full) => {
    if (!targetClient) {
      ui.system('No target set. Use /target <clientId> or /to <clientId> <message>');
      return;
    }
    if (!full) {
      ui.system('Usage: /send <message>');
      return;
    }
    try {
      client.send(targetClient, full);
    } catch (err) {
      ui.system(`Send failed: ${err.message}`);
    }
  });

  ui.command('reply', '<message> - Reply to last peer', (args, full) => {
    const message = full || args.join(' ');
    if (!message) {
      ui.system('Usage: /reply <message>');
      return;
    }
    if (!lastPeer) {
      ui.system('No peer has messaged you yet. Use /to <id> <message> first.');
      return;
    }
    try {
      client.send(lastPeer, message);
      ui.system(`Replied to ${lastPeer.slice(0, 8)}...`);
    } catch (err) {
      ui.system(`Reply failed: ${err.message}`);
    }
  });

  ui.command('quit', 'Exit the client', () => {
    ui.system('Disconnecting...');
    client.disconnect();
    ui.stop();
    process.exit(0);
  });

  ui.command('id', 'Show my client ID', () => {
    ui.system(`My ID: ${getIdentity()}`);
  });

  ui.command('relay', 'Show relay URL', () => {
    ui.system(`Relay: ${RELAY_URL}`);
  });

  ui.command('p2p', '[port] - Switch to P2P mode', async (args) => {
    ui.system('Switching to P2P mode...');
    client.disconnect();
    ui.stop();
    const port = args[0] ? parseInt(args[0], 10) : 0;
    await runP2PMode(port);
  });

  // Connect to relay
  ui.system('Connecting to relay...');
  try {
    await client.connect();
    ui.system('Connected! Use /to <clientId> <message> to test');
    ui.system('Or use --p2p flag for TRUE peer-to-peer mode');
  } catch (err) {
    ui.system(`Connection failed: ${err.message}`);
    ui.system('Is the relay running? Set AITAP_RELAY to change server.');
    ui.stop();
    process.exit(1);
  }

  // Start UI
  ui.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    client.disconnect();
    ui.stop();
    process.exit(0);
  });
}

// ============================================================================
// P2P MODE
// ============================================================================
async function runP2PMode(requestedPort = 0) {
  const portArg = args.find(arg => /^\d+$/.test(arg));
  const PORT = requestedPort || (portArg ? parseInt(portArg, 10) : 0);
  
  const ui = new TerminalUI();
  const p2p = new P2PClient(PORT);

  let lastPeer = null;

  ui.print('\n╔══════════════════════════════════════════════════════════╗');
  ui.print('║           Open-Tap P2P Mode v0.0.1alpha                  ║');
  ui.print('║                                                          ║');
  ui.print('║  🌐 TRUE PEER-TO-PEER - No central relay                 ║');
  ui.print('║  🔍 Auto-discovery via mDNS on same WiFi                 ║');
  ui.print('║  🔐 Mutual authentication with GUIDs                     ║');
  ui.print('╚══════════════════════════════════════════════════════════╝\n');

  // Handle P2P events
  p2p.on('started', (info) => {
    ui.system('✅ P2P Node started');
    ui.system(`   My GUID: ${info.guid}`);
    ui.system(`   Endpoint: ${info.endpoint}`);
    if (!info.discovery) {
      ui.system('   ⚠️  mDNS discovery unavailable (install multicast-dns for auto-discovery)');
    }
    ui.system('');
  });

  p2p.on('message', (msg) => {
    lastPeer = msg.from;
    ui.receive(msg.from, msg.payload);
  });

  p2p.on('discovered', (peer) => {
    ui.system(`🔍 Discovered peer: ${peer.guid.slice(0, 20)}... at ${peer.endpoint}`);
  });

  p2p.on('peer:connected', ({ guid, incoming }) => {
    ui.system(`${incoming ? '📥' : '📤'} Peer ${incoming ? 'connected to' : 'connected with'}: ${guid.slice(0, 16)}...`);
  });

  p2p.on('peer:disconnected', ({ guid }) => {
    ui.system(`❌ Peer disconnected: ${guid.slice(0, 16)}...`);
  });

  p2p.on('error', (msg) => {
    ui.system(`❌ ${msg}`);
  });

  // Commands
  ui.command('id', 'Show my GUID and endpoint', () => {
    const info = p2p.getInfo();
    ui.system('My P2P Info:');
    ui.system(`  GUID: ${info.guid}`);
    ui.system(`  Endpoint: ${info.endpoint}`);
  });

  ui.command('peers', 'List discovered and connected peers', () => {
    const peers = p2p.getPeers();
    const stats = p2p.getConnectionStats();
    
    ui.system(`Peers (${peers.length} discovered, ${stats.total} connected):`);
    
    if (peers.length === 0) {
      ui.system('  No peers yet. Discovery takes 5-10 seconds on same WiFi.');
      ui.system('  Or add manually: /add-peer <guid>');
      return;
    }

    for (const peer of peers) {
      const status = peer.connected ? '✅ connected' : '⏳ discovered';
      const type = peer.manual ? '[manual]' : peer.discovered ? '[mdns]' : '[unknown]';
      ui.system(`  ${status} ${type} ${peer.guid.slice(0, 24)}... at ${peer.endpoint || '?'}`);
    }
  });

  ui.command('add-peer', '<guid> - Add peer by GUID', (args) => {
    if (args.length < 1) {
      ui.system('Usage: /add-peer <guid>');
      ui.system('  The GUID format: uuid-ip-port-pubkey');
      return;
    }

    const guid = args[0];
    const parsed = parseGUID(guid);
    
    if (!parsed.valid) {
      ui.system(`Invalid GUID: ${parsed.error}`);
      return;
    }

    p2p.addPeer(guid, parsed.endpoint);
    ui.system(`Added peer: ${guid.slice(0, 24)}... at ${parsed.endpoint}`);
  });

  ui.command('auth', '<guid> - Authenticate with peer', async (args) => {
    if (args.length < 1) {
      ui.system('Usage: /auth <guid>');
      return;
    }

    const guid = args[0];
    ui.system(`Authenticating with ${guid.slice(0, 16)}...`);
    
    try {
      const result = await p2p.authenticate(guid);
      if (result.alreadyConnected) {
        ui.system('Already connected and authenticated!');
      } else {
        ui.system('✅ Authenticated! You can now send messages');
      }
    } catch (err) {
      ui.system(`❌ Authentication failed: ${err.message}`);
    }
  });

  ui.command('connect', '<guid> - Connect to peer', async (args) => {
    if (args.length < 1) {
      ui.system('Usage: /connect <guid>');
      return;
    }
    
    const guid = args[0];
    ui.system(`Connecting to ${guid.slice(0, 16)}...`);
    
    try {
      await p2p.connectToPeer(guid);
      ui.system('✅ Connected and authenticated!');
    } catch (err) {
      ui.system(`❌ Connection failed: ${err.message}`);
    }
  });

  ui.command('to', '<guid> <message> - Send message to peer', async (args, full) => {
    if (args.length < 2) {
      ui.system('Usage: /to <guid> <message>');
      return;
    }

    const targetGuid = args[0];
    const message = full.slice(targetGuid.length + 1).trim();

    // Auto-connect if not connected
    if (!p2p.isPeerConnected(targetGuid)) {
      ui.system(`Not connected. Auto-authenticating...`);
      try {
        await p2p.authenticate(targetGuid);
      } catch (err) {
        ui.system(`Cannot connect: ${err.message}`);
        return;
      }
    }

    const result = p2p.sendToPeer(targetGuid, message);
    if (!result.success) {
      ui.system(`Send failed: ${result.error}`);
    }
  });

  ui.command('reply', '<message> - Reply to last peer', (args, full) => {
    const message = full || args.join(' ');
    if (!message) {
      ui.system('Usage: /reply <message>');
      return;
    }

    const result = p2p.reply(message);
    if (result.success) {
      ui.system(`Replied to ${lastPeer ? lastPeer.slice(0, 12) : 'last peer'}...`);
    } else {
      ui.system(`Reply failed: ${result.error}`);
    }
  });

  ui.command('stats', 'Show connection statistics', () => {
    const stats = p2p.getConnectionStats();
    ui.system('Connection Stats:');
    ui.system(`  Incoming: ${stats.incoming}`);
    ui.system(`  Outgoing: ${stats.outgoing}`);
    ui.system(`  Discovered: ${stats.discovered}`);
    ui.system(`  Total Active: ${stats.total}`);
  });

  ui.command('broadcast', '<message> - Broadcast to all peers', (args, full) => {
    if (!full) {
      ui.system('Usage: /broadcast <message>');
      return;
    }

    const peers = p2p.getPeers().filter(p => p.connected);
    if (peers.length === 0) {
      ui.system('No connected peers to broadcast to');
      return;
    }

    for (const peer of peers) {
      p2p.sendToPeer(peer.guid, full);
    }
    ui.system(`Broadcast sent to ${peers.length} peers`);
  });

  ui.command('relay', 'Switch to relay mode', async () => {
    ui.system('Switching to relay mode...');
    p2p.stop();
    ui.stop();
    await runRelayMode();
  });

  ui.command('quit', 'Exit', () => {
    ui.system('Shutting down P2P node...');
    p2p.stop();
    ui.stop();
    process.exit(0);
  });

  // Start P2P
  try {
    await p2p.start();
  } catch (err) {
    ui.system(`Failed to start: ${err.message}`);
    process.exit(1);
  }

  // Start UI
  ui.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    ui.system('Shutting down...');
    p2p.stop();
    ui.stop();
    process.exit(0);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
