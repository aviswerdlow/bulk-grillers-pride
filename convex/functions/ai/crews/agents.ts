/**
 * CrewAI Agent Definitions
 * 
 * Defines the three specialized agents for product categorization:
 * - Product Analyzer Agent
 * - Category Matcher Agent  
 * - Quality Validator Agent
 */

import { Agent, AgentRole, LLMConfig } from "./types";
import { 
  processBatchWithLangChain,
  AIProvider,
  initializeLLM,
  estimateTokenCount,
  estimateCost,
} from "../langchain";
import { ActionCtx } from "../../../_generated/server";
import { Doc, Id } from "../../../_generated/dataModel";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { multiProviderManager, SelectionCriteria } from "../providers";

// Zod schema for product analysis output
const ProductAnalysisSchema = z.object({
  features: z.array(z.string()).describe("Key features that define this product"),
  characteristics: z.record(z.any()).describe("Unique characteristics that distinguish it"),
  keyAttributes: z.array(z.string()).describe("Attributes relevant for categorization"),
  categoryIndicators: z.array(z.string()).describe("Category indicators found in name/description"),
  confidence: z.number().min(0).max(1).describe("Confidence in the analysis"),
  productType: z.string().optional().describe("Inferred product type"),
  similarityFeatures: z.array(z.string()).optional().describe("Features for similarity matching"),
});

export class ProductAnalyzerAgent implements Agent {
  id = "product_analyzer_001";
  role: AgentRole = "analyzer";
  goal = "Extract and analyze key features from product data to enable accurate categorization";
  backstory = `You are an expert product analyst with deep knowledge of product characteristics,
    features, and attributes across various industries. Your role is to identify and extract
    the most relevant features that will help in accurate categorization. You excel at
    understanding product descriptions, specifications, and identifying unique characteristics
    that distinguish one product from another.`;
  maxConcurrentTasks = 5;
  memory = true;
  verbose = false;
  maxIter = 3;
  
  llmConfig: LLMConfig = {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1000,
    timeout: 20000,
  };

  async analyze(
    ctx: ActionCtx,
    product: Doc<'products'>,
    organizationId: Id<'organizations'>
  ): Promise<{
    features: string[];
    characteristics: Record<string, any>;
    keyAttributes: string[];
    confidence: number;
    categoryIndicators?: string[];
    productType?: string;
    similarityFeatures?: string[];
  }> {
    try {
      // Use multi-provider system for better reliability and cost optimization
      const messages = [
        {
          role: 'system' as const,
          content: `You are an expert product analyst specializing in feature extraction for categorization.
Your task is to analyze products and extract key features that will help in accurate categorization.

Focus on:
1. Identifying defining characteristics and attributes
2. Extracting category indicators from text
3. Determining product type and classification
4. Finding features useful for similarity matching

Provide detailed, specific features rather than generic ones.`
        },
        {
          role: 'user' as const,
          content: `Analyze this product for categorization:

Product Name: ${product.name}
Description: ${product.description || 'No description provided'}
SKU: ${product.sku || 'N/A'}
Type: ${product.productType || 'N/A'}
Vendor: ${product.vendor || 'N/A'}
Tags: ${product.tags.length > 0 ? product.tags.join(', ') : 'No tags'}
Custom Fields: ${product.customFields ? JSON.stringify(product.customFields, null, 2) : 'None'}

Extract comprehensive features for categorization purposes and return the result as a JSON object with the following structure:
{
  "features": ["array of key features"],
  "characteristics": { "object with unique characteristics" },
  "keyAttributes": ["array of categorization attributes"],
  "categoryIndicators": ["array of category indicators found"],
  "confidence": 0.0 to 1.0,
  "productType": "inferred product type",
  "similarityFeatures": ["features for similarity matching"]
}`
        }
      ];

      // Define selection criteria for this agent
      const criteria: SelectionCriteria = {
        requiredCapabilities: ['text-generation', 'structured-output'],
        maxLatencyMs: this.llmConfig.timeout || 20000,
        preferredTier: 'balanced' as any,
        preferCached: true
      };

      // Use multi-provider manager
      const response = await multiProviderManager.complete(
        {
          messages,
          model: this.llmConfig.model,
          temperature: this.llmConfig.temperature,
          maxTokens: this.llmConfig.maxTokens,
          structuredOutput: ProductAnalysisSchema
        },
        criteria
      );

      // Parse the response
      let result: any;
      if (response.structuredData) {
        result = response.structuredData;
      } else {
        try {
          result = JSON.parse(response.content);
        } catch {
          // If parsing fails, use the LLM response to extract key information
          result = {
            features: this.extractFeaturesFromText(response.content),
            characteristics: {},
            keyAttributes: [],
            categoryIndicators: [],
            confidence: 0.7,
            productType: 'unknown',
            similarityFeatures: []
          };
        }
      }

      // Transform result to match expected interface
      return {
        features: result.features || [],
        characteristics: {
          productType: result.productType || 'unknown',
          categoryIndicators: result.categoryIndicators || [],
          inferredAttributes: result.characteristics || {},
        },
        keyAttributes: result.keyAttributes || [],
        confidence: result.confidence || 0.7,
        categoryIndicators: result.categoryIndicators,
        productType: result.productType,
        similarityFeatures: result.similarityFeatures,
      };

    } catch (error) {
      console.error('ProductAnalyzerAgent multi-provider error:', error);
      // Fallback to enhanced mock analysis on error
      return this.mockAnalysis(product);
    }
  }

  // Helper method to extract features from unstructured text
  private extractFeaturesFromText(text: string): string[] {
    const features: string[] = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.includes('feature') || line.includes('characteristic') || line.includes('-')) {
        const cleaned = line.replace(/^[\s\-\*]+/, '').trim();
        if (cleaned.length > 3 && cleaned.length < 100) {
          features.push(cleaned);
        }
      }
    });

    return features.slice(0, 10); // Limit to 10 features
  }

  // Enhanced mock analysis as fallback
  private mockAnalysis(product: Doc<'products'>): any {
    const text = `${product.name} ${product.description || ''} ${product.productType || ''}`.toLowerCase();
    
    // Extract features based on keywords
    const features: string[] = [];
    const categoryIndicators: string[] = [];
    
    // Product type detection
    const productTypes = {
      'grill': ['grilling equipment', 'outdoor cooking'],
      'smoker': ['smoking equipment', 'bbq equipment'],
      'electric': ['electric powered', 'plug-in device'],
      'gas': ['gas powered', 'propane compatible'],
      'charcoal': ['charcoal burning', 'traditional grilling'],
      'portable': ['portable design', 'travel-friendly'],
      'commercial': ['commercial grade', 'heavy duty'],
      'residential': ['home use', 'consumer grade'],
    };

    Object.entries(productTypes).forEach(([keyword, relatedFeatures]) => {
      if (text.includes(keyword)) {
        features.push(...relatedFeatures);
        categoryIndicators.push(keyword);
      }
    });

    // Extract brand and model
    const nameParts = product.name.split(' ');
    const brand = nameParts[0];
    const model = nameParts.slice(1, 3).join(' ');

    // Build characteristics
    const characteristics = {
      productType: this.inferProductType(text),
      brand: brand,
      model: model,
      priceRange: this.inferPriceRange(product),
      size: this.inferSize(text),
      powerSource: this.inferPowerSource(text),
    };

    // Key attributes for categorization
    const keyAttributes = [
      'product_type',
      'power_source',
      'size_category',
      'usage_type',
      'price_range',
    ].filter(attr => characteristics[attr.replace('_', '')]);

    // Similarity features for matching
    const similarityFeatures = [
      ...new Set([
        ...features,
        ...categoryIndicators,
        characteristics.productType,
        characteristics.powerSource,
      ].filter(Boolean))
    ];

    return {
      features: features.length > 0 ? features : ['general product', 'consumer item'],
      characteristics,
      keyAttributes,
      confidence: 0.75,
      categoryIndicators,
      productType: characteristics.productType,
      similarityFeatures,
    };
  }

  private inferProductType(text: string): string {
    if (text.includes('grill')) return 'grilling equipment';
    if (text.includes('smoker')) return 'smoking equipment';
    if (text.includes('accessory') || text.includes('accessories')) return 'accessory';
    if (text.includes('cover')) return 'protective gear';
    if (text.includes('tool') || text.includes('utensil')) return 'cooking tools';
    return 'general product';
  }

  private inferPriceRange(product: Doc<'products'>): string {
    // This would normally use price data if available
    const name = product.name.toLowerCase();
    if (name.includes('pro') || name.includes('commercial')) return 'premium';
    if (name.includes('basic') || name.includes('entry')) return 'budget';
    return 'mid-range';
  }

  private inferSize(text: string): string {
    if (text.includes('large') || text.includes('xl')) return 'large';
    if (text.includes('small') || text.includes('compact')) return 'small';
    if (text.includes('portable') || text.includes('travel')) return 'portable';
    return 'standard';
  }

  private inferPowerSource(text: string): string {
    if (text.includes('electric')) return 'electric';
    if (text.includes('gas') || text.includes('propane')) return 'gas';
    if (text.includes('charcoal')) return 'charcoal';
    if (text.includes('wood') || text.includes('pellet')) return 'wood';
    return 'manual';
  }

  // Similarity check tool for finding similar products
  async checkSimilarity(
    product1: Doc<'products'>,
    product2: Doc<'products'>,
    analysis1?: any,
    analysis2?: any
  ): Promise<{
    similarityScore: number;
    matchingFeatures: string[];
    explanation: string;
  }> {
    // If analyses are not provided, perform them
    const a1 = analysis1 || await this.analyze(null as any, product1, '' as any);
    const a2 = analysis2 || await this.analyze(null as any, product2, '' as any);

    // Calculate feature overlap
    const features1 = new Set([
      ...a1.features,
      ...(a1.similarityFeatures || []),
      ...(a1.categoryIndicators || []),
    ]);
    const features2 = new Set([
      ...a2.features,
      ...(a2.similarityFeatures || []),
      ...(a2.categoryIndicators || []),
    ]);

    const matchingFeatures = [...features1].filter(f => features2.has(f));
    const totalFeatures = new Set([...features1, ...features2]).size;
    const featureOverlap = matchingFeatures.length / totalFeatures;

    // Calculate attribute similarity
    const attributeScore = this.calculateAttributeSimilarity(a1.characteristics, a2.characteristics);

    // Calculate name similarity
    const nameScore = this.calculateStringSimilarity(product1.name, product2.name);

    // Weighted similarity score
    const similarityScore = 
      featureOverlap * 0.5 +       // 50% weight on feature overlap
      attributeScore * 0.3 +       // 30% weight on attributes
      nameScore * 0.2;             // 20% weight on name similarity

    // Generate explanation
    const explanation = this.generateSimilarityExplanation(
      matchingFeatures,
      similarityScore,
      product1.name,
      product2.name
    );

    return {
      similarityScore: Math.min(1, similarityScore),
      matchingFeatures,
      explanation,
    };
  }

  private calculateAttributeSimilarity(chars1: any, chars2: any): number {
    const attributes = ['productType', 'powerSource', 'size', 'priceRange'];
    let matches = 0;
    
    attributes.forEach(attr => {
      if (chars1[attr] && chars2[attr] && chars1[attr] === chars2[attr]) {
        matches++;
      }
    });

    return matches / attributes.length;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;
    
    return union > 0 ? intersection / union : 0;
  }

  private generateSimilarityExplanation(
    matchingFeatures: string[],
    score: number,
    name1: string,
    name2: string
  ): string {
    if (score > 0.8) {
      return `Very high similarity between "${name1}" and "${name2}". Matching features: ${matchingFeatures.join(', ')}.`;
    } else if (score > 0.6) {
      return `Good similarity between products. Common features: ${matchingFeatures.slice(0, 3).join(', ')}.`;
    } else if (score > 0.4) {
      return `Moderate similarity. Some shared features: ${matchingFeatures.slice(0, 2).join(', ')}.`;
    } else {
      return `Low similarity between products. Few common features.`;
    }
  }

  // Feature extraction tool (standalone version for tool usage)
  async extractFeatures(
    product: Doc<'products'>
  ): Promise<{
    features: string[];
    categoryIndicators: string[];
    productType: string;
  }> {
    const analysis = await this.analyze(null as any, product, '' as any);
    
    return {
      features: analysis.features,
      categoryIndicators: analysis.categoryIndicators || [],
      productType: analysis.productType || 'unknown',
    };
  }
}

export class CategoryMatcherAgent implements Agent {
  id = "category_matcher_001";
  role: AgentRole = "matcher";
  goal = "Match products to the most appropriate categories based on analyzed features";
  backstory = `You are a categorization expert with extensive knowledge of product taxonomies
    and classification systems. You excel at matching product features to category hierarchies,
    understanding nuanced differences between similar categories, and making accurate
    categorization decisions. You consider both explicit features and implicit characteristics
    when suggesting categories.`;
  maxConcurrentTasks = 4;
  memory = true;
  verbose = false;
  maxIter = 3;
  
  llmConfig: LLMConfig = {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.4,
    maxTokens: 800,
    timeout: 15000,
  };

  async match(
    ctx: ActionCtx,
    product: Doc<'products'>,
    categories: Doc<'categories'>[],
    analysis: any,
    organizationId: Id<'organizations'>
  ): Promise<{
    suggestedCategories: Array<{
      categoryId: Id<'categories'>;
      confidence: number;
      reasoning: string;
    }>;
    newCategoryRecommendations?: string[];
  }> {
    // Build category context
    const categoryContext = categories.map(cat => ({
      id: cat._id,
      name: cat.name,
      description: cat.description,
      level: cat.metadata?.level,
    }));

    const prompt = `
      Based on the product analysis, match this product to the most appropriate categories:
      
      Product Analysis:
      ${JSON.stringify(analysis, null, 2)}
      
      Available Categories:
      ${JSON.stringify(categoryContext, null, 2)}
      
      Suggest the top 3 most appropriate categories with confidence scores and reasoning.
      If no existing categories are suitable, suggest new category names.
    `;

    // Mock implementation - would use CrewAI execution
    const suggestions = categories
      .map(cat => {
        const score = calculateCategoryScore(product, cat, analysis);
        return {
          categoryId: cat._id,
          confidence: score,
          reasoning: generateReasoning(product, cat, analysis),
        };
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    return {
      suggestedCategories: suggestions,
      newCategoryRecommendations: suggestions[0]?.confidence < 0.5 
        ? [`${analysis.characteristics.productType} - ${analysis.features[0]}`]
        : undefined,
    };
  }
}

export class QualityValidatorAgent implements Agent {
  id = "quality_validator_001";
  role: AgentRole = "validator";
  goal = "Validate categorization decisions and ensure high-quality, accurate results";
  backstory = `You are a quality assurance specialist focused on categorization accuracy.
    You validate categorization decisions by checking for consistency, accuracy, and
    completeness. You identify potential errors, ambiguities, or cases that need human
    review. Your role is critical in maintaining the integrity of the categorization system.`;
  maxConcurrentTasks = 3;
  memory = true;
  verbose = false;
  maxIter = 2;
  
  llmConfig: LLMConfig = {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    maxTokens: 600,
    timeout: 10000,
  };

  async validate(
    ctx: ActionCtx,
    product: Doc<'products'>,
    analysis: any,
    matchingResult: any,
    organizationId: Id<'organizations'>
  ): Promise<{
    isValid: boolean;
    validationErrors?: string[];
    finalCategory?: Id<'categories'>;
    confidence: number;
    qualityScore: number;
  }> {
    // Validation checks
    const validationErrors: string[] = [];
    
    // Check if analysis is complete
    if (!analysis.features || analysis.features.length === 0) {
      validationErrors.push("No features extracted from product");
    }
    
    // Check matching confidence
    const topMatch = matchingResult.suggestedCategories[0];
    if (!topMatch || topMatch.confidence < 0.3) {
      validationErrors.push("Low confidence in category matching");
    }
    
    // Check for consistency
    if (analysis.confidence < 0.5 && topMatch?.confidence > 0.8) {
      validationErrors.push("Inconsistency between analysis and matching confidence");
    }
    
    // Calculate quality score
    const qualityScore = calculateQualityScore(
      analysis,
      matchingResult,
      validationErrors.length
    );
    
    return {
      isValid: validationErrors.length === 0 && qualityScore >= 0.7,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      finalCategory: topMatch?.categoryId,
      confidence: topMatch?.confidence || 0,
      qualityScore,
    };
  }
}

// Helper functions
function extractCategoryIndicators(product: Doc<'products'>): string[] {
  const indicators: string[] = [];
  const text = `${product.name} ${product.description || ''}`.toLowerCase();
  
  // Common category keywords
  const keywords = ['grill', 'smoker', 'bbq', 'electric', 'gas', 'charcoal', 'portable'];
  
  keywords.forEach(keyword => {
    if (text.includes(keyword)) {
      indicators.push(keyword);
    }
  });
  
  return indicators;
}

function calculateCategoryScore(
  product: Doc<'products'>,
  category: Doc<'categories'>,
  analysis: any
): number {
  let score = 0.5; // Base score
  
  const productText = `${product.name} ${product.description || ''}`.toLowerCase();
  const categoryText = `${category.name} ${category.description || ''}`.toLowerCase();
  
  // Check name similarity
  const nameWords = product.name.toLowerCase().split(' ');
  const categoryWords = category.name.toLowerCase().split(' ');
  const commonWords = nameWords.filter(word => categoryWords.includes(word));
  
  score += commonWords.length * 0.1;
  
  // Check feature matches
  if (analysis.features) {
    analysis.features.forEach((feature: string) => {
      if (categoryText.includes(feature.toLowerCase())) {
        score += 0.15;
      }
    });
  }
  
  // Check category indicators
  if (analysis.characteristics?.category_indicators) {
    analysis.characteristics.category_indicators.forEach((indicator: string) => {
      if (categoryText.includes(indicator)) {
        score += 0.2;
      }
    });
  }
  
  return Math.min(score, 1.0);
}

function generateReasoning(
  product: Doc<'products'>,
  category: Doc<'categories'>,
  analysis: any
): string {
  const reasons: string[] = [];
  
  // Check name similarity
  const nameWords = product.name.toLowerCase().split(' ');
  const categoryWords = category.name.toLowerCase().split(' ');
  const commonWords = nameWords.filter(word => categoryWords.includes(word));
  
  if (commonWords.length > 0) {
    reasons.push(`Product name contains category keywords: ${commonWords.join(', ')}`);
  }
  
  // Check features
  if (analysis.features) {
    const matchingFeatures = analysis.features.filter((f: string) => 
      category.name.toLowerCase().includes(f.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(f.toLowerCase()))
    );
    
    if (matchingFeatures.length > 0) {
      reasons.push(`Matching features: ${matchingFeatures.join(', ')}`);
    }
  }
  
  if (reasons.length === 0) {
    reasons.push('General category match based on product type');
  }
  
  return reasons.join('. ');
}

function calculateQualityScore(
  analysis: any,
  matchingResult: any,
  errorCount: number
): number {
  let score = 1.0;
  
  // Deduct for errors
  score -= errorCount * 0.2;
  
  // Deduct for low confidence
  if (analysis.confidence < 0.7) score -= 0.1;
  if (matchingResult.suggestedCategories[0]?.confidence < 0.6) score -= 0.15;
  
  // Deduct for insufficient matches
  if (matchingResult.suggestedCategories.length < 2) score -= 0.1;
  
  // Bonus for high confidence and multiple good matches
  if (analysis.confidence > 0.9 && matchingResult.suggestedCategories[0]?.confidence > 0.8) {
    score += 0.1;
  }
  
  return Math.max(0, Math.min(1, score));
}

// Factory function to create agents
export function createAgents(config?: {
  analyzerConfig?: Partial<LLMConfig>;
  matcherConfig?: Partial<LLMConfig>;
  validatorConfig?: Partial<LLMConfig>;
}): {
  analyzer: ProductAnalyzerAgent;
  matcher: CategoryMatcherAgent;
  validator: QualityValidatorAgent;
} {
  const analyzer = new ProductAnalyzerAgent();
  const matcher = new CategoryMatcherAgent();
  const validator = new QualityValidatorAgent();
  
  // Apply custom configs if provided
  if (config?.analyzerConfig) {
    analyzer.llmConfig = { ...analyzer.llmConfig, ...config.analyzerConfig };
  }
  if (config?.matcherConfig) {
    matcher.llmConfig = { ...matcher.llmConfig, ...config.matcherConfig };
  }
  if (config?.validatorConfig) {
    validator.llmConfig = { ...validator.llmConfig, ...config.validatorConfig };
  }
  
  return { analyzer, matcher, validator };
}