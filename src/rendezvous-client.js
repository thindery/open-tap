#!/usr/bin/env node
/**
 * Open-Tap Rendezvous Client
 * Connects to a rendezvous server for cross-network P2P discovery
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class RendezvousClient extends EventEmitter {
  constructor(rendezvousUrl, myGuid, myEndpoint) {
    super();
    this.url = rendezvousUrl;
    this.guid = myGuid;
    this.endpoint = myEndpoint;
    this.ws = null;
    this.connected = false;
    this.reconnectInterval = 5000;
    this.reconnectTimer = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          this.connected = true;
          console.log(`[🌍] Connected to rendezvous: ${this.url}`);
          
          // Announce ourselves
          this.announce();
          
          // Query for peers
          this.queryPeers();
          
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data);
            this.handleMessage(msg);
          } catch (err) {
            // Ignore invalid messages
          }
        });

        this.ws.on('close', () => {
          this.connected = false;
          this.emit('disconnected');
          this.scheduleReconnect();
        });

        this.ws.on('error', (err) => {
          reject(err);
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  announce() {
    if (!this.connected) return;
    
    this.ws.send(JSON.stringify({
      type: 'announce',
      guid: this.guid,
      endpoint: this.endpoint
    }));
  }

  queryPeers() {
    if (!this.connected) return;
    
    this.ws.send(JSON.stringify({
      type: 'query'
    }));
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'peers':
        // Got list of peers from rendezvous
        this.emit('peers', msg.peers);
        break;
      case 'announced':
        console.log(`[📢] Rendezvous: ${msg.message}`);
        break;
      case 'error':
        console.error(`[❌] Rendezvous error: ${msg.message}`);
        break;
      case 'welcome':
        // Initial welcome, ignore
        break;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log(`[🔄] Reconnecting to rendezvous...`);
      this.connect().catch(() => {
        // Reconnect failed, will retry
      });
    }, this.reconnectInterval);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

module.exports = { RendezvousClient };
