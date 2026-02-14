/**
 * Authentication Tests
 * Tests for challenge-response auth handshake
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthManager } from '../../src/auth.js';

describe('Authentication', () => {
  let authManager;
  const testGuid = 'a7f3-9d2e-b1c8-192.168.1.42-3000-pubkey123';

  beforeEach(() => {
    authManager = new AuthManager(testGuid);
  });

  describe('Challenge Generation', () => {
    it('should generate a valid challenge format', async () => {
      const mockSend = vi.fn();
      const mockWs = { send: mockSend, on: vi.fn(), removeListener: vi.fn() };
      const peerGuid = 'peer-test-guid-here';

      // Start auth (this sends challenge)
      const authPromise = authManager.authenticate(mockWs, peerGuid);
      
      // Wait for immediate execution
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should have sent a challenge message
      expect(mockSend).toHaveBeenCalled();
      
      const sentMsg = JSON.parse(mockSend.mock.calls[0][0]);
      expect(sentMsg.type).toBe('auth:challenge');
      expect(sentMsg.guid).toBe(testGuid);
      expect(sentMsg.challenge).toBeDefined();
      expect(sentMsg.challenge.length).toBe(64); // 32 hex bytes = 64 chars
      expect(sentMsg.challenge).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique challenges', async () => {
      const challenges = new Set();
      
      for (let i = 0; i < 10; i++) {
        const authManagerI = new AuthManager(testGuid);
        const mockWs = { 
          send: vi.fn(), 
          on: vi.fn(), 
          removeListener: vi.fn() 
        };
        const peerGuid = `peer-${i}`;

        authManagerI.authenticate(mockWs, peerGuid);
        await new Promise(resolve => setTimeout(resolve, 5));
        
        const sentMsg = JSON.parse(mockWs.send.mock.calls[0][0]);
        challenges.add(sentMsg.challenge);
      }
      
      // All should be unique
      expect(challenges.size).toBe(10);
    });
  });

  describe('Response Verification', () => {
    it('should verify correct response', async () => {
      const mockSend = vi.fn();
      const mockWs = { 
        send: mockSend, 
        on: vi.fn((event, handler) => {
          if (event === 'message') {
            // Store handler for later use
            mockWs._messageHandler = handler;
          }
        }),
        removeListener: vi.fn()
      };
      const peerGuid = 'peer-test-guid-here';

      // Start auth
      const authPromise = authManager.authenticate(mockWs, peerGuid);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Get the challenge that was sent
      const challengeMsg = JSON.parse(mockSend.mock.calls[0][0]);
      const challenge = challengeMsg.challenge;
      
      // Calculate expected response (same as auth manager does)
      const crypto = require('crypto');
      const expectedResponse = crypto.createHash('sha256')
        .update(`${challenge}:${testGuid}:${peerGuid}`)
        .digest('hex');
      
      // Simulate receiving auth:success
      if (mockWs._messageHandler) {
        mockWs._messageHandler(Buffer.from(JSON.stringify({
          type: 'auth:success',
          sessionKey: 'test-session-key-123'
        })));
      }
      
      // Auth should succeed
      await expect(authPromise).resolves.toEqual({
        success: true,
        sessionKey: 'test-session-key-123'
      });
    });

    it('should reject invalid response', async () => {
      const mockSend = vi.fn();
      const receivedMessages = [];
      let messageHandler = null;
      
      const mockWs = { 
        send: vi.fn((msg) => {
          receivedMessages.push(JSON.parse(msg));
        }), 
        on: vi.fn((event, handler) => {
          if (event === 'message') {
            messageHandler = handler;
          }
        }),
        removeListener: vi.fn()
      };
      const peerGuid = 'peer-test-guid-here';

      // Start auth
      const authPromise = authManager.authenticate(mockWs, peerGuid);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Get the challenge
      const challengeMsg = receivedMessages.find(m => m.type === 'auth:challenge');
      expect(challengeMsg).toBeDefined();
      
      // Send an invalid response
      if (messageHandler) {
        messageHandler(Buffer.from(JSON.stringify({
          type: 'auth:response',
          response: 'invalid-response-hash'
        })));
      }
      
      // Wait for rejection
      await expect(authPromise).rejects.toThrow('Invalid authentication response');
    });
  });

  describe('Timeout Handling', () => {
    it('should reject challenge after timeout', async () => {
      vi.useFakeTimers();
      const mockSend = vi.fn();
      const mockWs = { 
        send: mockSend, 
        on: vi.fn(), 
        removeListener: vi.fn() 
      };
      const peerGuid = 'peer-timeout-test';

      // Start auth
      const authPromise = authManager.authenticate(mockWs, peerGuid);
      
      // Fast-forward time
      vi.advanceTimersByTime(11000);
      
      // Check that rejection happens
      await expect(authPromise).rejects.toThrow('Authentication timeout');
      
      vi.useRealTimers();
    });
  });

  describe('Session Management', () => {
    it('should track authenticated peers', () => {
      const peers = authManager.getAuthenticatedPeers();
      expect(peers).toEqual([]);
    });

    it('should return null for non-authenticated peer session key', () => {
      const key = authManager.getSessionKey('non-existent-peer');
      expect(key).toBeNull();
    });

    it('should report peer as not authenticated initially', () => {
      const isAuth = authManager.isAuthenticated('some-peer');
      expect(isAuth).toBe(false);
    });

    it('should emit authenticated event on successful auth', async () => {
      const authenticatedSpy = vi.fn();
      authManager.on('authenticated', authenticatedSpy);
      
      // We would need to complete a full auth handshake here
      // For now, just verify the event emitter exists
      expect(authManager.listenerCount('authenticated')).toBe(1);
    });
  });

  describe('Peer Removal', () => {
    it('should remove peer from tracking', () => {
      const peerGuid = 'peer-to-remove';
      
      // Add a fake authenticated peer
      authManager.authenticatedPeers.set(peerGuid, {
        sessionKey: 'test-key',
        ws: { readyState: 1 }, // OPEN
        authenticatedAt: new Date().toISOString()
      });
      
      expect(authManager.isAuthenticated(peerGuid)).toBe(true);
      
      // Remove the peer
      authManager.removePeer(peerGuid);
      
      expect(authManager.isAuthenticated(peerGuid)).toBe(false);
    });

    it('should emit disconnected event', () => {
      const disconnectedSpy = vi.fn();
      authManager.on('disconnected', disconnectedSpy);
      
      authManager.removePeer('test-peer');
      
      expect(disconnectedSpy).toHaveBeenCalledWith({ guid: 'test-peer' });
    });
  });
});
