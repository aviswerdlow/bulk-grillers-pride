/**
 * Integration test for product import workflow
 */

import { setupTestDatabase, cleanupTestDatabase, seedTestData, queryTestData, withTransaction } from '../utils/database';
import { testOrganizations } from '../fixtures/organizations';
import { testUsers } from '../fixtures/users';

describe('Product Import Workflow', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });
  
  beforeEach(async () => {
    // Clear specific tables before each test
    await seedTestData('organizations', []);
    await seedTestData('products', []);
    await seedTestData('categories', []);
  });
  
  describe('CSV Import', () => {
    it('should import products from CSV with category mapping', async () => {
      // Setup
      await seedTestData('organizations', [testOrganizations.default]);
      await seedTestData('categories', [
        { id: 'cat_electronics', name: 'Electronics', organizationId: testOrganizations.default.id },
        { id: 'cat_accessories', name: 'Accessories', organizationId: testOrganizations.default.id },
      ]);
      
      // Simulate CSV data
      const csvData = [
        { name: 'iPhone 13', sku: 'IPHONE-13', price: 999, category: 'Electronics' },
        { name: 'AirPods Pro', sku: 'AIRPODS-PRO', price: 249, category: 'Accessories' },
        { name: 'MacBook Pro', sku: 'MACBOOK-PRO', price: 2499, category: 'Electronics' },
      ];
      
      // Execute import workflow
      const importResults = await withTransaction(async () => {
        const results = {
          imported: 0,
          skipped: 0,
          errors: [],
        };
        
        for (const row of csvData) {
          try {
            // Find category
            const categories = await queryTestData('categories', c => c.name === row.category);
            if (categories.length === 0) {
              results.errors.push(`Category not found: ${row.category}`);
              results.skipped++;
              continue;
            }
            
            // Check for duplicate SKU
            const existingProducts = await queryTestData('products', p => p.sku === row.sku);
            if (existingProducts.length > 0) {
              results.errors.push(`Duplicate SKU: ${row.sku}`);
              results.skipped++;
              continue;
            }
            
            // Import product
            await seedTestData('products', [{
              id: `prod_${row.sku}`,
              organizationId: testOrganizations.default.id,
              name: row.name,
              sku: row.sku,
              price: row.price,
              categoryId: categories[0].id,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }]);
            
            results.imported++;
          } catch (error: any) {
            results.errors.push(`Failed to import ${row.sku}: ${error.message}`);
            results.skipped++;
          }
        }
        
        return results;
      });
      
      // Verify
      expect(importResults.imported).toBe(3);
      expect(importResults.skipped).toBe(0);
      expect(importResults.errors).toHaveLength(0);
      
      const products = await queryTestData('products');
      expect(products).toHaveLength(3);
      expect(products.map(p => p.sku).sort()).toEqual(['AIRPODS-PRO', 'IPHONE-13', 'MACBOOK-PRO']);
    });
    
    it('should handle import errors gracefully', async () => {
      // Setup with duplicate SKUs
      await seedTestData('organizations', [testOrganizations.default]);
      await seedTestData('products', [
        { id: 'prod_existing', sku: 'IPHONE-13', name: 'Existing iPhone', organizationId: testOrganizations.default.id },
      ]);
      
      // Simulate CSV with duplicate and missing category
      const csvData = [
        { name: 'iPhone 13 Duplicate', sku: 'IPHONE-13', price: 999, category: 'Electronics' },
        { name: 'Unknown Product', sku: 'UNKNOWN-001', price: 100, category: 'NonExistentCategory' },
      ];
      
      // Execute import
      const importResults = await withTransaction(async () => {
        const results = {
          imported: 0,
          skipped: 0,
          errors: [] as string[],
        };
        
        for (const row of csvData) {
          // Check for duplicate SKU
          const existingProducts = await queryTestData('products', p => p.sku === row.sku);
          if (existingProducts.length > 0) {
            results.errors.push(`Duplicate SKU: ${row.sku}`);
            results.skipped++;
            continue;
          }
          
          // Check category exists
          const categories = await queryTestData('categories', c => c.name === row.category);
          if (categories.length === 0) {
            results.errors.push(`Category not found: ${row.category}`);
            results.skipped++;
            continue;
          }
          
          results.imported++;
        }
        
        return results;
      });
      
      // Verify
      expect(importResults.imported).toBe(0);
      expect(importResults.skipped).toBe(2);
      expect(importResults.errors).toHaveLength(2);
      expect(importResults.errors).toContain('Duplicate SKU: IPHONE-13');
      expect(importResults.errors).toContain('Category not found: NonExistentCategory');
    });
  });
  
  describe('Bulk Operations', () => {
    it('should perform bulk price updates within transaction', async () => {
      // Setup
      await seedTestData('products', [
        { id: 'prod_1', sku: 'PROD-001', price: 100, organizationId: testOrganizations.default.id },
        { id: 'prod_2', sku: 'PROD-002', price: 200, organizationId: testOrganizations.default.id },
        { id: 'prod_3', sku: 'PROD-003', price: 300, organizationId: testOrganizations.default.id },
      ]);
      
      // Execute bulk update with 10% increase
      const updateResult = await withTransaction(async () => {
        const products = await queryTestData('products');
        let updated = 0;
        
        for (const product of products) {
          const newPrice = Math.round(product.price * 1.1 * 100) / 100;
          
          // Simulate update
          const allProducts = await queryTestData('products');
          const index = allProducts.findIndex(p => p.id === product.id);
          if (index !== -1) {
            allProducts[index].price = newPrice;
            allProducts[index].updatedAt = Date.now();
            await seedTestData('products', allProducts);
            updated++;
          }
        }
        
        return { updated };
      });
      
      // Verify
      expect(updateResult.updated).toBe(3);
      
      const updatedProducts = await queryTestData('products');
      expect(updatedProducts[0].price).toBe(110);
      expect(updatedProducts[1].price).toBe(220);
      expect(updatedProducts[2].price).toBe(330);
    });
    
    it('should rollback bulk operations on error', async () => {
      // Setup
      await seedTestData('products', [
        { id: 'prod_1', sku: 'PROD-001', price: 100, organizationId: testOrganizations.default.id },
        { id: 'prod_2', sku: 'PROD-002', price: 200, organizationId: testOrganizations.default.id },
      ]);
      
      // Execute bulk update that fails
      let error: Error | null = null;
      try {
        await withTransaction(async () => {
          // Update first product
          const products = await queryTestData('products');
          products[0].price = 150;
          await seedTestData('products', products);
          
          // Simulate error on second product
          throw new Error('Simulated update failure');
        });
      } catch (e: any) {
        error = e;
      }
      
      // Verify rollback
      expect(error).toBeTruthy();
      expect(error?.message).toBe('Simulated update failure');
      
      const products = await queryTestData('products');
      expect(products[0].price).toBe(100); // Should be rolled back
      expect(products[1].price).toBe(200); // Should be unchanged
    });
  });
});