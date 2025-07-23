import { describe, it, expect, beforeAll } from '@jest/globals';
import { t } from '../../test.setup';
import { encrypt, decrypt, encryptApiKey, decryptApiKey, isEncrypted, generateEncryptionKey } from '../../lib/encryption';

// Mock environment variable for testing
beforeAll(() => {
  // Generate a test encryption key
  process.env.ENCRYPTION_KEY = generateEncryptionKey();
});

describe('Encryption Library', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'sk-test-api-key-12345678901234567890';
      const encrypted = encrypt(plaintext);
      
      // Encrypted string should be different from plaintext
      expect(encrypted).not.toBe(plaintext);
      
      // Should be base64 encoded
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
      
      // Decrypt should return original value
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
    
    it('should produce different encrypted values for same plaintext', () => {
      const plaintext = 'sk-test-api-key';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      // Due to random IV, encrypted values should be different
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });
    
    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
    
    it('should handle special characters', () => {
      const plaintext = 'sk-test!@#$%^&*()_+-=[]{}|;:"<>?,./';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
    
    it('should throw error on invalid encrypted data', () => {
      expect(() => decrypt('invalid-data')).toThrow();
      expect(() => decrypt('aGVsbG8=')).toThrow(); // Valid base64 but invalid format
    });
  });
  
  describe('encryptApiKey and decryptApiKey', () => {
    it('should handle null and undefined gracefully', () => {
      expect(encryptApiKey(null)).toBeNull();
      expect(encryptApiKey(undefined)).toBeNull();
      expect(decryptApiKey(null)).toBeNull();
      expect(decryptApiKey(undefined)).toBeNull();
    });
    
    it('should encrypt and decrypt API keys', () => {
      const apiKey = 'sk-proj-abcdef123456789';
      const encrypted = encryptApiKey(apiKey);
      
      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(apiKey);
      
      const decrypted = decryptApiKey(encrypted!);
      expect(decrypted).toBe(apiKey);
    });
    
    it('should handle legacy unencrypted keys in decryptApiKey', () => {
      const legacyKey = 'sk-legacy-unencrypted-key';
      
      // Legacy key should be detected as unencrypted
      expect(isEncrypted(legacyKey)).toBe(false);
      
      // decryptApiKey should return the key as-is for migration
      const result = decryptApiKey(legacyKey);
      expect(result).toBe(legacyKey);
    });
  });
  
  describe('isEncrypted', () => {
    it('should correctly identify encrypted values', () => {
      const plaintext = 'sk-test-api-key';
      const encrypted = encrypt(plaintext);
      
      expect(isEncrypted(encrypted)).toBe(true);
      expect(isEncrypted(plaintext)).toBe(false);
    });
    
    it('should handle edge cases', () => {
      expect(isEncrypted('')).toBe(false);
      expect(isEncrypted('short')).toBe(false);
      expect(isEncrypted('not-base64!')).toBe(false);
      
      // Valid base64 but too short
      expect(isEncrypted('aGVsbG8=')).toBe(false);
    });
  });
  
  describe('generateEncryptionKey', () => {
    it('should generate valid encryption keys', () => {
      const key = generateEncryptionKey();
      
      // Should be 64 hex characters (32 bytes)
      expect(key).toMatch(/^[a-f0-9]{64}$/);
      expect(key.length).toBe(64);
    });
    
    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
    });
  });
  
  describe('encryption key validation', () => {
    it('should throw error if ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
      
      // Restore
      process.env.ENCRYPTION_KEY = originalKey;
    });
    
    it('should throw error if ENCRYPTION_KEY has wrong length', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'short-key';
      
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be 64 hexadecimal characters');
      
      // Restore
      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});