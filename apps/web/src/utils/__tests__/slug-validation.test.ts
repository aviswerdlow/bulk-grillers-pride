import { isValidSlug, sanitizeSlug, getSlugValidationError } from '../slug-validation';

describe('slug-validation', () => {
  describe('isValidSlug', () => {
    it('should accept valid slugs', () => {
      expect(isValidSlug('my-org')).toBe(true);
      expect(isValidSlug('org123')).toBe(true);
      expect(isValidSlug('test-org-123')).toBe(true);
      expect(isValidSlug('abc')).toBe(true);
    });

    it('should reject invalid slugs', () => {
      expect(isValidSlug('')).toBe(false);
      expect(isValidSlug('a')).toBe(false); // too short
      expect(isValidSlug('ab')).toBe(false); // too short
      expect(isValidSlug('a'.repeat(51))).toBe(false); // too long
      expect(isValidSlug('My-Org')).toBe(false); // uppercase
      expect(isValidSlug('my org')).toBe(false); // space
      expect(isValidSlug('my--org')).toBe(false); // consecutive hyphens
      expect(isValidSlug('-myorg')).toBe(false); // starts with hyphen
      expect(isValidSlug('myorg-')).toBe(false); // ends with hyphen
      expect(isValidSlug('my_org')).toBe(false); // underscore
      expect(isValidSlug('my.org')).toBe(false); // dot
      expect(isValidSlug('my@org')).toBe(false); // special character
    });
  });

  describe('sanitizeSlug', () => {
    it('should sanitize organization names to valid slugs', () => {
      expect(sanitizeSlug('My Organization')).toBe('my-organization');
      expect(sanitizeSlug('Test & Co.')).toBe('test-co');
      expect(sanitizeSlug('  Spaces  Everywhere  ')).toBe('spaces-everywhere');
      expect(sanitizeSlug('123 Numbers First')).toBe('123-numbers-first');
      expect(sanitizeSlug('Multiple---Hyphens')).toBe('multiple-hyphens');
      expect(sanitizeSlug('Special!@#$%Characters')).toBe('special-characters');
      expect(sanitizeSlug('CamelCaseOrg')).toBe('camelcaseorg');
      expect(sanitizeSlug('---Leading-Trailing---')).toBe('leading-trailing');
    });

    it('should handle edge cases', () => {
      expect(sanitizeSlug('')).toBe('');
      expect(sanitizeSlug('   ')).toBe('');
      expect(sanitizeSlug('!!!')).toBe('');
      expect(sanitizeSlug('---')).toBe('');
    });
  });

  describe('getSlugValidationError', () => {
    it('should return null for valid slugs', () => {
      expect(getSlugValidationError('my-org')).toBeNull();
      expect(getSlugValidationError('org123')).toBeNull();
      expect(getSlugValidationError('test-org-123')).toBeNull();
    });

    it('should return appropriate error messages', () => {
      expect(getSlugValidationError('')).toBe('Organization URL is required');
      expect(getSlugValidationError('ab')).toBe('Organization URL must be at least 3 characters');
      expect(getSlugValidationError('a'.repeat(51))).toBe(
        'Organization URL must be less than 50 characters'
      );
      expect(getSlugValidationError('-myorg')).toBe(
        'Organization URL must start with a letter or number'
      );
      expect(getSlugValidationError('myorg-')).toBe(
        'Organization URL must end with a letter or number'
      );
      expect(getSlugValidationError('my--org')).toBe(
        'Organization URL cannot contain consecutive hyphens'
      );
      expect(getSlugValidationError('My-Org')).toBe(
        'Organization URL can only contain lowercase letters, numbers, and hyphens'
      );
      expect(getSlugValidationError('my org')).toBe(
        'Organization URL can only contain lowercase letters, numbers, and hyphens'
      );
    });
  });
});
