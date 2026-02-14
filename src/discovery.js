/**
 * Open-Tap P2P Discovery Service
 * mDNS-based peer discovery for LAN
 */

const EventEmitter = require('events');
const { getPrimaryIP } = require('./guid');

// Try to load multicast-dns (optional dependency)
let mdns = null;
try {
  mdns = require('multicast-dns');
} catch {
  // mDNS not available, will use fallback
}

const SERVICE_TYPE = '_opentap._tcp.local';
const DISCOVERY_INTERVAL = 5000; // Query every 5s

class DiscoveryService extends EventEmitter {
  constructor(guid, port) {
    super();
    this.guid = guid;
    this.port = port;
    this.ip = getPrimaryIP();
    this.mdns = null;
    this.running = false;
    this.discoveredPeers = new Map(); // guid -> { ip, port, pubkey, lastSeen }
    this.queryInterval = null;
    this.broadcastInterval = null;
  }

  /**
   * Start discovery service
   */
  async start() {
    if (this.running) return;
    
    if (!mdns) {
      this.emit('warning', 'multicast-dns not installed. Run: npm install multicast-dns');
      this.emit('warning', 'Falling back to manual peer discovery only');
      return false;
    }

    try {
      this.mdns = mdns();
      this.running = true;

      // Listen for mDNS queries and responses
      this.mdns.on('query', (query) => {
        // Respond to queries for our service
        for (const q of query.questions) {
          if (q.name === SERVICE_TYPE || q.name.includes('_opentap')) {
            this._broadcastPresence();
          }
        }
      });

      this.mdns.on('response', (response) => {
        this._handleResponse(response);
      });

      // Broadcast our presence periodically
      this._broadcastPresence();
      this.broadcastInterval = setInterval(() => {
        this._broadcastPresence();
      }, 10000); // Announce every 10s

      // Query for peers periodically
      this._queryPeers();
      this.queryInterval = setInterval(() => {
        this._queryPeers();
      }, DISCOVERY_INTERVAL);

      this.emit('started', { guid: this.guid, endpoint: `${this.ip}:${this.port}` });
      return true;

    } catch (err) {
      this.emit('error', `Failed to start discovery: ${err.message}`);
      return false;
    }
  }

  /**
   * Stop discovery service
   */
  stop() {
    if (!this.running) return;
    
    this.running = false;
    
    if (this.queryInterval) {
      clearInterval(this.queryInterval);
      this.queryInterval = null;
    }
    
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    
    if (this.mdns) {
      this.mdns.destroy();
      this.mdns = null;
    }
    
    this.emit('stopped');
  }

  /**
   * Broadcast our presence via mDNS
   */
  _broadcastPresence() {
    if (!this.mdns || !this.running) return;

    const hostname = `opentap-${this.guid.slice(0, 8)}.local`;
    
    this.mdns.respond({
      answers: [
        {
          name: SERVICE_TYPE,
          type: 'PTR',
          class: 'IN',
          ttl: 300,
          data: hostname
        },
        {
          name: hostname,
          type: 'SRV',
          class: 'IN',
          ttl: 300,
          data: {
            port: this.port,
            weight: 0,
            priority: 10,
            target: hostname
          }
        },
        {
          name: hostname,
          type: 'TXT',
          class: 'IN',
          ttl: 300,
          data: [
            `guid=${this.guid}`,
            `ip=${this.ip}`,
            `port=${this.port}`,
            `v=1`
          ]
        },
        {
          name: hostname,
          type: 'A',
          class: 'IN',
          ttl: 300,
          data: this.ip
        }
      ]
    });
  }

  /**
   * Query for peers
   */
  _queryPeers() {
    if (!this.mdns || !this.running) return;
    
    this.mdns.query({
      questions: [
        {
          name: SERVICE_TYPE,
          type: 'PTR'
        }
      ]
    });
  }

  /**
   * Handle mDNS response
   */
  _handleResponse(response) {
    const answers = response.answers || [];
    const ptr = answers.find(a => a.type === 'PTR' && a.name === SERVICE_TYPE);
    
    if (!ptr) return;

    const hostname = ptr.data;
    const txt = answers.find(a => a.type === 'TXT' && a.name === hostname);
    const a = answers.find(a => a.type === 'A' && a.name === hostname);
    const srv = answers.find(a => a.type === 'SRV' && a.name === hostname);

    if (txt && a) {
      // Parse TXT record
      const data = {};
      for (const entry of txt.data) {
        const str = entry.toString();
        const eq = str.indexOf('=');
        if (eq > 0) {
          data[str.slice(0, eq)] = str.slice(eq + 1);
        }
      }

      if (data.guid && data.guid !== this.guid) {
        const peerInfo = {
          guid: data.guid,
          ip: a.data,
          port: parseInt(data.port, 10) || (srv ? srv.data.port : 3000),
          lastSeen: Date.now(),
          endpoint: `${a.data}:${data.port || (srv ? srv.data.port : 3000)}`
        };

        const isNew = !this.discoveredPeers.has(data.guid);
        this.discoveredPeers.set(data.guid, peerInfo);

        if (isNew) {
          this.emit('peer:discovered', peerInfo);
        } else {
          this.emit('peer:updated', peerInfo);
        }
      }
    }
  }

  /**
   * Get all discovered peers
   */
  getPeers() {
    return Array.from(this.discoveredPeers.values());
  }

  /**
   * Get peer by GUID
   */
  getPeer(guid) {
    return this.discoveredPeers.get(guid);
  }

  /**
   * Manually add a peer (for WAN or manual entry)
   */
  addPeer(guid, endpoint) {
    // Parse endpoint (ip:port)
    const [ip, portStr] = endpoint.split(':');
    const port = parseInt(portStr, 10) || 3000;
    
    const peerInfo = {
      guid,
      ip,
      port,
      lastSeen: Date.now(),
      endpoint: `${ip}:${port}`,
      manual: true
    };
    
    this.discoveredPeers.set(guid, peerInfo);
    this.emit('peer:added', peerInfo);
    return peerInfo;
  }

  /**
   * Remove a peer
   */
  removePeer(guid) {
    const had = this.discoveredPeers.has(guid);
    this.discoveredPeers.delete(guid);
    if (had) {
      this.emit('peer:removed', { guid });
    }
    return had;
  }

  /**
   * Clean up stale peers (not seen in 5 minutes)
   */
  cleanupStalePeers(maxAgeMs = 300000) {
    const now = Date.now();
    for (const [guid, peer] of this.discoveredPeers) {
      if (now - peer.lastSeen > maxAgeMs) {
        this.discoveredPeers.delete(guid);
        this.emit('peer:stale', { guid });
      }
    }
  }
}

module.exports = { DiscoveryService, SERVICE_TYPE };
