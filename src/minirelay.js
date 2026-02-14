/**
 * Open-Tap Mini-Relay Server
 * Each node runs its own WebSocket server for P2P connections
 */

const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');
const EventEmitter = require('events');

const HEARTBEAT_INTERVAL = 30000; // 30s

class MiniRelay extends EventEmitter {
  constructor(port, guid) {
    super();
    this.port = port;
    this.guid = guid;
    this.server = null;
    this.wss = null;
    this.peers = new Map(); // peerGuid -> { ws, authenticated, sessionKey }
    this.running = false;
    this.httpServer = null;
  }

  /**
   * Start the mini-relay server
   */
  async start() {
    if (this.running) return;

    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server for health checks
        this.httpServer = http.createServer((req, res) => {
          if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              status: 'ok', 
              guid: this.guid,
              peers: this.peers.size,
              p2p: true 
            }));
            return;
          }
          if (req.url === '/id') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              guid: this.guid,
              endpoint: `ws://localhost:${this.port}`
            }));
            return;
          }
          res.writeHead(404);
          res.end('Not found');
        });

        // WebSocket server
        this.wss = new WebSocket.Server({ server: this.httpServer });

        // Heartbeat
        this.heartbeatInterval = setInterval(() => {
          this._pingPeers();
        }, HEARTBEAT_INTERVAL);

        // Handle incoming connections
        this.wss.on('connection', (ws, req) => {
          this._handleConnection(ws, req);
        });

        // Start listening
        this.httpServer.listen(this.port, () => {
          this.running = true;
          this.emit('started', { port: this.port, guid: this.guid });
          resolve({ port: this.port, guid: this.guid });
        });

        this.httpServer.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.port} is already in use`));
          } else {
            reject(err);
          }
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Stop the mini-relay
   */
  stop() {
    if (!this.running) return;

    this.running = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all peer connections
    for (const [peerGuid, peer] of this.peers) {
      if (peer.ws && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.close();
      }
    }
    this.peers.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Close HTTP server
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }

    this.emit('stopped');
  }

  /**
   * Handle incoming WebSocket connection
   */
  _handleConnection(ws, req) {
    const peerInfo = {
      ip: req.socket.remoteAddress,
      connectedAt: new Date().toISOString(),
      authenticated: false,
      peerGuid: null,
      sessionKey: null,
      challenge: null
    };

    ws.isAlive = true;

    // Send welcome with our GUID
    ws.send(JSON.stringify({
      type: 'welcome',
      guid: this.guid,
      message: 'Open-Tap P2P Node'
    }));

    // Handle messages
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        this._handleMessage(ws, peerInfo, msg);
      } catch (err) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON'
        }));
      }
    });

    // Heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Close
    ws.on('close', () => {
      if (peerInfo.peerGuid) {
        this.peers.delete(peerInfo.peerGuid);
        this.emit('peer:disconnected', { guid: peerInfo.peerGuid });
      }
    });

    // Error
    ws.on('error', (err) => {
      this.emit('peer:error', { error: err.message, ip: peerInfo.ip });
    });
  }

  /**
   * Handle incoming message
   */
  _handleMessage(ws, peerInfo, msg) {
    switch (msg.type) {
      case 'auth:challenge':
        this._handleAuthChallenge(ws, peerInfo, msg);
        break;
      case 'auth:response':
        this._handleAuthResponse(ws, peerInfo, msg);
        break;
      case 'message':
        this._handleIncomingMessage(ws, peerInfo, msg);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', time: msg.time }));
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${msg.type}`
        }));
    }
  }

  /**
   * Handle auth challenge from peer
   */
  _handleAuthChallenge(ws, peerInfo, msg) {
    if (!msg.guid || !msg.challenge) {
      ws.send(JSON.stringify({
        type: 'auth:error',
        message: 'Challenge requires guid and challenge'
      }));
      return;
    }

    // Store peer info
    peerInfo.peerGuid = msg.guid;
    peerInfo.challenge = crypto.randomBytes(32).toString('hex');

    // Generate our response to their challenge
    const response = this._generateAuthResponse(msg.challenge, msg.guid);
    
    // Send our challenge back
    ws.send(JSON.stringify({
      type: 'auth:challenge',
      guid: this.guid,
      challenge: peerInfo.challenge,
      response: response
    }));
  }

  /**
   * Handle auth response from peer
   */
  _handleAuthResponse(ws, peerInfo, msg) {
    if (!peerInfo.challenge || !peerInfo.peerGuid) {
      ws.send(JSON.stringify({
        type: 'auth:error',
        message: 'No pending challenge'
      }));
      return;
    }

    if (!msg.response) {
      ws.send(JSON.stringify({
        type: 'auth:error',
        message: 'Response required'
      }));
      return;
    }

    // Verify their response
    const expected = this._generateAuthResponse(peerInfo.challenge, peerInfo.peerGuid);
    
    if (msg.response !== expected) {
      ws.send(JSON.stringify({
        type: 'auth:failed',
        message: 'Invalid response'
      }));
      ws.close();
      return;
    }

    // Authentication successful
    peerInfo.authenticated = true;
    peerInfo.sessionKey = crypto.randomBytes(32).toString('hex');
    
    this.peers.set(peerInfo.peerGuid, {
      ws,
      ...peerInfo
    });

    ws.send(JSON.stringify({
      type: 'auth:success',
      sessionKey: peerInfo.sessionKey,
      message: 'Authenticated'
    }));

    this.emit('peer:authenticated', { 
      guid: peerInfo.peerGuid,
      ip: peerInfo.ip 
    });
  }

  /**
   * Handle incoming message from peer
   */
  _handleIncomingMessage(ws, peerInfo, msg) {
    if (!peerInfo.authenticated) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authenticated'
      }));
      return;
    }

    if (!msg.payload) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Message requires payload'
      }));
      return;
    }

    // Emit for processing
    this.emit('message', {
      from: peerInfo.peerGuid,
      payload: msg.payload,
      timestamp: new Date().toISOString()
    });

    // Ack
    ws.send(JSON.stringify({
      type: 'ack',
      id: msg.id || crypto.randomUUID()
    }));
  }

  /**
   * Generate authentication response
   * Simple HMAC-like construction
   */
  _generateAuthResponse(challenge, guid) {
    // Combine challenge + guid + our guid for response
    const data = `${challenge}:${guid}:${this.guid}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Send message to a connected peer
   */
  sendToPeer(peerGuid, payload) {
    const peer = this.peers.get(peerGuid);
    if (!peer || !peer.ws || peer.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    if (!peer.authenticated) {
      return false;
    }

    peer.ws.send(JSON.stringify({
      type: 'message',
      payload,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    }));

    return true;
  }

  /**
   * Ping all connected peers
   */
  _pingPeers() {
    this.wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }

  /**
   * Get list of connected peers
   */
  getConnectedPeers() {
    const list = [];
    for (const [guid, peer] of this.peers) {
      list.push({
        guid,
        ip: peer.ip,
        authenticated: peer.authenticated,
        connectedAt: peer.connectedAt
      });
    }
    return list;
  }

  /**
   * Check if peer is connected and authenticated
   */
  isPeerConnected(peerGuid) {
    const peer = this.peers.get(peerGuid);
    return peer && peer.authenticated && peer.ws.readyState === WebSocket.OPEN;
  }
}

module.exports = { MiniRelay };
