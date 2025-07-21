/**
 * Tests for CrewAI Agents
 */

import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { convexTest } from 'convex-test';
import {
  ProductAnalyzerAgent,
  CategoryMatcherAgent,
  QualityValidatorAgent,
  createAgents,
} from '../agents';
import { Doc, Id } from '../../../../_generated/dataModel';

describe('CrewAI Agents', () => {
  let ctx: any;
  
  beforeEach(async () => {
    ctx = await convexTest({
      modules: {},
    });
  });
  
  afterEach(async () => {
    await ctx.close();
  });
  
  describe('ProductAnalyzerAgent', () => {
    let agent: ProductAnalyzerAgent;
    
    beforeEach(() => {
      agent = new ProductAnalyzerAgent();
    });
    
    test('should have correct configuration', () => {
      expect(agent.role).toBe('analyzer');
      expect(agent.goal).toContain('Extract and analyze key features');
      expect(agent.maxConcurrentTasks).toBe(5);
      expect(agent.memory).toBe(true);
      expect(agent.llmConfig.provider).toBe('openai');
      expect(agent.llmConfig.temperature).toBe(0.3);
    });
    
    test('should analyze product features', async () => {
      const testProduct: Doc<'products'> = {
        _id: 'prod_test123' as Id<'products'>,
        _creationTime: Date.now(),
        organizationId: 'org_test' as Id<'organizations'>,
        projectId: 'proj_test' as Id<'projects'>,
        name: 'Weber Spirit II E-310 Gas Grill',
        description: 'Three-burner gas grill with porcelain-enameled cast iron cooking grates',
        sku: 'WEBER-SPIRIT-310',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const result = await agent.analyze(ctx, testProduct, 'org_test' as Id<'organizations'>);
      
      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('characteristics');
      expect(result).toHaveProperty('keyAttributes');
      expect(result).toHaveProperty('confidence');
      
      expect(result.features).toContain('grilling equipment');
      expect(result.characteristics.category_indicators).toContain('grill');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
    
    test('should extract category indicators from product', async () => {
      const testProduct: Doc<'products'> = {
        _id: 'prod_test456' as Id<'products'>,
        _creationTime: Date.now(),
        organizationId: 'org_test' as Id<'organizations'>,
        projectId: 'proj_test' as Id<'projects'>,
        name: 'Portable Electric Smoker BBQ',
        description: 'Compact electric smoker for outdoor cooking',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const result = await agent.analyze(ctx, testProduct, 'org_test' as Id<'organizations'>);
      
      expect(result.characteristics.category_indicators).toContain('smoker');
      expect(result.characteristics.category_indicators).toContain('bbq');
      expect(result.characteristics.category_indicators).toContain('electric');
      expect(result.characteristics.category_indicators).toContain('portable');
    });
  });
  
  describe('CategoryMatcherAgent', () => {
    let agent: CategoryMatcherAgent;
    
    beforeEach(() => {
      agent = new CategoryMatcherAgent();
    });
    
    test('should have correct configuration', () => {
      expect(agent.role).toBe('matcher');
      expect(agent.goal).toContain('Match products to the most appropriate categories');
      expect(agent.maxConcurrentTasks).toBe(4);
      expect(agent.llmConfig.temperature).toBe(0.4);
    });
    
    test('should match product to categories', async () => {
      const testProduct: Doc<'products'> = {
        _id: 'prod_test789' as Id<'products'>,
        _creationTime: Date.now(),
        organizationId: 'org_test' as Id<'organizations'>,
        projectId: 'proj_test' as Id<'projects'>,
        name: 'Gas Grill Accessories Set',
        description: 'Complete grilling tools and accessories',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const testCategories: Doc<'categories'>[] = [
        {
          _id: 'cat_grills' as Id<'categories'>,
          _creationTime: Date.now(),
          organizationId: 'org_test' as Id<'organizations'>,
          projectId: 'proj_test' as Id<'projects'>,
          name: 'Grills',
          description: 'Gas and charcoal grills',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          _id: 'cat_accessories' as Id<'categories'>,
          _creationTime: Date.now(),
          organizationId: 'org_test' as Id<'organizations'>,
          projectId: 'proj_test' as Id<'projects'>,
          name: 'Grill Accessories',
          description: 'Tools and accessories for grilling',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      
      const analysisResult = {
        features: ['grilling equipment', 'accessories'],
        characteristics: {
          category_indicators: ['grill', 'accessories'],
        },
        keyAttributes: ['product_type'],
        confidence: 0.9,
      };
      
      const result = await agent.match(
        ctx,
        testProduct,
        testCategories,
        analysisResult,
        'org_test' as Id<'organizations'>
      );
      
      expect(result.suggestedCategories).toHaveLength(2);
      expect(result.suggestedCategories[0].categoryId).toBe('cat_accessories');
      expect(result.suggestedCategories[0].confidence).toBeGreaterThan(0.5);
      expect(result.suggestedCategories[0].reasoning).toContain('accessories');
    });
    
    test('should suggest new categories for poor matches', async () => {
      const testProduct: Doc<'products'> = {
        _id: 'prod_unknown' as Id<'products'>,
        _creationTime: Date.now(),
        organizationId: 'org_test' as Id<'organizations'>,
        projectId: 'proj_test' as Id<'projects'>,
        name: 'Quantum Flux Capacitor',
        description: 'Advanced time travel device',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const testCategories: Doc<'categories'>[] = [
        {
          _id: 'cat_grills' as Id<'categories'>,
          _creationTime: Date.now(),
          organizationId: 'org_test' as Id<'organizations'>,
          projectId: 'proj_test' as Id<'projects'>,
          name: 'Grills',
          description: 'Outdoor cooking equipment',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      
      const analysisResult = {
        features: ['time travel', 'quantum'],
        characteristics: {
          productType: 'electronics',
          category_indicators: [],
        },
        keyAttributes: ['technology'],
        confidence: 0.9,
      };
      
      const result = await agent.match(
        ctx,
        testProduct,
        testCategories,
        analysisResult,
        'org_test' as Id<'organizations'>
      );
      
      expect(result.suggestedCategories[0].confidence).toBeLessThan(0.5);
      expect(result.newCategoryRecommendations).toBeDefined();
      expect(result.newCategoryRecommendations![0]).toContain('electronics');
    });
  });
  
  describe('QualityValidatorAgent', () => {
    let agent: QualityValidatorAgent;
    
    beforeEach(() => {
      agent = new QualityValidatorAgent();
    });
    
    test('should have correct configuration', () => {
      expect(agent.role).toBe('validator');
      expect(agent.goal).toContain('Validate categorization decisions');
      expect(agent.maxConcurrentTasks).toBe(3);
      expect(agent.llmConfig.temperature).toBe(0.2);
    });
    
    test('should validate successful categorization', async () => {
      const testProduct: Doc<'products'> = {
        _id: 'prod_valid' as Id<'products'>,
        _creationTime: Date.now(),
        organizationId: 'org_test' as Id<'organizations'>,
        projectId: 'proj_test' as Id<'projects'>,
        name: 'Premium Gas Grill',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const analysisResult = {
        features: ['grilling', 'gas powered'],
        confidence: 0.9,
      };
      
      const matchingResult = {
        suggestedCategories: [
          {
            categoryId: 'cat_grills' as Id<'categories'>,
            confidence: 0.85,
            reasoning: 'Product name contains grill',
          },
        ],
      };
      
      const result = await agent.validate(
        ctx,
        testProduct,
        analysisResult,
        matchingResult,
        'org_test' as Id<'organizations'>
      );
      
      expect(result.isValid).toBe(true);
      expect(result.validationErrors).toBeUndefined();
      expect(result.finalCategory).toBe('cat_grills');
      expect(result.confidence).toBe(0.85);
      expect(result.qualityScore).toBeGreaterThan(0.7);
    });
    
    test('should detect validation errors', async () => {
      const testProduct: Doc<'products'> = {
        _id: 'prod_invalid' as Id<'products'>,
        _creationTime: Date.now(),
        organizationId: 'org_test' as Id<'organizations'>,
        projectId: 'proj_test' as Id<'projects'>,
        name: 'Unknown Product',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const analysisResult = {
        features: [],
        confidence: 0.2,
      };
      
      const matchingResult = {
        suggestedCategories: [],
      };
      
      const result = await agent.validate(
        ctx,
        testProduct,
        analysisResult,
        matchingResult,
        'org_test' as Id<'organizations'>
      );
      
      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors).toContain('No features extracted from product');
      expect(result.validationErrors).toContain('Low confidence in category matching');
      expect(result.qualityScore).toBeLessThan(0.7);
    });
    
    test('should detect inconsistencies', async () => {
      const testProduct: Doc<'products'> = {
        _id: 'prod_inconsistent' as Id<'products'>,
        _creationTime: Date.now(),
        organizationId: 'org_test' as Id<'organizations'>,
        projectId: 'proj_test' as Id<'projects'>,
        name: 'Test Product',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const analysisResult = {
        features: ['test'],
        confidence: 0.3, // Low analysis confidence
      };
      
      const matchingResult = {
        suggestedCategories: [
          {
            categoryId: 'cat_test' as Id<'categories'>,
            confidence: 0.95, // High matching confidence
            reasoning: 'Perfect match',
          },
        ],
      };
      
      const result = await agent.validate(
        ctx,
        testProduct,
        analysisResult,
        matchingResult,
        'org_test' as Id<'organizations'>
      );
      
      expect(result.validationErrors).toContain(
        'Inconsistency between analysis and matching confidence'
      );
    });
  });
  
  describe('createAgents', () => {
    test('should create all agents with default config', () => {
      const agents = createAgents();
      
      expect(agents.analyzer).toBeInstanceOf(ProductAnalyzerAgent);
      expect(agents.matcher).toBeInstanceOf(CategoryMatcherAgent);
      expect(agents.validator).toBeInstanceOf(QualityValidatorAgent);
    });
    
    test('should apply custom LLM configs', () => {
      const agents = createAgents({
        analyzerConfig: {
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          temperature: 0.5,
        },
        matcherConfig: {
          provider: 'gemini',
          model: 'gemini-1.5-pro',
        },
      });
      
      expect(agents.analyzer.llmConfig.provider).toBe('anthropic');
      expect(agents.analyzer.llmConfig.model).toBe('claude-3-sonnet');
      expect(agents.analyzer.llmConfig.temperature).toBe(0.5);
      
      expect(agents.matcher.llmConfig.provider).toBe('gemini');
      expect(agents.matcher.llmConfig.model).toBe('gemini-1.5-pro');
      
      // Validator should keep defaults
      expect(agents.validator.llmConfig.provider).toBe('openai');
    });
  });
});