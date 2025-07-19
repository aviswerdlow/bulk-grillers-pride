import { z } from 'zod';
import { api } from '../../../../convex/_generated/api';
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

// AI Categorization schemas
const aiJobSchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
  organizationId: z.string(),
  projectId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  progress: z.object({
    current: z.number().min(0),
    total: z.number().min(0),
    percentage: z.number().min(0).max(100),
  }),
  provider: z.enum(['openai', 'anthropic', 'gemini']),
  model: z.string(),
  temperature: z.number().min(0).max(1),
  productIds: z.array(z.string()),
  filters: z.object({
    status: z.string().optional(),
    hasCategories: z.boolean().optional(),
    productType: z.string().optional(),
  }).optional(),
  results: z.array(z.object({
    productId: z.string(),
    suggestedCategoryIds: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    rationale: z.string(),
    appliedAt: z.number().optional(),
  })),
  errors: z.array(z.object({
    message: z.string(),
    productId: z.string().optional(),
    timestamp: z.number(),
    type: z.enum(['api_error', 'rate_limit', 'validation_error', 'network_error', 
                   'configuration_error', 'permission_error']),
  })),
  metadata: z.any(),
  cost: z.object({
    inputTokens: z.number().min(0),
    outputTokens: z.number().min(0),
    totalCost: z.number().min(0),
  }),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const createJobResponseSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  message: z.string(),
});

const categorizationResultSchema = z.object({
  productId: z.string(),
  suggestedCategories: z.array(z.object({
    categoryId: z.string(),
    categoryName: z.string(),
    confidence: z.number().min(0).max(1),
    rationale: z.string(),
  })),
  applied: z.boolean(),
  error: z.string().optional(),
});

// Define contract tests
const aiCategorizationContracts: ContractTestConfig[] = [
  // Create Categorization Job
  {
    functionRef: api.functions.ai.categorization.createCategorizationJob,
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
      provider: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
      model: z.string().optional(),
      temperature: z.number().min(0).max(1).default(0.3),
      autoApply: z.boolean().default(false),
      confidenceThreshold: z.number().min(0).max(1).default(0.8),
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
        provider: 'anthropic',
        model: 'claude-3-opus',
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        productIds: Array.from({ length: 50 }, () => createMockId('products')),
        temperature: 0.5,
        autoApply: true,
        confidenceThreshold: 0.9,
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
        temperature: 1.5, // Out of range
      },
    ],
    auth: {
      required: true,
      roles: ['editor', 'admin', 'owner'],
    },
  },
  
  // Get Categorization Job
  {
    functionRef: api.functions.ai.categorization.getCategorizationJob,
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
  
  // List Categorization Jobs
  {
    functionRef: api.functions.ai.categorization.listCategorizationJobs,
    name: 'ai.categorization.listCategorizationJobs',
    description: 'List AI categorization jobs with filtering',
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
        status: 'invalid' as any, // Invalid status
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
    functionRef: api.functions.ai.categorization.cancelCategorizationJob,
    name: 'ai.categorization.cancelCategorizationJob',
    description: 'Cancel a running or pending categorization job',
    inputSchema: z.object({
      jobId: z.string(),
      reason: z.string().optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      cancelledAt: z.number(),
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
    functionRef: api.functions.ai.categorization.applyCategorization,
    name: 'ai.categorization.applyCategorization',
    description: 'Apply AI categorization results to products',
    inputSchema: z.object({
      jobId: z.string(),
      productId: z.string(),
      categoryIds: z.array(z.string()).min(1),
      confidence: z.number().min(0).max(1),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      applied: z.number(),
      message: z.string(),
    }),
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
  
  // Get Job Results
  {
    functionRef: api.functions.ai.categorization.getJobResults,
    name: 'ai.categorization.getJobResults',
    description: 'Get detailed results of a categorization job',
    inputSchema: z.object({
      jobId: z.string(),
      includeApplied: z.boolean().default(true),
      includeErrors: z.boolean().default(true),
    }),
    outputSchema: z.object({
      job: aiJobSchema,
      results: z.array(categorizationResultSchema),
      summary: z.object({
        total: z.number(),
        categorized: z.number(),
        applied: z.number(),
        failed: z.number(),
        averageConfidence: z.number(),
      }),
    }),
    validInputs: [
      {
        jobId: createMockId('aiCategorizationJobs'),
      },
      {
        jobId: createMockId('aiCategorizationJobs'),
        includeApplied: false,
        includeErrors: true,
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
  
  // Retry Failed Products
  {
    functionRef: api.functions.ai.categorization.retryFailedProducts,
    name: 'ai.categorization.retryFailedProducts',
    description: 'Retry categorization for failed products',
    inputSchema: z.object({
      jobId: z.string(),
      productIds: z.array(z.string()).optional(),
    }),
    outputSchema: createJobResponseSchema,
    validInputs: [
      {
        jobId: createMockId('aiCategorizationJobs'),
      },
      {
        jobId: createMockId('aiCategorizationJobs'),
        productIds: [createMockId('products'), createMockId('products')],
      },
    ],
    invalidInputs: [
      {}, // Missing jobId
    ],
    auth: {
      required: true,
      roles: ['editor', 'admin', 'owner'],
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
      const mockResponse = {
        jobId: createMockId('aiCategorizationJobs'),
        status: 'pending',
        message: 'Categorization job created successfully',
      };
      expectResponseShape(mockResponse, createJobResponseSchema);
    });
    
    it('should validate categorization result shape', () => {
      const mockResult = {
        productId: createMockId('products'),
        suggestedCategories: [
          {
            categoryId: createMockId('categories'),
            categoryName: 'Meat & Poultry',
            confidence: 0.85,
            rationale: 'Product title contains beef keywords',
          },
        ],
        applied: true,
        error: undefined,
      };
      expectResponseShape(mockResult, categorizationResultSchema);
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
          provider: provider as any,
        };
        
        const result = createContract!.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
    
    it('should validate temperature range', () => {
      const createContract = aiCategorizationContracts.find(c => 
        c.name === 'ai.categorization.createCategorizationJob'
      );
      expect(createContract).toBeDefined();
      
      const validTemps = [0, 0.3, 0.5, 0.7, 1];
      validTemps.forEach(temp => {
        const input = {
          organizationId: createMockId('organizations'),
          projectId: createMockId('projects'),
          temperature: temp,
        };
        
        const result = createContract!.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
      
      const invalidTemps = [-0.1, 1.1, 2];
      invalidTemps.forEach(temp => {
        const input = {
          organizationId: createMockId('organizations'),
          projectId: createMockId('projects'),
          temperature: temp,
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
          overrides: { status: status as any }
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