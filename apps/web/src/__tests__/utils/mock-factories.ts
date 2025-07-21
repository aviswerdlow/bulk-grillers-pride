/**
 * Mock factory utilities for tests
 * Provides simple mock data creators that match the UI types
 */

import type { Product, Category, User, Organization } from '@/types/models';
import type { Id } from '@convex/_generated/dataModel';

// Helper to create mock IDs
export function createMockId<T extends string>(table: T): Id<T> {
  return `test_${table}_${Math.random().toString(36).substr(2, 9)}` as Id<T>;
}

// Product mock factory
export function createMockProduct(overrides?: Partial<Product>): Product {
  const now = Date.now();
  return {
    _id: createMockId('products'),
    title: 'Test Product',
    handle: 'test-product',
    vendor: 'Test Vendor',
    productType: 'Test Type',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    categories: [],
    description: 'Test product description',
    sku: 'TEST-SKU-001',
    tags: ['test', 'product'],
    ...overrides,
  };
}

// Category mock factory
export function createMockCategory(overrides?: Partial<Category>): Category {
  return {
    _id: createMockId('categories'),
    name: 'Test Category',
    level: 0,
    path: '/test-category',
    organizationId: createMockId('organizations'),
    projectId: createMockId('projects'),
    isActive: true,
    productCount: 0,
    ...overrides,
  };
}

// User mock factory
export function createMockUser(overrides?: Partial<User>): User {
  const now = Date.now();
  return {
    _id: createMockId('users'),
    clerkId: `clerk_${Math.random().toString(36).substr(2, 9)}`,
    email: 'test@example.com',
    name: 'Test User',
    createdAt: now,
    updatedAt: now,
    organizationIds: [],
    ...overrides,
  };
}

// Organization mock factory  
export function createMockOrganization(overrides?: Partial<Organization>): Organization {
  const now = Date.now();
  return {
    _id: createMockId('organizations'),
    name: 'Test Organization',
    slug: 'test-org',
    clerkOrganizationId: `org_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
    memberCount: 1,
    projectCount: 1,
    ...overrides,
  };
}

// Helper to create multiple items
export function createMockProducts(count: number, overrides?: Partial<Product>): Product[] {
  return Array.from({ length: count }, (_, i) => 
    createMockProduct({
      title: `Test Product ${i + 1}`,
      handle: `test-product-${i + 1}`,
      sku: `TEST-SKU-${String(i + 1).padStart(3, '0')}`,
      ...overrides,
    })
  );
}

export function createMockCategories(count: number, overrides?: Partial<Category>): Category[] {
  return Array.from({ length: count }, (_, i) => 
    createMockCategory({
      name: `Test Category ${i + 1}`,
      path: `/test-category-${i + 1}`,
      ...overrides,
    })
  );
}