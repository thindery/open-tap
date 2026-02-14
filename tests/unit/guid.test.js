/**
 * GUID / Badge Tests
 * Tests for badge creation, parsing, and validation
 */

import { describe, it, expect } from 'vitest';
import { 
  createGUID, 
  parseGUID, 
  getWebSocketURL,
  generateShortUUID 
} from '../../src/guid.js';

describe('GUID / Badge', () => {
  describe('createGUID', () => {
    it('should generate a valid GUID format', () => {
      const guid = createGUID(3000, '192.168.1.100');
      
      // Should have 6 parts: uuid (3) + ip (1-4 depending on dots) + port + pubkey
      const parts = guid.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(6);
      
      // Should contain port number
      expect(guid).toContain('3000');
      
      // Should contain IP
      expect(guid).toContain('192.168.1.100');
    });

    it('should generate unique GUIDs', () => {
      const guid1 = createGUID(3000, '192.168.1.100');
      const guid2 = createGUID(3000, '192.168.1.100');
      
      expect(guid1).not.toBe(guid2);
    });

    it('should use provided IP when specified', () => {
      const guid = createGUID(5000, '10.0.0.50');
      expect(guid).toContain('10.0.0.50');
    });
  });

  describe('parseGUID', () => {
    it('should extract UUID, IP, port, and pubkey from valid GUID', () => {
      // Create a GUID with known values
      const testGuid = 'a7f3-9d2e-b1c8-192.168.1.42-3000-abcdef1234567890';
      const parsed = parseGUID(testGuid);
      
      expect(parsed.valid).toBe(true);
      expect(parsed.uuid).toBe('a7f3-9d2e-b1c8');
      expect(parsed.ip).toBe('192.168.1.42');
      expect(parsed.port).toBe(3000);
      expect(parsed.pubkey).toBe('abcdef1234567890');
      expect(parsed.endpoint).toBe('192.168.1.42:3000');
    });

    it('should reject GUID with too few parts', () => {
      const invalid = parseGUID('too-short');
      
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toBe('Invalid GUID format');
    });

    it('should reject GUID with invalid IP format', () => {
      const invalid = parseGUID('uuid-part-192-168-1-abc-3000-pubkey');
      
      expect(invalid.valid).toBe(false);
    });

    it('should reject GUID with invalid port', () => {
      const invalid = parseGUID('uuid-part-here-192.168.1.1-notaport-pubkey');
      
      expect(invalid.valid).toBe(false);
    });

    it('should reject port out of valid range', () => {
      // Port too high
      const tooHigh = parseGUID('uuid-part-here-192.168.1.1-999999-pubkey');
      expect(tooHigh.valid).toBe(false);
      
      // Port zero (though parsing may handle it)
      const zeroPort = parseGUID('uuid-part-here-192.168.1.1-0-pubkey');
      // This will be parsed but marked invalid due to port check
      expect(zeroPort.valid).toBe(false);
    });
  });

  describe('getWebSocketURL', () => {
    it('should generate WebSocket URL from valid GUID', () => {
      const guid = 'a7f3-9d2e-b1c8-192.168.1.42-3000-abcdef1234567890';
      const url = getWebSocketURL(guid);
      
      expect(url).toBe('ws://192.168.1.42:3000');
    });

    it('should return null for invalid GUID', () => {
      const url = getWebSocketURL('invalid');
      
      expect(url).toBeNull();
    });
  });

  describe('generateShortUUID', () => {
    it('should generate a valid short UUID format', () => {
      const uuid = generateShortUUID();
      const parts = uuid.split('-');
      
      // Should have 3 parts
      expect(parts.length).toBe(3);
      
      // Each part should be non-empty
      parts.forEach(part => {
        expect(part.length).toBeGreaterThan(0);
      });
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateShortUUID();
      const uuid2 = generateShortUUID();
      
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('round-trip', () => {
    it('should preserve data through create and parse', () => {
      const originalPort = 8080;
      const originalIP = '192.168.1.100';
      
      const guid = createGUID(originalPort, originalIP);
      const parsed = parseGUID(guid);
      
      expect(parsed.valid).toBe(true);
      expect(parsed.ip).toBe(originalIP);
      expect(parsed.port).toBe(originalPort);
      expect(parsed.uuid).toBeDefined();
      expect(parsed.pubkey).toBeDefined();
    });
  });
});
