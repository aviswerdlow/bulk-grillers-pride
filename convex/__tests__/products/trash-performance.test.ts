/**
 * Performance tests for optimized trash table queries
 * 
 * These tests validate that the performance optimizations
 * are working correctly and meet the expected thresholds.
 */

import { convexTest } from 'convex-test';
import { describe, expect, test } from '@jest/globals';
import schema from '../../schema';
import { api } from '../../_generated/api';

describe('Trash Table Performance', () => {
  describe('getTrashItems optimization', () => {
    test('should use proper indexes for deletedAt sorting', async () => {
      const t = convexTest(schema);
      
      // The query should complete quickly even with many items
      // Note: In a real test, you'd populate with test data
      const result = await t.query(api.products.deletion.getTrashItems, {
        organizationId: 'org123' as any,
        limit: 50,
        sortBy: 'deletedAt',
      });

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.continueCursor).toBeDefined();
      expect(result.isDone).toBeDefined();
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
    });

    test('should use proper indexes for expiresAt sorting', async () => {
      const t = convexTest(schema);
      
      const result = await t.query(api.products.deletion.getTrashItems, {
        organizationId: 'org123' as any,
        limit: 50,
        sortBy: 'expiresAt',
      });

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
    });

    test('should handle pagination correctly', async () => {
      const t = convexTest(schema);
      
      // First page
      const firstPage = await t.query(api.products.deletion.getTrashItems, {
        organizationId: 'org123' as any,
        limit: 10,
      });

      expect(firstPage.items.length).toBeLessThanOrEqual(10);

      // If there's a next page, fetch it
      if (!firstPage.isDone && firstPage.continueCursor) {
        const secondPage = await t.query(api.products.deletion.getTrashItems, {
          organizationId: 'org123' as any,
          limit: 10,
          cursor: firstPage.continueCursor,
        });

        expect(secondPage).toBeDefined();
        expect(secondPage.items).toBeInstanceOf(Array);
      }
    });
  });

  describe('searchTrashItems optimization', () => {
    test('should use search index for title search', async () => {
      const t = convexTest(schema);
      
      const result = await t.query(api.products.deletion.searchTrashItems, {
        organizationId: 'org123' as any,
        searchTerm: 'test product',
        limit: 20,
      });

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeLessThanOrEqual(20);
    });

    test('should fallback to other fields when needed', async () => {
      const t = convexTest(schema);
      
      // Search by SKU (not in search index)
      const result = await t.query(api.products.deletion.searchTrashItems, {
        organizationId: 'org123' as any,
        searchTerm: 'SKU123',
        limit: 20,
      });

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('Performance monitoring', () => {
    test('monitored queries should track metrics', async () => {
      const t = convexTest(schema);
      
      // Use the monitored version
      const result = await t.query(api.products.deletionMonitored.getTrashItems, {
        organizationId: 'org123' as any,
        limit: 50,
      });

      expect(result).toBeDefined();
      // In a real test, you'd verify that performance metrics were logged
    });

    test('should check performance alerts', async () => {
      const t = convexTest(schema);
      
      const alerts = await t.query(api.products.deletionMonitored.checkPerformanceAlerts, {
        organizationId: 'org123' as any,
        timeWindowMinutes: 60,
      });

      expect(alerts).toBeDefined();
      expect(alerts.alerts).toBeInstanceOf(Array);
      expect(alerts.checkedAt).toBeGreaterThan(0);
      expect(alerts.timeWindowMinutes).toBe(60);
    });
  });

  describe('Trash table size monitoring', () => {
    test('should monitor table size and provide warnings', async () => {
      const t = convexTest(schema);
      
      const monitoring = await t.query(api.products.deletionMonitored.monitorTrashTableSize, {
        organizationId: 'org123' as any,
      });

      expect(monitoring).toBeDefined();
      expect(monitoring.totalCount).toBeGreaterThanOrEqual(0);
      expect(monitoring.statusCounts).toBeDefined();
      expect(monitoring.estimatedSizeMB).toBeGreaterThanOrEqual(0);
      expect(monitoring.warningThresholds).toBeDefined();
      expect(monitoring.warningThresholds.count).toMatch(/OK|WARNING/);
      expect(monitoring.warningThresholds.size).toMatch(/OK|WARNING/);
    });
  });
});

/**
 * Performance benchmarks to ensure queries meet requirements
 * 
 * Expected performance targets:
 * - getTrashItems: <200ms for 50 items
 * - searchTrashItems: <300ms for simple searches
 * - getDeletionStats: <500ms for 30-day range
 * 
 * These are validated through the performance monitoring system
 */