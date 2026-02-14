/**
 * Open-Tap Identity
 * Simple GUID generation for client identity
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ID_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.open-tap-id');

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
    fs.writeFileSync(ID_FILE, newId);
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
