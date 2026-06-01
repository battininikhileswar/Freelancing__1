const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Derive a 32-byte key from the env variable
const getKey = () => {
  const rawKey = process.env.ENCRYPTION_KEY || 'default_dev_key_not_for_production_!!';
  return crypto.scryptSync(rawKey, 'grievance_portal_salt', KEY_LENGTH);
};

/**
 * encrypt(text) — AES-256-GCM encrypt a string
 * Returns: 'iv:authTag:ciphertext' (hex)
 */
const encrypt = (text) => {
  if (!text) return text;
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(String(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err.message);
    return text; // Fallback to plaintext in dev
  }
};

/**
 * decrypt(encryptedText) — AES-256-GCM decrypt
 * Handles both encrypted and plain text (backward compat)
 */
const decrypt = (encryptedText) => {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const key = getKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err.message);
    return encryptedText;
  }
};

/**
 * hashPhone(phone) — One-way hash for phone lookup without storing plaintext
 */
const hashPhone = (phone) => {
  if (!phone) return null;
  return crypto.createHmac('sha256', process.env.ENCRYPTION_KEY || 'dev_salt')
    .update(String(phone))
    .digest('hex');
};

/**
 * maskPhone(phone) — Mask for display: 9876543210 → 98****3210
 */
const maskPhone = (phone) => {
  if (!phone) return '';
  const s = String(phone);
  return s.slice(0, 2) + '****' + s.slice(-4);
};

/**
 * maskEmail(email) — Mask for display: ravi@gmail.com → ra**@gmail.com
 */
const maskEmail = (email) => {
  if (!email) return '';
  const [user, domain] = email.split('@');
  return user.slice(0, 2) + '**@' + domain;
};

/**
 * sanitizeComplaintForPublic(complaint) — Strip routing details for public API
 */
const sanitizeComplaintForPublic = (complaint) => {
  const safe = { ...complaint };
  // Never expose routing internals to public
  delete safe.routing;
  delete safe.userEmail;
  delete safe.userPhone;
  if (safe.isAnonymous) {
    delete safe.userId;
    delete safe.userName;
  }
  return safe;
};

module.exports = {
  encrypt,
  decrypt,
  hashPhone,
  maskPhone,
  maskEmail,
  sanitizeComplaintForPublic,
};
