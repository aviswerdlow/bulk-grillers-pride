import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseMessage } from '@langchain/core/messages';
import { Doc, Id } from '../../_generated/dataModel';

// Zod schemas for structured output
export const CategorySuggestionSchema = z.object({
  categoryId: z.string().describe('The ID of the suggested category'),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  rationale: z.string().describe('Explanation for why this category was chosen'),
});

export const ProductCategorizationResultSchema = z.object({
  productId: z.string(),
  suggestions: z.array(CategorySuggestionSchema).max(3).describe('Top 3 category suggestions'),
  newCategorySuggestions: z
    .array(
      z.object({
        name: z.string().describe('Suggested new category name'),
        parentCategoryId: z.string().optional().describe('Parent category ID if applicable'),
        rationale: z.string().describe('Why this new category should be created'),
      })
    )
    .optional(),
  keyFeatures: z.array(z.string()).describe('Key features extracted from the product'),
  productType: z.string().optional().describe('Inferred product type'),
  status: z.literal('success'),
});

export const ProductCategorizationErrorSchema = z.object({
  productId: z.string(),
  suggestions: z.array(z.never()),
  newCategorySuggestions: z.array(z.never()),
  status: z.literal('error'),
  error: z.string(),
});

export const BatchCategorizationResultSchema = z.array(
  z.union([ProductCategorizationResultSchema, ProductCategorizationErrorSchema])
);

// Type definitions
export type CategoryContext = {
  id: string;
  name: string;
  handle: string;
  path: string;
  description?: string;
};

export type AIProvider = 'openai' | 'anthropic' | 'gemini';

// Prompt templates for each provider
const CATEGORIZATION_PROMPTS = {
  openai: ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a product categorization expert for an e-commerce platform. Your task is to analyze products and suggest the most appropriate categories from the available options.

Available Categories:
{categories}

Instructions:
1. Analyze each product's title, description, and type
2. Extract key features that help with categorization
3. Match products to the most relevant existing categories
4. Suggest up to 3 categories per product with confidence scores
5. If no suitable category exists, suggest new categories that should be created
6. Provide clear rationale for each suggestion

Return your response in the following JSON format:
{format_instructions}`,
    ],
    [
      'human',
      `Please categorize the following products:

{products}

Additional context or instructions:
{custom_prompt}`,
    ],
  ]),

  anthropic: ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are Claude, an AI assistant specialized in e-commerce product categorization. Your expertise lies in understanding product attributes and matching them to appropriate categories.

Available Categories:
{categories}

Your approach:
1. Carefully analyze product information (title, description, type)
2. Identify key features and characteristics
3. Match products to existing categories based on relevance
4. Provide confidence scores that reflect the quality of the match
5. Suggest new categories when existing ones don't fit well
6. Always explain your reasoning clearly

Output format:
{format_instructions}`,
    ],
    [
      'human',
      `Categorize these products thoughtfully:

{products}

Additional guidance:
{custom_prompt}`,
    ],
  ]),

  gemini: ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a product categorization AI for e-commerce. Analyze products and assign them to the most suitable categories.

Categories available:
{categories}

Process:
1. Extract product features from title, description, and type
2. Match to existing categories with confidence scores
3. Suggest new categories if needed
4. Provide clear rationale

Format your response as:
{format_instructions}`,
    ],
    [
      'human',
      `Categorize these products:

{products}

Extra instructions:
{custom_prompt}`,
    ],
  ]),
};

// Initialize LLM based on provider
export function initializeLLM(
  provider: AIProvider,
  apiKey: string,
  model: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    streaming?: boolean;
  }
) {
  const commonOptions = {
    apiKey,
    modelName: model,
    temperature: options?.temperature ?? 0.3,
    maxTokens: options?.maxTokens ?? 2000,
    streaming: options?.streaming ?? false,
  };

  switch (provider) {
    case 'openai':
      return new ChatOpenAI(commonOptions);

    case 'anthropic':
      return new ChatAnthropic({
        ...commonOptions,
        anthropicApiKey: apiKey,
      });

    case 'gemini':
      // Note: Gemini support would require @langchain/google-genai package
      throw new Error('Gemini provider not yet implemented. Please use OpenAI or Anthropic.');

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Create categorization chain
export function createCategorizationChain(llm: ChatOpenAI | ChatAnthropic, provider: AIProvider) {
  const parser = StructuredOutputParser.fromZodSchema(BatchCategorizationResultSchema);
  const prompt = CATEGORIZATION_PROMPTS[provider];

  return RunnableSequence.from([prompt, llm, parser]);
}

// Format products for the prompt
export function formatProductsForPrompt(products: Doc<'products'>[]): string {
  return products
    .map((product, index) => {
      const features = [
        `Title: ${product.title}`,
        product.description ? `Description: ${product.description}` : null,
        product.productType ? `Type: ${product.productType}` : null,
        product.vendor ? `Vendor: ${product.vendor}` : null,
        product.tags.length > 0 ? `Tags: ${product.tags.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      return `Product ${index + 1} (ID: ${product._id}):\n${features}`;
    })
    .join('\n\n');
}

// Format categories for the prompt
export function formatCategoriesForPrompt(categories: CategoryContext[]): string {
  const categoryTree = categories
    .map((cat) => {
      const level = cat.path.split('/').filter(Boolean).length;
      const indent = '  '.repeat(level);
      return `${indent}- ${cat.name} (${cat.handle})${cat.description ? `: ${cat.description}` : ''}`;
    })
    .join('\n');

  return categoryTree || 'No categories available yet. Please suggest new categories.';
}

// Process a batch of products with retry logic
export async function processBatchWithLangChain(
  products: Doc<'products'>[],
  categories: CategoryContext[],
  customPrompt: string,
  provider: AIProvider,
  apiKey: string,
  model: string,
  options?: {
    maxRetries?: number;
    temperature?: number;
    streaming?: boolean;
  }
): Promise<
  Array<
    | z.infer<typeof ProductCategorizationResultSchema>
    | z.infer<typeof ProductCategorizationErrorSchema>
  >
> {
  const maxRetries = options?.maxRetries ?? 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Initialize LLM with exponential backoff on temperature for retries
      const temperature = (options?.temperature ?? 0.3) + attempt * 0.1;
      const llm = initializeLLM(provider, apiKey, model, {
        ...options,
        temperature: Math.min(temperature, 0.7),
      });

      // Create the categorization chain
      const chain = createCategorizationChain(llm, provider);
      const parser = StructuredOutputParser.fromZodSchema(BatchCategorizationResultSchema);

      // Prepare the input
      const input = {
        products: formatProductsForPrompt(products),
        categories: formatCategoriesForPrompt(categories),
        custom_prompt: customPrompt || 'Focus on accuracy and provide detailed rationale.',
        format_instructions: parser.getFormatInstructions(),
      };

      // Execute the chain
      const result = await chain.invoke(input);

      // Validate results match input products
      const productIds = new Set(products.map((p) => p._id));
      const validResults = result.filter(
        (r: z.infer<typeof BatchCategorizationResultSchema>[number]) =>
          productIds.has(r.productId as Id<'products'>)
      );

      // Add error results for any missing products
      const resultProductIds = new Set(
        validResults.map(
          (r: z.infer<typeof BatchCategorizationResultSchema>[number]) => r.productId
        )
      );
      const missingProducts = products.filter((p) => !resultProductIds.has(p._id));

      const missingResults: z.infer<typeof ProductCategorizationErrorSchema>[] =
        missingProducts.map((p) => ({
          productId: p._id,
          suggestions: [],
          newCategorySuggestions: [],
          status: 'error' as const,
          error: 'Product was not processed by AI',
        }));

      return [...validResults, ...missingResults];
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt + 1} failed:`, error);

      // Add exponential backoff delay
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If all retries failed, return error results for all products
  console.error('All retry attempts failed:', lastError);
  return products.map((product) => ({
    productId: product._id,
    suggestions: [],
    newCategorySuggestions: [],
    status: 'error' as const,
    error: lastError?.message || 'Failed to process after multiple retries',
  }));
}

// Cost estimation utilities
export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export function estimateCost(
  provider: AIProvider,
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  // Cost per 1K tokens (approximate as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'openai:gpt-4': { input: 0.03, output: 0.06 },
    'openai:gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
    'openai:gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'anthropic:claude-3-opus': { input: 0.015, output: 0.075 },
    'anthropic:claude-3-sonnet': { input: 0.003, output: 0.015 },
    'anthropic:claude-3-haiku': { input: 0.00025, output: 0.00125 },
  };

  const key = `${provider}:${model}`;
  const rates = pricing[key] || { input: 0.01, output: 0.03 }; // Default rates

  const inputCost = (inputTokens / 1000) * rates.input;
  const outputCost = (outputTokens / 1000) * rates.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

// Cache key generation for similar products
export function generateCacheKey(product: Doc<'products'>): string {
  const normalizedTitle = product.title.toLowerCase().trim();
  const normalizedType = (product.productType || '').toLowerCase().trim();
  const normalizedVendor = (product.vendor || '').toLowerCase().trim();

  return `${normalizedVendor}:${normalizedType}:${normalizedTitle}`;
}

// Simple in-memory cache for similar products (consider Redis for production)
export class ProductCategorizationCache {
  private cache: Map<
    string,
    {
      result: z.infer<typeof ProductCategorizationResultSchema>;
      timestamp: number;
    }
  > = new Map();

  private readonly ttl: number = 3600000; // 1 hour default TTL

  constructor(ttlMs?: number) {
    if (ttlMs) this.ttl = ttlMs;
  }

  get(key: string): z.infer<typeof ProductCategorizationResultSchema> | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  set(key: string, result: z.infer<typeof ProductCategorizationResultSchema>): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
