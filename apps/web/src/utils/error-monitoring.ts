/**
 * Error monitoring and logging utilities
 *
 * This module provides utilities for error monitoring and logging without Sentry.
 * It includes detection for Sentry-related errors that may come from browser extensions
 * or third-party scripts.
 */

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

export interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
}

export const LogLevel: LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

/**
 * Enhanced logger with structured logging and error context
 */
export class Logger {
  private context: string;
  private isDevelopment: boolean;

  constructor(context: string) {
    this.context = context;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;
  }

  private log(level: keyof LogLevel, message: string, data?: any) {
    const formattedMessage = this.formatMessage(level, message);

    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formattedMessage, data || '');
        }
        break;
      case 'info':
        console.log(formattedMessage, data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, data || '');
        break;
      case 'error':
        console.error(formattedMessage, data || '');
        break;
    }

    // In production, you could send this to a logging service
    if (!this.isDevelopment && level === 'error') {
      this.reportError(message, data);
    }
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, error?: any) {
    const errorData =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : error;

    this.log('error', message, errorData);
  }

  /**
   * Report error to external service (placeholder for future implementation)
   */
  private reportError(message: string, data: any) {
    // Future: Send to error monitoring service
    // For now, just ensure errors are logged
  }
}

/**
 * Detect and handle Sentry-related errors from browser extensions
 */
export function detectSentryErrors(): { hasSentryErrors: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check performance entries for failed Sentry requests
  if (typeof window !== 'undefined' && window.performance) {
    const entries = performance.getEntriesByType('resource');
    const sentryEntries = entries.filter(
      (entry) =>
        entry.name.includes('sentry.io') ||
        entry.name.includes('ingest.sentry') ||
        entry.name.includes('@sentry')
    );

    sentryEntries.forEach((entry) => {
      const resourceEntry = entry as PerformanceResourceTiming;
      // Check if the request failed (0 means failed or blocked)
      if (resourceEntry.responseStatus === 0 || resourceEntry.responseStatus >= 400) {
        errors.push(
          `Failed Sentry request: ${entry.name} (Status: ${resourceEntry.responseStatus || 'blocked'})`
        );
      }
    });
  }

  // Check for Sentry global objects that might be injected
  if (typeof window !== 'undefined') {
    const sentryGlobals = ['__SENTRY__', 'Sentry', 'sentry'];
    sentryGlobals.forEach((global) => {
      if (global in window) {
        errors.push(`Detected Sentry global: ${global} (possibly from browser extension)`);
      }
    });
  }

  return {
    hasSentryErrors: errors.length > 0,
    errors,
  };
}

/**
 * Monitor for console errors related to missing Convex functions
 */
export function monitorConvexErrors(logger: Logger) {
  if (typeof window === 'undefined') return;

  // Override console.error to catch Convex-related errors
  const originalError = console.error;
  console.error = function (...args: any[]) {
    const errorMessage = args.join(' ');

    // Check for Convex function errors
    if (errorMessage.includes('Function') && errorMessage.includes('not found')) {
      logger.error('Convex function not found', {
        message: errorMessage,
        args,
      });
    }

    // Check for Convex connection errors
    if (errorMessage.includes('convex') && errorMessage.includes('WebSocket')) {
      logger.error('Convex WebSocket error', {
        message: errorMessage,
        args,
      });
    }

    // Call original console.error
    originalError.apply(console, args);
  };
}

/**
 * Create a safe wrapper for Convex queries that logs errors
 */
export function createSafeQuery<T>(
  queryFn: () => T | undefined,
  queryName: string,
  logger: Logger
): T | undefined {
  try {
    const result = queryFn();
    if (result !== undefined) {
      logger.debug(`Query ${queryName} successful`, { hasData: !!result });
    }
    return result;
  } catch (error) {
    logger.error(`Query ${queryName} failed`, error);
    return undefined;
  }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  start(label: string) {
    this.marks.set(label, performance.now());
    this.logger.debug(`Performance mark started: ${label}`);
  }

  end(label: string): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      this.logger.warn(`No start mark found for: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(label);

    this.logger.info(`Performance measurement: ${label}`, {
      duration: `${duration.toFixed(2)}ms`,
    });

    return duration;
  }
}

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandling(logger: Logger) {
  if (typeof window === 'undefined') return;

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
      reason: event.reason,
      promise: event.promise,
    });
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    // Ignore Sentry-related errors from extensions
    if (event.message && event.message.includes('sentry')) {
      logger.warn('Ignoring Sentry-related error (likely from browser extension)', {
        message: event.message,
        filename: event.filename,
      });
      return;
    }

    logger.error('Global error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  // Monitor Sentry errors on startup
  const sentryCheck = detectSentryErrors();
  if (sentryCheck.hasSentryErrors) {
    logger.warn('Detected Sentry-related errors', {
      errors: sentryCheck.errors,
      recommendation:
        'These are likely from browser extensions. Consider disabling monitoring extensions in development.',
    });
  }
}

/**
 * Create a logger instance for a specific component
 */
export function createLogger(component: string): Logger {
  return new Logger(component);
}
