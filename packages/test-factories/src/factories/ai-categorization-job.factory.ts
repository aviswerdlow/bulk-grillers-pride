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
    const productIds = options?.overrides?.productIds || this.generateProductIds();
    
    const job: AiCategorizationJob = {
      _id: options?.overrides?._id || this.idGenerator.next(),
      _creationTime: options?.overrides?._creationTime || pastDate,
      organizationId: options?.overrides?.organizationId || createMockId('organizations'),
      projectId: options?.overrides?.projectId || createMockId('projects'),
      
      // Job Configuration
      jobType: options?.overrides?.jobType || this.randomEnum(['bulk_categorization', 'single_product', 'validation'] as const),
      batchSize: options?.overrides?.batchSize || this.faker.number.int({ min: 10, max: 50 }),
      aiProvider: options?.overrides?.aiProvider || this.randomEnum(['openai', 'anthropic', 'gemini'] as const),
      aiModel: options?.overrides?.aiModel || this.generateModel(),
      prompt: options?.overrides?.prompt || this.faker.lorem.paragraph(),
      
      // Target Products
      productIds,
      categoryContext: options?.overrides?.categoryContext || {},
      
      // Job Status
      status,
      progress: this.generateProgress(status, productIds.length),
      
      // Results
      results: this.generateResults(status, productIds),
      
      // Error Handling
      errors: this.generateErrors(status),
      
      // Notifications
      notifications: options?.overrides?.notifications || {
        email: this.faker.datatype.boolean(),
        dashboard: true,
        recipients: [this.faker.internet.email()],
      },
      notificationsSent: status === 'completed' || status === 'failed',
      
      // Execution Details
      startedAt: status !== 'pending' ? this.faker.date.between({ from: pastDate, to: now }).getTime() : undefined,
      completedAt: ['completed', 'failed', 'cancelled'].includes(status) 
        ? this.faker.date.between({ from: pastDate, to: now }).getTime() 
        : undefined,
      executionTime: ['completed', 'failed'].includes(status) 
        ? this.faker.number.int({ min: 1000, max: 60000 }) 
        : undefined,
      
      // Cost Tracking
      totalCost: ['completed', 'failed'].includes(status) 
        ? this.faker.number.float({ min: 0.01, max: 10, multipleOf: 0.01 }) 
        : undefined,
      totalTokens: ['completed', 'failed'].includes(status) 
        ? this.faker.number.int({ min: 1000, max: 100000 }) 
        : undefined,
      
      // Real-time Progress Tracking
      currentBatch: status === 'running' ? this.faker.number.int({ min: 1, max: 5 }) : undefined,
      lastProcessedProduct: status === 'running' ? productIds[Math.floor(productIds.length / 2)] : undefined,
      
      // Metadata
      metadata: options?.overrides?.metadata || {},
      
      // Audit
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
        jobType: 'bulk_categorization',
        batchSize: 50,
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        prompt: 'Categorize these products based on their attributes',
        productIds,
        categoryContext: {},
        progress: {
          total: productIds.length,
          processed: productIds.length,
          successful: productIds.length,
          failed: 0,
          skipped: 0,
        },
        results: productIds.map((productId) => ({
          productId,
          suggestions: [{
            categoryId: createMockId('categories'),
            confidence: 0.95,
            rationale: 'High confidence match based on product attributes',
          }],
          newCategorySuggestions: [],
          status: 'success' as const,
          error: undefined,
        })),
        errors: [],
        notifications: {
          email: true,
          dashboard: true,
          recipients: ['test@example.com'],
        },
        notificationsSent: true,
        createdBy: createMockId('users'),
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 1800000,
        metadata: {},
      }
    });
  }
  
  private generateProgress(status: string, total: number) {
    if (status === 'pending') {
      return { 
        total, 
        processed: 0, 
        successful: 0, 
        failed: 0, 
        skipped: 0 
      };
    }
    
    if (status === 'running') {
      const processed = this.faker.number.int({ min: 1, max: total - 1 });
      const successful = this.faker.number.int({ min: 0, max: processed });
      const failed = this.faker.number.int({ min: 0, max: processed - successful });
      const skipped = processed - successful - failed;
      return { total, processed, successful, failed, skipped };
    }
    
    if (status === 'completed') {
      const failed = this.faker.number.int({ min: 0, max: Math.floor(total * 0.1) });
      const skipped = this.faker.number.int({ min: 0, max: Math.floor(total * 0.05) });
      const successful = total - failed - skipped;
      return { total, processed: total, successful, failed, skipped };
    }
    
    // For failed/cancelled status
    const processed = this.faker.number.int({ min: 1, max: total });
    const successful = this.faker.number.int({ min: 0, max: processed });
    const failed = processed - successful;
    return { total, processed, successful, failed, skipped: 0 };
  }
  
  private generateModel(): string {
    const models = {
      openai: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
      anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      gemini: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    };
    
    const provider = this.faker.helpers.objectKey(models);
    return this.faker.helpers.arrayElement(models[provider as keyof typeof models]);
  }
  
  private generateProductIds(): Id<'products'>[] {
    const count = this.faker.number.int({ min: 5, max: 50 });
    return Array.from({ length: count }, () => createMockId('products'));
  }
  
  private generateResults(status: string, productIds: Id<'products'>[]) {
    if (['pending', 'running', 'cancelled'].includes(status)) {
      return [];
    }
    
    // For completed/failed status, generate results for some products
    const resultsCount = status === 'completed' 
      ? productIds.length 
      : this.faker.number.int({ min: 0, max: productIds.length });
    
    return productIds.slice(0, resultsCount).map((productId) => ({
      productId,
      suggestions: Array.from({ 
        length: this.faker.number.int({ min: 1, max: 3 }) 
      }, () => ({
        categoryId: createMockId('categories'),
        confidence: this.faker.number.float({ min: 0.5, max: 0.99, multipleOf: 0.01 }),
        rationale: this.faker.lorem.sentence(),
      })),
      newCategorySuggestions: this.faker.helpers.maybe(() => 
        Array.from({ length: this.faker.number.int({ min: 1, max: 2 }) }, () => ({
          name: this.faker.commerce.department(),
          parentId: this.faker.helpers.maybe(() => createMockId('categories')),
          rationale: this.faker.lorem.sentence(),
          confidence: this.faker.number.float({ min: 0.5, max: 0.95, multipleOf: 0.01 }),
        })),
        { probability: 0.2 }
      ) || [],
      status: this.faker.helpers.arrayElement(['success', 'error', 'skipped'] as const),
      error: this.faker.helpers.maybe(() => 
        this.faker.helpers.arrayElement([
          'Failed to categorize product',
          'Insufficient product data',
          'API error during processing',
        ]),
        { probability: 0.1 }
      ),
    }));
  }
  
  private generateErrors(status: string) {
    if (status === 'failed') {
      return [{
        type: this.faker.helpers.arrayElement(['api_error', 'rate_limit', 'validation_error', 'network_error']),
        message: this.faker.helpers.arrayElement([
          'API rate limit exceeded',
          'Invalid API key',
          'Model not available',
          'Network timeout',
        ]),
        productId: this.faker.helpers.maybe(() => createMockId('products')),
        timestamp: this.faker.date.recent({ days: 1 }).getTime(),
      }];
    }
    
    if (status === 'completed' && this.faker.datatype.boolean({ probability: 0.2 })) {
      // Some completed jobs might have partial errors
      return [{
        type: 'validation_error',
        message: 'Failed to categorize product: insufficient data',
        productId: createMockId('products'),
        timestamp: this.faker.date.recent({ days: 1 }).getTime(),
      }];
    }
    
    return [];
  }
  
}