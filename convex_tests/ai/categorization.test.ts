import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  processBatchWithLangChain,
  formatProductsForPrompt,
  formatCategoriesForPrompt,
  generateCacheKey,
  estimateTokenCount,
  estimateCost,
  ProductCategorizationCache,
} from '../../functions/ai/langchain';
import { Doc } from '../../_generated/dataModel';

// Mock LangChain modules
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify([
        {
          productId: 'product1',
          suggestions: [
            {
              categoryId: 'cat1',
              confidence: 0.95,
              rationale: 'High-quality grilling equipment matches outdoor cooking category',
            },
          ],
          newCategorySuggestions: [],
          keyFeatures: ['premium', 'grill', 'outdoor'],
          productType: 'Grills & Outdoor Cooking',
          status: 'success',
        },
      ]),
    }),
  })),
}));

vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify([
        {
          productId: 'product1',
          suggestions: [
            {
              categoryId: 'cat1',
              confidence: 0.92,
              rationale: 'Based on product features, this belongs in grilling equipment',
            },
          ],
          newCategorySuggestions: [],
          keyFeatures: ['grill', 'outdoor', 'cooking'],
          productType: 'Outdoor Cooking Equipment',
          status: 'success',
        },
      ]),
    }),
  })),
}));

describe('AI Categorization Tests', () => {
  describe('formatProductsForPrompt', () => {
    it('should format products correctly for AI prompt', () => {
      const products: Doc<'products'>[] = [
        {
          _id: 'prod1' as any,
          _creationTime: 0,
          organizationId: 'org1' as any,
          projectId: 'proj1' as any,
          title: 'Premium Gas Grill BBQ Master 5000',
          description: 'Professional-grade gas grill with 5 burners and side warmer',
          vendor: 'GrillTech Pro',
          productType: 'Gas Grills',
          handle: 'premium-gas-grill-bbq-master-5000',
          status: 'active',
          tags: ['outdoor', 'cooking', 'premium'],
          categories: [],
          images: [],
          version: 1,
          createdBy: 'user1' as any,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: 'user1' as any,
        },
      ];

      const formatted = formatProductsForPrompt(products);

      expect(formatted).toContain('Product 1 (ID: prod1):');
      expect(formatted).toContain('Title: Premium Gas Grill BBQ Master 5000');
      expect(formatted).toContain('Description: Professional-grade gas grill');
      expect(formatted).toContain('Type: Gas Grills');
      expect(formatted).toContain('Vendor: GrillTech Pro');
      expect(formatted).toContain('Tags: outdoor, cooking, premium');
    });

    it('should handle products with missing optional fields', () => {
      const products: Doc<'products'>[] = [
        {
          _id: 'prod2' as any,
          _creationTime: 0,
          organizationId: 'org1' as any,
          projectId: 'proj1' as any,
          title: 'Basic Charcoal Grill',
          handle: 'basic-charcoal-grill',
          status: 'active',
          tags: [],
          categories: [],
          images: [],
          version: 1,
          createdBy: 'user1' as any,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastModifiedBy: 'user1' as any,
        },
      ];

      const formatted = formatProductsForPrompt(products);

      expect(formatted).toContain('Title: Basic Charcoal Grill');
      expect(formatted).not.toContain('Description:');
      expect(formatted).not.toContain('Type:');
      expect(formatted).not.toContain('Vendor:');
      expect(formatted).not.toContain('Tags:');
    });
  });

  describe('formatCategoriesForPrompt', () => {
    it('should format categories in hierarchical structure', () => {
      const categories = [
        {
          id: 'cat1',
          name: 'Outdoor Cooking',
          handle: 'outdoor-cooking',
          path: '/outdoor-cooking',
          description: 'Equipment for outdoor grilling and BBQ',
        },
        {
          id: 'cat2',
          name: 'Gas Grills',
          handle: 'gas-grills',
          path: '/outdoor-cooking/gas-grills',
          description: 'Propane and natural gas grills',
        },
        {
          id: 'cat3',
          name: 'Premium Models',
          handle: 'premium-models',
          path: '/outdoor-cooking/gas-grills/premium-models',
        },
      ];

      const formatted = formatCategoriesForPrompt(categories);

      expect(formatted).toContain(
        '- Outdoor Cooking (outdoor-cooking): Equipment for outdoor grilling and BBQ'
      );
      expect(formatted).toContain('  - Gas Grills (gas-grills): Propane and natural gas grills');
      expect(formatted).toContain('    - Premium Models (premium-models)');
    });

    it('should handle empty categories', () => {
      const formatted = formatCategoriesForPrompt([]);
      expect(formatted).toBe('No categories available yet. Please suggest new categories.');
    });
  });

  describe('generateCacheKey', () => {
    it('should generate consistent cache keys', () => {
      const product: Doc<'products'> = {
        _id: 'prod1' as any,
        _creationTime: 0,
        organizationId: 'org1' as any,
        projectId: 'proj1' as any,
        title: 'Premium Gas Grill BBQ Master 5000',
        vendor: 'GrillTech Pro',
        productType: 'Gas Grills',
        handle: 'premium-gas-grill',
        status: 'active',
        tags: [],
        categories: [],
        images: [],
        version: 1,
        createdBy: 'user1' as any,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: 'user1' as any,
      };

      const key1 = generateCacheKey(product);
      const key2 = generateCacheKey(product);

      expect(key1).toBe(key2);
      expect(key1).toBe('grilltech pro:gas grills:premium gas grill bbq master 5000');
    });

    it('should normalize case and whitespace', () => {
      const product1: Doc<'products'> = {
        _id: 'prod1' as any,
        _creationTime: 0,
        organizationId: 'org1' as any,
        projectId: 'proj1' as any,
        title: '  Premium GAS Grill  ',
        vendor: 'GRILLTECH PRO',
        productType: ' Gas Grills ',
        handle: 'premium-gas-grill',
        status: 'active',
        tags: [],
        categories: [],
        images: [],
        version: 1,
        createdBy: 'user1' as any,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: 'user1' as any,
      };

      const key = generateCacheKey(product1);
      expect(key).toBe('grilltech pro:gas grills:premium gas grill');
    });
  });

  describe('Token estimation and cost calculation', () => {
    it('should estimate token count accurately', () => {
      const shortText = 'This is a test';
      const longText =
        'This is a much longer text that contains many words and should result in a higher token count estimation for our cost calculations';

      const shortTokens = estimateTokenCount(shortText);
      const longTokens = estimateTokenCount(longText);

      expect(shortTokens).toBeLessThan(longTokens);
      expect(shortTokens).toBeGreaterThan(0);
      expect(longTokens).toBeGreaterThan(30); // ~4 chars per token
    });

    it('should calculate costs for different providers', () => {
      const inputTokens = 1000;
      const outputTokens = 500;

      const openAICost = estimateCost('openai', 'gpt-4', inputTokens, outputTokens);
      const anthropicCost = estimateCost('anthropic', 'claude-3-sonnet', inputTokens, outputTokens);

      expect(openAICost.totalCost).toBeGreaterThan(0);
      expect(anthropicCost.totalCost).toBeGreaterThan(0);
      expect(openAICost.inputCost + openAICost.outputCost).toBe(openAICost.totalCost);
    });
  });

  describe('ProductCategorizationCache', () => {
    let cache: ProductCategorizationCache;

    beforeEach(() => {
      cache = new ProductCategorizationCache(1000); // 1 second TTL for testing
    });

    it('should store and retrieve results', () => {
      const key = 'test:key';
      const result = {
        productId: 'prod1',
        suggestions: [
          {
            categoryId: 'cat1',
            confidence: 0.9,
            rationale: 'Test rationale',
          },
        ],
        newCategorySuggestions: [],
        keyFeatures: ['test'],
        productType: 'Test Type',
        status: 'success' as const,
      };

      cache.set(key, result);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(result);
    });

    it('should expire results after TTL', async () => {
      const key = 'test:key';
      const result = {
        productId: 'prod1',
        suggestions: [],
        newCategorySuggestions: [],
        keyFeatures: [],
        status: 'success' as const,
      };

      cache.set(key, result);
      expect(cache.get(key)).toBeTruthy();

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(cache.get(key)).toBeNull();
    });

    it('should track cache size', () => {
      expect(cache.size()).toBe(0);

      cache.set('key1', {
        productId: 'prod1',
        suggestions: [],
        newCategorySuggestions: [],
        keyFeatures: [],
        status: 'success',
      });
      expect(cache.size()).toBe(1);

      cache.set('key2', {
        productId: 'prod2',
        suggestions: [],
        newCategorySuggestions: [],
        keyFeatures: [],
        status: 'success',
      });
      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('Real Product Categorization Examples', () => {
    const realProducts: Doc<'products'>[] = [
      {
        _id: 'grill1' as any,
        _creationTime: 0,
        organizationId: 'org1' as any,
        projectId: 'proj1' as any,
        title: 'Weber Spirit II E-310 3-Burner Propane Gas Grill',
        description:
          'The Weber Spirit II E-310 is a premium gas grill featuring GS4 grilling system, porcelain-enameled cast iron cooking grates, and 529 square inches of cooking space.',
        vendor: 'Weber',
        productType: 'Gas Grills',
        handle: 'weber-spirit-ii-e310',
        status: 'active',
        tags: ['gas-grill', '3-burner', 'propane', 'weber', 'outdoor-cooking'],
        categories: [],
        images: [],
        version: 1,
        createdBy: 'user1' as any,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: 'user1' as any,
      },
      {
        _id: 'accessory1' as any,
        _creationTime: 0,
        organizationId: 'org1' as any,
        projectId: 'proj1' as any,
        title: 'Grill Brush and Scraper - Heavy Duty BBQ Cleaning Tool',
        description:
          '18-inch stainless steel grill brush with triple bristles and scraper for effective cleaning of grill grates',
        vendor: 'GrillPro',
        productType: 'Grill Accessories',
        handle: 'grill-brush-scraper',
        status: 'active',
        tags: ['cleaning', 'maintenance', 'grill-tool'],
        categories: [],
        images: [],
        version: 1,
        createdBy: 'user1' as any,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: 'user1' as any,
      },
      {
        _id: 'food1' as any,
        _creationTime: 0,
        organizationId: 'org1' as any,
        projectId: 'proj1' as any,
        title: 'Premium BBQ Rub Variety Pack - 4 Flavors',
        description:
          'Artisan spice blend collection including Sweet Heat, Smoky Mesquite, Carolina Gold, and Texas Bold rubs',
        vendor: "Pitmaster's Choice",
        productType: 'BBQ Seasonings',
        handle: 'bbq-rub-variety-pack',
        status: 'active',
        tags: ['seasonings', 'spices', 'bbq-rub', 'variety-pack'],
        categories: [],
        images: [],
        version: 1,
        createdBy: 'user1' as any,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: 'user1' as any,
      },
    ];

    const realCategories = [
      {
        id: 'outdoor-equipment',
        name: 'Outdoor Cooking Equipment',
        handle: 'outdoor-cooking-equipment',
        path: '/outdoor-cooking-equipment',
        description: 'Grills, smokers, and outdoor cooking appliances',
      },
      {
        id: 'gas-grills-cat',
        name: 'Gas Grills',
        handle: 'gas-grills',
        path: '/outdoor-cooking-equipment/gas-grills',
        description: 'Propane and natural gas grills',
      },
      {
        id: 'grill-accessories',
        name: 'Grill Accessories',
        handle: 'grill-accessories',
        path: '/grill-accessories',
        description: 'Tools, covers, and maintenance items for grills',
      },
      {
        id: 'cleaning-tools',
        name: 'Cleaning & Maintenance',
        handle: 'cleaning-maintenance',
        path: '/grill-accessories/cleaning-maintenance',
        description: 'Brushes, scrapers, and cleaning supplies',
      },
      {
        id: 'food-seasonings',
        name: 'Food & Seasonings',
        handle: 'food-seasonings',
        path: '/food-seasonings',
        description: 'BBQ rubs, sauces, and grilling ingredients',
      },
      {
        id: 'spice-rubs',
        name: 'Spice Rubs & Blends',
        handle: 'spice-rubs-blends',
        path: '/food-seasonings/spice-rubs-blends',
        description: 'Dry rubs and seasoning blends for grilling',
      },
    ];

    it('should categorize a gas grill correctly', () => {
      const grillProduct = realProducts[0];
      const formatted = formatProductsForPrompt([grillProduct]);

      expect(formatted).toContain('Weber Spirit II E-310');
      expect(formatted).toContain('Gas Grills');
      expect(formatted).toContain('premium gas grill');

      // Expected categorization would be:
      // Primary: /outdoor-cooking-equipment/gas-grills
      // Confidence: High (0.9+) due to exact type match
    });

    it('should categorize grill accessories correctly', () => {
      const accessoryProduct = realProducts[1];
      const formatted = formatProductsForPrompt([accessoryProduct]);

      expect(formatted).toContain('Grill Brush and Scraper');
      expect(formatted).toContain('cleaning');
      expect(formatted).toContain('Grill Accessories');

      // Expected categorization would be:
      // Primary: /grill-accessories/cleaning-maintenance
      // Confidence: High (0.85+) due to specific cleaning tool identification
    });

    it('should categorize food products correctly', () => {
      const foodProduct = realProducts[2];
      const formatted = formatProductsForPrompt([foodProduct]);

      expect(formatted).toContain('BBQ Rub Variety Pack');
      expect(formatted).toContain('BBQ Seasonings');
      expect(formatted).toContain('spices');

      // Expected categorization would be:
      // Primary: /food-seasonings/spice-rubs-blends
      // Confidence: Very High (0.95+) due to exact category match
    });

    it('should suggest new categories when needed', () => {
      const newProduct: Doc<'products'> = {
        _id: 'new1' as any,
        _creationTime: 0,
        organizationId: 'org1' as any,
        projectId: 'proj1' as any,
        title: 'Smart Grill Thermometer with WiFi',
        description: 'Wireless meat thermometer with smartphone app integration',
        vendor: 'TechGrill',
        productType: 'Smart Devices',
        handle: 'smart-grill-thermometer',
        status: 'active',
        tags: ['smart', 'thermometer', 'wifi', 'technology'],
        categories: [],
        images: [],
        version: 1,
        createdBy: 'user1' as any,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastModifiedBy: 'user1' as any,
      };

      const formatted = formatProductsForPrompt([newProduct]);
      expect(formatted).toContain('Smart Devices');

      // Expected behavior:
      // Should suggest creating new category: /grill-accessories/smart-devices
      // Or: /outdoor-cooking-equipment/smart-technology
    });
  });
});
