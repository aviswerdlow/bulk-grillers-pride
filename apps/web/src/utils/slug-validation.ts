/**
 * Validates if a string is a valid slug
 * Valid slugs contain only lowercase letters, numbers, and hyphens
 * Must start and end with a letter or number
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length === 0) return false;
  
  // Must be between 3 and 50 characters
  if (slug.length < 3 || slug.length > 50) return false;
  
  // Must match the pattern: lowercase letters, numbers, hyphens
  // Must start and end with letter or number
  // For 3 character slugs, we need to handle the case where there's no middle part
  const pattern = slug.length === 3 ? /^[a-z0-9]{3}$/ : /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
  
  // Additional check for consecutive hyphens
  if (slug.includes('--')) return false;
  
  return pattern.test(slug);
}

/**
 * Sanitizes a string to create a valid slug
 */
export function sanitizeSlug(input: string): string {
  if (!input) return '';
  
  return input
    .toLowerCase()
    .trim()
    // Replace spaces, underscores, and special characters with hyphens
    .replace(/[\s_]+/g, '-')
    // Replace any character that isn't lowercase letter, number, or hyphen with hyphen
    .replace(/[^a-z0-9-]+/g, '-')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Gets a validation error message for an invalid slug
 */
export function getSlugValidationError(slug: string): string | null {
  if (!slug || slug.length === 0) {
    return 'Organization URL is required';
  }
  
  if (slug.length < 3) {
    return 'Organization URL must be at least 3 characters';
  }
  
  if (slug.length > 50) {
    return 'Organization URL must be less than 50 characters';
  }
  
  // Check for invalid characters first (including uppercase)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return 'Organization URL can only contain lowercase letters, numbers, and hyphens';
  }
  
  if (!/^[a-z0-9]/.test(slug)) {
    return 'Organization URL must start with a letter or number';
  }
  
  if (!/[a-z0-9]$/.test(slug)) {
    return 'Organization URL must end with a letter or number';
  }
  
  if (slug.includes('--')) {
    return 'Organization URL cannot contain consecutive hyphens';
  }
  
  return null;
}