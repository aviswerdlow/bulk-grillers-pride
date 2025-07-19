import { Id } from '../../_generated/dataModel';
import { ConvexTestingHelper } from '../test-helpers';

/**
 * Test helpers for product deletion feature
 */

// Mock data generators
export const generateMockProduct = (overrides?: Partial<any>) => ({
  _id: `product_${Date.now()}_${Math.random()}` as Id<'products'>,
  _creationTime: Date.now(),
  organizationId: 'org_test' as Id<'organizations'>,
  projectId: 'proj_test' as Id<'projects'>,
  title: 'Test Product',
  description: 'Test product description',
  handle: 'test-product',
  sku: `SKU-${Date.now()}`,
  status: 'active' as const,
  tags: [],
  categories: [],
  images: [],
  metadata: {},
  version: 1,
  createdBy: 'user_test' as Id<'users'>,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastModifiedBy: 'user_test' as Id<'users'>,
  ...overrides,
});

export const generateMockTrashEntry = (productId: Id<'products'>, overrides?: Partial<any>) => {
  const now = Date.now();
  return {
    _id: `trash_${Date.now()}_${Math.random()}` as Id<'productTrash'>,
    _creationTime: now,
    organizationId: 'org_test' as Id<'organizations'>,
    projectId: 'proj_test' as Id<'projects'>,
    productId,
    productData: generateMockProduct({ _id: productId }),
    deletedAt: now,
    deletedBy: 'user_test' as Id<'users'>,
    deletionReason: 'Test deletion',
    deletionType: 'manual' as const,
    expiresAt: now + (30 * 24 * 60 * 60 * 1000), // 30 days
    bulkOperationId: undefined,
    relatedData: {
      variantIds: [],
      categoryAssignmentIds: [],
      aiJobIds: [],
      imageStorageIds: [],
    },
    recoveryStatus: 'recoverable' as const,
    ...overrides,
  };
};

export const generateMockDeletionAuditLog = (overrides?: Partial<any>) => ({
  _id: `audit_${Date.now()}_${Math.random()}` as Id<'deletionAuditLogs'>,
  _creationTime: Date.now(),
  organizationId: 'org_test' as Id<'organizations'>,
  projectId: 'proj_test' as Id<'projects'>,
  operationType: 'soft_delete' as const,
  affectedProducts: [{
    productId: 'prod_test' as Id<'products'>,
    title: 'Test Product',
    sku: 'SKU-123',
    categories: [],
  }],
  totalCount: 1,
  breakdown: {
    uncategorized: 1,
    categorized: 0,
    byCategory: [],
  },
  performedBy: 'user_test' as Id<'users'>,
  performedAt: Date.now(),
  userEmail: 'test@example.com',
  userName: 'Test User',
  ...overrides,
});

// Test data setup helpers
export async function setupTestProduct(t: ConvexTestingHelper, overrides?: Partial<any>) {
  const product = generateMockProduct(overrides);
  const productId = await t.run(async (ctx) => {
    return await ctx.db.insert('products', product);
  });
  return { productId, product: { ...product, _id: productId } };
}

export async function setupTestProductWithVariants(t: ConvexTestingHelper, variantCount = 3) {
  const { productId, product } = await setupTestProduct(t);
  
  const variantIds = await Promise.all(
    Array.from({ length: variantCount }, (_, i) => 
      t.run(async (ctx) => {
        return await ctx.db.insert('productVariants', {
          organizationId: product.organizationId,
          projectId: product.projectId,
          productId,
          sku: `${product.sku}-VAR-${i + 1}`,
          price: 100 + (i * 10),
          inventoryQuantity: 100,
          inventoryPolicy: 'deny' as const,
          trackQuantity: true,
          options: [{ name: 'Size', value: `Size ${i + 1}` }],
          images: [],
          metadata: {},
          status: 'active' as const,
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: product.createdBy,
        });
      })
    )
  );

  return { productId, product, variantIds };
}

export async function setupTestTrashEntry(
  t: ConvexTestingHelper, 
  productId: Id<'products'>,
  overrides?: Partial<any>
) {
  const trashEntry = generateMockTrashEntry(productId, overrides);
  const trashId = await t.run(async (ctx) => {
    return await ctx.db.insert('productTrash', trashEntry);
  });
  return { trashId, trashEntry: { ...trashEntry, _id: trashId } };
}

// Assertion helpers
export function assertProductDeleted(product: any) {
  expect(product.status).toBe('archived');
  expect(product.archivedAt).toBeDefined();
  expect(product.archivedBy).toBeDefined();
}

export function assertProductRestored(product: any) {
  expect(product.status).toBe('active');
  expect(product.archivedAt).toBeUndefined();
  expect(product.archivedBy).toBeUndefined();
}

export function assertTrashEntryValid(trashEntry: any, expectedProduct: any) {
  expect(trashEntry.productId).toBe(expectedProduct._id);
  expect(trashEntry.productData._id).toBe(expectedProduct._id);
  expect(trashEntry.productData.title).toBe(expectedProduct.title);
  expect(trashEntry.recoveryStatus).toBe('recoverable');
  expect(trashEntry.expiresAt).toBeGreaterThan(Date.now());
}

export function assertAuditLogValid(auditLog: any, expectedOperation: string, expectedCount: number) {
  expect(auditLog.operationType).toBe(expectedOperation);
  expect(auditLog.totalCount).toBe(expectedCount);
  expect(auditLog.affectedProducts).toHaveLength(expectedCount);
  expect(auditLog.performedAt).toBeDefined();
  expect(auditLog.performedBy).toBeDefined();
}

// Scenario helpers
export async function createExpiredTrashEntry(t: ConvexTestingHelper, daysAgo = 31) {
  const { productId } = await setupTestProduct(t);
  const expiresAt = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
  const deletedAt = expiresAt - (30 * 24 * 60 * 60 * 1000); // 30 days before expiry
  
  return setupTestTrashEntry(t, productId, {
    deletedAt,
    expiresAt,
    recoveryStatus: 'recoverable',
  });
}

export async function createBulkDeletionScenario(t: ConvexTestingHelper, productCount = 5) {
  const products = await Promise.all(
    Array.from({ length: productCount }, () => setupTestProduct(t))
  );
  
  return {
    productIds: products.map(p => p.productId),
    products: products.map(p => p.product),
    confirmationText: `DELETE ${productCount}`,
  };
}

// Mock mutation helpers for testing
export const mockDeleteProductMutation = (shouldSucceed = true) => {
  return {
    handler: async ({ productId, reason }: any) => {
      if (!shouldSucceed) {
        throw new Error('Mock deletion failed');
      }
      return {
        success: true,
        trashId: `trash_mock_${Date.now()}` as Id<'productTrash'>,
      };
    },
  };
};

export const mockBulkDeleteProductsMutation = (successCount: number, failCount: number) => {
  return {
    handler: async ({ productIds, confirmationText, reason }: any) => {
      const expectedText = `DELETE ${productIds.length}`;
      if (confirmationText !== expectedText) {
        throw new Error('Invalid confirmation text');
      }
      
      const results = productIds.map((id: string, index: number) => ({
        success: index < successCount,
        productId: id,
        ...(index < successCount 
          ? { trashId: `trash_${id}` as Id<'productTrash'> }
          : { error: 'Mock failure' }
        ),
      }));
      
      return {
        success: true,
        deletedCount: successCount,
        failedCount: failCount,
        bulkOperationId: `bulk_mock_${Date.now()}`,
        results,
      };
    },
  };
};

// Utility functions
export function calculateDaysUntilExpiry(expiresAt: number): number {
  return Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
}

export function isExpiringSoon(trashEntry: any): boolean {
  const daysRemaining = calculateDaysUntilExpiry(trashEntry.expiresAt);
  return daysRemaining <= 7 && daysRemaining > 0;
}

// Test cleanup helper
export async function cleanupTestData(t: ConvexTestingHelper, ids: {
  productIds?: Id<'products'>[];
  trashIds?: Id<'productTrash'>[];
  auditLogIds?: Id<'deletionAuditLogs'>[];
}) {
  await t.run(async (ctx) => {
    // Clean up products
    if (ids.productIds) {
      for (const id of ids.productIds) {
        const doc = await ctx.db.get(id);
        if (doc) await ctx.db.delete(id);
      }
    }
    
    // Clean up trash entries
    if (ids.trashIds) {
      for (const id of ids.trashIds) {
        const doc = await ctx.db.get(id);
        if (doc) await ctx.db.delete(id);
      }
    }
    
    // Clean up audit logs
    if (ids.auditLogIds) {
      for (const id of ids.auditLogIds) {
        const doc = await ctx.db.get(id);
        if (doc) await ctx.db.delete(id);
      }
    }
  });
}