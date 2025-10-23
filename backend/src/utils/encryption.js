import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Derive key from environment encryption key
function getKey() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // If key is hex string, convert to buffer; otherwise hash it
  if (encryptionKey.length === 64 && /^[0-9a-f]+$/i.test(encryptionKey)) {
    return Buffer.from(encryptionKey, 'hex');
  }

  return crypto.scryptSync(encryptionKey, 'sql-browser-salt', KEY_LENGTH);
}

/**
 * Encrypt sensitive data (connection strings, passwords)
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in format: iv:encrypted:tag (hex encoded)
 */
export function encrypt(text) {
  if (!text) return null;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Return format: iv:encrypted:tag
  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

/**
 * Decrypt encrypted data
 * @param {string} encryptedText - Encrypted text in format: iv:encrypted:tag
 * @returns {string} - Decrypted plain text
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return null;

  const key = getKey();
  const parts = encryptedText.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const tag = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash password using bcrypt-like approach (for consistency)
 * @param {string} password - Plain text password
 * @returns {string} - Hashed password
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} storedHash - Stored hash in format: salt:hash
 * @returns {boolean} - True if password matches
 */
export function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const passwordHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === passwordHash;
}
