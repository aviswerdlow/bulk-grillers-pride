import { t } from '../../test.setup';
/**
 * Example test using the @bulk-grillers-pride/convex-test-helpers package
 * This demonstrates how to use the new test helper package in actual Convex tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createConvexTest,
  createQueryContext,
  createMutationContext,
  setupAuth,
  seedDatabase,
  assertDocumentExists,
  createMockUser,
  createMockOrganization,
  createMockProduct,
  type ConvexTestContext,
} from '@bulk-grillers-pride/convex-test-helpers';

// Import the actual Convex types
import type { QueryCtx, MutationCtx } from '../../_generated/server';
import { convexTest } from '../convex-test-standard';

describe('Example using convex-test-helpers package', () => {
  beforeEach(() => {
    });
  
  it('should demonstrate query testing', async () => {
    // Setup authentication
    const user = createMockUser({ _id: 'user_123', email: 'test@example.com' });
    setupAuth(t, { tokenIdentifier: user.clerkId });
    
    // Seed data
    const org = createMockOrganization({ _id: 'org_123' });
    const products = [
      createMockProduct({ organizationId: org._id, price: 10 }),
      createMockProduct({ organizationId: org._id, price: 20 }),
      createMockProduct({ organizationId: org._id, price: 30 }),
    ];
    
    await seedDatabase(t, {
      users: [user],
      organizations: [org],
      products,
    });
    
    // Create context (cast to Convex type if needed)
    const ctx = createQueryContext(t) as unknown as QueryCtx;
    
    // Test queries
    const allProducts = await t.db.query('products')
      .filter(p => p.organizationId === org._id)
      .collect();
    
    expect(allProducts).toHaveLength(3);
    
    // Test with assertions
    await assertDocumentExists(test, 'products', p => p.price === 20);
  });
  
  it('should demonstrate mutation testing', async () => {
    const ctx = createMutationContext(t) as unknown as MutationCtx;
    
    // Create a product
    const productId = await t.db.insert('products', {
      title: 'New Product',
      organizationId: 'org_123',
      price: 25,
      status: 'active',
    });
    
    // Update it
    await t.db.patch(productId, { price: 30 });
    
    // Verify
    const updated = await t.db.get(productId);
    expect(updated.price).toBe(30);
    
    // Test scheduling
    await ctx.scheduler.runAfter(5000, 'processProduct', { productId });
    expect(t.scheduler.runAfter).toHaveBeenCalledWith(
      5000,
      'processProduct',
      { productId }
    );
  });
});