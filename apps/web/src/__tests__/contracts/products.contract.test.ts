import { z } from 'zod';
import { api } from '@convex/_generated/api';
import {
  ContractTestConfig,
  validateContract,
  commonSchemas,
  generatePaginationTests,
  generateFilterTests,
  expectResponseShape,
  createMockContext,
  expectError,
} from './contract-test-utils';
import { 
  productFactory, 
  organizationFactory,
  createMockId,
  createMockIdFromString,
} from '@bulk-grillers-pride/test-factories';

// Product schemas
const productSchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
  organizationId: z.string(),
  projectId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  handle: z.string(),
  status: z.enum(['active', 'draft', 'archived']),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  tags: z.array(z.string()),
  categories: z.array(z.string()),
  aiCategorization: z.object({
    suggestions: z.array(z.object({
      categoryId: z.string(),
      confidence: z.number(),
      rationale: z.string(),
      status: z.enum(['pending', 'accepted', 'rejected']),
    })),
    lastProcessed: z.number(),
    batchId: z.string().optional(),
  }).optional(),
  images: z.array(z.object({
    id: z.string(),
    url: z.string(),
    alt: z.string().optional(),
    position: z.number(),
    storageId: z.string(),
  })),
  metadata: z.any(),
  version: z.number(),
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  lastModifiedBy: z.string(),
});

const productListSchema = commonSchemas.paginationOutput(productSchema);

// Define contract tests
const productContracts: ContractTestConfig[] = [
  // List Products
  {
    functionRef: api.functions.products.list,
    name: 'products.list',
    description: 'List products with pagination and filtering',
    inputSchema: z.object({
      organizationId: z.string(),
      projectId: z.string(),
      status: z.enum(['active', 'draft', 'archived']).optional(),
      search: z.string().optional(),
      categoryId: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
      cursor: z.string().optional(),
    }),
    outputSchema: productListSchema,
    validInputs: [
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        status: 'active',
        limit: 10,
      },
    ],
    invalidInputs: [
      {}, // Missing required fields
      { organizationId: 'invalid-id' }, // Missing projectId
      { organizationId: createMockId('organizations'), projectId: createMockId('projects'), status: 'invalid' },
      { organizationId: createMockId('organizations'), projectId: createMockId('projects'), limit: 0 },
      { organizationId: createMockId('organizations'), projectId: createMockId('projects'), limit: 101 },
    ],
    auth: {
      required: true,
      roles: ['viewer', 'editor', 'admin', 'owner'],
    },
  },
  
  // Get Product
  {
    functionRef: api.functions.products.get,
    name: 'products.get',
    description: 'Get a single product by ID',
    inputSchema: z.object({
      productId: z.string(),
    }),
    outputSchema: productSchema.nullable(),
    validInputs: [
      { productId: createMockId('products') },
    ],
    invalidInputs: [
      {}, // Missing productId
      { productId: '' }, // Empty string
      { productId: null }, // Null value
    ],
    auth: {
      required: true,
      roles: ['viewer', 'editor', 'admin', 'owner'],
    },
  },
  
  // Create Product
  {
    functionRef: api.functions.products.create,
    name: 'products.create',
    description: 'Create a new product',
    inputSchema: z.object({
      organizationId: z.string(),
      projectId: z.string(),
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      vendor: z.string().optional(),
      productType: z.string().optional(),
      handle: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
      status: z.enum(['active', 'draft', 'archived']).default('draft'),
      tags: z.array(z.string()).default([]),
      categories: z.array(z.string()).default([]),
      images: z.array(z.object({
        url: z.string().url(),
        alt: z.string().optional(),
        position: z.number().min(0),
        storageId: z.string(),
      })).default([]),
      metadata: z.any().optional(),
    }),
    outputSchema: z.object({
      _id: z.string(),
      success: z.boolean(),
    }),
    validInputs: [
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        title: 'Test Product',
        handle: 'test-product',
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        title: 'Premium Steak',
        description: 'High quality beef',
        vendor: 'Angus Farms',
        productType: 'meat/beef',
        handle: 'premium-steak',
        status: 'active',
        tags: ['premium', 'beef', 'steak'],
        categories: [createMockId('categories')],
      },
    ],
    invalidInputs: [
      {}, // Missing required fields
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        title: '', // Empty title
        handle: 'test',
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        title: 'Test',
        handle: 'Test Product', // Invalid handle format
      },
    ],
    auth: {
      required: true,
      roles: ['editor', 'admin', 'owner'],
    },
  },
  
  // Update Product
  {
    functionRef: api.functions.products.update,
    name: 'products.update',
    description: 'Update an existing product',
    inputSchema: z.object({
      productId: z.string(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      vendor: z.string().optional(),
      productType: z.string().optional(),
      handle: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
      status: z.enum(['active', 'draft', 'archived']).optional(),
      tags: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
      images: z.array(z.object({
        url: z.string().url(),
        alt: z.string().optional(),
        position: z.number().min(0),
        storageId: z.string(),
      })).optional(),
      metadata: z.any().optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      updated: z.number(),
    }),
    validInputs: [
      {
        productId: createMockId('products'),
        title: 'Updated Product Title',
      },
      {
        productId: createMockId('products'),
        status: 'active',
        tags: ['new-tag'],
      },
    ],
    invalidInputs: [
      {}, // Missing productId
      {
        productId: createMockId('products'),
        title: '', // Empty title
      },
      {
        productId: createMockId('products'),
        handle: 'Invalid Handle!', // Invalid format
      },
    ],
    auth: {
      required: true,
      roles: ['editor', 'admin', 'owner'],
    },
  },
  
  // Delete Product
  {
    functionRef: api.functions.products.deleteProduct,
    name: 'products.deleteProduct',
    description: 'Delete a product (soft delete)',
    inputSchema: z.object({
      productId: z.string(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
    validInputs: [
      { productId: createMockId('products') },
    ],
    invalidInputs: [
      {}, // Missing productId
      { productId: '' }, // Empty string
    ],
    auth: {
      required: true,
      roles: ['admin', 'owner'],
    },
  },
  
  // Bulk Update Products
  {
    functionRef: api.functions.products.bulkUpdate,
    name: 'products.bulkUpdate',
    description: 'Update multiple products at once',
    inputSchema: z.object({
      productIds: z.array(z.string()).min(1).max(100),
      updates: z.object({
        status: z.enum(['active', 'draft', 'archived']).optional(),
        categories: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        vendor: z.string().optional(),
        productType: z.string().optional(),
      }),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      updated: z.number(),
      failed: z.array(z.object({
        productId: z.string(),
        error: z.string(),
      })),
    }),
    validInputs: [
      {
        productIds: [createMockId('products'), createMockId('products')],
        updates: { status: 'active' },
      },
      {
        productIds: [createMockId('products')],
        updates: { 
          categories: [createMockId('categories')],
          tags: ['bulk-updated'],
        },
      },
    ],
    invalidInputs: [
      { productIds: [], updates: {} }, // Empty array
      { productIds: ['id1'], updates: { status: 'invalid' } }, // Invalid status
    ],
    auth: {
      required: true,
      roles: ['editor', 'admin', 'owner'],
    },
  },
];

describe('Product API Contracts', () => {
  describe('Schema Validation', () => {
    productContracts.forEach(contract => {
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
    it('should validate product list response shape', () => {
      const mockResponse = {
        items: [productFactory.create()],
        nextCursor: 'cursor123',
        hasMore: false,
      };
      
      expectResponseShape(mockResponse, productListSchema);
    });
    
    it('should validate single product response shape', () => {
      const mockProduct = productFactory.create();
      expectResponseShape(mockProduct, productSchema);
    });
  });
  
  describe('Pagination Tests', () => {
    const baseInput = {
      organizationId: createMockId('organizations'),
      projectId: createMockId('projects'),
    };
    
    const paginationTests = generatePaginationTests(baseInput);
    
    paginationTests.forEach(testCase => {
      it(`should handle pagination with ${JSON.stringify(testCase)}`, () => {
        const listContract = productContracts.find(c => c.name === 'products.list');
        expect(listContract).toBeDefined();
        
        const result = listContract!.inputSchema.safeParse(testCase);
        expect(result.success).toBe(true);
      });
    });
  });
  
  describe('Filter Tests', () => {
    const baseInput = {
      organizationId: createMockId('organizations'),
      projectId: createMockId('projects'),
    };
    
    const statusFilterTests = generateFilterTests(baseInput, 'status', ['active', 'draft', 'archived']);
    
    statusFilterTests.forEach(testCase => {
      it(`should handle status filter with ${testCase.status}`, () => {
        const listContract = productContracts.find(c => c.name === 'products.list');
        expect(listContract).toBeDefined();
        
        const result = listContract!.inputSchema.safeParse(testCase);
        expect(result.success).toBe(true);
      });
    });
  });
  
  describe('Error Handling', () => {
    it('should reject invalid product creation', async () => {
      const createContract = productContracts.find(c => c.name === 'products.create');
      expect(createContract).toBeDefined();
      
      const invalidInput = {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        title: '', // Empty title
        handle: 'test',
      };
      
      if (!createContract) {
        throw new Error('Create contract not found');
      }
      const result = createContract.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('title');
    });
    
    it('should reject invalid handle format', () => {
      const createContract = productContracts.find(c => c.name === 'products.create');
      expect(createContract).toBeDefined();
      
      const invalidInput = {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        title: 'Test Product',
        handle: 'Invalid Handle!', // Contains spaces and special chars
      };
      
      if (!createContract) {
        throw new Error('Create contract not found');
      }
      const result = createContract.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('handle');
    });
  });
});