import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import {
  initializeLLM,
  createCategorizationChain,
  formatProductsForPrompt,
  formatCategoriesForPrompt,
  estimateTokenCount,
  estimateCost,
  generateCacheKey,
  ProductCategorizationCache,
  AIProvider,
  CategoryContext,
} from '../langchain';
import { Doc } from '../../../_generated/dataModel';

// Mock the LangChain imports
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation((options) => ({
    ...options,
    _llmType: 'openai',
  })),
}));

vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation((options) => ({
    ...options,
    _llmType: 'anthropic',
  })),
}));

vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation((options) => ({
    ...options,
    _llmType: 'gemini',
  })),
}));

vi.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: {
    fromMessages: vi.fn().mockReturnValue('mocked-prompt'),
  },
}));

vi.mock('@langchain/core/output_parsers', () => ({
  StructuredOutputParser: {
    fromZodSchema: vi.fn().mockReturnValue({
      getFormatInstructions: vi.fn().mockReturnValue('format-instructions'),
    }),
  },
}));

vi.mock('@langchain/core/runnables', () => ({
  RunnableSequence: {
    from: vi.fn().mockReturnValue('mocked-chain'),
  },
}));

describe('LangChain AI Integration', () => {
  describe('initializeLLM', () => {
    it('should initialize OpenAI model correctly', () => {
      const llm = initializeLLM('openai', 'test-api-key', 'gpt-4', {
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(llm).toHaveProperty('apiKey', 'test-api-key');
      expect(llm).toHaveProperty('modelName', 'gpt-4');
      expect(llm).toHaveProperty('temperature', 0.5);
      expect(llm).toHaveProperty('maxTokens', 1000);
      expect(llm).toHaveProperty('_llmType', 'openai');
    });

    it('should initialize Anthropic model correctly', () => {
      const llm = initializeLLM('anthropic', 'test-api-key', 'claude-3-opus', {
        temperature: 0.3,
      });

      expect(llm).toHaveProperty('anthropicApiKey', 'test-api-key');
      expect(llm).toHaveProperty('modelName', 'claude-3-opus');
      expect(llm).toHaveProperty('temperature', 0.3);
      expect(llm).toHaveProperty('_llmType', 'anthropic');
    });

    it('should initialize Gemini model correctly', () => {
      const llm = initializeLLM('gemini', 'test-api-key', 'gemini-1.5-pro', {
        temperature: 0.4,
        maxTokens: 1500,
      });

      expect(llm).toHaveProperty('apiKey', 'test-api-key');
      expect(llm).toHaveProperty('modelName', 'gemini-1.5-pro');
      expect(llm).toHaveProperty('temperature', 0.4);
      expect(llm).toHaveProperty('maxOutputTokens', 1500);
      expect(llm).toHaveProperty('_llmType', 'gemini');
      
      // Verify safety settings are included
      expect(llm).toHaveProperty('safetySettings');
      expect(llm.safetySettings).toHaveLength(4);
    });

    it('should use default options when not provided', () => {
      const llm = initializeLLM('gemini', 'test-api-key', 'gemini-1.5-flash');

      expect(llm).toHaveProperty('temperature', 0.3);
      expect(llm).toHaveProperty('maxOutputTokens', 2000);
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        initializeLLM('unsupported' as AIProvider, 'test-api-key', 'model');
      }).toThrow('Unsupported AI provider: unsupported');
    });
  });

  describe('Cost Estimation', () => {
    it('should calculate costs for OpenAI models', () => {
      const cost = estimateCost('openai', 'gpt-4', 1000, 500);
      
      expect(cost.inputCost).toBeCloseTo(0.03);
      expect(cost.outputCost).toBeCloseTo(0.03);
      expect(cost.totalCost).toBeCloseTo(0.06);
    });

    it('should calculate costs for Anthropic models', () => {
      const cost = estimateCost('anthropic', 'claude-3-sonnet', 2000, 1000);
      
      expect(cost.inputCost).toBeCloseTo(0.006);
      expect(cost.outputCost).toBeCloseTo(0.015);
      expect(cost.totalCost).toBeCloseTo(0.021);
    });

    it('should calculate costs for Gemini models', () => {
      const cost = estimateCost('gemini', 'gemini-1.5-flash', 10000, 5000);
      
      expect(cost.inputCost).toBeCloseTo(0.00075);
      expect(cost.outputCost).toBeCloseTo(0.0015);
      expect(cost.totalCost).toBeCloseTo(0.00225);
    });

    it('should calculate costs for Gemini Pro model', () => {
      const cost = estimateCost('gemini', 'gemini-1.5-pro', 1000, 1000);
      
      expect(cost.inputCost).toBeCloseTo(0.0035);
      expect(cost.outputCost).toBeCloseTo(0.0105);
      expect(cost.totalCost).toBeCloseTo(0.014);
    });

    it('should use default rates for unknown models', () => {
      const cost = estimateCost('gemini', 'unknown-model', 1000, 1000);
      
      expect(cost.inputCost).toBeCloseTo(0.01);
      expect(cost.outputCost).toBeCloseTo(0.03);
      expect(cost.totalCost).toBeCloseTo(0.04);
    });
  });

  describe('Product Formatting', () => {
    it('should format products correctly for prompt', () => {
      const products: Partial<Doc<'products'>>[] = [
        {
          _id: 'prod1' as any,
          title: 'Test Product',
          description: 'A test product description',
          productType: 'Electronics',
          vendor: 'Test Vendor',
          tags: ['tag1', 'tag2'],
        },
        {
          _id: 'prod2' as any,
          title: 'Another Product',
          tags: [],
        },
      ];

      const formatted = formatProductsForPrompt(products as Doc<'products'>[]);
      
      expect(formatted).toContain('Product 1 (ID: prod1)');
      expect(formatted).toContain('Title: Test Product');
      expect(formatted).toContain('Description: A test product description');
      expect(formatted).toContain('Type: Electronics');
      expect(formatted).toContain('Vendor: Test Vendor');
      expect(formatted).toContain('Tags: tag1, tag2');
      
      expect(formatted).toContain('Product 2 (ID: prod2)');
      expect(formatted).toContain('Title: Another Product');
      expect(formatted).not.toContain('Product 2.*Tags:');
    });
  });

  describe('Category Formatting', () => {
    it('should format categories with hierarchy', () => {
      const categories: CategoryContext[] = [
        {
          id: 'cat1',
          name: 'Electronics',
          handle: 'electronics',
          path: '/electronics',
          description: 'Electronic products',
        },
        {
          id: 'cat2',
          name: 'Computers',
          handle: 'computers',
          path: '/electronics/computers',
        },
      ];

      const formatted = formatCategoriesForPrompt(categories);
      
      expect(formatted).toContain('- Electronics (electronics): Electronic products');
      expect(formatted).toContain('  - Computers (computers)');
    });

    it('should handle empty categories', () => {
      const formatted = formatCategoriesForPrompt([]);
      expect(formatted).toBe('No categories available yet. Please suggest new categories.');
    });
  });

  describe('Token Estimation', () => {
    it('should estimate token count', () => {
      const text = 'This is a test string with approximately 10 words.';
      const tokens = estimateTokenCount(text);
      
      // ~4 characters per token
      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(20);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const product: Partial<Doc<'products'>> = {
        title: '  Test Product  ',
        productType: 'Electronics',
        vendor: 'Test Vendor',
      };

      const key = generateCacheKey(product as Doc<'products'>);
      expect(key).toBe('test vendor:electronics:test product');
    });

    it('should handle missing fields', () => {
      const product: Partial<Doc<'products'>> = {
        title: 'Test Product',
      };

      const key = generateCacheKey(product as Doc<'products'>);
      expect(key).toBe('::test product');
    });
  });

  describe('ProductCategorizationCache', () => {
    let cache: ProductCategorizationCache;

    beforeEach(() => {
      cache = new ProductCategorizationCache(1000); // 1 second TTL for testing
    });

    it('should store and retrieve results', () => {
      const result = {
        productId: 'test-id',
        suggestions: [],
        keyFeatures: [],
        status: 'success' as const,
      };

      cache.set('test-key', result);
      expect(cache.get('test-key')).toEqual(result);
      expect(cache.size()).toBe(1);
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeNull();
    });

    it('should expire old entries', async () => {
      const result = {
        productId: 'test-id',
        suggestions: [],
        keyFeatures: [],
        status: 'success' as const,
      };

      cache.set('test-key', result);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(cache.get('test-key')).toBeNull();
      expect(cache.size()).toBe(0);
    });

    it('should clear all entries', () => {
      cache.set('key1', { productId: 'id1', suggestions: [], keyFeatures: [], status: 'success' });
      cache.set('key2', { productId: 'id2', suggestions: [], keyFeatures: [], status: 'success' });
      
      expect(cache.size()).toBe(2);
      
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });
});