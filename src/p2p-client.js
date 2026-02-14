/**
 * Open-Tap P2P Client
 * Manages peer connections, authentication, and messaging
 */

const WebSocket = require('ws');
const { AuthManager } = require('./auth');
const { DiscoveryService } = require('./discovery');
const { MiniRelay } = require('./minirelay');
const { createGUID, parseGUID, getWebSocketURL, getPrimaryIP } = require('./guid');
const EventEmitter = require('events');

class P2PClient extends EventEmitter {
  constructor(port = 0) {
    super();
    this.port = port === 0 ? this._findFreePort() : port;
    this.ip = getPrimaryIP();
    this.guid = createGUID(this.port, this.ip);
    
    // Components
    this.miniRelay = new MiniRelay(this.port, this.guid);
    this.discovery = new DiscoveryService(this.guid, this.port);
    this.authManager = new AuthManager(this.guid);
    
    // Connection registry
    this.connections = new Map(); // guid -> { ws, authenticated, lastMessage }
    this.lastPeer = null; // For /reply
    this.isRunning = false;
    
    this._setupHandlers();
  }

  /**
   * Setup event handlers
   */
  _setupHandlers() {
    // MiniRelay events
    this.miniRelay.on('peer:authenticated', ({ guid, ip }) => {
      this.emit('peer:connected', { guid, ip, incoming: true });
    });
    
    this.miniRelay.on('peer:disconnected', ({ guid }) => {
      this.connections.delete(guid);
      this.emit('peer:disconnected', { guid });
    });
    
    this.miniRelay.on('message', (msg) => {
      this.lastPeer = msg.from;
      this.emit('message', msg);
    });

    // Discovery events
    this.discovery.on('peer:discovered', (peer) => {
      this.emit('discovered', peer);
    });
  }

  /**
   * Find a free port
   */
  _findFreePort() {
    // Random port between 3001-9999
    return Math.floor(Math.random() * 6999) + 3001;
  }

  /**
   * Start P2P node
   */
  async start() {
    if (this.isRunning) return;

    try {
      // Start mini-relay
      await this.miniRelay.start();
      
      // Update GUID with actual port if it was 0
      if (this.port === 0) {
        this.port = this.miniRelay.port;
        this.guid = createGUID(this.port, this.ip);
        // Update components with real GUID
        this.miniRelay.guid = this.guid;
        this.discovery.guid = this.guid;
        this.discovery.port = this.port;
        this.authManager.guid = this.guid;
      }

      // Start discovery
      const discoveryStarted = await this.discovery.start();
      
      this.isRunning = true;
      
      this.emit('started', {
        guid: this.guid,
        endpoint: `${this.ip}:${this.port}`,
        discovery: discoveryStarted
      });

      return {
        guid: this.guid,
        endpoint: `${this.ip}:${this.port}`,
        discovery: discoveryStarted
      };

    } catch (err) {
      this.emit('error', `Failed to start P2P: ${err.message}`);
      throw err;
    }
  }

  /**
   * Stop P2P node
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Close all outgoing connections
    for (const [guid, conn] of this.connections) {
      if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.close();
      }
    }
    this.connections.clear();
    
    // Stop services
    this.discovery.stop();
    this.miniRelay.stop();
    
    this.emit('stopped');
  }

  /**
   * Connect to a peer by GUID
   */
  async connectToPeer(peerGuid) {
    // Check if already connected
    if (this.connections.has(peerGuid)) {
      const existing = this.connections.get(peerGuid);
      if (existing.authenticated && existing.ws.readyState === WebSocket.OPEN) {
        return { success: true, existing: true };
      }
    }

    const url = getWebSocketURL(peerGuid);
    if (!url) {
      throw new Error('Invalid GUID format');
    }

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url);
        let timeout = setTimeout(() => {
          ws.terminate();
          reject(new Error('Connection timeout'));
        }, 10000);

        ws.on('open', async () => {
          clearTimeout(timeout);
          
          this.connections.set(peerGuid, {
            ws,
            authenticated: false,
            connectedAt: new Date().toISOString()
          });

          // Perform auth
          try {
            const auth = await this.authManager.authenticate(ws, peerGuid);
            
            const conn = this.connections.get(peerGuid);
            if (conn) {
              conn.authenticated = true;
              conn.sessionKey = auth.sessionKey;
            }

            this.emit('peer:connected', { 
              guid: peerGuid, 
              incoming: false,
              authenticated: true 
            });

            resolve({ success: true, sessionKey: auth.sessionKey });
          } catch (authErr) {
            ws.close();
            this.connections.delete(peerGuid);
            reject(authErr);
          }
        });

        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data);
            if (msg.type === 'message') {
              this.lastPeer = peerGuid;
              this.emit('message', {
                from: peerGuid,
                payload: msg.payload,
                timestamp: msg.timestamp || new Date().toISOString()
              });
            }
          } catch {
            // Ignore invalid messages
          }
        });

        ws.on('close', () => {
          this.connections.delete(peerGuid);
          this.authManager.removePeer(peerGuid);
        });

        ws.on('error', (err) => {
          clearTimeout(timeout);
          this.connections.delete(peerGuid);
          reject(err);
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Send message to peer
   */
  sendToPeer(peerGuid, payload) {
    // Try outgoing connection first
    const conn = this.connections.get(peerGuid);
    if (conn && conn.authenticated && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify({
        type: 'message',
        payload,
        timestamp: new Date().toISOString()
      }));
      return { success: true };
    }

    // Try through mini-relay (incoming connection)
    const sent = this.miniRelay.sendToPeer(peerGuid, payload);
    if (sent) {
      return { success: true };
    }

    return { success: false, error: 'Peer not connected' };
  }

  /**
   * Send to last peer (for /reply)
   */
  reply(payload) {
    if (!this.lastPeer) {
      return { success: false, error: 'No peer to reply to' };
    }
    return this.sendToPeer(this.lastPeer, payload);
  }

  /**
   * Get node info
   */
  getInfo() {
    return {
      guid: this.guid,
      endpoint: `${this.ip}:${this.port}`,
      ip: this.ip,
      port: this.port,
      running: this.isRunning
    };
  }

  /**
   * Get all peers
   */
  getPeers() {
    const peers = [];
    
    // Discovered peers
    for (const peer of this.discovery.getPeers()) {
      peers.push({
        ...peer,
        connected: this.isPeerConnected(peer.guid),
        discovered: true
      });
    }
    
    // Manually added peers
    for (const [guid, conn] of this.connections) {
      if (!peers.find(p => p.guid === guid)) {
        peers.push({
          guid,
          connected: conn.authenticated,
          endpoint: 'unknown',
          discovered: false,
          manual: true
        });
      }
    }
    
    return peers;
  }

  /**
   * Check if peer is connected
   */
  isPeerConnected(peerGuid) {
    // Check outgoing
    const conn = this.connections.get(peerGuid);
    if (conn && conn.authenticated) return true;
    
    // Check incoming
    return this.miniRelay.isPeerConnected(peerGuid);
  }

  /**
   * Add peer manually
   */
  addPeer(guid, endpoint) {
    return this.discovery.addPeer(guid, endpoint);
  }

  /**
   * Discover peer from external source (rendezvous, etc.)
   */
  discoverPeer(guid, endpoint, source = 'external') {
    const added = this.discovery.addPeer(guid, endpoint);
    if (added) {
      // Mark with source
      const peer = this.discovery.peers.get(guid);
      if (peer) {
        peer.source = source;
      }
      this.emit('discovered', { guid, endpoint, source });
    }
    return added;
  }

  /**
   * Authenticate with peer (connect + auth)
   */
  async authenticate(peerGuid) {
    // First check if already connected
    if (this.isPeerConnected(peerGuid)) {
      return { success: true, alreadyConnected: true };
    }
    
    // Try to connect
    return await this.connectToPeer(peerGuid);
  }

  /**
   * Get last peer
   */
  getLastPeer() {
    return this.lastPeer;
  }

  /**
   * Get connected peers count
   */
  getConnectionStats() {
    const incoming = this.miniRelay.getConnectedPeers().length;
    const outgoing = Array.from(this.connections.values()).filter(c => c.authenticated).length;
    
    return {
      incoming,
      outgoing,
      discovered: this.discovery.getPeers().length,
      total: incoming + outgoing
    };
  }
}

module.exports = { P2PClient };
