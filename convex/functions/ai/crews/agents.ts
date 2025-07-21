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
  ProductCategorizationResult,
} from "../langchain";
import { ActionCtx } from "../../../_generated/server";
import { Doc, Id } from "../../../_generated/dataModel";

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
  }> {
    const prompt = `
      Analyze the following product and extract key features for categorization:
      
      Product Name: ${product.name}
      Description: ${product.description || 'N/A'}
      SKU: ${product.sku || 'N/A'}
      ${product.customFields ? `Custom Fields: ${JSON.stringify(product.customFields)}` : ''}
      
      Extract:
      1. Key features that define this product
      2. Unique characteristics that distinguish it
      3. Attributes relevant for categorization
      4. Any category indicators in the name/description
      
      Provide a structured analysis focusing on categorization-relevant information.
    `;

    // Use existing LangChain infrastructure for now
    // In future, this would use CrewAI's native agent execution
    const mockAnalysis = {
      features: [
        product.name.toLowerCase().includes('grill') ? 'grilling equipment' : 'general product',
        product.description?.toLowerCase().includes('electric') ? 'electric powered' : 'manual',
        'consumer product',
      ],
      characteristics: {
        productType: 'physical',
        category_indicators: extractCategoryIndicators(product),
        brand: product.name.split(' ')[0],
      },
      keyAttributes: [
        'product_type',
        'power_source',
        'primary_use',
      ],
      confidence: 0.85,
    };

    return mockAnalysis;
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