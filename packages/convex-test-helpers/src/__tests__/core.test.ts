import { describe, it, expect, beforeEach } from '@jest/globals';
import { createConvexTest } from '../core';
import { createQueryContext, createMutationContext } from '../context';
import { setupAuth, seedDatabase, clearDatabase } from '../utilities';
import { assertDocumentExists, assertTableCount } from '../assertions';
import type { ConvexTestContext } from '../types';

describe('Convex Test Helpers', () => {
  let test: ConvexTestContext;
  
  beforeEach(() => {
    test = createConvexTest();
  });
  
  describe('Core functionality', () => {
    it('should create a test context', () => {
      expect(test).toBeDefined();
      expect(test.db).toBeDefined();
      expect(test.auth).toBeDefined();
      expect(test.scheduler).toBeDefined();
      expect(test.storage).toBeDefined();
    });
    
    it('should insert and retrieve documents', async () => {
      const id = await test.db.insert('users', {
        name: 'Test User',
        email: 'test@example.com'
      });
      
      expect(id).toBe('users_1');
      
      const doc = await test.db.get(id);
      expect(doc).toBeDefined();
      expect(doc.name).toBe('Test User');
      expect(doc._id).toBe(id);
      expect(doc._creationTime).toBeDefined();
    });
    
    it('should query documents', async () => {
      await seedDatabase(test, {
        products: [
          { name: 'Product 1', price: 10 },
          { name: 'Product 2', price: 20 },
          { name: 'Product 3', price: 30 },
        ]
      });
      
      const all = await test.db.query('products').collect();
      expect(all).toHaveLength(3);
      
      const expensive = await test.db.query('products')
        .filter(p => p.price > 15)
        .collect();
      expect(expensive).toHaveLength(2);
    });
  });
  
  describe('Context builders', () => {
    it('should create query context', () => {
      const ctx = createQueryContext(test);
      expect(ctx.db).toBe(test.db);
      expect(ctx.auth).toBe(test.auth);
    });
    
    it('should create mutation context', () => {
      const ctx = createMutationContext(test);
      expect(ctx.db).toBe(test.db);
      expect(ctx.auth).toBe(test.auth);
      expect(ctx.scheduler).toBe(test.scheduler);
    });
  });
  
  describe('Authentication', () => {
    it('should setup authenticated user', async () => {
      setupAuth(test, { tokenIdentifier: 'user_123' });
      
      const identity = await test.auth.getUserIdentity();
      expect(identity).toBeDefined();
      expect(identity.tokenIdentifier).toBe('user_123');
    });
    
    it('should setup unauthenticated state', async () => {
      setupAuth(test, null);
      
      const identity = await test.auth.getUserIdentity();
      expect(identity).toBeNull();
    });
  });
  
  describe('Assertions', () => {
    it('should assert document exists', async () => {
      await seedDatabase(test, {
        users: [{ email: 'test@example.com' }]
      });
      
      await expect(
        assertDocumentExists(test, 'users', u => u.email === 'test@example.com')
      ).resolves.not.toThrow();
      
      await expect(
        assertDocumentExists(test, 'users', u => u.email === 'other@example.com')
      ).rejects.toThrow();
    });
    
    it('should assert table count', async () => {
      await seedDatabase(test, {
        items: [{ name: 'Item 1' }, { name: 'Item 2' }]
      });
      
      expect(() => assertTableCount(test, 'items', 2)).not.toThrow();
      expect(() => assertTableCount(test, 'items', 3)).toThrow();
    });
  });
});