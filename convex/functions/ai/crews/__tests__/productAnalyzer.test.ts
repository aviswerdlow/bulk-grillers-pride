/**
 * Tests for ProductAnalyzerAgent
 * 
 * Validates the migrated product analysis logic and tools
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProductAnalyzerAgent } from '../agents';
import { Doc } from '../../../../_generated/dataModel';

describe('ProductAnalyzerAgent', () => {
  let analyzer: ProductAnalyzerAgent;
  
  beforeEach(() => {
    analyzer = new ProductAnalyzerAgent();
  });

  const mockProduct: Doc<'products'> = {
    _id: 'test_product_1' as any,
    _creationTime: Date.now(),
    organizationId: 'org_123' as any,
    name: 'Weber Spirit II E-310 Gas Grill',
    description: 'Three-burner gas grill with GS4 grilling system, porcelain-enameled cast iron cooking grates',
    sku: 'WEBER-45010001',
    productType: 'Gas Grill',
    vendor: 'Weber',
    tags: ['outdoor-cooking', 'gas-grill', '3-burner'],
    status: 'active',
    isDeleted: false,
    customFields: {
      btus: '30000',
      cookingArea: '529 sq in',
      warranty: '10 years',
    },
  };

  describe('analyze', () => {
    it('should extract features from product data', async () => {
      // Mock the LLM call to use the fallback
      const originalEnv = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const result = await analyzer.analyze(null as any, mockProduct, 'org_123' as any);

      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('characteristics');
      expect(result).toHaveProperty('keyAttributes');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('categoryIndicators');
      expect(result).toHaveProperty('productType');

      // Verify features were extracted
      expect(result.features).toContain('grilling equipment');
      expect(result.features).toContain('gas powered');
      
      // Verify category indicators
      expect(result.categoryIndicators).toContain('grill');
      expect(result.categoryIndicators).toContain('gas');

      // Verify product type
      expect(result.productType).toBe('grilling equipment');

      // Restore env
      if (originalEnv) process.env.OPENAI_API_KEY = originalEnv;
    });

    it('should handle products without descriptions', async () => {
      const productNoDesc = { ...mockProduct, description: undefined };
      
      const result = await analyzer.analyze(null as any, productNoDesc, 'org_123' as any);

      expect(result).toHaveProperty('features');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('checkSimilarity', () => {
    const mockProduct2: Doc<'products'> = {
      ...mockProduct,
      _id: 'test_product_2' as any,
      name: 'Char-Broil Performance 475 Gas Grill',
      description: 'Four-burner gas grill with stainless steel burners',
      sku: 'CB-463377319',
    };

    it('should calculate similarity between products', async () => {
      const result = await analyzer.checkSimilarity(mockProduct, mockProduct2);

      expect(result).toHaveProperty('similarityScore');
      expect(result).toHaveProperty('matchingFeatures');
      expect(result).toHaveProperty('explanation');

      // Gas grills should have high similarity
      expect(result.similarityScore).toBeGreaterThan(0.5);
      expect(result.matchingFeatures).toContain('grilling equipment');
      expect(result.matchingFeatures).toContain('gas powered');
    });

    it('should detect low similarity for different product types', async () => {
      const electricProduct: Doc<'products'> = {
        ...mockProduct,
        _id: 'test_product_3' as any,
        name: 'George Foreman Electric Indoor Grill',
        description: 'Electric countertop grill for indoor use',
        productType: 'Electric Grill',
      };

      const result = await analyzer.checkSimilarity(mockProduct, electricProduct);

      expect(result.similarityScore).toBeLessThan(0.5);
      expect(result.explanation).toContain('Low similarity');
    });
  });

  describe('extractFeatures', () => {
    it('should extract features as a standalone tool', async () => {
      const result = await analyzer.extractFeatures(mockProduct);

      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('categoryIndicators');
      expect(result).toHaveProperty('productType');

      expect(result.features.length).toBeGreaterThan(0);
      expect(result.productType).toBe('grilling equipment');
    });
  });

  describe('enhanced mock analysis', () => {
    it('should provide comprehensive fallback analysis', async () => {
      // Force mock analysis by not providing API key
      delete process.env.OPENAI_API_KEY;

      const commercialProduct: Doc<'products'> = {
        ...mockProduct,
        name: 'Viking Professional 5 Series Gas Grill',
        description: 'Commercial-grade outdoor gas grill',
      };

      const result = await analyzer.analyze(null as any, commercialProduct, 'org_123' as any);

      expect(result.characteristics.priceRange).toBe('premium');
      expect(result.features).toContain('commercial grade');
    });
  });
});