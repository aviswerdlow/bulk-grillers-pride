/**
 * Client-side encryption utilities
 * These are wrapper functions that throw errors directing users to use the action versions
 * The actual encryption is handled by actions in ../actions/encryption.ts
 */

export function encrypt(plaintext: string): string {
  throw new Error('Use encryptAction from ../actions/encryption instead - encryption requires Node.js runtime');
}

export function decrypt(encryptedData: string): string {
  throw new Error('Use decryptAction from ../actions/encryption instead - decryption requires Node.js runtime');
}

export function generateEncryptionKey(): string {
  throw new Error('Use generateEncryptionKeyAction from ../actions/encryption instead - key generation requires Node.js runtime');
}

export function isEncrypted(value: string): boolean {
  // Simple check that can be done client-side
  try {
    if (typeof value !== 'string' || value.length < 44) return false;
    // Try to decode from base64
    const decoded = atob(value);
    // Check minimum length (16 bytes IV + 16 bytes auth tag + at least 1 byte data)
    return decoded.length >= 33;
  } catch {
    return false;
  }
}

export function encryptApiKey(apiKey: string | null | undefined): string | null {
  throw new Error('Use encryptApiKeyAction from ../actions/encryption instead - encryption requires Node.js runtime');
}

export function decryptApiKey(encryptedKey: string | null | undefined): string | null {
  throw new Error('Use decryptApiKeyAction from ../actions/encryption instead - decryption requires Node.js runtime');
}