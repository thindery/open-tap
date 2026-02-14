#!/usr/bin/env node
/**
 * Open-Tap P2P Mode
 * Entry point for peer-to-peer operation
 * 
 * Usage: 
 *   tap --p2p                    # Local mDNS discovery only
 *   tap --p2p --rendezvous=URL   # Use rendezvous server for cross-network
 */

const { P2PClient } = require('./p2p-client');
const { RendezvousClient } = require('./rendezvous-client');
const { TerminalUI } = require('./ui');
const { parseGUID } = require('./guid');

// Parse arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => /^\d+$/.test(arg));
const PORT = portArg ? parseInt(portArg, 10) : 0; // 0 = auto-assign

const RENDEZVOUS_ARG = args.find(arg => arg.startsWith('--rendezvous='));
const RENDEZVOUS_URL = RENDEZVOUS_ARG ? RENDEZVOUS_ARG.split('=')[1] : 
                       process.env.OPEN_TAP_RENDEZVOUS ||
                       null;

async function main() {
  const ui = new TerminalUI();
  const p2p = new P2PClient(PORT);
  let rendezvous = null;

  // Print startup banner
  ui.print('\n╔══════════════════════════════════════════════════════════╗');
  ui.print('║           Open-Tap P2P Mode v0.0.2alpha                  ║');
  ui.print('║                                                          ║');
  ui.print('║  🌐 TRUE PEER-TO-PEER - No central relay                 ║');
  ui.print('║  🔍 Discovery: mDNS (LAN) + Rendezvous (cross-network)   ║');
  ui.print('║  🔐 Mutual authentication with GUIDs                     ║');
  ui.print('╚══════════════════════════════════════════════════════════╝\n');

  // Track last peer for /reply
  let lastPeer = null;

  // Handle P2P events
  p2p.on('started', (info) => {
    ui.system('✅ P2P Node started');
    ui.system(`   My GUID: ${info.guid}`);
    ui.system(`   Endpoint: ${info.endpoint}`);
    
    if (RENDEZVOUS_URL) {
      ui.system(`   Rendezvous: ${RENDEZVOUS_URL}`);
    } else if (!info.discovery) {
      ui.system('   ⚠️  mDNS discovery unavailable (install multicast-dns)');
    }
    
    ui.system('');
    ui.system('   Commands:');
    ui.system('     /id    - Show your GUID');
    ui.system('     /peers - List discovered peers');
    if (!RENDEZVOUS_URL) {
      ui.system('     /add-peer <guid> - Add peer manually for cross-network');
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

  // Start P2P and get info
  try {
    await p2p.start();
  } catch (err) {
    ui.system(`Failed to start: ${err.message}`);
    process.exit(1);
  }

  const myInfo = p2p.getInfo();

  // Connect to rendezvous if specified
  if (RENDEZVOUS_URL) {
    ui.system(`🌍 Connecting to rendezvous server...`);
    
    try {
      rendezvous = new RendezvousClient(
        RENDEZVOUS_URL,
        myInfo.guid,
        myInfo.endpoint
      );

      rendezvous.on('peers', (peers) => {
        for (const peer of peers) {
          if (peer.guid !== myInfo.guid) {
            // Add to P2P client
            p2p.addPeer(peer.guid, peer.endpoint);
            p2p.discoverPeer(peer.guid, peer.endpoint, 'rendezvous');
          }
        }
      });

      await rendezvous.connect();
      ui.system('✅ Connected to rendezvous server');
      ui.system('   Peers discovered on same rendezvous will auto-appear in /peers');
    } catch (err) {
      ui.system(`⚠️  Rendezvous connection failed: ${err.message}`);
      ui.system('   P2P will work locally but not across networks');
    }
  }

  // Command: /id - Show my GUID
  ui.command('id', 'Show my GUID and endpoint', () => {
    const info = p2p.getInfo();
    ui.system('My P2P Info:');
    ui.system(`  GUID: ${info.guid}`);
    ui.system(`  Endpoint: ${info.endpoint}`);
    if (RENDEZVOUS_URL) {
      ui.system(`  Rendezvous: ${RENDEZVOUS_URL}`);
    }
    ui.system(`\n  Share this GUID with peers on different networks:`);
    ui.system(`  ${info.guid}`);
  });

  // Command: /peers - List peers
  ui.command('peers', 'List discovered and connected peers', () => {
    const peers = p2p.getPeers();
    const stats = p2p.getConnectionStats();
    
    ui.system(`Peers (${peers.length} discovered, ${stats.total} connected):`);
    
    if (peers.length === 0) {
      ui.system('  No peers yet.');
      if (RENDEZVOUS_URL) {
        ui.system('  Waiting for peers on same rendezvous server...');
      } else {
        ui.system('  Discovery takes 5-10 seconds on same WiFi.');
        ui.system('  Or add manually: /add-peer <guid>');
      }
      return;
    }

    for (const peer of peers) {
      const status = peer.connected ? '✅ connected' : '⏳ discovered';
      const type = peer.source || 'manual';
      ui.system(`  ${status} [${type}] ${peer.guid.slice(0, 24)}... at ${peer.endpoint || '?'}`);
    }
  });

  // Command: /add-peer <guid> - Add peer manually
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
    ui.system(`Use /auth ${guid.slice(0, 16)}... to authenticate`);
  });

  // Command: /auth <guid> - Authenticate with peer
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

  // Command: /to <guid> <msg> - Send message to peer
  ui.command('to', '<guid> <message> - Send message to peer', async (args, full) => {
    if (args.length < 2) {
      ui.system('Usage: /to <guid> <message>');
      ui.system('  First use /auth <guid> to authenticate, then /to');
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

  // Command: /reply <msg> - Reply to last sender
  ui.command('reply', '<message> - Reply to last peer', (args, full) => {
    const message = full || args.join(' ');
    if (!message) {
      ui.system('Usage: /reply <message>');
      return;
    }

    if (!lastPeer) {
      ui.system('No peer has sent you a message yet. Use /to first.');
      return;
    }

    const result = p2p.sendToPeer(lastPeer, message);
    if (result.success) {
      ui.system(`Replied to ${lastPeer.slice(0, 12)}...`);
    } else {
      ui.system(`Reply failed: ${result.error}`);
    }
  });

  // Command: /stats - Show connection stats
  ui.command('stats', 'Show connection statistics', () => {
    const stats = p2p.getConnectionStats();
    ui.system('Connection Stats:');
    ui.system(`  Incoming: ${stats.incoming}`);
    ui.system(`  Outgoing: ${stats.outgoing}`);
    ui.system(`  Discovered: ${stats.discovered}`);
    ui.system(`  Total Active: ${stats.total}`);
  });

  // Command: /broadcast <msg> - Send to all connected
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

  // Command: /quit - Exit
  ui.command('quit', 'Exit P2P mode', () => {
    ui.system('Shutting down P2P node...');
    if (rendezvous) {
      rendezvous.disconnect();
    }
    p2p.stop();
    ui.stop();
    process.exit(0);
  });

  // Start UI
  ui.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    ui.system('Shutting down...');
    if (rendezvous) {
      rendezvous.disconnect();
    }
    p2p.stop();
    ui.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
