import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { t } from '../../test.setup';
import { isValidSlug, getSlugValidationError } from '../../lib/slugValidation';

describe('Backend Slug Validation', () => {
  describe('isValidSlug', () => {
    describe('valid slugs', () => {
      it('should accept simple lowercase slugs', () => {
        expect(isValidSlug('abc')).toBe(true);
        expect(isValidSlug('test')).toBe(true);
        expect(isValidSlug('mycompany')).toBe(true);
      });

      it('should accept slugs with numbers', () => {
        expect(isValidSlug('test123')).toBe(true);
        expect(isValidSlug('123test')).toBe(true);
        expect(isValidSlug('test123test')).toBe(true);
      });

      it('should accept slugs with hyphens', () => {
        expect(isValidSlug('my-company')).toBe(true);
        expect(isValidSlug('test-123')).toBe(true);
        expect(isValidSlug('a-b-c')).toBe(true);
      });

      it('should accept slugs at boundary lengths', () => {
        expect(isValidSlug('abc')).toBe(true); // 3 chars (minimum)
        expect(isValidSlug('a'.repeat(50))).toBe(true); // 50 chars (maximum)
      });
    });

    describe('invalid slugs', () => {
      it('should reject empty or null values', () => {
        expect(isValidSlug('')).toBe(false);
        expect(isValidSlug(null as any)).toBe(false);
        expect(isValidSlug(undefined as any)).toBe(false);
      });

      it('should reject slugs that are too short', () => {
        expect(isValidSlug('a')).toBe(false);
        expect(isValidSlug('ab')).toBe(false);
      });

      it('should reject slugs that are too long', () => {
        expect(isValidSlug('a'.repeat(51))).toBe(false);
        expect(isValidSlug('very-long-slug-name-that-exceeds-fifty-characters-limit')).toBe(false);
      });

      it('should reject slugs with uppercase letters', () => {
        expect(isValidSlug('Test')).toBe(false);
        expect(isValidSlug('TEST')).toBe(false);
        expect(isValidSlug('myCompany')).toBe(false);
      });

      it('should reject slugs with special characters', () => {
        expect(isValidSlug('test@company')).toBe(false);
        expect(isValidSlug('test.com')).toBe(false);
        expect(isValidSlug('test_company')).toBe(false);
        expect(isValidSlug('test company')).toBe(false);
        expect(isValidSlug('test!@#$')).toBe(false);
      });

      it('should reject slugs starting or ending with hyphens', () => {
        expect(isValidSlug('-test')).toBe(false);
        expect(isValidSlug('test-')).toBe(false);
        expect(isValidSlug('-test-')).toBe(false);
      });

      it('should reject slugs with consecutive hyphens', () => {
        expect(isValidSlug('test--company')).toBe(false);
        expect(isValidSlug('my---slug')).toBe(false);
      });
    });
  });

  describe('getSlugValidationError', () => {
    it('should return error for empty slug', () => {
      expect(getSlugValidationError('')).toBe('Organization URL is required');
      expect(getSlugValidationError(null as any)).toBe('Organization URL is required');
      expect(getSlugValidationError(undefined as any)).toBe('Organization URL is required');
    });

    it('should return error for slug too short', () => {
      expect(getSlugValidationError('a')).toBe('Organization URL must be at least 3 characters');
      expect(getSlugValidationError('ab')).toBe('Organization URL must be at least 3 characters');
    });

    it('should return error for slug too long', () => {
      expect(getSlugValidationError('a'.repeat(51))).toBe('Organization URL must be less than 50 characters');
    });

    it('should return error for invalid characters', () => {
      expect(getSlugValidationError('test@company')).toBe('Organization URL can only contain lowercase letters, numbers, and hyphens');
      expect(getSlugValidationError('test.com')).toBe('Organization URL can only contain lowercase letters, numbers, and hyphens');
      expect(getSlugValidationError('Test Company')).toBe('Organization URL can only contain lowercase letters, numbers, and hyphens');
    });

    it('should return error for invalid start character', () => {
      expect(getSlugValidationError('-test')).toBe('Organization URL must start with a letter or number');
      expect(getSlugValidationError('_test')).toBe('Organization URL can only contain lowercase letters, numbers, and hyphens');
    });

    it('should return error for invalid end character', () => {
      expect(getSlugValidationError('test-')).toBe('Organization URL must end with a letter or number');
      expect(getSlugValidationError('test_')).toBe('Organization URL can only contain lowercase letters, numbers, and hyphens');
    });

    it('should return error for consecutive hyphens', () => {
      expect(getSlugValidationError('test--company')).toBe('Organization URL cannot contain consecutive hyphens');
      expect(getSlugValidationError('my---slug')).toBe('Organization URL cannot contain consecutive hyphens');
    });

    it('should return null for valid slugs', () => {
      expect(getSlugValidationError('mycompany')).toBe(null);
      expect(getSlugValidationError('test-123')).toBe(null);
      expect(getSlugValidationError('valid-slug-name')).toBe(null);
    });

    it('should check errors in priority order', () => {
      // Empty slug should return required error first
      expect(getSlugValidationError('')).toBe('Organization URL is required');
      
      // Short slug with invalid chars should return length error first
      expect(getSlugValidationError('A!')).toBe('Organization URL must be at least 3 characters');
      
      // Long slug with invalid chars should return length error first
      expect(getSlugValidationError('A'.repeat(51) + '!')).toBe('Organization URL must be less than 50 characters');
      
      // Invalid characters should be checked before start/end patterns
      expect(getSlugValidationError('Test-slug')).toBe('Organization URL can only contain lowercase letters, numbers, and hyphens');
      
      // Start pattern should be checked before consecutive hyphens
      expect(getSlugValidationError('--test')).toBe('Organization URL must start with a letter or number');
    });
  });

  describe('consistency between functions', () => {
    const testCases = [
      'valid-slug',
      'test123',
      'my-company-name',
      '',
      'a',
      'ab',
      'a'.repeat(51),
      'Test',
      'test@company',
      '-test',
      'test-',
      'test--company',
      'test.com',
      'test_underscore',
      '123',
      '123-456',
    ];

    testCases.forEach(slug => {
      it(`should be consistent for "${slug}"`, () => {
        const isValid = isValidSlug(slug);
        const error = getSlugValidationError(slug);
        
        if (isValid) {
          expect(error).toBe(null);
        } else {
          expect(error).not.toBe(null);
          expect(typeof error).toBe('string');
        }
      });
    });
  });
});