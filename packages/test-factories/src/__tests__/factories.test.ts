import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  userFactory,
  organizationFactory,
  productFactory,
  categoryFactory,
  aiCategorizationJobFactory,
  createTestScenario,
  createMockId,
  createMockIdFromString,
  createIdGenerator,
} from '../index';

describe('Test Factories', () => {
  describe('ID Utilities', () => {
    it('should create mock IDs', () => {
      const userId = createMockId('users');
      expect(typeof userId).toBe('string');
      expect(userId.length).toBeGreaterThan(0);
    });
    
    it('should create deterministic IDs from strings', () => {
      const id1 = createMockIdFromString('users', 'test-seed');
      const id2 = createMockIdFromString('users', 'test-seed');
      const id3 = createMockIdFromString('users', 'different-seed');
      
      expect(id1).toBe(id2);
      expect(id1).not.toBe(id3);
    });
    
    it('should create ID generators', () => {
      const generator = createIdGenerator('products');
      const id1 = generator.next();
      const id2 = generator.next();
      
      expect(id1).not.toBe(id2);
      
      generator.reset();
      const id3 = generator.next();
      expect(id3).toBe(id1); // Same as first after reset
    });
  });
  
  describe('UserFactory', () => {
    it('should create a user', () => {
      const user = userFactory.create();
      
      expect(user._id).toBeDefined();
      expect(user.email).toMatch(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i);
      expect(user.firstName).toBeDefined();
      expect(user.lastName).toBeDefined();
      expect(['active', 'invited', 'suspended']).toContain(user.status);
    });
    
    it('should create multiple users', () => {
      const users = userFactory.createMany(3);
      
      expect(users).toHaveLength(3);
      const emails = users.map(u => u.email);
      expect(new Set(emails).size).toBe(3); // All unique
    });
    
    it('should create specialized users', () => {
      const active = userFactory.createActive();
      const invited = userFactory.createInvited();
      const suspended = userFactory.createSuspended();
      
      expect(active.status).toBe('active');
      expect(active.lastLogin).toBeDefined();
      
      expect(invited.status).toBe('invited');
      expect(invited.lastLogin).toBeUndefined();
      
      expect(suspended.status).toBe('suspended');
    });
    
    it('should create users with email domain', () => {
      const user = userFactory.createWithEmailDomain('company.com');
      expect(user.email).toMatch(/@company\.com$/);
    });
    
    it('should create test users', () => {
      const user1 = userFactory.createTest(1);
      const user2 = userFactory.createTest(2);
      
      expect(user1.email).toBe('test1@example.com');
      expect(user2.email).toBe('test2@example.com');
    });
  });
  
  describe('OrganizationFactory', () => {
    it('should create an organization', () => {
      const org = organizationFactory.create();
      
      expect(org._id).toBeDefined();
      expect(org.name).toBeDefined();
      expect(org.slug).toMatch(/^[a-z0-9-]+$/);
      expect(['active', 'suspended', 'trial']).toContain(org.status);
      expect(org.settings.aiProvider).toBeDefined();
    });
    
    it('should create specialized organizations', () => {
      const trial = organizationFactory.createTrial();
      const enterprise = organizationFactory.createEnterprise();
      const suspended = organizationFactory.createSuspended();
      
      expect(trial.status).toBe('trial');
      expect(trial.subscription.status).toBe('trialing');
      expect(trial.subscription.trialEnds).toBeDefined();
      
      expect(enterprise.subscription.plan).toBe('enterprise');
      expect(enterprise.subscription.seats).toBeGreaterThanOrEqual(50);
      
      expect(suspended.status).toBe('suspended');
      expect(suspended.subscription.status).toBe('past_due');
    });
  });
  
  describe('ProductFactory', () => {
    it('should create a product', () => {
      const product = productFactory.create();
      
      expect(product._id).toBeDefined();
      expect(product.title).toBeDefined();
      expect(product.handle).toMatch(/^[a-z0-9-]+$/);
      expect(['active', 'draft', 'archived']).toContain(product.status);
    });
    
    it('should create specialized products', () => {
      const meat = productFactory.createMeatProduct();
      const seafood = productFactory.createSeafoodProduct();
      const draft = productFactory.createDraft();
      
      expect(meat.productType).toMatch(/^meat\//);
      expect(meat.tags?.some(tag => /beef|pork|chicken|lamb|turkey/.test(tag))).toBe(true);
      
      expect(seafood.productType).toMatch(/^seafood\//);
      expect(seafood.tags).toContain('seafood');
      
      expect(draft.status).toBe('draft');
      expect(draft.images).toHaveLength(0);
    });
  });
  
  describe('CategoryFactory', () => {
    it('should create a category', () => {
      const category = categoryFactory.create();
      
      expect(category._id).toBeDefined();
      expect(category.name).toBeDefined();
      expect(category.handle).toMatch(/^[a-z0-9-]+$/);
      expect(category.level).toBeGreaterThanOrEqual(0);
      expect(['active', 'hidden', 'archived']).toContain(category.status);
    });
    
    it('should create root and subcategories', () => {
      const root = categoryFactory.createRoot();
      const sub = categoryFactory.createSubcategory(root._id, root.path);
      
      expect(root.level).toBe(0);
      expect(root.parentId).toBeUndefined();
      
      expect(sub.level).toBeGreaterThan(0);
      expect(sub.parentId).toBe(root._id);
      expect(sub.path).toContain(root.path);
    });
    
    it('should create category hierarchy', () => {
      const orgId = createMockId('organizations');
      const projectId = createMockId('projects');
      const hierarchy = categoryFactory.createMeatHierarchy(orgId, projectId);
      
      expect(hierarchy).toHaveLength(4);
      expect(hierarchy[0].name).toBe('Meat & Seafood');
      expect(hierarchy[1].name).toBe('Beef');
      expect(hierarchy[1].parentId).toBe(hierarchy[0]._id);
    });
  });
  
  describe('AiCategorizationJobFactory', () => {
    it('should create an AI job', () => {
      const job = aiCategorizationJobFactory.create();
      
      expect(job._id).toBeDefined();
      expect(['pending', 'running', 'completed', 'failed', 'cancelled']).toContain(job.status);
      expect(['openai', 'anthropic', 'gemini']).toContain(job.provider);
      expect(job.productIds.length).toBeGreaterThan(0);
    });
    
    it('should create specialized jobs', () => {
      const pending = aiCategorizationJobFactory.createPending();
      const running = aiCategorizationJobFactory.createRunning();
      const completed = aiCategorizationJobFactory.createCompleted();
      const failed = aiCategorizationJobFactory.createFailed();
      
      expect(pending.status).toBe('pending');
      expect(pending.progress.current).toBe(0);
      expect(pending.startedAt).toBeUndefined();
      
      expect(running.status).toBe('running');
      expect(running.progress.current).toBeGreaterThan(0);
      expect(running.progress.current).toBeLessThan(running.progress.total);
      
      expect(completed.status).toBe('completed');
      expect(completed.progress.percentage).toBe(100);
      expect(completed.results.length).toBeGreaterThan(0);
      
      expect(failed.status).toBe('failed');
      expect(failed.errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('createTestScenario', () => {
    it('should create a complete test scenario', () => {
      const scenario = createTestScenario({
        userCount: 2,
        categoryCount: 4,
        productCount: 5,
        includeAiJob: true,
      });
      
      expect(scenario.organization).toBeDefined();
      expect(scenario.users).toHaveLength(2);
      expect(scenario.categories).toHaveLength(4);
      expect(scenario.products).toHaveLength(5);
      expect(scenario.aiJob).toBeDefined();
      
      // Check relationships
      const orgId = scenario.organization._id;
      expect(scenario.products[0].organizationId).toBe(orgId);
      expect(scenario.categories[0].organizationId).toBe(orgId);
      expect(scenario.aiJob!.organizationId).toBe(orgId);
    });
    
    it('should create deterministic scenarios with seed', () => {
      const scenario1 = createTestScenario({ seed: 12345 });
      const scenario2 = createTestScenario({ seed: 12345 });
      const scenario3 = createTestScenario({ seed: 54321 });
      
      // Same seed should produce same names
      expect(scenario1.organization.name).toBe(scenario2.organization.name);
      expect(scenario1.users[0].email).toBe(scenario2.users[0].email);
      
      // Different seed should produce different data
      expect(scenario1.organization.name).not.toBe(scenario3.organization.name);
    });
  });
});