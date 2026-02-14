/**
 * Open-Tap Identity
 * Simple GUID generation for client identity
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ID_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.aitap', 'id');

/**
 * Generate a new GUID
 */
function generateGuid() {
  return crypto.randomUUID();
}

/**
 * Get or create a persistent client identity
 */
function getIdentity() {
  try {
    // Try to read existing identity
    if (fs.existsSync(ID_FILE)) {
      const id = fs.readFileSync(ID_FILE, 'utf8').trim();
      if (id && id.length > 0) {
        return id;
      }
    }
  } catch (err) {
    // Fall through to create new
  }

  // Generate and save new identity
  const newId = generateGuid();
  try {
    // Ensure directory exists
    const dir = path.dirname(ID_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ID_FILE, newId);
    
    // Set restrictive permissions on Unix systems (chmod 600)
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(ID_FILE, 0o600);
      } catch (chmodErr) {
        // Ignore chmod errors
      }
    }
  } catch (err) {
    // Silent fail - use ephemeral ID
  }
  return newId;
}

/**
 * Reset identity (generate new)
 */
function resetIdentity() {
  try {
    // Also clean up old location if exists
    const oldIdFile = path.join(process.env.HOME || process.env.USERPROFILE, '.aitap-id');
    if (fs.existsSync(oldIdFile)) {
      fs.unlinkSync(oldIdFile);
    }
    if (fs.existsSync(ID_FILE)) {
      fs.unlinkSync(ID_FILE);
    }
  } catch (err) {
    // Ignore
  }
  return getIdentity();
}

module.exports = {
  generateGuid,
  getIdentity,
  resetIdentity,
  ID_FILE
};
