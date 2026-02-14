/**
 * Open-Tap P2P GUID
 * Format: uuid-ip-port-pubkey
 * Example: a7f3-9d2e-b1c8-192.168.1.42-3000
 */

const crypto = require('crypto');
const os = require('os');

/**
 * Get local IP addresses
 */
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4
      if (iface.internal || iface.family !== 'IPv4') continue;
      ips.push(iface.address);
    }
  }
  
  return ips;
}

/**
 * Get primary local IP
 */
function getPrimaryIP() {
  const ips = getLocalIPs();
  // Prefer 192.168.x.x, then 10.x.x.x, then first available
  const priority = [
    ips.find(ip => ip.startsWith('192.168.')),
    ips.find(ip => ip.startsWith('10.')),
    ips.find(ip => ip.startsWith('172.')),
    ips[0]
  ].filter(Boolean);
  
  return priority[0] || '127.0.0.1';
}

/**
 * Generate a short UUID (first 4 segments of UUID)
 */
function generateShortUUID() {
  const uuid = crypto.randomUUID();
  return uuid.split('-').slice(0, 3).join('-');
}

/**
 * Generate a simple public key fingerprint (simulated for now)
 */
function generatePubKeyFingerprint() {
  return crypto.randomBytes(8).toString('hex').slice(0, 16);
}

/**
 * Create a GUID string
 * Format: uuid-ip-port-pubkey
 */
function createGUID(port, ip = null) {
  const uuid = generateShortUUID();
  const address = ip || getPrimaryIP();
  const pubkey = generatePubKeyFingerprint();
  
  return `${uuid}-${address}-${port}-${pubkey}`;
}

/**
 * Parse a GUID string
 * Returns: { uuid, ip, port, pubkey, valid }
 */
function parseGUID(guid) {
  const parts = guid.split('-');
  
  // Format: xxxx-xxxx-xxxx-IP-PORT-PUBKEY
  // Need at least: uuid(3 parts) + ip + port + pubkey = 6 parts minimum
  if (parts.length < 6) {
    return { valid: false, error: 'Invalid GUID format' };
  }
  
  // Reconstruct UUID from first 3 parts
  const uuid = parts.slice(0, 3).join('-');
  
  // Port is second-to-last
  const port = parseInt(parts[parts.length - 2], 10);
  
  // Pubkey is last
  const pubkey = parts[parts.length - 1];
  
  // IP is everything between UUID and port
  // Handle IPv4: parts[3] to parts[parts.length - 3]
  const ipParts = parts.slice(3, parts.length - 2);
  const ip = ipParts.join('.'); // Rejoin with dots in case IP had dots split
  
  // Validate IP format (basic check)
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const validIP = ipRegex.test(ip);
  
  // Validate port
  const validPort = !isNaN(port) && port > 0 && port <= 65535;
  
  return {
    valid: validIP && validPort,
    uuid,
    ip,
    port,
    pubkey,
    endpoint: `${ip}:${port}`
  };
}

/**
 * Get WebSocket URL from GUID
 */
function getWebSocketURL(guid) {
  const parsed = parseGUID(guid);
  if (!parsed.valid) {
    return null;
  }
  return `ws://${parsed.endpoint}`;
}

/**
 * Check if GUID is for local peer (same IP)
 */
function isLocalPeer(guid) {
  const parsed = parseGUID(guid);
  if (!parsed.valid) return false;
  
  const localIPs = getLocalIPs();
  return localIPs.includes(parsed.ip);
}

module.exports = {
  createGUID,
  parseGUID,
  getWebSocketURL,
  getLocalIPs,
  getPrimaryIP,
  isLocalPeer,
  generateShortUUID
};
