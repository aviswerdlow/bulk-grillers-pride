import { describe, it, expect } from '@jest/globals';
import { convexTest, createMockCtx } from '../../../__tests__/test-helpers';

// Mock the langchain module
jest.mock('../langchain', () => ({
  AIProvider: 'openai' as const,
  processBatchWithLangChain: jest.fn(),
}));

describe('API Key Validation', () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest();
  });

  describe('validateApiKeyConfiguration', () => {
    it('should detect missing API key', async () => {
      const userId = await testHelper.createUser({
        clerkId: 'user_test123',
        email: 'test@example.com',
      });

      const orgId = await testHelper.createOrganization({
        name: 'Test Org',
        slug: 'test-org',
        settings: {
          aiProvider: 'openai',
          apiKeys: {
            openai: undefined,
            anthropic: undefined,
            gemini: undefined,
          },
        },
      });

      await testHelper.createMembership({
        organizationId: orgId,
        userId,
        role: 'admin',
      });

      testHelper.withAuth('user_test123');

      const module = await import('../categorization');
      const result = await testHelper.runQuery(module.validateApiKeyConfiguration, {
        organizationId: orgId,
      });

      expect(result.hasApiKey).toBe(false);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('No API key configured for openai');
    });

    it('should validate OpenAI API key format', async () => {
      const userId = await testHelper.createUser({
        clerkId: 'user_test123',
        email: 'test@example.com',
      });

      const orgId = await testHelper.createOrganization({
        name: 'Test Org',
        slug: 'test-org',
        settings: {
          aiProvider: 'openai',
          apiKeys: {
            openai: 'invalid-key',
            anthropic: undefined,
            gemini: undefined,
          },
        },
      });

      await testHelper.createMembership({
        organizationId: orgId,
        userId,
        role: 'admin',
      });

      testHelper.withAuth('user_test123');

      const module = await import('../categorization');
      const result = await testHelper.runQuery(module.validateApiKeyConfiguration, {
        organizationId: orgId,
      });

      expect(result.hasApiKey).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid OpenAI API key format');
    });

    it('should validate valid OpenAI API key', async () => {
      const userId = await testHelper.createUser({
        clerkId: 'user_test123',
        email: 'test@example.com',
      });

      const orgId = await testHelper.createOrganization({
        name: 'Test Org',
        slug: 'test-org',
        settings: {
          aiProvider: 'openai',
          apiKeys: {
            openai: 'sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890',
            anthropic: undefined,
            gemini: undefined,
          },
        },
      });

      await testHelper.createMembership({
        organizationId: orgId,
        userId,
        role: 'admin',
      });

      testHelper.withAuth('user_test123');

      const module = await import('../categorization');
      const result = await testHelper.runQuery(module.validateApiKeyConfiguration, {
        organizationId: orgId,
      });

      expect(result.hasApiKey).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('checkModelAvailability', () => {
    it('should validate available models', async () => {
      const module = await import('../categorization');
      
      const result = await testHelper.runQuery(module.checkModelAvailability, {
        provider: 'openai',
        model: 'gpt-4o',
      });

      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect deprecated models', async () => {
      const module = await import('../categorization');
      
      const result = await testHelper.runQuery(module.checkModelAvailability, {
        provider: 'openai',
        model: 'text-davinci-003',
      });

      expect(result.available).toBe(false);
      expect(result.error).toContain('deprecated');
      expect(result.suggestion).toContain('gpt-4-turbo-preview');
    });

    it('should suggest corrections for misspelled models', async () => {
      const module = await import('../categorization');
      
      const result = await testHelper.runQuery(module.checkModelAvailability, {
        provider: 'openai',
        model: 'o3',
      });

      expect(result.available).toBe(false);
      expect(result.error).toContain('not recognized');
      expect(result.suggestion).toContain('gpt-4-turbo-preview');
    });

    it('should list available models for unknown model', async () => {
      const module = await import('../categorization');
      
      const result = await testHelper.runQuery(module.checkModelAvailability, {
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
      const userId = await testHelper.createUser({
        clerkId: 'user_test123',
        email: 'test@example.com',
      });

      const orgId = await testHelper.createOrganization({
        name: 'Test Org',
        slug: 'test-org',
        settings: {
          aiProvider: 'openai',
          apiKeys: {
            openai: undefined,
            anthropic: undefined,
            gemini: undefined,
          },
        },
      });

      const projectId = await testHelper.createProject({
        organizationId: orgId,
        name: 'Test Project',
        createdBy: userId,
      });

      await testHelper.createMembership({
        organizationId: orgId,
        userId,
        role: 'admin',
      });

      testHelper.withAuth('user_test123');

      const module = await import('../categorization');
      
      await expect(
        testHelper.runMutation(module.createCategorizationJob, {
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
      const userId = await testHelper.createUser({
        clerkId: 'user_test123',
        email: 'test@example.com',
      });

      const orgId = await testHelper.createOrganization({
        name: 'Test Org',
        slug: 'test-org',
        settings: {
          aiProvider: 'openai',
          apiKeys: {
            openai: 'sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890',
            anthropic: undefined,
            gemini: undefined,
          },
        },
      });

      const projectId = await testHelper.createProject({
        organizationId: orgId,
        name: 'Test Project',
        createdBy: userId,
      });

      await testHelper.createMembership({
        organizationId: orgId,
        userId,
        role: 'admin',
      });

      testHelper.withAuth('user_test123');

      const module = await import('../categorization');
      
      await expect(
        testHelper.runMutation(module.createCategorizationJob, {
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