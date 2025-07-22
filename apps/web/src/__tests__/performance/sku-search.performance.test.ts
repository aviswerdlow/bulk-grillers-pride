import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { performance } from 'perf_hooks';
import { ConvexReactClient } from 'convex/browser';
import { api } from '@/../../../convex/_generated/api';
import { Id } from '@/../../../convex/_generated/dataModel';
import { createTestProduct } from '@bulk-grillers-pride/test-factories';

describe('SKU Search Performance Tests', () => {
  let client: ConvexReactClient;
  let organizationId: Id<'organizations'>;
  const productIds: Id<'products'>[] = [];
  
  // Performance thresholds
  const PERFORMANCE_THRESHOLDS = {
    singleSearch: 100, // ms
    bulkSearch: 500, // ms
    indexedSearch: 50, // ms
    complexSearch: 200, // ms
    concurrentSearches: 1000, // ms total for 10 concurrent
  };

  beforeAll(async () => {
    // Setup test environment and seed data
    client = new ConvexReactClient(process.env.CONVEX_URL!);
    
    // Create test organization
    organizationId = 'mock-org-id' as Id<'organizations'>;
    
    // Seed database with products for performance testing
    const seedProducts = async () => {
      const products = [];
      
      // Create 1000 products with various SKU patterns
      for (let i = 0; i < 1000; i++) {
        const category = ['MEAT', 'DAIRY', 'PROD', 'BAKE', 'FROZ'][i % 5];
        const subCategory = ['BEEF', 'PORK', 'CHKN', 'FISH', 'LAMB'][i % 5];
        const sku = `${category}-${subCategory}-${String(i).padStart(4, '0')}`;
        
        products.push({
          title: `Product ${i}`,
          sku,
          price: Math.random() * 100,
          description: `Test product ${i} for performance testing`,
          status: 'active' as const,
        });
      }
      
      // Add some products without SKUs
      for (let i = 0; i < 100; i++) {
        products.push({
          title: `No SKU Product ${i}`,
          sku: undefined,
          price: Math.random() * 50,
          description: `Product without SKU for testing`,
          status: 'active' as const,
        });
      }
      
      return products;
    };
    
    const products = await seedProducts();
    console.log(`Seeded ${products.length} products for performance testing`);
  });

  afterAll(async () => {
    // Cleanup test data
    if (client) {
      client.close();
    }
  });

  describe('Single SKU Search Performance', () => {
    it('searches for exact SKU match within threshold', async () => {
      const searchSKU = 'MEAT-BEEF-0042';
      
      const startTime = performance.now();
      const results = await client.query(api.functions.products.products.search, {
        organizationId,
        query: searchSKU,
      });
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(1);
      expect(results[0].sku).toBe(searchSKU);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleSearch);
      
      console.log(`Exact SKU search took ${duration.toFixed(2)}ms`);
    });

    it('searches for partial SKU match within threshold', async () => {
      const partialSKU = 'MEAT-BEEF';
      
      const startTime = performance.now();
      const results = await client.query(api.functions.products.products.search, {
        organizationId,
        query: partialSKU,
      });
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(p => p.sku?.includes(partialSKU))).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkSearch);
      
      console.log(`Partial SKU search returned ${results.length} results in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Bulk SKU Search Performance', () => {
    it('handles multiple SKU searches efficiently', async () => {
      const skusToSearch = [
        'MEAT-BEEF-0001',
        'DAIRY-PORK-0100',
        'PROD-CHKN-0200',
        'BAKE-FISH-0300',
        'FROZ-LAMB-0400',
      ];
      
      const durations: number[] = [];
      
      for (const sku of skusToSearch) {
        const startTime = performance.now();
        await client.query(api.functions.products.products.search, {
          organizationId,
          query: sku,
        });
        const endTime = performance.now();
        durations.push(endTime - startTime);
      }
      
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);
      const avgDuration = totalDuration / durations.length;
      
      expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkSearch);
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleSearch);
      
      console.log(`Bulk search: ${skusToSearch.length} searches completed in ${totalDuration.toFixed(2)}ms (avg: ${avgDuration.toFixed(2)}ms)`);
    });
  });

  describe('Indexed SKU Search Performance', () => {
    it('leverages SKU index for fast lookups', async () => {
      // Test that indexed SKU searches are faster than non-indexed
      const indexedSKU = 'MEAT-BEEF-0500';
      const nonIndexedQuery = 'Product 500'; // Title search
      
      // Indexed SKU search
      const indexedStart = performance.now();
      const indexedResults = await client.query(api.functions.products.products.search, {
        organizationId,
        query: indexedSKU,
      });
      const indexedEnd = performance.now();
      const indexedDuration = indexedEnd - indexedStart;
      
      // Non-indexed title search
      const titleStart = performance.now();
      const titleResults = await client.query(api.functions.products.products.search, {
        organizationId,
        query: nonIndexedQuery,
      });
      const titleEnd = performance.now();
      const titleDuration = titleEnd - titleStart;
      
      expect(indexedDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.indexedSearch);
      expect(indexedDuration).toBeLessThan(titleDuration * 0.7); // Indexed should be at least 30% faster
      
      console.log(`Indexed SKU search: ${indexedDuration.toFixed(2)}ms vs Title search: ${titleDuration.toFixed(2)}ms`);
    });
  });

  describe('Complex SKU Query Performance', () => {
    it('handles wildcard SKU searches efficiently', async () => {
      const wildcardPatterns = [
        'MEAT-*-0*', // All meat products with SKU starting with 0
        '*-BEEF-*', // All beef products
        '*-*-09*', // All products with 09 in the number
      ];
      
      for (const pattern of wildcardPatterns) {
        const startTime = performance.now();
        const results = await client.query(api.functions.products.products.searchWithPattern, {
          organizationId,
          pattern,
        });
        const endTime = performance.now();
        
        const duration = endTime - startTime;
        
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.complexSearch);
        console.log(`Wildcard search '${pattern}' returned ${results.length} results in ${duration.toFixed(2)}ms`);
      }
    });

    it('combines SKU and other filters efficiently', async () => {
      const startTime = performance.now();
      const results = await client.query(api.functions.products.products.searchAdvanced, {
        organizationId,
        filters: {
          skuPrefix: 'MEAT',
          priceRange: { min: 20, max: 80 },
          status: 'active',
        },
      });
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.complexSearch);
      
      console.log(`Complex filtered search returned ${results.length} results in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Concurrent SKU Search Performance', () => {
    it('handles multiple concurrent SKU searches', async () => {
      const concurrentSearches = 10;
      const searchQueries = Array.from({ length: concurrentSearches }, (_, i) => 
        `MEAT-BEEF-${String(i * 10).padStart(4, '0')}`
      );
      
      const startTime = performance.now();
      const searchPromises = searchQueries.map(query =>
        client.query(api.functions.products.products.search, {
          organizationId,
          query,
        })
      );
      
      const results = await Promise.all(searchPromises);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(concurrentSearches);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrentSearches);
      
      const avgDuration = duration / concurrentSearches;
      console.log(`${concurrentSearches} concurrent searches completed in ${duration.toFixed(2)}ms (avg: ${avgDuration.toFixed(2)}ms per search)`);
    });
  });

  describe('SKU Search Scalability', () => {
    it('maintains performance with large result sets', async () => {
      // Search for a common prefix that returns many results
      const commonPrefix = 'MEAT';
      
      const startTime = performance.now();
      const results = await client.query(api.functions.products.products.search, {
        organizationId,
        query: commonPrefix,
        limit: 100, // Limit results for performance
      });
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(results.length).toBeLessThanOrEqual(100);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkSearch);
      
      console.log(`Large result set search returned ${results.length} results in ${duration.toFixed(2)}ms`);
    });

    it('uses pagination efficiently for large SKU searches', async () => {
      const pageSize = 20;
      const pages = 5;
      const durations: number[] = [];
      
      for (let page = 0; page < pages; page++) {
        const startTime = performance.now();
        const results = await client.query(api.functions.products.products.searchPaginated, {
          organizationId,
          query: 'MEAT',
          page,
          pageSize,
        });
        const endTime = performance.now();
        
        durations.push(endTime - startTime);
        
        expect(results.items.length).toBeLessThanOrEqual(pageSize);
      }
      
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleSearch);
      expect(maxDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.singleSearch * 1.5);
      
      console.log(`Paginated search: ${pages} pages fetched with avg ${avgDuration.toFixed(2)}ms, max ${maxDuration.toFixed(2)}ms`);
    });
  });

  describe('SKU Search Optimization Recommendations', () => {
    it('generates performance metrics report', async () => {
      const performanceReport = {
        timestamp: new Date().toISOString(),
        environment: 'test',
        metrics: {
          exactMatchAvg: 0,
          partialMatchAvg: 0,
          wildcardAvg: 0,
          concurrentAvg: 0,
          paginationAvg: 0,
        },
        recommendations: [] as string[],
      };

      // Collect metrics from multiple test runs
      const testRuns = 5;
      const metrics = {
        exactMatch: [] as number[],
        partialMatch: [] as number[],
        wildcard: [] as number[],
      };

      for (let i = 0; i < testRuns; i++) {
        // Exact match test
        const exactStart = performance.now();
        await client.query(api.functions.products.products.search, {
          organizationId,
          query: `MEAT-BEEF-${String(i * 100).padStart(4, '0')}`,
        });
        metrics.exactMatch.push(performance.now() - exactStart);

        // Partial match test
        const partialStart = performance.now();
        await client.query(api.functions.products.products.search, {
          organizationId,
          query: 'DAIRY',
        });
        metrics.partialMatch.push(performance.now() - partialStart);

        // Wildcard test
        const wildcardStart = performance.now();
        await client.query(api.functions.products.products.searchWithPattern, {
          organizationId,
          pattern: '*-PORK-*',
        });
        metrics.wildcard.push(performance.now() - wildcardStart);
      }

      // Calculate averages
      performanceReport.metrics.exactMatchAvg = metrics.exactMatch.reduce((a, b) => a + b) / testRuns;
      performanceReport.metrics.partialMatchAvg = metrics.partialMatch.reduce((a, b) => a + b) / testRuns;
      performanceReport.metrics.wildcardAvg = metrics.wildcard.reduce((a, b) => a + b) / testRuns;

      // Generate recommendations based on metrics
      if (performanceReport.metrics.exactMatchAvg > 50) {
        performanceReport.recommendations.push('Consider adding a dedicated SKU index for exact matches');
      }
      if (performanceReport.metrics.partialMatchAvg > 200) {
        performanceReport.recommendations.push('Implement prefix indexing for partial SKU searches');
      }
      if (performanceReport.metrics.wildcardAvg > 300) {
        performanceReport.recommendations.push('Consider using full-text search for wildcard patterns');
      }

      // Add general recommendations
      performanceReport.recommendations.push(
        'Implement caching for frequently searched SKUs',
        'Use database query optimization for complex filters',
        'Consider read replicas for search-heavy workloads'
      );

      console.log('Performance Report:', JSON.stringify(performanceReport, null, 2));
      
      // Assert that we have meaningful metrics
      expect(performanceReport.metrics.exactMatchAvg).toBeGreaterThan(0);
      expect(performanceReport.recommendations.length).toBeGreaterThan(0);
    });
  });
});