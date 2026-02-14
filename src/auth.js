/**
 * Open-Tap P2P Authentication
 * Mutual auth handshake for peer verification
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class AuthManager extends EventEmitter {
  constructor(guid) {
    super();
    this.guid = guid;
    this.pendingChallenges = new Map(); // guid -> { challenge, response, timeout }
    this.authenticatedPeers = new Map(); // guid -> { sessionKey, ws }
  }

  /**
   * Start authentication with a peer
   */
  async authenticate(ws, peerGuid) {
    return new Promise((resolve, reject) => {
      const challenge = crypto.randomBytes(32).toString('hex');
      const timeout = setTimeout(() => {
        this.pendingChallenges.delete(peerGuid);
        reject(new Error('Authentication timeout'));
      }, 10000); // 10 second timeout

      this.pendingChallenges.set(peerGuid, {
        challenge,
        timeout,
        resolve,
        reject
      });

      // Send challenge
      ws.send(JSON.stringify({
        type: 'auth:challenge',
        guid: this.guid,
        challenge: challenge
      }));

      // Setup one-time handler for response
      const handler = (data) => {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'auth:challenge' && msg.guid === peerGuid) {
            // They sent us a challenge too - respond
            const response = this._generateResponse(msg.challenge, peerGuid);
            ws.send(JSON.stringify({
              type: 'auth:response',
              response: response
            }));
            // Store their challenge for when they respond
            const pending = this.pendingChallenges.get(peerGuid);
            if (pending) {
              pending.theirChallenge = msg.challenge;
              pending.theirResponse = msg.response;
            }
          }
          else if (msg.type === 'auth:response') {
            this._verifyResponse(ws, peerGuid, msg.response, handler);
          }
          else if (msg.type === 'auth:success') {
            // Auth successful!
            ws.removeListener('message', handler);
            this.authenticatedPeers.set(peerGuid, {
              sessionKey: msg.sessionKey,
              ws,
              authenticatedAt: new Date().toISOString()
            });
            this.emit('authenticated', { guid: peerGuid });
            resolve({ success: true, sessionKey: msg.sessionKey });
          }
          else if (msg.type === 'auth:failed') {
            ws.removeListener('message', handler);
            clearTimeout(timeout);
            this.pendingChallenges.delete(peerGuid);
            reject(new Error(msg.message || 'Authentication failed'));
          }
        } catch (err) {
          // Ignore parse errors
        }
      };

      ws.on('message', handler);
    });
  }

  /**
   * Verify peer's response
   */
  _verifyResponse(ws, peerGuid, response, handler) {
    const pending = this.pendingChallenges.get(peerGuid);
    if (!pending) return;

    clearTimeout(pending.timeout);

    // Verify response
    const expected = this._generateResponse(pending.challenge, peerGuid);
    
    if (response !== expected) {
      ws.removeListener('message', handler);
      this.pendingChallenges.delete(peerGuid);
      pending.reject(new Error('Invalid authentication response'));
      return;
    }

    // Send our response to their challenge if we haven't already
    if (pending.theirChallenge && pending.theirResponse) {
      const ourResponse = this._generateResponse(pending.theirChallenge, peerGuid);
      ws.send(JSON.stringify({
        type: 'auth:response',
        response: ourResponse
      }));

      // Verification of their preemptive response
      const expectedTheirResponse = this._generateResponse(pending.challenge, peerGuid);
      if (pending.theirResponse !== expectedTheirResponse) {
        ws.removeListener('message', handler);
        this.pendingChallenges.delete(peerGuid);
        pending.reject(new Error('Invalid preemptive response'));
        return;
      }
    }

    // Send success
    const sessionKey = crypto.randomBytes(32).toString('hex');
    ws.send(JSON.stringify({
      type: 'auth:success',
      sessionKey: sessionKey
    }));

    ws.removeListener('message', handler);
    this.pendingChallenges.delete(peerGuid);
    
    this.authenticatedPeers.set(peerGuid, {
      sessionKey,
      ws,
      authenticatedAt: new Date().toISOString()
    });

    this.emit('authenticated', { guid: peerGuid });
    pending.resolve({ success: true, sessionKey });
  }

  /**
   * Generate authentication response
   */
  _generateResponse(challenge, peerGuid) {
    const data = `${challenge}:${this.guid}:${peerGuid}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Check if peer is authenticated
   */
  isAuthenticated(peerGuid) {
    const peer = this.authenticatedPeers.get(peerGuid);
    if (!peer) return false;
    const ws = peer.ws;
    if (!ws) return false;
    return ws.readyState === require('ws').OPEN;
  }

  /**
   * Get session key for peer
   */
  getSessionKey(peerGuid) {
    const peer = this.authenticatedPeers.get(peerGuid);
    return peer ? peer.sessionKey : null;
  }

  /**
   * Remove peer from authenticated list
   */
  removePeer(peerGuid) {
    this.authenticatedPeers.delete(peerGuid);
    this.pendingChallenges.delete(peerGuid);
    this.emit('disconnected', { guid: peerGuid });
  }

  /**
   * Get all authenticated peers
   */
  getAuthenticatedPeers() {
    const list = [];
    for (const [guid, peer] of this.authenticatedPeers) {
      list.push({
        guid,
        authenticatedAt: peer.authenticatedAt
      });
    }
    return list;
  }
}

module.exports = { AuthManager };
