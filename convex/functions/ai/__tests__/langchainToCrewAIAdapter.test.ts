import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { t } from '../../../test.setup';
import { LangChainToCrewAIAdapter } from '../langchainToCrewAIAdapter';
import { ConvexTestingHelper } from '../../../__tests__/convex-test-standard';
import { productFactory, categoryFactory } from '@test-factories';
import { z } from 'zod';
import {
  BatchCategorizationResultSchema,
  ProductCategorizationResultSchema,
} from '../langchain';

// Mock the internal action calls
jest.mock('../../../_generated/api', () => ({
  internal: {
    functions: {
      ai: {
        crews: {
          crewManager: {
            processBatchWithCrewAI: 'mocked-internal-action',
          },
        },
      },
    },
  },
}));

describe('LangChainToCrewAIAdapter', () => {
  let adapter: LangChainToCrewAIAdapter;
  let mockCtx: any;
  let testHelper: ConvexTestingHelper;

  beforeEach(async () => {
    adapter = new LangChainToCrewAIAdapter();
    testHelper = new ConvexTestingHelper();
    await testHelper.setup();
    
    // Create mock context with runAction
    mockCtx = {
      runAction: jest.fn(),
    };
  });

  afterEach(async () => {
    await testHelper.teardown();
  });

  describe('Request Transformation', () => {
    it('should transform LangChain request to CrewAI format', async () => {
      // Arrange
      const products = [
        productFactory.build({ title: 'Test Product 1' }),
        productFactory.build({ title: 'Test Product 2' }),
      ];
      const categories = [
        { id: 'cat1', name: 'Category 1', handle: 'cat-1', path: '/cat-1' },
        { id: 'cat2', name: 'Category 2', handle: 'cat-2', path: '/cat-2' },
      ];
      const customPrompt = 'Test categorization prompt';
      const provider = 'openai' as const;
      const model = 'gpt-4';
      
      // Mock CrewAI response
      const mockCrewResponse = {
        crewId: 'test-crew-id',
        sessionId: 'test-session-id',
        products: products.map(p => ({
          productId: p._id,
          analysisResult: {
            productId: p._id,
            features: ['feature1', 'feature2'],
            characteristics: { type: 'test' },
            keyAttributes: ['attr1'],
            confidence: 0.9,
          },
          matchingResult: {
            productId: p._id,
            suggestedCategories: [
              { categoryId: 'cat1', confidence: 0.95, reasoning: 'High match' },
              { categoryId: 'cat2', confidence: 0.75, reasoning: 'Good match' },
            ],
          },
          validationResult: {
            productId: p._id,
            isValid: true,
            finalCategory: 'cat1',
            confidence: 0.9,
            qualityScore: 0.85,
          },
          processingTime: 100,
        })),
        metrics: {
          totalTasks: 6,
          completedTasks: 6,
          failedTasks: 0,
          averageTaskDuration: 100,
          tokensUsed: 1000,
          estimatedCost: 0.05,
          throughput: 120,
          memoryPeakUsage: 1024,
        },
      };
      
      mockCtx.runAction.mockResolvedValue(mockCrewResponse);

      // Act
      const result = await adapter.processBatchWithLangChain(
        mockCtx,
        products,
        categories,
        customPrompt,
        provider,
        'test-api-key',
        model,
        { maxRetries: 3, temperature: 0.7 }
      );

      // Assert
      expect(mockCtx.runAction).toHaveBeenCalledWith(
        'mocked-internal-action',
        expect.objectContaining({
          organizationId: products[0].organizationId,
          productIds: products.map(p => p._id),
          categoryIds: ['cat1', 'cat2'],
          options: expect.objectContaining({
            provider: 'openai',
            model: 'gpt-4',
            temperature: 0.7,
            customPrompt: customPrompt,
          }),
        })
      );
      
      // Validate result format matches LangChain schema
      const validation = BatchCategorizationResultSchema.safeParse(result);
      expect(validation.success).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('success');
      expect(result[0].suggestions).toHaveLength(2);
    });
  });

  describe('Response Transformation', () => {
    it('should transform CrewAI response to LangChain format', async () => {
      // Arrange
      const product = productFactory.build({ title: 'Test Product' });
      const categories = [
        { id: 'cat1', name: 'Category 1', handle: 'cat-1', path: '/cat-1' },
      ];
      
      // Mock CrewAI response with successful categorization
      const mockCrewResponse = {
        crewId: 'test-crew-id',
        sessionId: 'test-session-id',
        products: [{
          productId: product._id,
          analysisResult: {
            productId: product._id,
            features: ['lightweight', 'portable', 'durable'],
            characteristics: { type: 'grilling-tool', material: 'stainless-steel' },
            keyAttributes: ['heat-resistant', 'dishwasher-safe'],
            confidence: 0.92,
          },
          matchingResult: {
            productId: product._id,
            suggestedCategories: [
              { categoryId: 'cat1', confidence: 0.95, reasoning: 'Perfect match for grilling tools' },
            ],
            newCategoryRecommendations: ['Grilling Accessories'],
          },
          validationResult: {
            productId: product._id,
            isValid: true,
            finalCategory: 'cat1',
            confidence: 0.95,
            qualityScore: 0.9,
          },
          processingTime: 150,
        }],
        metrics: {
          totalTasks: 3,
          completedTasks: 3,
          failedTasks: 0,
          averageTaskDuration: 150,
          tokensUsed: 500,
          estimatedCost: 0.025,
          throughput: 400,
          memoryPeakUsage: 512,
        },
      };
      
      mockCtx.runAction.mockResolvedValue(mockCrewResponse);

      // Act
      const result = await adapter.processBatchWithLangChain(
        mockCtx,
        [product],
        categories,
        'Categorize this product',
        'openai',
        'test-api-key',
        'gpt-4'
      );

      // Assert
      expect(result).toHaveLength(1);
      const productResult = result[0];
      
      // Validate transformed result
      expect(productResult.productId).toBe(product._id);
      expect(productResult.status).toBe('success');
      expect(productResult.suggestions).toHaveLength(1);
      expect(productResult.suggestions[0]).toEqual({
        categoryId: 'cat1',
        confidence: 0.95,
        rationale: 'Perfect match for grilling tools',
      });
      expect(productResult.keyFeatures).toEqual(['lightweight', 'portable', 'durable']);
      expect(productResult.productType).toBe('grilling-tool');
      expect(productResult.newCategorySuggestions).toHaveLength(1);
      expect(productResult.newCategorySuggestions[0].name).toBe('Grilling Accessories');
    });

    it('should handle CrewAI errors and transform to LangChain error format', async () => {
      // Arrange
      const product = productFactory.build();
      const categories = [{ id: 'cat1', name: 'Category 1', handle: 'cat-1', path: '/cat-1' }];
      
      // Mock CrewAI response with error
      const mockCrewResponse = {
        crewId: 'test-crew-id',
        sessionId: 'test-session-id',
        products: [{
          productId: product._id,
          error: 'Failed to analyze product: timeout',
          processingTime: 5000,
        }],
        metrics: {
          totalTasks: 3,
          completedTasks: 0,
          failedTasks: 3,
          averageTaskDuration: 5000,
          tokensUsed: 0,
          estimatedCost: 0,
          throughput: 0,
          memoryPeakUsage: 256,
        },
      };
      
      mockCtx.runAction.mockResolvedValue(mockCrewResponse);

      // Act
      const result = await adapter.processBatchWithLangChain(
        mockCtx,
        [product],
        categories,
        'Categorize',
        'openai',
        'test-api-key',
        'gpt-4'
      );

      // Assert
      expect(result).toHaveLength(1);
      const errorResult = result[0];
      expect(errorResult.productId).toBe(product._id);
      expect(errorResult.status).toBe('error');
      expect(errorResult.error).toBe('Failed to analyze product: timeout');
      expect(errorResult.suggestions).toEqual([]);
    });
  });

  describe('Caching', () => {
    it('should return cached results without calling CrewAI', async () => {
      // Arrange
      const product1 = productFactory.build({ title: 'Cached Product', vendor: 'TestVendor' });
      const product2 = productFactory.build({ title: 'New Product', vendor: 'OtherVendor' });
      const categories = [{ id: 'cat1', name: 'Category 1', handle: 'cat-1', path: '/cat-1' }];
      
      // Pre-populate cache with product1
      const cachedResult: z.infer<typeof ProductCategorizationResultSchema> = {
        productId: 'cached-id',
        suggestions: [{ categoryId: 'cat1', confidence: 0.9, rationale: 'Cached result' }],
        keyFeatures: ['cached-feature'],
        status: 'success',
      };
      
      const adapterWithCache = new LangChainToCrewAIAdapter();
      // Access private cache for testing (in real code, use dependency injection)
      (adapterWithCache as any).cache.set('testvendor::cached product', cachedResult);
      
      // Mock CrewAI response for uncached product only
      const mockCrewResponse = {
        crewId: 'test-crew-id',
        sessionId: 'test-session-id',
        products: [{
          productId: product2._id,
          analysisResult: { features: ['new-feature'] },
          matchingResult: {
            suggestedCategories: [
              { categoryId: 'cat1', confidence: 0.85, reasoning: 'New match' },
            ],
          },
          validationResult: { isValid: true },
          processingTime: 100,
        }],
        metrics: { completedTasks: 1, failedTasks: 0 },
      };
      
      mockCtx.runAction.mockResolvedValue(mockCrewResponse);

      // Act
      const result = await adapterWithCache.processBatchWithLangChain(
        mockCtx,
        [product1, product2],
        categories,
        'Categorize',
        'openai',
        'test-api-key',
        'gpt-4'
      );

      // Assert
      expect(mockCtx.runAction).toHaveBeenCalledTimes(1); // Only called for uncached product
      expect(result).toHaveLength(2);
      
      // Check cached result
      expect(result[0].productId).toBe(product1._id);
      expect(result[0].suggestions[0].rationale).toBe('Cached result');
      
      // Check new result
      expect(result[1].productId).toBe(product2._id);
      expect(result[1].suggestions[0].rationale).toBe('New match');
    });
  });

  describe('Error Handling', () => {
    it('should handle CrewAI action failure and return error results', async () => {
      // Arrange
      const products = [productFactory.build(), productFactory.build()];
      const categories = [{ id: 'cat1', name: 'Category 1', handle: 'cat-1', path: '/cat-1' }];
      
      mockCtx.runAction.mockRejectedValue(new Error('CrewAI service unavailable'));

      // Act
      const result = await adapter.processBatchWithLangChain(
        mockCtx,
        products,
        categories,
        'Categorize',
        'openai',
        'test-api-key',
        'gpt-4'
      );

      // Assert
      expect(result).toHaveLength(2);
      result.forEach((productResult, index) => {
        expect(productResult.productId).toBe(products[index]._id);
        expect(productResult.status).toBe('error');
        expect(productResult.error).toContain('Failed to process with CrewAI');
        expect(productResult.suggestions).toEqual([]);
      });
    });

    it('should handle missing products in CrewAI response', async () => {
      // Arrange
      const products = [
        productFactory.build({ title: 'Product 1' }),
        productFactory.build({ title: 'Product 2' }),
        productFactory.build({ title: 'Product 3' }),
      ];
      const categories = [{ id: 'cat1', name: 'Category 1', handle: 'cat-1', path: '/cat-1' }];
      
      // Mock CrewAI response missing product 2
      const mockCrewResponse = {
        crewId: 'test-crew-id',
        sessionId: 'test-session-id',
        products: [
          {
            productId: products[0]._id,
            analysisResult: { features: ['feature1'] },
            matchingResult: {
              suggestedCategories: [{ categoryId: 'cat1', confidence: 0.9, reasoning: 'Match' }],
            },
            processingTime: 100,
          },
          {
            productId: products[2]._id,
            analysisResult: { features: ['feature3'] },
            matchingResult: {
              suggestedCategories: [{ categoryId: 'cat1', confidence: 0.8, reasoning: 'Match' }],
            },
            processingTime: 100,
          },
        ],
        metrics: { completedTasks: 2, failedTasks: 1 },
      };
      
      mockCtx.runAction.mockResolvedValue(mockCrewResponse);

      // Act
      const result = await adapter.processBatchWithLangChain(
        mockCtx,
        products,
        categories,
        'Categorize',
        'openai',
        'test-api-key',
        'gpt-4'
      );

      // Assert
      expect(result).toHaveLength(3);
      
      // Check processed products
      expect(result[0].status).toBe('success');
      expect(result[2].status).toBe('success');
      
      // Check missing product
      const missingResult = result.find(r => r.productId === products[1]._id);
      expect(missingResult).toBeDefined();
      expect(missingResult!.status).toBe('error');
      expect(missingResult!.error).toBe('Product was not processed by CrewAI');
    });
  });
});