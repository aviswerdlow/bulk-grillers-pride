import { api } from '@convex/_generated/api';
import { z } from 'zod';

import {
  ContractTestConfig,
  validateContract,
//   commonSchemas,
  expectResponseShape,
//   createMockContext,
} from './contract-test-utils';
import { 
  categoryFactory,
  createMockId,
} from '@bulk-grillers-pride/test-factories';

// Category schemas
const categorySchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
  organizationId: z.string(),
  projectId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  handle: z.string(),
  externalId: z.string().optional(),
  parentId: z.string().optional(),
  level: z.number().min(0),
  path: z.string(),
  sortOrder: z.number(),
  color: z.string().optional(),
  icon: z.string().optional(),
  image: z.object({
    url: z.string(),
    alt: z.string().optional(),
    storageId: z.string(),
  }).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z.enum(['active', 'hidden', 'archived']),
  isVisible: z.boolean(),
  metadata: z.any(),
  aiSuggestions: z.object({
    suggestedBy: z.string(),
    rationale: z.string(),
    confidence: z.number(),
    approvedBy: z.string().optional(),
    approvedAt: z.number().optional(),
  }).optional(),
  version: z.number(),
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  lastModifiedBy: z.string(),
});

const categoryTreeSchema = z.object({
  category: categorySchema,
  children: z.array(z.any()), // Recursive type
  productCount: z.number(),
});

const categoryWithCountSchema = categorySchema.extend({
  productCount: z.number(),
});

// Define contract tests
const categoryContracts: ContractTestConfig[] = [
  // List Categories
  {
    functionRef: (api as any).functions.categories.categories.list,
    name: 'categories.list',
    description: 'List categories with optional filtering',
    inputSchema: z.object({
      organizationId: z.string(),
      projectId: z.string(),
      parentId: z.string().optional(),
      level: z.number().min(0).optional(),
      status: z.enum(['active', 'hidden', 'archived']).optional(),
      includeProductCounts: z.boolean().optional(),
    }),
    outputSchema: z.array(z.union([categorySchema, categoryWithCountSchema])),
    validInputs: [
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        level: 0,
        status: 'active',
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        parentId: createMockId('categories'),
        includeProductCounts: true,
      },
    ],
    invalidInputs: [
      {}, // Missing required fields
      { organizationId: createMockId('organizations') }, // Missing projectId
      { 
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        level: -1, // Negative level
      },
    ],
    auth: {
      required: true,
      roles: ['viewer', 'editor', 'admin', 'owner'],
    },
  },
  
  // Get Category Tree
  {
    functionRef: (api as any).functions.categories.categories.getTree,
    name: 'categories.getTree',
    description: 'Get hierarchical category tree',
    inputSchema: z.object({
      organizationId: z.string(),
      projectId: z.string(),
      rootId: z.string().optional(),
      maxDepth: z.number().min(1).max(10).optional(),
      includeHidden: z.boolean().optional(),
      includeProductCounts: z.boolean().optional(),
    }),
    outputSchema: z.array(categoryTreeSchema),
    validInputs: [
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        maxDepth: 3,
        includeProductCounts: true,
      },
    ],
    invalidInputs: [
      { maxDepth: 0 }, // Too small
      { maxDepth: 11 }, // Too large
    ],
    auth: {
      required: true,
      roles: ['viewer', 'editor', 'admin', 'owner'],
    },
  },
  
  // Create Category
  {
    functionRef: (api as any).functions.categories.categories.create,
    name: 'categories.create',
    description: 'Create a new category',
    inputSchema: z.object({
      organizationId: z.string(),
      projectId: z.string(),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      handle: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
      parentId: z.string().optional(),
      sortOrder: z.number().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      icon: z.string().optional(),
      image: z.object({
        url: z.string().url(),
        alt: z.string().optional(),
        storageId: z.string(),
      }).optional(),
      seoTitle: z.string().max(200).optional(),
      seoDescription: z.string().max(500).optional(),
      status: z.enum(['active', 'hidden', 'archived']).default('active'),
      isVisible: z.boolean().default(true),
      metadata: z.any().optional(),
    }),
    outputSchema: z.object({
      _id: z.string(),
      success: z.boolean(),
      path: z.string(),
      level: z.number(),
    }),
    validInputs: [
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        name: 'Test Category',
        handle: 'test-category',
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        name: 'Meat & Poultry',
        description: 'Fresh and frozen meat products',
        handle: 'meat-poultry',
        parentId: createMockId('categories'),
        color: '#FF5733',
        icon: 'meat',
        status: 'active',
      },
    ],
    invalidInputs: [
      {}, // Missing required fields
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        name: '', // Empty name
        handle: 'test',
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        name: 'Test',
        handle: 'Invalid Handle!', // Invalid format
      },
      {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        name: 'Test',
        handle: 'test',
        color: 'red', // Invalid color format
      },
    ],
    auth: {
      required: true,
      roles: ['editor', 'admin', 'owner'],
    },
  },
  
  // Update Category
  {
    functionRef: (api as any).functions.categories.categories.update,
    name: 'categories.update',
    description: 'Update an existing category',
    inputSchema: z.object({
      categoryId: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      handle: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
      sortOrder: z.number().optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      icon: z.string().optional(),
      image: z.object({
        url: z.string().url(),
        alt: z.string().optional(),
        storageId: z.string(),
      }).optional(),
      seoTitle: z.string().max(200).optional(),
      seoDescription: z.string().max(500).optional(),
      status: z.enum(['active', 'hidden', 'archived']).optional(),
      isVisible: z.boolean().optional(),
      metadata: z.any().optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      updated: z.number(),
    }),
    validInputs: [
      {
        categoryId: createMockId('categories'),
        name: 'Updated Category Name',
      },
      {
        categoryId: createMockId('categories'),
        status: 'hidden',
        isVisible: false,
      },
    ],
    invalidInputs: [
      {}, // Missing categoryId
      {
        categoryId: createMockId('categories'),
        name: '', // Empty name
      },
      {
        categoryId: createMockId('categories'),
        handle: 'Invalid Handle!', // Invalid format
      },
    ],
    auth: {
      required: true,
      roles: ['editor', 'admin', 'owner'],
    },
  },
  
  // Move Category
  {
    functionRef: (api as any).functions.categories.categories.move,
    name: 'categories.move',
    description: 'Move a category to a different parent',
    inputSchema: z.object({
      categoryId: z.string(),
      newParentId: z.string().nullable(),
      newSortOrder: z.number().optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      newPath: z.string(),
      newLevel: z.number(),
      affectedCategories: z.number(),
    }),
    validInputs: [
      {
        categoryId: createMockId('categories'),
        newParentId: createMockId('categories'),
      },
      {
        categoryId: createMockId('categories'),
        newParentId: null, // Move to root
        newSortOrder: 0,
      },
    ],
    invalidInputs: [
      {}, // Missing categoryId
      { categoryId: '' }, // Empty categoryId
    ],
    auth: {
      required: true,
      roles: ['admin', 'owner'],
    },
  },
  
  // Delete Category
  {
    functionRef: (api as any).functions.categories.categories.deleteCategory,
    name: 'categories.deleteCategory',
    description: 'Delete a category and optionally its children',
    inputSchema: z.object({
      categoryId: z.string(),
      deleteChildren: z.boolean().default(false),
      reassignProductsTo: z.string().optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      deletedCount: z.number(),
      reassignedProducts: z.number(),
    }),
    validInputs: [
      {
        categoryId: createMockId('categories'),
      },
      {
        categoryId: createMockId('categories'),
        deleteChildren: true,
      },
      {
        categoryId: createMockId('categories'),
        reassignProductsTo: createMockId('categories'),
      },
    ],
    invalidInputs: [
      {}, // Missing categoryId
      { categoryId: '' }, // Empty categoryId
    ],
    auth: {
      required: true,
      roles: ['admin', 'owner'],
    },
  },
  
  // Get Category Breadcrumb
  {
    functionRef: (api as any).functions.categories.categories.getBreadcrumb,
    name: 'categories.getBreadcrumb',
    description: 'Get category breadcrumb path',
    inputSchema: z.object({
      categoryId: z.string(),
    }),
    outputSchema: z.array(z.object({
      _id: z.string(),
      name: z.string(),
      handle: z.string(),
      level: z.number(),
    })),
    validInputs: [
      { categoryId: createMockId('categories') },
    ],
    invalidInputs: [
      {}, // Missing categoryId
      { categoryId: '' }, // Empty categoryId
    ],
    auth: {
      required: true,
      roles: ['viewer', 'editor', 'admin', 'owner'],
    },
  },
];

describe('Category API Contracts', () => {
  describe('Schema Validation', () => {
    categoryContracts.forEach(contract => {
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
    it('should validate category response shape', () => {
      const mockCategory = categoryFactory.create();
      expectResponseShape(mockCategory, categorySchema);
    });
    
    it('should validate category with count response shape', () => {
      const mockCategory = {
        ...categoryFactory.create(),
        productCount: 42,
      };
      expectResponseShape(mockCategory, categoryWithCountSchema);
    });
    
    it('should validate category tree response shape', () => {
      const mockTree = {
        category: categoryFactory.create(),
        children: [] as z.infer<typeof categorySchema>[],
        productCount: 10,
      };
      expectResponseShape(mockTree, categoryTreeSchema);
    });
  });
  
  describe('Hierarchy Tests', () => {
    it('should validate parent-child relationships', () => {
      const createContract = categoryContracts.find(c => c.name === 'categories.create');
      expect(createContract).toBeDefined();
      
      const rootCategory = {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        name: 'Root Category',
        handle: 'root-category',
        parentId: undefined,
      };
      
      const childCategory = {
        organizationId: createMockId('organizations'),
        projectId: createMockId('projects'),
        name: 'Child Category',
        handle: 'child-category',
        parentId: createMockId('categories'),
      };
      
      expect(createContract!.inputSchema.safeParse(rootCategory).success).toBe(true);
      expect(createContract!.inputSchema.safeParse(childCategory).success).toBe(true);
    });
  });
  
  describe('Color Validation', () => {
    it('should accept valid hex colors', () => {
      const createContract = categoryContracts.find(c => c.name === 'categories.create');
      const validColors = ['#FF5733', '#00FF00', '#0000FF', '#123456', '#ABCDEF'];
      
      validColors.forEach(color => {
        const input = {
          organizationId: createMockId('organizations'),
          projectId: createMockId('projects'),
          name: 'Test',
          handle: 'test',
          color,
        };
        
        const result = createContract!.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
    
    it('should reject invalid hex colors', () => {
      const createContract = categoryContracts.find(c => c.name === 'categories.create');
      const invalidColors = ['red', '#GG5733', '#FF573', '123456', '#FF5733FF'];
      
      invalidColors.forEach(color => {
        const input = {
          organizationId: createMockId('organizations'),
          projectId: createMockId('projects'),
          name: 'Test',
          handle: 'test',
          color,
        };
        
        const result = createContract!.inputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });
});