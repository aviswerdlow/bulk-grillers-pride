import {
  Logger,
  detectSentryErrors,
  monitorConvexErrors,
  createSafeQuery,
  PerformanceMonitor,
  setupGlobalErrorHandling,
  createLogger,
} from '../error-monitoring';

describe('Error Monitoring Utilities', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

    // Reset performance entries mock
    if (global.performance) {
      (global.performance as unknown as { getEntriesByType: jest.Mock }).getEntriesByType = jest.fn(() => []);
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Clean up any global modifications
    delete (global as unknown as { __SENTRY__?: unknown }).__SENTRY__;
    delete (global as unknown as { Sentry?: unknown }).Sentry;
    delete (global as unknown as { sentry?: unknown }).sentry;
  });

  describe('Logger', () => {
    it('should create logger with context', () => {
      const logger = new Logger('TestComponent');
      logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [TestComponent] Test message'),
        ''
      );
    });

    it('should log different levels correctly', () => {
      const logger = new Logger('TestComponent');

      logger.info('Info message', { data: 'test' });
      logger.warn('Warning message', { warning: true });
      logger.error('Error message', new Error('Test error'));

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'), {
        data: 'test',
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'), {
        warning: true,
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.objectContaining({
          message: 'Test error',
          name: 'Error',
        })
      );
    });

    it('should only log debug messages in development', () => {
      const originalEnv = process.env.NODE_ENV;

      // Test in production
      process.env.NODE_ENV = 'production';
      const prodLogger = new Logger('TestComponent');
      prodLogger.debug('Debug message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();

      // Test in development
      process.env.NODE_ENV = 'development';
      const devLogger = new Logger('TestComponent');
      devLogger.debug('Debug message');
      expect(consoleDebugSpy).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should format error objects correctly', () => {
      const logger = new Logger('TestComponent');
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Test.js:10:5';

      logger.error('An error occurred', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.objectContaining({
          message: 'Test error',
          stack: error.stack,
          name: 'Error',
        })
      );
    });
  });

  describe('detectSentryErrors', () => {
    it('should detect Sentry-related performance entries', () => {
      const mockEntries = [
        {
          name: 'https://sentry.io/api/123/store/',
          responseStatus: 403,
        },
        {
          name: 'https://browser.sentry-cdn.com/bundle.js',
          responseStatus: 200,
        },
        {
          name: 'https://ingest.sentry.io/api/456/envelope/',
          responseStatus: 0,
        },
      ];

      (global.performance as unknown as { getEntriesByType: jest.Mock }).getEntriesByType = jest.fn(() => mockEntries);

      const result = detectSentryErrors();

      expect(result.hasSentryErrors).toBe(true);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('https://sentry.io/api/123/store/');
      expect(result.errors[1]).toContain('https://ingest.sentry.io/api/456/envelope/');
    });

    it('should detect Sentry global objects', () => {
      (global as unknown as { __SENTRY__: object }).__SENTRY__ = {};
      (global as unknown as { Sentry: { init: jest.Mock } }).Sentry = { init: jest.fn() };

      const result = detectSentryErrors();

      expect(result.hasSentryErrors).toBe(true);
      expect(result.errors).toContain(
        'Detected Sentry global: __SENTRY__ (possibly from browser extension)'
      );
      expect(result.errors).toContain(
        'Detected Sentry global: Sentry (possibly from browser extension)'
      );
    });

    it('should return no errors when Sentry is not detected', () => {
      const result = detectSentryErrors();

      expect(result.hasSentryErrors).toBe(false);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('monitorConvexErrors', () => {
    it('should intercept Convex function not found errors', () => {
      const logger = createLogger('Test');
      const loggerErrorSpy = jest.spyOn(logger, 'error');

      monitorConvexErrors(logger);

      // Simulate Convex error
      console.error('Function functions.dashboard.getDashboardStats not found');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Convex function not found',
        expect.objectContaining({
          message: expect.stringContaining('not found'),
        })
      );
    });

    it('should intercept Convex WebSocket errors', () => {
      const logger = createLogger('Test');
      const loggerErrorSpy = jest.spyOn(logger, 'error');

      monitorConvexErrors(logger);

      // Simulate WebSocket error
      console.error('convex WebSocket connection failed');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Convex WebSocket error',
        expect.objectContaining({
          message: expect.stringContaining('WebSocket'),
        })
      );
    });

    it('should still call original console.error', () => {
      const logger = createLogger('Test');

      monitorConvexErrors(logger);

      console.error('Regular error message');

      // Check that the original functionality is preserved
      expect(consoleErrorSpy).toHaveBeenCalledWith('Regular error message');
    });
  });

  describe('createSafeQuery', () => {
    it('should execute query successfully and log', () => {
      const logger = createLogger('Test');
      const loggerDebugSpy = jest.spyOn(logger, 'debug');

      const mockQuery = jest.fn(() => ({ data: 'test' }));
      const result = createSafeQuery(mockQuery, 'testQuery', logger);

      expect(result).toEqual({ data: 'test' });
      expect(mockQuery).toHaveBeenCalled();
      expect(loggerDebugSpy).toHaveBeenCalledWith('Query testQuery successful', { hasData: true });
    });

    it('should handle query errors gracefully', () => {
      const logger = createLogger('Test');
      const loggerErrorSpy = jest.spyOn(logger, 'error');

      const mockQuery = jest.fn(() => {
        throw new Error('Query failed');
      });

      const result = createSafeQuery(mockQuery, 'testQuery', logger);

      expect(result).toBeUndefined();
      expect(loggerErrorSpy).toHaveBeenCalledWith('Query testQuery failed', expect.any(Error));
    });

    it('should handle undefined results', () => {
      const logger = createLogger('Test');
      const loggerDebugSpy = jest.spyOn(logger, 'debug');

      const mockQuery = jest.fn(() => undefined);
      const result = createSafeQuery(mockQuery, 'testQuery', logger);

      expect(result).toBeUndefined();
      expect(loggerDebugSpy).not.toHaveBeenCalled();
    });
  });

  describe('PerformanceMonitor', () => {
    it('should measure performance between start and end', () => {
      const logger = createLogger('Test');
      const monitor = new PerformanceMonitor(logger);
      const loggerInfoSpy = jest.spyOn(logger, 'info');

      // Mock performance.now()
      let mockTime = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => {
        mockTime += 100;
        return mockTime;
      });

      monitor.start('testOperation');
      // Simulate some work
      monitor.end('testOperation');

      expect(loggerInfoSpy).toHaveBeenCalledWith('Performance measurement: testOperation', {
        duration: '100.00ms',
      });
    });

    it('should handle missing start marks', () => {
      const logger = createLogger('Test');
      const monitor = new PerformanceMonitor(logger);
      const loggerWarnSpy = jest.spyOn(logger, 'warn');

      const duration = monitor.end('nonExistentOperation');

      expect(duration).toBe(0);
      expect(loggerWarnSpy).toHaveBeenCalledWith('No start mark found for: nonExistentOperation');
    });
  });

  describe('setupGlobalErrorHandling', () => {
    it('should handle unhandled promise rejections', () => {
      const logger = createLogger('Test');
      const loggerErrorSpy = jest.spyOn(logger, 'error');

      setupGlobalErrorHandling(logger);

      const rejectionEvent = new Event('unhandledrejection') as PromiseRejectionEvent;
      rejectionEvent.reason = new Error('Promise rejected');
      // Don't create an actual rejected promise, just mock it
      rejectionEvent.promise = { catch: jest.fn() };

      window.dispatchEvent(rejectionEvent);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unhandled promise rejection',
        expect.objectContaining({
          reason: rejectionEvent.reason,
        })
      );
    });

    it('should handle global errors', () => {
      const logger = createLogger('Test');
      const loggerErrorSpy = jest.spyOn(logger, 'error');

      setupGlobalErrorHandling(logger);

      const errorEvent = new ErrorEvent('error', {
        message: 'Global error occurred',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Test error'),
      });

      window.dispatchEvent(errorEvent);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Global error',
        expect.objectContaining({
          message: 'Global error occurred',
          filename: 'test.js',
          lineno: 10,
          colno: 5,
        })
      );
    });

    it('should ignore Sentry-related errors from extensions', () => {
      const logger = createLogger('Test');
      const loggerWarnSpy = jest.spyOn(logger, 'warn');
      const loggerErrorSpy = jest.spyOn(logger, 'error');

      setupGlobalErrorHandling(logger);

      const sentryErrorEvent = new ErrorEvent('error', {
        message: 'Failed to load sentry script',
        filename: 'chrome-extension://abc/sentry.js',
      });

      window.dispatchEvent(sentryErrorEvent);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Ignoring Sentry-related error (likely from browser extension)',
        expect.any(Object)
      );
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should check for Sentry errors on setup', () => {
      const logger = createLogger('Test');
      const loggerWarnSpy = jest.spyOn(logger, 'warn');

      // Mock Sentry global
      (global as unknown as { __SENTRY__: object }).__SENTRY__ = {};

      setupGlobalErrorHandling(logger);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Detected Sentry-related errors',
        expect.objectContaining({
          errors: expect.arrayContaining([expect.stringContaining('__SENTRY__')]),
          recommendation: expect.stringContaining('browser extensions'),
        })
      );
    });
  });

  describe('createLogger', () => {
    it('should create a logger instance with the specified component name', () => {
      const logger = createLogger('MyComponent');
      logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [MyComponent] Test message'),
        ''
      );
    });
  });
});
