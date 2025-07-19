import { BaseFactory, FactoryOptions } from '../utils/factory';
import { createMockId, createIdGenerator } from '../utils/ids';
import type { Doc, Id } from '../types';

type AiCategorizationJob = Doc<'aiCategorizationJobs'>;

export class AiCategorizationJobFactory extends BaseFactory<AiCategorizationJob> {
  private idGenerator = createIdGenerator('aiCategorizationJobs');
  
  create(options?: FactoryOptions<AiCategorizationJob>): AiCategorizationJob {
    const now = this.now();
    const pastDate = this.past(30);
    const status = options?.overrides?.status || this.randomEnum(['pending', 'running', 'completed', 'failed', 'cancelled'] as const);
    
    const job: AiCategorizationJob = {
      _id: options?.overrides?._id || this.idGenerator.next(),
      _creationTime: options?.overrides?._creationTime || pastDate,
      organizationId: options?.overrides?.organizationId || createMockId('organizations'),
      projectId: options?.overrides?.projectId || createMockId('projects'),
      
      // Job Details
      status,
      progress: this.generateProgress(status),
      
      // Configuration
      provider: this.randomEnum(['openai', 'anthropic', 'gemini'] as const),
      model: this.generateModel(),
      temperature: this.faker.number.float({ min: 0, max: 1, multipleOf: 0.1 }),
      
      // Product Selection
      productIds: this.generateProductIds(),
      filters: this.faker.helpers.maybe(() => ({
        status: this.faker.helpers.arrayElement(['active', 'draft']),
        hasCategories: this.faker.datatype.boolean(),
        productType: this.faker.helpers.maybe(() => 'meat/beef'),
      }), { probability: 0.3 }),
      
      // Results
      results: this.generateResults(status),
      errors: this.generateErrors(status),
      
      // Metadata
      metadata: {
        source: this.faker.helpers.arrayElement(['manual', 'api', 'scheduled']),
        batchId: this.faker.string.uuid(),
        retryCount: this.faker.number.int({ min: 0, max: 3 }),
      },
      
      // Cost Tracking
      cost: this.generateCost(status),
      
      // Timing
      startedAt: status !== 'pending' ? this.faker.date.between({ from: pastDate, to: now }).getTime() : undefined,
      completedAt: ['completed', 'failed', 'cancelled'].includes(status) 
        ? this.faker.date.between({ from: pastDate, to: now }).getTime() 
        : undefined,
      
      // User Info
      createdBy: options?.overrides?.createdBy || createMockId('users'),
      createdAt: pastDate,
      updatedAt: this.faker.date.between({ from: pastDate, to: now }).getTime(),
    };
    
    return this.applyOverrides(job, options?.overrides);
  }
  
  /**
   * Create a pending job
   */
  createPending(options?: FactoryOptions<AiCategorizationJob>): AiCategorizationJob {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'pending',
        progress: {
          current: 0,
          total: options?.overrides?.productIds?.length || this.faker.number.int({ min: 10, max: 100 }),
          percentage: 0,
        },
        startedAt: undefined,
        completedAt: undefined,
        results: [],
        errors: [],
      }
    });
  }
  
  /**
   * Create a running job
   */
  createRunning(options?: FactoryOptions<AiCategorizationJob>): AiCategorizationJob {
    const total = options?.overrides?.productIds?.length || this.faker.number.int({ min: 10, max: 100 });
    const current = this.faker.number.int({ min: 1, max: total - 1 });
    
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'running',
        progress: {
          current,
          total,
          percentage: Math.round((current / total) * 100),
        },
        startedAt: this.faker.date.recent({ days: 1 }).getTime(),
        completedAt: undefined,
      }
    });
  }
  
  /**
   * Create a completed job
   */
  createCompleted(options?: FactoryOptions<AiCategorizationJob>): AiCategorizationJob {
    const productIds = options?.overrides?.productIds || this.generateProductIds();
    
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'completed',
        productIds,
        progress: {
          current: productIds.length,
          total: productIds.length,
          percentage: 100,
        },
        results: productIds.map((productId: Id<'products'>) => ({
          productId,
          suggestedCategoryIds: [createMockId('categories')],
          confidence: this.faker.number.float({ min: 0.7, max: 0.99, multipleOf: 0.01 }),
          rationale: this.faker.lorem.sentence(),
          appliedAt: this.faker.date.recent({ days: 1 }).getTime(),
        })),
        errors: [],
      }
    });
  }
  
  /**
   * Create a failed job
   */
  createFailed(options?: FactoryOptions<AiCategorizationJob>): AiCategorizationJob {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'failed',
        errors: [{
          message: this.faker.helpers.arrayElement([
            'API rate limit exceeded',
            'Invalid API key',
            'Model not available',
            'Network timeout',
          ]),
          productId: this.faker.helpers.maybe(() => createMockId('products')),
          timestamp: this.faker.date.recent({ days: 1 }).getTime(),
          type: this.faker.helpers.arrayElement(['api_error', 'rate_limit', 'validation_error', 'network_error']),
        }],
      }
    });
  }
  
  /**
   * Create a test job with predictable data
   */
  createTest(index: number = 1): AiCategorizationJob {
    const productIds = Array.from({ length: 5 }, (_, i) => 
      createMockId('products')
    );
    
    return this.create({
      overrides: {
        _id: createMockId('aiCategorizationJobs'),
        status: 'completed',
        provider: 'openai',
        model: 'gpt-4',
        productIds,
        progress: {
          current: productIds.length,
          total: productIds.length,
          percentage: 100,
        },
      }
    });
  }
  
  private generateProgress(status: string) {
    if (status === 'pending') {
      const total = this.faker.number.int({ min: 10, max: 100 });
      return { current: 0, total, percentage: 0 };
    }
    
    if (status === 'running') {
      const total = this.faker.number.int({ min: 10, max: 100 });
      const current = this.faker.number.int({ min: 1, max: total - 1 });
      return { current, total, percentage: Math.round((current / total) * 100) };
    }
    
    const total = this.faker.number.int({ min: 10, max: 100 });
    return { current: total, total, percentage: 100 };
  }
  
  private generateModel(): string {
    const models = {
      openai: ['gpt-4', 'gpt-3.5-turbo', 'o3-mini'],
      anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-opus-4'],
      gemini: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    };
    
    const provider = this.faker.helpers.objectKey(models);
    return this.faker.helpers.arrayElement(models[provider as keyof typeof models]);
  }
  
  private generateProductIds(): Id<'products'>[] {
    const count = this.faker.number.int({ min: 5, max: 50 });
    return Array.from({ length: count }, () => createMockId('products'));
  }
  
  private generateResults(status: string) {
    if (['pending', 'running', 'failed', 'cancelled'].includes(status)) {
      return [];
    }
    
    const count = this.faker.number.int({ min: 5, max: 20 });
    return Array.from({ length: count }, () => ({
      productId: createMockId('products'),
      suggestedCategoryIds: Array.from({ 
        length: this.faker.number.int({ min: 1, max: 3 }) 
      }, () => createMockId('categories')),
      confidence: this.faker.number.float({ min: 0.5, max: 0.99, multipleOf: 0.01 }),
      rationale: this.faker.lorem.sentence(),
      appliedAt: this.faker.helpers.maybe(() => 
        this.faker.date.recent({ days: 7 }).getTime(), 
        { probability: 0.7 }
      ),
    }));
  }
  
  private generateErrors(status: string) {
    if (status === 'failed') {
      return [{
        message: this.faker.helpers.arrayElement([
          'API rate limit exceeded',
          'Invalid API key',
          'Model not available',
        ]),
        timestamp: this.faker.date.recent({ days: 1 }).getTime(),
        type: 'api_error' as const,
      }];
    }
    
    if (status === 'completed' && this.faker.datatype.boolean({ probability: 0.2 })) {
      // Some completed jobs might have partial errors
      return [{
        message: 'Failed to categorize product: insufficient data',
        productId: createMockId('products'),
        timestamp: this.faker.date.recent({ days: 1 }).getTime(),
        type: 'validation_error' as const,
      }];
    }
    
    return [];
  }
  
  private generateCost(status: string) {
    if (['pending', 'cancelled'].includes(status)) {
      return { inputTokens: 0, outputTokens: 0, totalCost: 0 };
    }
    
    const inputTokens = this.faker.number.int({ min: 1000, max: 50000 });
    const outputTokens = this.faker.number.int({ min: 500, max: 10000 });
    const totalCost = (inputTokens * 0.00003 + outputTokens * 0.00006); // Example pricing
    
    return { inputTokens, outputTokens, totalCost };
  }
}