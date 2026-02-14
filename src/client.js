/**
 * Open-Tap Client
 * WebSocket connection handler
 */

const WebSocket = require('ws');
const { getIdentity } = require('./identity');

class OpenTapClient {
  constructor(relayUrl) {
    this.relayUrl = relayUrl;
    this.clientId = getIdentity();
    this.ws = null;
    this.connected = false;
    this.messageHandlers = [];
    this.readyHandlers = [];
    this.errorHandlers = [];
  }

  /**
   * Connect to relay server
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.relayUrl);

        this.ws.on('open', () => {
          this.connected = true;
          this.readyHandlers.forEach(fn => fn());
        });

        this.ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            this.messageHandlers.forEach(fn => fn(msg));
          } catch (err) {
            // Ignore invalid messages
          }
        });

        this.ws.on('close', () => {
          this.connected = false;
        });

        this.ws.on('error', (err) => {
          this.errorHandlers.forEach(fn => fn(err));
          reject(err);
        });

        // Wait for welcome message to confirm connection
        const checkWelcome = (msg) => {
          if (msg.type === 'welcome') {
            this.clientId = msg.clientId || this.clientId;
            this.messageHandlers = this.messageHandlers.filter(f => f !== checkWelcome);
            resolve(msg);
          }
        };
        this.onMessage(checkWelcome);

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Send message to target client
   */
  send(target, payload) {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to relay');
    }

    const message = {
      target: target,
      payload: payload,
      timestamp: new Date().toISOString()
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Broadcast to all clients
   */
  broadcast(payload) {
    this.send('broadcast', payload);
  }

  /**
   * Disconnect from relay
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  /**
   * Register message handler
   */
  onMessage(handler) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Register ready handler
   */
  onReady(handler) {
    this.readyHandlers.push(handler);
    return () => {
      this.readyHandlers = this.readyHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Register error handler
   */
  onError(handler) {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
    };
  }
}

module.exports = { OpenTapClient };
