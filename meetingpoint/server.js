#!/usr/bin/env node
/**
 * aitap Meeting Point
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
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute per IP
const AUTH_FAILURE_MAX = 5; // Max failed auth attempts before backoff
const AUTH_BACKOFF_MS = 30000; // 30 second backoff after auth failures
const AUTH_RETRY_MULTIPLIER = 2; // Exponential backoff multiplier

// Peer registry: guid -> { endpoint, lastSeen, pubkey }
const peers = new Map();

// Rate limiting: ip -> { count, resetTime, authFailures: number, backoffUntil: number }
const rateLimits = new Map();

/**
 * Rate limiting module
 */
function checkRateLimit(ip) {
  const now = Date.now();
  let limit = rateLimits.get(ip);
  
  if (!limit) {
    limit = { count: 1, resetTime: now + RATE_LIMIT_WINDOW, authFailures: 0, backoffUntil: 0 };
    rateLimits.set(ip, limit);
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  
  // Check if in backoff period due to auth failures
  if (limit.backoffUntil > now) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((limit.backoffUntil - now) / 1000) };
  }
  
  // Reset if window expired
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + RATE_LIMIT_WINDOW;
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  
  // Check against limit
  if (limit.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((limit.resetTime - now) / 1000) };
  }
  
  limit.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - limit.count };
}

/**
 * Record authentication failure for exponential backoff
 */
function recordAuthFailure(ip) {
  const now = Date.now();
  let limit = rateLimits.get(ip);
  
  if (!limit) {
    limit = { count: 0, resetTime: now + RATE_LIMIT_WINDOW, authFailures: 1, backoffUntil: now + AUTH_BACKOFF_MS };
    rateLimits.set(ip, limit);
    return;
  }
  
  limit.authFailures++;
  const backoffMs = AUTH_BACKOFF_MS * Math.pow(AUTH_RETRY_MULTIPLIER, Math.min(limit.authFailures - 1, 5)); // Cap at 5th failure
  limit.backoffUntil = now + backoffMs;
}

/**
 * Clear rate limit for successful auth
 */
function clearAuthFailures(ip) {
  const limit = rateLimits.get(ip);
  if (limit) {
    limit.authFailures = 0;
    limit.backoffUntil = 0;
  }
}

/**
 * Get client IP from request
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for'] || 
         req.socket.remoteAddress || 
         'unknown';
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Get client IP for rate limiting
  const clientIp = getClientIp(req);
  
  // Check rate limit for HTTP requests
  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    res.writeHead(429, { 
      'Content-Type': 'application/json',
      'Retry-After': rateCheck.retryAfter
    });
    res.end(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter }));
    return;
  }
  
  // CORS headers - restrict to same-origin only (no wildcards for WebSocket-only service)
  const origin = req.headers.origin;
  // Only allow same-origin or no origin (direct requests)
  if (origin) {
    // For a public server, you might want to allow specific origins
    // Here we only allow same-origin direct requests
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

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

// Clean up old rate limit entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, limit] of rateLimits.entries()) {
    if (now > limit.resetTime + RATE_LIMIT_WINDOW) {
      rateLimits.delete(ip);
    }
  }
}, 3600000);

// Handle connections
wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  let peerGuid = null;
  const clientIp = getClientIp(req);
  
  // Check rate limit on connection
  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Rate limit exceeded. Retry after ${rateCheck.retryAfter}s`
    }));
    ws.close(1008, 'Rate limit exceeded');
    return;
  }

  console.log(`[+] Rendezvous client connected (${wss.clients.size} total) from ${clientIp}`);

  ws.on('message', (data) => {
    try {
      // Check rate limit on each message
      const rateCheck = checkRateLimit(clientIp);
      if (!rateCheck.allowed) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Rate limit exceeded. Retry after ${rateCheck.retryAfter}s`
        }));
        ws.close(1008, 'Rate limit exceeded');
        return;
      }
      
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

// Export for testing
module.exports = { server, wss, rateLimits, checkRateLimit };
