import crypto from 'crypto';

/**
 * Encryption utilities for API keys and sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

// Get encryption key from environment variable
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // Validate key length (should be 32 bytes / 64 hex chars for AES-256)
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)');
  }
  
  return key;
};

/**
 * Encrypts a string using AES-256-GCM
 * Returns base64 encoded string containing: iv:authTag:encryptedData
 */
export function encrypt(plaintext: string): string {
  const key = Buffer.from(getEncryptionKey(), 'hex');
  
  // Generate a random initialization vector
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  // Encrypt the plaintext
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  
  // Get the authentication tag
  const authTag = cipher.getAuthTag();
  
  // Combine iv, authTag, and encrypted data
  const combined = Buffer.concat([iv, authTag, encrypted]);
  
  // Return base64 encoded string
  return combined.toString('base64');
}

/**
 * Decrypts a string encrypted with encrypt()
 * Expects base64 encoded string containing: iv:authTag:encryptedData
 */
export function decrypt(encryptedData: string): string {
  const key = Buffer.from(getEncryptionKey(), 'hex');
  
  // Decode from base64
  const combined = Buffer.from(encryptedData, 'base64');
  
  // Extract components
  const iv = combined.subarray(0, 16);
  const authTag = combined.subarray(16, 32);
  const encrypted = combined.subarray(32);
  
  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Generates a new encryption key for initial setup
 * This should be run once and the result stored securely
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates that a string can be decrypted
 */
export function isEncrypted(value: string): boolean {
  try {
    // Check if it's a valid base64 string
    const decoded = Buffer.from(value, 'base64');
    // Check minimum length (16 bytes IV + 16 bytes auth tag + at least 1 byte data)
    return decoded.length >= 33;
  } catch {
    return false;
  }
}

/**
 * Safely encrypts a value, handling null/undefined
 */
export function encryptApiKey(apiKey: string | null | undefined): string | null {
  if (!apiKey) return null;
  return encrypt(apiKey);
}

/**
 * Safely decrypts a value, handling null/undefined
 */
export function decryptApiKey(encryptedKey: string | null | undefined): string | null {
  if (!encryptedKey) return null;
  
  try {
    return decrypt(encryptedKey);
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    // Check if it's an unencrypted legacy key
    if (!isEncrypted(encryptedKey)) {
      // Return as-is for migration purposes
      return encryptedKey;
    }
    throw error;
  }
}