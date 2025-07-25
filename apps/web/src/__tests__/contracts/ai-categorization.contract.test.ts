import { api } from '@convex/_generated/api';
import { z } from 'zod';

import {
  ContractTestConfig,
  validateContract,
  commonSchemas,
  expectResponseShape,
} from './contract-test-utils';
import { 
  aiCategorizationJobFactory,
  createMockId,
} from '@bulk-grillers-pride/test-factories';

// AI Categorization schemas - matching actual Convex schema
const aiJobSchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
  organizationId: z.string(),
  projectId: z.string(),
  
  // Job Configuration
  jobType: z.enum(['bulk_categorization', 'single_product', 'validation']),
  batchSize: z.number(),
  aiProvider: z.string(), // Note: actual schema uses aiProvider, not provider
  aiModel: z.string(), // Note: actual schema uses aiModel, not model
  prompt: z.string(),
  
  // Target Products
  productIds: z.array(z.string()),
  categoryContext: z.unknown(), // JSON of available categories
  
  // Job Status
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  progress: z.object({
    total: z.number(),
    processed: z.number(),
    successful: z.number(),
    failed: z.number(),
    skipped: z.number(),
  }),
  
  // Results
  results: z.array(
    z.object({
      productId: z.string(),
      suggestions: z.array(
        z.object({
          categoryId: z.string(),
          confidence: z.number(),
          rationale: z.string(),
        })
      ),
      newCategorySuggestions: z.array(
        z.object({
          name: z.string(),
          parentId: z.string().optional(),
          rationale: z.string(),
        })
      ).optional(),
      applied: z.boolean().optional(),
      appliedAt: z.number().optional(),
      appliedBy: z.string().optional(),
    })
  ),
  
  // Error Handling
  errors: z.array(
    z.object({
      type: z.string(),
      message: z.string(),
      productId: z.string().optional(),
      timestamp: z.number(),
    })
  ),
  
  // Notifications
  notifications: z.object({
    email: z.boolean(),
    dashboard: z.boolean(),
    recipients: z.array(z.string()),
  }),
  
  // Timestamps
  createdAt: z.number(),
  updatedAt: z.number(),
  createdBy: z.string(),
  
  // Cost Tracking
  metadata: z.unknown(), // Contains cost info among other things
});

const createJobResponseSchema = z.string(); // The mutation returns just the job ID

// Removed categorizationResultSchema as it doesn't match actual implementation

// Define contract tests
const aiCategorizationContracts: ContractTestConfig[] = [
  // Create Categorization Job
  {
    functionRef: (api as any).functions.ai.categorization.createCategorizationJob,
    name: 'ai.categorization.createCategorizationJob',
    description: 'Create a new AI categorization job',
    inputSchema: z.object({
      organizationId: z.string(),
      projectId: z.string(),
      productIds: z.array(z.string()).min(1).max(1000).optional(),
      filters: z.object({
        status: z.enum(['active', 'draft']).optional(),
        hasCategories: z.boolean().optional(),
        productType: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
      aiProvider: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
      aiModel: z.string().optional(),
      jobType: z.enum(['bulk_categorization', 'single_product', 'validation']).default('bulk_categorization'),
      batchSize: z.number().min(1).max(100).default(50),
      // Note: These fields don't exist in the actual implementation
      // but may be used by the UI
    }),
    outputSchema: createJobResponseSchema,
    validInputs: [
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        productIds: [createMockId('products')],
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        filters: { status: 'active', hasCategories: false },
        aiProvider: 'anthropic',
        aiModel: 'claude-3-opus',
        jobType: 'bulk_categorization',
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        productIds: Array.from({ length: 50 }, () => createMockId('products')),
        jobType: 'single_product',
        batchSize: 25,
      },
    ],
    invalidInputs: [
      {}, // Missing required fields
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        productIds: [], // Empty array
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        productIds: Array.from({ length: 1001 }, () => createMockId('products')), // Too many
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        batchSize: 101, // Out of range
      },
    ],
    auth: {
      required: true,
      roles: ['editor', 'admin', 'owner'],
    },
  },
  
  // Get Categorization Job
  {
    functionRef: (api as any).functions.ai.categorization.getCategorizationJob,
    name: 'ai.categorization.getCategorizationJob',
    description: 'Get details of a categorization job',
    inputSchema: z.object({
      jobId: z.string(),
    }),
    outputSchema: aiJobSchema.nullable(),
    validInputs: [
      { jobId: createMockId('aiCategorizationJobs') },
    ],
    invalidInputs: [
      {}, // Missing jobId
      { jobId: '' }, // Empty string
    ],
    auth: {
      required: true,
      roles: ['viewer', 'editor', 'admin', 'owner'],
    },
  },
  
  // Get Categorization Jobs
  {
    functionRef: (api as any).functions.ai.categorization.getCategorizationJobs,
    name: 'ai.categorization.getCategorizationJobs',
    description: 'Get AI categorization jobs with filtering',
    inputSchema: z.object({
      organizationId: z.string(),
      projectId: z.string().optional(),
      status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
      createdBy: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }),
    outputSchema: commonSchemas.paginationOutput(aiJobSchema),
    validInputs: [
      {
        organizationId: createMockId('organizations'),
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        status: 'completed',
        limit: 50,
      },
    ],
    invalidInputs: [
      {}, // Missing organizationId
      {
        organizationId: createMockId('organizations'),
        status: 'invalid' as unknown, // Invalid status
      },
      {
        organizationId: createMockId('organizations'),
        limit: 101, // Too large
      },
    ],
    auth: {
      required: true,
      roles: ['viewer', 'editor', 'admin', 'owner'],
    },
  },
  
  // Cancel Categorization Job
  {
    functionRef: (api as any).functions.ai.categorization.cancelCategorizationJob,
    name: 'ai.categorization.cancelCategorizationJob',
    description: 'Cancel a running or pending categorization job',
    inputSchema: z.object({
      jobId: z.string(),
      reason: z.string().optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      jobId: z.string(),
    }),
    validInputs: [
      {
        jobId: createMockId('aiCategorizationJobs'),
      },
      {
        jobId: createMockId('aiCategorizationJobs'),
        reason: 'User requested cancellation',
      },
    ],
    invalidInputs: [
      {}, // Missing jobId
      { jobId: '' }, // Empty string
    ],
    auth: {
      required: true,
      roles: ['editor', 'admin', 'owner'],
    },
  },
  
  // Apply Categorization Results
  {
    functionRef: (api as any).functions.ai.categorization.applyCategorization,
    name: 'ai.categorization.applyCategorization',
    description: 'Apply AI categorization results to products',
    inputSchema: z.object({
      jobId: z.string(),
      productId: z.string(),
      categoryIds: z.array(z.string()).min(1),
      confidence: z.number().min(0).max(1),
    }),
    outputSchema: z.string(), // Returns the productId
    validInputs: [
      {
        jobId: createMockId('aiCategorizationJobs'),
        productId: createMockId('products'),
        categoryIds: [createMockId('categories')],
        confidence: 0.85,
      },
      {
        jobId: createMockId('aiCategorizationJobs'),
        productId: createMockId('products'),
        categoryIds: [createMockId('categories'), createMockId('categories')],
        confidence: 0.95,
      },
    ],
    invalidInputs: [
      {
        jobId: createMockId('aiCategorizationJobs'),
        productId: createMockId('products'),
        categoryIds: [], // Empty array
        confidence: 0.85,
      },
      {
        jobId: createMockId('aiCategorizationJobs'),
        productId: createMockId('products'),
        categoryIds: [createMockId('categories')],
        confidence: 1.5, // Out of range
      },
    ],
    auth: {
      required: true,
      roles: ['editor', 'admin', 'owner'],
    },
  },
  
  // Get Job Details
  {
    functionRef: (api as any).functions.ai.categorization.getJobDetails,
    name: 'ai.categorization.getJobDetails',
    description: 'Get detailed information about a categorization job',
    inputSchema: z.object({
      jobId: z.string(),
    }),
    outputSchema: z.object({
      job: aiJobSchema.nullable(),
      productResults: z.array(z.object({
        product: z.object({
          _id: z.string(),
          title: z.string(),
          sku: z.string().nullable(),
          currentCategories: z.array(z.string()),
        }),
        categories: z.array(z.object({
          _id: z.string(),
          name: z.string(),
          path: z.string(),
        })),
        confidence: z.number(),
        rationale: z.string(),
        applied: z.boolean(),
        appliedAt: z.number().optional(),
      })).optional(),
      metrics: z.object({
        successRate: z.number(),
        averageConfidence: z.number(),
        totalProcessingTime: z.number(),
        tokensUsed: z.number(),
        estimatedCost: z.number(),
      }).optional(),
      errors: z.array(z.object({
        productId: z.string(),
        productTitle: z.string(),
        error: z.string(),
        timestamp: z.number(),
      })).optional(),
    }).nullable(),
    validInputs: [
      {
        jobId: createMockId('aiCategorizationJobs'),
      },
    ],
    invalidInputs: [
      {}, // Missing jobId
    ],
    auth: {
      required: true,
      roles: ['viewer', 'editor', 'admin', 'owner'],
    },
  },
  
  // Export Job Results
  {
    functionRef: (api as any).functions.ai.categorization.exportJobResults,
    name: 'ai.categorization.exportJobResults',
    description: 'Export categorization job results as CSV',
    inputSchema: z.object({
      jobId: z.string(),
      format: z.enum(['summary', 'detailed']).default('summary'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      csv: z.string(),
      filename: z.string(),
      rowCount: z.number(),
    }),
    validInputs: [
      {
        jobId: createMockId('aiCategorizationJobs'),
      },
      {
        jobId: createMockId('aiCategorizationJobs'),
        format: 'detailed',
      },
    ],
    invalidInputs: [
      {}, // Missing jobId
    ],
    auth: {
      required: true,
      roles: ['viewer', 'editor', 'admin', 'owner'],
    },
  },
];

describe('AI Categorization API Contracts', () => {
  describe('Schema Validation', () => {
    aiCategorizationContracts.forEach(contract => {
      describe(contract.name, () => {
        it('should validate contract configuration', () => {
          const result = validateContract(contract);
          
          if (result.errors.length > 0) {
            console.error(`Errors in ${contract.name}:`, result.errors);
          }
          
          if (result.warnings.length > 0) {
            console.warn(`Warnings in ${contract.name}:`, result.warnings);
          }
          
          expect(result.passed).toBe(true);
        });
        
        it('should have proper authentication requirements', () => {
          expect(contract.auth).toBeDefined();
          expect(contract.auth?.required).toBe(true);
          expect(contract.auth?.roles).toBeDefined();
          expect(contract.auth?.roles!.length).toBeGreaterThan(0);
        });
      });
    });
  });
  
  describe('Response Shape Tests', () => {
    it('should validate AI job response shape', () => {
      const mockJob = aiCategorizationJobFactory.create();
      expectResponseShape(mockJob, aiJobSchema);
    });
    
    it('should validate job creation response', () => {
      const mockResponse = createMockId('aiCategorizationJobs');
      expectResponseShape(mockResponse, createJobResponseSchema);
    });
  });
  
  describe('Provider and Model Tests', () => {
    it('should accept valid AI providers', () => {
      const createContract = aiCategorizationContracts.find(c => 
        c.name === 'ai.categorization.createCategorizationJob'
      );
      expect(createContract).toBeDefined();
      
      const providers = ['openai', 'anthropic', 'gemini'];
      providers.forEach(provider => {
        const input = {
          organizationId: createMockId('organizations'),
          projectId: createMockId('projects'),
          aiProvider: provider as unknown,
        };
        
        const result = createContract!.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
    
    it('should validate batch size range', () => {
      const createContract = aiCategorizationContracts.find(c => 
        c.name === 'ai.categorization.createCategorizationJob'
      );
      expect(createContract).toBeDefined();
      
      const validSizes = [1, 10, 25, 50, 100];
      validSizes.forEach(size => {
        const input = {
          organizationId: createMockId('organizations'),
          projectId: createMockId('projects'),
          batchSize: size,
        };
        
        const result = createContract!.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
      
      const invalidSizes = [0, 101, 200];
      invalidSizes.forEach(size => {
        const input = {
          organizationId: createMockId('organizations'),
          projectId: createMockId('projects'),
          batchSize: size,
        };
        
        const result = createContract!.inputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });
  
  describe('Job Status Flow', () => {
    it('should handle all job statuses', () => {
      const statuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
      
      statuses.forEach(status => {
        const mockJob = aiCategorizationJobFactory.create({
          overrides: { status: status as unknown }
        });
        
        const result = aiJobSchema.safeParse(mockJob);
        expect(result.success).toBe(true);
      });
    });
  });
  
  describe('Batch Size Limits', () => {
    it('should enforce product batch limits', () => {
      const createContract = aiCategorizationContracts.find(c => 
        c.name === 'ai.categorization.createCategorizationJob'
      );
      expect(createContract).toBeDefined();
      
      // Valid batch sizes
      const validSizes = [1, 50, 100, 500, 1000];
      validSizes.forEach(size => {
        const input = {
          organizationId: createMockId('organizations'),
          projectId: createMockId('projects'),
          productIds: Array.from({ length: size }, () => createMockId('products')),
        };
        
        const result = createContract!.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
      
      // Invalid batch size (too large)
      const tooLarge = {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        productIds: Array.from({ length: 1001 }, () => createMockId('products')),
      };
      
      const result = createContract!.inputSchema.safeParse(tooLarge);
      expect(result.success).toBe(false);
    });
  });
});