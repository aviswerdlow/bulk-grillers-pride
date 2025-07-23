import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { LogLevel, createLogger } from '@/utils/error-monitoring';

describe('Logging Utility', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (process.env as any).NODE_ENV = originalEnv;
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = 'development';
    });

    it('should log debug messages in development', () => {
      const logger = createLogger('TestComponent');
      logger.debug('Debug message', { data: 'test' });
      
      expect(consoleDebugSpy).toHaveBeenCalled();
      const logCall = consoleDebugSpy.mock.calls[0][0];
      expect(logCall).toContain('[DEBUG]');
      expect(logCall).toContain('[TestComponent]');
      expect(logCall).toContain('Debug message');
    });

    it('should log info messages in development', () => {
      const logger = createLogger('TestComponent');
      logger.info('Info message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('[INFO]');
      expect(logCall).toContain('Info message');
    });

    it('should log error messages with error objects', () => {
      const logger = createLogger('TestComponent');
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][0];
      expect(logCall).toContain('[ERROR]');
      expect(logCall).toContain('Error occurred');
      
      const errorData = consoleErrorSpy.mock.calls[0][1];
      expect(errorData).toHaveProperty('message', 'Test error');
      expect(errorData).toHaveProperty('stack');
      expect(errorData).toHaveProperty('name', 'Error');
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = 'production';
    });

    it('should not log debug messages in production', () => {
      const logger = createLogger('TestComponent');
      logger.debug('Debug message');
      
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should still log info messages in production', () => {
      const logger = createLogger('TestComponent');
      logger.info('Info message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log error messages in production', () => {
      const logger = createLogger('TestComponent');
      logger.error('Error message');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Message Formatting', () => {
    it('should include timestamp in log messages', () => {
      const logger = createLogger('TestComponent');
      logger.info('Test message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      // Check for ISO date format
      expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('should include component context in log messages', () => {
      const logger = createLogger('MyComponent');
      logger.warn('Warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      const logCall = consoleWarnSpy.mock.calls[0][0];
      expect(logCall).toContain('[MyComponent]');
    });
  });

  describe('Log Levels', () => {
    it('should have correct log level constants', () => {
      expect(LogLevel.DEBUG).toBe('debug');
      expect(LogLevel.INFO).toBe('info');
      expect(LogLevel.WARN).toBe('warn');
      expect(LogLevel.ERROR).toBe('error');
    });
  });
});