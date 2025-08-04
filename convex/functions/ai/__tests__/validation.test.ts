import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { t } from '../../../test.setup';
// Jest doesn't need explicit imports for describe, it, expect, beforeEach
// Mock the langchain module
jest.mock('../langchain', () => ({
  AIProvider: 'openai' as const,
  processBatchWithLangChain: jest.fn(),
  ProductCategorizationCache: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    clear: jest.fn(),
    size: jest.fn().mockReturnValue(0),
  })),
  initializeLLM: jest.fn(),
  createCategorizationChain: jest.fn(),
  formatProductsForPrompt: jest.fn(),
  formatCategoriesForPrompt: jest.fn(),
  estimateTokenCount: jest.fn().mockReturnValue(100),
  estimateCost: jest.fn().mockReturnValue({
    inputCost: 0.01,
    outputCost: 0.02,
    totalCost: 0.03,
  }),
  generateCacheKey: jest.fn().mockReturnValue('cache-key'),
  CategorySuggestionSchema: {
    parse: jest.fn(),
  },
  ProductCategorizationResultSchema: {
    parse: jest.fn(),
  },
  ProductCategorizationErrorSchema: {
    parse: jest.fn(),
  },
  BatchCategorizationResultSchema: {
    parse: jest.fn(),
  },
}));

describe('API Key Validation', () => {
  let ctx: any;

  beforeEach(async () => {
    
    ctx = await t.run(async (ctx) => ctx);
  });

  describe('validateApiKeyConfiguration', () => {
    it('should detect missing API key', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const userId = await ctx.db.insert('users', {
        clerkId: 'user_test123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const orgId = await ctx.db.insert('organizations', {
        name: 'Test Org',
        clerkOrganizationId: 'org_123',
        slug: 'test-org',
        status: 'active',
        settings: {
          defaultProductStatus: 'active',
          requireProductApproval: false,
          enableAiCategorization: true,
          aiProvider: 'openai',
          apiKeys: {
            openai: undefined,
            anthropic: undefined,
            gemini: undefined,
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: orgId,
        userId,
        role: 'admin',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      // Setup auth
      ctx.auth.getUserIdentity.mockResolvedValue({
        tokenIdentifier: 'user_test123',
        subject: 'user_test123',
      });

      const module = await import('../categorization');
      const result = await ctx.runQuery('validateApiKeyConfiguration', {
        organizationId: orgId,
      });

      expect(result.hasApiKey).toBe(false);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('No API key configured for openai');
    });

    it('should validate OpenAI API key format', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const userId = await ctx.db.insert('users', {
        clerkId: 'user_test123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const orgId = await ctx.db.insert('organizations', {
        name: 'Test Org',
        clerkOrganizationId: 'org_123',
        slug: 'test-org',
        status: 'active',
        settings: {
          defaultProductStatus: 'active',
          requireProductApproval: false,
          enableAiCategorization: true,
          aiProvider: 'openai',
          apiKeys: {
            openai: 'invalid-key',
            anthropic: undefined,
            gemini: undefined,
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: orgId,
        userId,
        role: 'admin',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      // Setup auth
      ctx.auth.getUserIdentity.mockResolvedValue({
        tokenIdentifier: 'user_test123',
        subject: 'user_test123',
      });

      const module = await import('../categorization');
      const result = await ctx.runQuery('validateApiKeyConfiguration', {
        organizationId: orgId,
      });

      expect(result.hasApiKey).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid OpenAI API key format');
    });

    it('should validate valid OpenAI API key', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const userId = await ctx.db.insert('users', {
        clerkId: 'user_test123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const orgId = await ctx.db.insert('organizations', {
        name: 'Test Org',
        clerkOrganizationId: 'org_123',
        slug: 'test-org',
        status: 'active',
        settings: {
          defaultProductStatus: 'active',
          requireProductApproval: false,
          enableAiCategorization: true,
          aiProvider: 'openai',
          apiKeys: {
            openai: 'sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890',
            anthropic: undefined,
            gemini: undefined,
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: orgId,
        userId,
        role: 'admin',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      // Setup auth
      ctx.auth.getUserIdentity.mockResolvedValue({
        tokenIdentifier: 'user_test123',
        subject: 'user_test123',
      });

      const module = await import('../categorization');
      const result = await ctx.runQuery('validateApiKeyConfiguration', {
        organizationId: orgId,
      });

      expect(result.hasApiKey).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('checkModelAvailability', () => {
    it('should validate available models', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const module = await import('../categorization');
      
      const result = await ctx.runQuery('checkModelAvailability', {
        provider: 'openai',
        model: 'gpt-4o',
      });

      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect deprecated models', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const module = await import('../categorization');
      
      const result = await ctx.runQuery('checkModelAvailability', {
        provider: 'openai',
        model: 'text-davinci-003',
      });

      expect(result.available).toBe(false);
      expect(result.error).toContain('deprecated');
      expect(result.suggestion).toContain('gpt-4-turbo-preview');
    });

    it('should suggest corrections for misspelled models', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const module = await import('../categorization');
      
      const result = await ctx.runQuery('checkModelAvailability', {
        provider: 'openai',
        model: 'o3',
      });

      expect(result.available).toBe(false);
      expect(result.error).toContain('not recognized');
      expect(result.suggestion).toContain('gpt-4-turbo-preview');
    });

    it('should list available models for unknown model', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const module = await import('../categorization');
      
      const result = await ctx.runQuery('checkModelAvailability', {
        provider: 'openai',
        model: 'unknown-model',
      });

      expect(result.available).toBe(false);
      expect(result.error).toContain('not available');
      expect(result.suggestion).toContain('Available models:');
      expect(result.suggestion).toContain('gpt-4o');
    });
  });

  describe('createCategorizationJob with validation', () => {
    it('should reject job creation with missing API key', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const userId = await ctx.db.insert('users', {
        clerkId: 'user_test123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const orgId = await ctx.db.insert('organizations', {
        name: 'Test Org',
        clerkOrganizationId: 'org_123',
        slug: 'test-org',
        status: 'active',
        settings: {
          defaultProductStatus: 'active',
          requireProductApproval: false,
          enableAiCategorization: true,
          aiProvider: 'openai',
          apiKeys: {
            openai: undefined,
            anthropic: undefined,
            gemini: undefined,
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Test Project',
        slug: 'test-project',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: orgId,
        userId,
        role: 'admin',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      // Setup auth
      ctx.auth.getUserIdentity.mockResolvedValue({
        tokenIdentifier: 'user_test123',
        subject: 'user_test123',
      });

      const module = await import('../categorization');
      
      await expect(
        ctx.runMutation('createCategorizationJob', {
          organizationId: orgId,
          projectId,
          jobType: 'bulk_categorization',
          productIds: [],
          aiProvider: 'openai',
          aiModel: 'gpt-4o',
          prompt: 'Test prompt',
          notifications: {
            email: false,
            dashboard: true,
            recipients: [],
          },
        })
      ).rejects.toThrow('No API key configured for openai');
    });

    it('should reject job creation with invalid model', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
      const userId = await ctx.db.insert('users', {
        clerkId: 'user_test123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const orgId = await ctx.db.insert('organizations', {
        name: 'Test Org',
        clerkOrganizationId: 'org_123',
        slug: 'test-org',
        status: 'active',
        settings: {
          defaultProductStatus: 'active',
          requireProductApproval: false,
          enableAiCategorization: true,
          aiProvider: 'openai',
          apiKeys: {
            openai: 'sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890',
            anthropic: undefined,
            gemini: undefined,
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const projectId = await ctx.db.insert('projects', {
        organizationId: orgId,
        name: 'Test Project',
        slug: 'test-project',
        status: 'active',
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert('organizationMemberships', {
        organizationId: orgId,
        userId,
        role: 'admin',
        status: 'active',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      // Setup auth
      ctx.auth.getUserIdentity.mockResolvedValue({
        tokenIdentifier: 'user_test123',
        subject: 'user_test123',
      });

      const module = await import('../categorization');
      
      await expect(
        ctx.runMutation('createCategorizationJob', {
          organizationId: orgId,
          projectId,
          jobType: 'bulk_categorization',
          productIds: [],
          aiProvider: 'openai',
          aiModel: 'text-davinci-003',
          prompt: 'Test prompt',
          notifications: {
            email: false,
            dashboard: true,
            recipients: [],
          },
        })
      ).rejects.toThrow('deprecated');
    });
  });
});