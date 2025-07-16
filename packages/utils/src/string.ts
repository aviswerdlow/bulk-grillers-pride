/**
 * Generate a URL-friendly handle from a string
 * @param name - The string to convert to a handle
 * @returns A lowercase, hyphenated string safe for URLs
 */
export function generateHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a slug from a string (alias for generateHandle)
 */
export const slugify = generateHandle;

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitalize the first letter of each word
 */
export function capitalizeWords(str: string): string {
  return str.split(' ').map(capitalize).join(' ');
}

/**
 * Truncate a string to a specified length with ellipsis
 */
export function truncate(str: string, length: number, suffix = '...'): string {
  if (str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
}

/**
 * Remove leading and trailing whitespace and collapse multiple spaces
 */
export function cleanWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Check if a string is empty or only whitespace
 */
export function isBlank(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * Generate a random string of specified length
 */
export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Convert a string to camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, (chr) => chr.toLowerCase());
}

/**
 * Convert a string to PascalCase
 */
export function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
