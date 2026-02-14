/**
 * Open-Tap P2P Client
 * Manages peer connections, authentication, and messaging with reliability features
 * v0.0.3 - Reliable Delivery
 */

const WebSocket = require('ws');
const { AuthManager } = require('./auth');
const { DiscoveryService } = require('./discovery');
const { MiniRelay } = require('./minirelay');
const { createGUID, parseGUID, getWebSocketURL, getPrimaryIP } = require('./guid');
const EventEmitter = require('events');
const crypto = require('crypto');

// Reliability constants
const ACK_TIMEOUT_MS = 5000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s
const DEDUP_WINDOW_SIZE = 100;

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
    
    // Reliability: Message tracking for ACKs and retries
    this.pendingMessages = new Map(); // msgId -> { peerGuid, payload, attempts, timeout }
    this.messageStats = new Map(); // msgId -> { sent: Date, acked: Date|null, failed: boolean }
    
    // Reliability: Deduplication - track last 100 received message IDs
    this.receivedMessageIds = new Set();
    this.receivedMessageQueue = []; // FIFO queue for eviction
    
    // Reliability: Offline message queue per peer
    this.offlineQueue = new Map(); // peerGuid -> [message objects]
    
    this._setupHandlers();
  }

  /**
   * Setup event handlers
   */
  _setupHandlers() {
    // MiniRelay events
    this.miniRelay.on('peer:authenticated', ({ guid, ip }) => {
      this.emit('peer:connected', { guid, ip, incoming: true });
      // Process offline queue for this peer
      this._processOfflineQueue(guid);
    });
    
    this.miniRelay.on('peer:disconnected', ({ guid }) => {
      this.connections.delete(guid);
      this.emit('peer:disconnected', { guid });
    });
    
    this.miniRelay.on('message', (msg) => {
      this._handleIncomingMessage(msg);
    });

    // Discovery events
    this.discovery.on('peer:discovered', (peer) => {
      this.emit('discovered', peer);
    });
  }

  /**
   * Generate unique message ID
   */
  _generateMessageId() {
    return `${this.guid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Handle incoming message with deduplication
   */
  _handleIncomingMessage(msg) {
    const { from, payload, timestamp, messageId } = msg;
    
    // Reliability: Deduplication check
    const msgId = messageId || `${from}-${payload}-${timestamp}`;
    if (this.receivedMessageIds.has(msgId)) {
      // Still send ACK for duplicates (in case original ACK was lost)
      this._sendAck(from, msgId);
      return; // Drop duplicate
    }
    
    // Add to dedup window
    this.receivedMessageIds.add(msgId);
    this.receivedMessageQueue.push(msgId);
    
    // Evict old entries if window exceeded
    while (this.receivedMessageQueue.length > DEDUP_WINDOW_SIZE) {
      const oldId = this.receivedMessageQueue.shift();
      this.receivedMessageIds.delete(oldId);
    }
    
    // Update last peer
    this.lastPeer = from;
    
    // Send ACK back
    this._sendAck(from, msgId);
    
    // Emit message event
    this.emit('message', {
      from,
      payload,
      timestamp: timestamp || new Date().toISOString(),
      messageId: msgId
    });
  }

  /**
   * Send ACK back to sender
   */
  _sendAck(peerGuid, originalMessageId) {
    const conn = this.connections.get(peerGuid);
    if (conn && conn.authenticated && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify({
        type: 'ack',
        messageId: originalMessageId,
        timestamp: new Date().toISOString()
      }));
    }
    // Also try minirelay for incoming connections
    const peer = this.miniRelay.peers.get(peerGuid);
    if (peer && peer.authenticated && peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(JSON.stringify({
        type: 'ack',
        messageId: originalMessageId,
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * Process offline message queue for a peer when they connect
   */
  _processOfflineQueue(peerGuid) {
    const queue = this.offlineQueue.get(peerGuid);
    if (!queue || queue.length === 0) return;
    
    this.emit('queue:processing', { peerGuid, count: queue.length });
    
    const messagesToSend = [...queue];
    this.offlineQueue.set(peerGuid, []); // Clear queue
    
    for (const msg of messagesToSend) {
      this._sendWithTracking(peerGuid, msg.payload, msg.messageId, false);
    }
  }

  /**
   * Send message with tracking and retry logic
   */
  _sendWithTracking(peerGuid, payload, messageId, isRetry = false) {
    const msgId = messageId || this._generateMessageId();
    
    // Check if we're already tracking this message
    if (this.pendingMessages.has(msgId)) {
      const pending = this.pendingMessages.get(msgId);
      if (pending.attempts >= MAX_RETRY_ATTEMPTS) {
        this._markFailed(msgId, peerGuid, payload);
        return { success: false, status: 'failed', messageId: msgId };
      }
    }
    
    // Send the message
    const result = this._doSend(peerGuid, payload, msgId);
    
    if (!result.success) {
      // Peer not connected - queue it
      if (result.error === 'Peer not connected') {
        this._queueOffline(peerGuid, payload, msgId);
        return { success: true, status: 'queued', messageId: msgId };
      }
      return { success: false, status: 'error', error: result.error, messageId: msgId };
    }
    
    // Set up ACK timeout and retry
    this._setupAckTimeout(msgId, peerGuid, payload);
    
    return { success: true, status: 'pending', messageId: msgId };
  }

  /**
   * Actually send the message over the wire
   */
  _doSend(peerGuid, payload, messageId) {
    const msg = {
      type: 'message',
      payload,
      messageId,
      timestamp: new Date().toISOString()
    };
    
    // Try outgoing connection first
    const conn = this.connections.get(peerGuid);
    if (conn && conn.authenticated && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(msg));
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
   * Set up ACK timeout and retry logic
   */
  _setupAckTimeout(messageId, peerGuid, payload) {
    const existing = this.pendingMessages.get(messageId);
    const attempts = existing ? existing.attempts + 1 : 1;
    
    // Clear any existing timeout
    if (existing && existing.timeout) {
      clearTimeout(existing.timeout);
    }
    
    // Store pending message info
    this.pendingMessages.set(messageId, {
      peerGuid,
      payload,
      attempts,
      sentAt: Date.now()
    });
    
    // Set up timeout
    const timeout = setTimeout(() => {
      this._handleAckTimeout(messageId, peerGuid, payload);
    }, ACK_TIMEOUT_MS);
    
    this.pendingMessages.get(messageId).timeout = timeout;
  }

  /**
   * Handle ACK timeout - retry or fail
   */
  _handleAckTimeout(messageId, peerGuid, payload) {
    const pending = this.pendingMessages.get(messageId);
    if (!pending) return; // Already acked or cleaned up
    
    if (pending.attempts < MAX_RETRY_ATTEMPTS) {
      // Retry with exponential backoff
      const backoff = RETRY_BACKOFF_MS[pending.attempts - 1] || 4000;
      
      this.emit('message:retry', { 
        messageId, 
        peerGuid, 
        attempt: pending.attempts + 1,
        maxAttempts: MAX_RETRY_ATTEMPTS 
      });
      
      setTimeout(() => {
        this._sendWithTracking(peerGuid, payload, messageId, true);
      }, backoff);
    } else {
      // Max retries reached - mark as failed
      this._markFailed(messageId, peerGuid, payload);
    }
  }

  /**
   * Mark message as failed after max retries
   */
  _markFailed(messageId, peerGuid, payload) {
    this.pendingMessages.delete(messageId);
    this.messageStats.set(messageId, {
      sent: new Date(),
      acked: null,
      failed: true,
      peerGuid,
      payload
    });
    
    this.emit('message:failed', { messageId, peerGuid, payload });
  }

  /**
   * Handle received ACK
   */
  _handleAck(peerGuid, messageId) {
    const pending = this.pendingMessages.get(messageId);
    if (!pending) return; // Already processed or unknown
    
    // Clear timeout
    if (pending.timeout) {
      clearTimeout(pending.timeout);
    }
    
    // Update stats
    this.pendingMessages.delete(messageId);
    this.messageStats.set(messageId, {
      sent: new Date(pending.sentAt),
      acked: new Date(),
      failed: false,
      peerGuid,
      payload: pending.payload
    });
    
    this.emit('message:acked', { messageId, peerGuid });
  }

  /**
   * Queue message for offline peer
   */
  _queueOffline(peerGuid, payload, messageId) {
    if (!this.offlineQueue.has(peerGuid)) {
      this.offlineQueue.set(peerGuid, []);
    }
    
    this.offlineQueue.get(peerGuid).push({
      payload,
      messageId,
      queuedAt: new Date().toISOString()
    });
    
    this.emit('message:queued', { messageId, peerGuid, payload });
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
    
    // Clear all pending timeouts
    for (const [msgId, pending] of this.pendingMessages) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
    }
    this.pendingMessages.clear();
    
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

            // Process offline queue for this peer
            this._processOfflineQueue(peerGuid);

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
              this._handleIncomingMessage({
                from: peerGuid,
                payload: msg.payload,
                timestamp: msg.timestamp || new Date().toISOString(),
                messageId: msg.id || msg.messageId
              });
            } else if (msg.type === 'ack') {
              this._handleAck(peerGuid, msg.messageId);
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
   * Send message to peer (reliable delivery)
   */
  sendToPeer(peerGuid, payload) {
    return this._sendWithTracking(peerGuid, payload);
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
    
    // Calculate reliability stats
    let pendingCount = 0;
    let failedCount = 0;
    let queuedCount = 0;
    
    for (const [, pending] of this.pendingMessages) {
      pendingCount++;
    }
    
    for (const [, stats] of this.messageStats) {
      if (stats.failed) failedCount++;
    }
    
    for (const [, queue] of this.offlineQueue) {
      queuedCount += queue.length;
    }
    
    return {
      incoming,
      outgoing,
      discovered: this.discovery.getPeers().length,
      total: incoming + outgoing,
      reliability: {
        pending: pendingCount,
        failed: failedCount,
        queued: queuedCount,
        dedupWindow: this.receivedMessageIds.size
      }
    };
  }

  /**
   * Get message status
   */
  getMessageStatus(messageId) {
    if (this.pendingMessages.has(messageId)) {
      return { status: 'pending', attempts: this.pendingMessages.get(messageId).attempts };
    }
    if (this.messageStats.has(messageId)) {
      const stats = this.messageStats.get(messageId);
      return { 
        status: stats.failed ? 'failed' : 'acked',
        sent: stats.sent,
        acked: stats.acked,
        failed: stats.failed
      };
    }
    return { status: 'unknown' };
  }

  /**
   * Clear old message stats (optional cleanup)
   */
  clearMessageStats(olderThanMs = 3600000) { // Default: 1 hour
    const cutoff = Date.now() - olderThanMs;
    for (const [msgId, stats] of this.messageStats) {
      if (stats.sent && stats.sent.getTime() < cutoff) {
        this.messageStats.delete(msgId);
      }
    }
  }
}

module.exports = { P2PClient };
