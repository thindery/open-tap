#!/usr/bin/env node
/**
 * Open-Tap Relay Server v0.0.1alpha
 * WebSocket relay for fire-and-forget bot messaging
 */

const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const HEARTBEAT_INTERVAL = 30000; // 30s

// Simple in-memory client registry
const clients = new Map();

// Generate unique client ID
function generateId() {
  return crypto.randomUUID();
}

// Create HTTP server (required for Fly.io health checks)
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', clients: clients.size }));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// Heartbeat management
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

// Handle incoming connections
wss.on('connection', (ws, req) => {
  const clientId = generateId();
  const clientInfo = {
    id: clientId,
    ip: req.socket.remoteAddress,
    connectedAt: new Date().toISOString(),
  };
  
  clients.set(clientId, clientInfo);
  ws.clientId = clientId;
  ws.isAlive = true;

  console.log(`[+] Client connected: ${clientId} (${clients.size} total)`);

  // Send client their ID
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId: clientId,
    message: 'Connected to Open-Tap relay'
  }));

  // Handle messages - fire and forget relay
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      // Validate target exists
      if (!message.target) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Message requires a target clientId'
        }));
        return;
      }

      // Log relay
      console.log(`[→] ${clientId} → ${message.target}: ${message.payload || '(no payload)'}`);

      // Find target and relay
      let delivered = false;
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && 
            (client.clientId === message.target || message.target === 'broadcast')) {
          client.send(JSON.stringify({
            type: 'message',
            from: clientId,
            payload: message.payload,
            timestamp: new Date().toISOString()
          }));
          delivered = true;
        }
      });

      // Ack to sender
      ws.send(JSON.stringify({
        type: 'ack',
        delivered: delivered,
        target: message.target
      }));

    } catch (err) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid JSON message'
      }));
    }
  });

  // Handle pong (heartbeat response)
  ws.on('pong', () => heartbeat(ws));

  // Handle close
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`[-] Client disconnected: ${clientId} (${clients.size} remaining)`);
  });

  // Handle errors
  ws.on('error', (err) => {
    console.error(`[!] Client ${clientId} error:`, err.message);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     Open-Tap Relay v0.0.1alpha         ║
║                                        ║
║  Listening on port ${PORT}                  ║
║  WebSocket: ws://localhost:${PORT}        ║
║  Health: http://localhost:${PORT}/health  ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[!] SIGTERM received, shutting down gracefully');
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
