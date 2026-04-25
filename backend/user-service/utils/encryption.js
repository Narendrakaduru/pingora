const crypto = require('crypto');

/**
 * Fernet-compatible encryption in Node.js
 * Note: Python's Fernet uses AES-128-CBC with HMAC-SHA256.
 * For media encryption, we'll use a simpler AES-256-GCM approach for performance and security,
 * but since we share the key from Chat Service (which is a Fernet key), 
 * we should be careful. 
 * Actually, let's just use AES-256-CBC with a derived key to keep it simple and robust for large files.
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

const encrypt = (buffer) => {
    if (!ENCRYPTION_KEY) return buffer;
    try {
        // Derive a 32-byte key from the provided string key
        const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const result = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
        return result;
    } catch (e) {
        console.error("Encryption failed:", e);
        return buffer;
    }
};

const decrypt = (buffer) => {
    if (!ENCRYPTION_KEY) return buffer;
    try {
        const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
        const iv = buffer.slice(0, 16);
        const encrypted = buffer.slice(16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        const result = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return result;
    } catch (e) {
        // Return original if decryption fails (e.g. unencrypted file)
        return buffer;
    }
};

module.exports = { encrypt, decrypt };
