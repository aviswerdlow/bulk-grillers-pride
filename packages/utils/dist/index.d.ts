/**
 * Generate a URL-friendly handle from a string
 * @param name - The string to convert to a handle
 * @returns A lowercase, hyphenated string safe for URLs
 */
declare function generateHandle(name: string): string;
/**
 * Generate a slug from a string (alias for generateHandle)
 */
declare const slugify: typeof generateHandle;
/**
 * Capitalize the first letter of a string
 */
declare function capitalize(str: string): string;
/**
 * Capitalize the first letter of each word
 */
declare function capitalizeWords(str: string): string;
/**
 * Truncate a string to a specified length with ellipsis
 */
declare function truncate(str: string, length: number, suffix?: string): string;
/**
 * Remove leading and trailing whitespace and collapse multiple spaces
 */
declare function cleanWhitespace(str: string): string;
/**
 * Check if a string is empty or only whitespace
 */
declare function isBlank(str: string | null | undefined): boolean;
/**
 * Generate a random string of specified length
 */
declare function randomString(length: number): string;
/**
 * Convert a string to camelCase
 */
declare function toCamelCase(str: string): string;
/**
 * Convert a string to PascalCase
 */
declare function toPascalCase(str: string): string;

/**
 * Format a number as currency
 */
declare function formatCurrency(amount: number, currency?: string, locale?: string): string;
/**
 * Format a number with thousands separators
 */
declare function formatNumber(num: number, locale?: string, options?: Intl.NumberFormatOptions): string;
/**
 * Format a date to a localized string
 */
declare function formatDate(date: Date | string | number, locale?: string, options?: Intl.DateTimeFormatOptions): string;
/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 */
declare function formatRelativeTime(date: Date | string | number): string;
/**
 * Format bytes to human readable format
 */
declare function formatBytes(bytes: number, decimals?: number): string;
/**
 * Format a percentage
 */
declare function formatPercentage(value: number, decimals?: number, includeSign?: boolean): string;
/**
 * Format a phone number
 */
declare function formatPhoneNumber(phone: string): string;
/**
 * Format duration in milliseconds to human readable format
 */
declare function formatDuration(ms: number): string;

/**
 * Debounce a function
 */
declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * Throttle a function
 */
declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
/**
 * Deep clone an object
 */
declare function deepClone<T>(obj: T): T;
/**
 * Check if two objects are deeply equal
 */
declare function deepEqual(a: any, b: any): boolean;
/**
 * Group array items by a key
 */
declare function groupBy<T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]>;
/**
 * Remove duplicates from an array
 */
declare function unique<T>(array: T[], key?: keyof T | ((item: T) => any)): T[];
/**
 * Sleep for a given number of milliseconds
 */
declare function sleep(ms: number): Promise<void>;
/**
 * Retry a function with exponential backoff
 */
declare function retry<T>(fn: () => Promise<T>, options?: {
    attempts?: number;
    delay?: number;
    maxDelay?: number;
    factor?: number;
    onError?: (error: Error, attempt: number) => void;
}): Promise<T>;

export { capitalize, capitalizeWords, cleanWhitespace, debounce, deepClone, deepEqual, formatBytes, formatCurrency, formatDate, formatDuration, formatNumber, formatPercentage, formatPhoneNumber, formatRelativeTime, generateHandle, groupBy, isBlank, randomString, retry, sleep, slugify, throttle, toCamelCase, toPascalCase, truncate, unique };
