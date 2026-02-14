#!/usr/bin/env node
/**
 * Open-Tap Rendezvous Server
 * Tiny coordination server for P2P discovery across networks
 * 
 * Peers announce: "I'm GUID X at endpoint Y"
 * Peers query: "Who is online?"
 * Then they connect P2P directly
 */

const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3001;
const HEARTBEAT_INTERVAL = 30000;
const PEER_TIMEOUT = 120000; // 2 minutes

// Peer registry: guid -> { endpoint, lastSeen, pubkey }
const peers = new Map();

// Create HTTP server
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      peers: peers.size,
      uptime: process.uptime()
    }));
    return;
  }

  // List all peers (HTTP GET for simple clients)
  if (req.url === '/peers' && req.method === 'GET') {
    cleanupPeers();
    const peerList = Array.from(peers.entries()).map(([guid, info]) => ({
      guid,
      endpoint: info.endpoint,
      lastSeen: info.lastSeen
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ peers: peerList }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ server });

// Heartbeat to keep connections alive
function heartbeat(ws) {
  ws.isAlive = true;
}

function pingClients() {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}

setInterval(pingClients, HEARTBEAT_INTERVAL);

// Clean up stale peers
function cleanupPeers() {
  const now = Date.now();
  for (const [guid, info] of peers.entries()) {
    if (now - info.lastSeen > PEER_TIMEOUT) {
      peers.delete(guid);
      console.log(`[🧹] Expired peer: ${guid}`);
    }
  }
}

setInterval(cleanupPeers, 30000);

// Handle connections
wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  let peerGuid = null;

  console.log(`[+] Rendezvous client connected (${wss.clients.size} total)`);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case 'announce':
          // Peer announces itself
          if (!msg.guid || !msg.endpoint) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'announce requires guid and endpoint'
            }));
            return;
          }

          peerGuid = msg.guid;
          peers.set(msg.guid, {
            endpoint: msg.endpoint,
            pubkey: msg.pubkey || null,
            lastSeen: Date.now(),
            ws: ws // Keep ref for direct messaging if needed
          });

          console.log(`[📢] Peer announced: ${msg.guid} at ${msg.endpoint}`);

          ws.send(JSON.stringify({
            type: 'announced',
            guid: msg.guid,
            message: 'You are now discoverable'
          }));

          // Broadcast to other clients that a new peer is here
          broadcastPeers();
          break;

        case 'query':
          // Peer queries for other peers
          cleanupPeers();
          const peerList = Array.from(peers.entries())
            .filter(([guid]) => guid !== peerGuid) // Exclude self
            .map(([guid, info]) => ({
              guid,
              endpoint: info.endpoint,
              pubkey: info.pubkey
            }));

          ws.send(JSON.stringify({
            type: 'peers',
            peers: peerList
          }));
          break;

        case 'ping':
          // Keepalive
          if (peerGuid && peers.has(peerGuid)) {
            peers.get(peerGuid).lastSeen = Date.now();
          }
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${msg.type}`
          }));
      }
    } catch (err) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid JSON'
      }));
    }
  });

  ws.on('pong', () => heartbeat(ws));

  ws.on('close', () => {
    if (peerGuid) {
      // Don't immediately delete - let timeout handle it
      // This allows brief disconnections
      console.log(`[-] Client disconnected: ${peerGuid}`);
    }
  });

  ws.on('error', (err) => {
    console.error('[!] WebSocket error:', err.message);
  });

  // Welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Open-Tap Rendezvous Server',
    proto: 'announce -> query -> connect P2P'
  }));
});

function broadcastPeers() {
  const peerList = Array.from(peers.entries()).map(([guid, info]) => ({
    guid,
    endpoint: info.endpoint
  }));

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'peers',
        peers: peerList
      }));
    }
  });
}

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  Open-Tap Rendezvous Server            ║
║                                        ║
║  Port: ${PORT}                            ║
║  WebSocket: ws://localhost:${PORT}        ║
║  HTTP: http://localhost:${PORT}/peers     ║
║                                        ║
║  Flow:                                 ║
║    1. Peers ANNOUNCE their GUID        ║
║    2. Peers QUERY for others           ║
║    3. Peers CONNECT P2P directly       ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[!] SIGTERM received, shutting down');
  wss.clients.forEach((ws) => ws.close());
  server.close(() => {
    console.log('[✓] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[!] SIGINT received, shutting down');
  process.exit(0);
});
