/**
 * Open-Tap Cryptography Module
 * Provides NaCl/libsodium box encryption for P2P communication
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Try to import tweetnacl
try {
  const nacl = require('tweetnacl');
} catch (err) {
  // Will be handled at runtime
}

const KEYS_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.aitap', 'keys');
const PUBLIC_KEY_FILE = path.join(KEYS_DIR, 'public.key');
const SECRET_KEY_FILE = path.join(KEYS_DIR, 'secret.key');

/**
 * Check if tweetnacl is available
 */
function hasCrypto() {
  try {
    return !!require('tweetnacl');
  } catch {
    return false;
  }
}

/**
 * Ensure keys directory exists with proper permissions
 */
function ensureKeysDir() {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load or generate X25519 keypair
 * Returns { publicKey: Uint8Array, secretKey: Uint8Array }
 */
function loadOrGenerateKeypair() {
  const nacl = require('tweetnacl');
  ensureKeysDir();

  // Try to load existing keys
  if (fs.existsSync(PUBLIC_KEY_FILE) && fs.existsSync(SECRET_KEY_FILE)) {
    try {
      const publicKey = new Uint8Array(fs.readFileSync(PUBLIC_KEY_FILE));
      const secretKey = new Uint8Array(fs.readFileSync(SECRET_KEY_FILE));
      
      if (publicKey.length === 32 && secretKey.length === 32) {
        return { publicKey, secretKey };
      }
    } catch (err) {
      // Fall through to generate new keys
    }
  }

  // Generate new keypair
  const keypair = nacl.box.keyPair();
  
  // Save keys with restricted permissions
  fs.writeFileSync(PUBLIC_KEY_FILE, Buffer.from(keypair.publicKey), { mode: 0o600 });
  fs.writeFileSync(SECRET_KEY_FILE, Buffer.from(keypair.secretKey), { mode: 0o600 });

  return keypair;
}

/**
 * Get public key for sharing with peers
 * Returns base64 encoded public key
 */
function getPublicKey() {
  const kp = loadOrGenerateKeypair();
  return Buffer.from(kp.publicKey).toString('base64');
}

/**
 * Precompute shared secret using ECDH
 * peerPublicKey: base64 encoded peer's public key
 * Returns: Uint8Array(32) shared secret for box encryption
 */
function computeSharedSecret(peerPublicKey) {
  const nacl = require('tweetnacl');
  const kp = loadOrGenerateKeypair();
  const peerPub = new Uint8Array(Buffer.from(peerPublicKey, 'base64'));
  
  if (peerPub.length !== 32) {
    throw new Error('Invalid public key length');
  }

  // Compute shared secret using scalar multiplication
  return nacl.box.before(peerPub, kp.secretKey);
}

/**
 * Encrypt message using box encryption
 * sharedSecret: precomputed shared secret
 * message: string or Buffer to encrypt
 * Returns: { ciphertext: base64, nonce: base64 }
 */
function encryptMessage(sharedSecret, message) {
  const nacl = require('tweetnacl');
  const msg = Buffer.from(message, 'utf8');
  const nonce = nacl.randomBytes(24);
  
  const ciphertext = nacl.box.after(msg, nonce, sharedSecret);
  
  return {
    ciphertext: Buffer.from(ciphertext).toString('base64'),
    nonce: Buffer.from(nonce).toString('base64')
  };
}

/**
 * Decrypt message using box encryption
 * sharedSecret: precomputed shared secret
 * encrypted: { ciphertext: base64, nonce: base64 }
 * Returns: decrypted string or null if failed
 */
function decryptMessage(sharedSecret, encrypted) {
  const nacl = require('tweetnacl');
  
  const ciphertext = new Uint8Array(Buffer.from(encrypted.ciphertext, 'base64'));
  const nonce = new Uint8Array(Buffer.from(encrypted.nonce, 'base64'));
  
  if (nonce.length !== 24) {
    throw new Error('Invalid nonce length');
  }

  const decrypted = nacl.box.open.after(ciphertext, nonce, sharedSecret);
  
  if (!decrypted) {
    return null; // Decryption failed
  }
  
  return Buffer.from(decrypted).toString('utf8');
}

/**
 * Generate secure nonce for auth challenges
 */
function generateSecureNonce() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate timestamp for replay protection
 */
function getTimestamp() {
  return Date.now();
}

/**
 * Hash challenge with timestamp, nonce, and shared secret
 * For replay-protected auth
 */
function hashChallengeResponse(challenge, timestamp, nonce, sharedSecret, guid, peerGuid) {
  const data = `${challenge}:${timestamp}:${nonce}:${sharedSecret || ''}:${guid}:${peerGuid}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
  hasCrypto,
  loadOrGenerateKeypair,
  getPublicKey,
  computeSharedSecret,
  encryptMessage,
  decryptMessage,
  generateSecureNonce,
  getTimestamp,
  hashChallengeResponse,
  KEYS_DIR,
  PUBLIC_KEY_FILE,
  SECRET_KEY_FILE
};
