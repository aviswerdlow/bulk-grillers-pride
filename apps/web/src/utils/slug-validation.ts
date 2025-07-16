/**
 * Utility functions for slug validation and sanitization
 */

/**
 * Validates if a slug is valid for URL usage
 * Requirements:
 * - Only lowercase letters, numbers, and hyphens
 * - Must start and end with alphanumeric characters
 * - No consecutive hyphens
 * - Between 3 and 50 characters
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 50) {
    return false;
  }

  // Check for valid characters and pattern
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

/**
 * Sanitizes a string to create a valid slug
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes consecutive hyphens
 * - Trims hyphens from start and end
 */
export function sanitizeSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      // Replace spaces and special characters with hyphens
      .replace(/[^a-z0-9]+/g, '-')
      // Remove consecutive hyphens
      .replace(/-+/g, '-')
      // Remove leading and trailing hyphens
      .replace(/^-+|-+$/g, '') ||
    // Ensure it's not empty after sanitization
    ''
  );
}

/**
 * Get validation error message for invalid slugs
 */
export function getSlugValidationError(slug: string): string | null {
  if (!slug) {
    return 'Organization URL is required';
  }

  if (slug.length < 3) {
    return 'Organization URL must be at least 3 characters';
  }

  if (slug.length > 50) {
    return 'Organization URL must be less than 50 characters';
  }

  if (!/^[a-z0-9]/.test(slug)) {
    return 'Organization URL must start with a letter or number';
  }

  if (!/[a-z0-9]$/.test(slug)) {
    return 'Organization URL must end with a letter or number';
  }

  if (/--/.test(slug)) {
    return 'Organization URL cannot contain consecutive hyphens';
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return 'Organization URL can only contain lowercase letters, numbers, and hyphens';
  }

  return null;
}
