/**
 * Test context helper for direct handler imports
 * 
 * This provides a migration path from string-based function calls
 * to direct handler imports for better type safety and maintainability.
 * 
 * Since Convex functions don't expose handlers directly, we need to
 * extract the handler logic into separate testable functions.
 */

import { t } from '../../test.setup';
import type { QueryCtx, MutationCtx } from '../../_generated/server';
import type { Id } from '../../_generated/dataModel';
import type { AuthContext, AuthResult } from '../../lib/auth';
import { mockRequireRole } from './mockAuth';

// Import handler functions from their modules
import {
  storeHandler,
  currentHandler,
  ensureUserHandler,
  currentWithOrganizationsHandler,
  getUserByIdHandler,
  getOrganizationUsersHandler,
  searchUsersHandler,
} from '../../functions/auth/users.handlers';

import {
  getProjectCategoriesHandler,
  getCategoryTreeHandler,
  getCategoryHandler,
  getBreadcrumbHandler,
} from '../../functions/categories/handlers/queries';

import {
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from '../../functions/categories/handlers/mutations';

import {
  getProductBySkuHandler,
} from '../../functions/products/handlers/queries';

import {
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
} from '../../functions/products/handlers/mutations';

import {
  getOrganizationBySlugHandler,
  getUserOrganizationsHandler,
  checkUserPermissionHandler,
} from '../../functions/organizations/handlers/queries';

import {
  createOrganizationHandler,
  updateOrganizationHandler,
  updateOrganizationSettingsHandler,
} from '../../functions/organizations/handlers/mutations';

import {
  getOrganizationProjectsHandler,
  getProjectBySlugHandler,
  getProjectStatsHandler,
} from '../../functions/projects/handlers/queries';

import {
  createProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
  archiveProjectHandler,
} from '../../functions/projects/handlers/mutations';

import {
  getImportJobsHandler,
  getImportJobHandler,
  getFileEntryHandler,
} from '../../functions/imports/handlers/queries';

import {
  createImportJobHandler,
  updateJobStatusHandler,
  completeImportHandler,
  generateUploadUrlHandler,
  completeFileUploadHandler,
} from '../../functions/imports/handlers/mutations';

import {
  getDashboardStatsHandler,
  getRecentActivityHandler,
} from '../../functions/dashboard/handlers/queries';

// Handler functions extracted from categorization.ts
// These would ideally be extracted into the actual module for reuse
export const getCategorizationJobHandler = async (
  ctx: QueryCtx,
  { jobId }: { jobId: Id<'aiCategorizationJobs'> }
) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');

  // Get the job from database
  const job = await ctx.db.get(jobId);
  if (!job) throw new Error('Job not found');

  // Verify user has access to this organization
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) throw new Error('User not found');

  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', job.organizationId).eq('userId', user._id)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership) throw new Error('Access denied');

  return job;
};

export const applyCategorizationHandler = async (
  ctx: MutationCtx,
  args: {
    jobId: Id<'aiCategorizationJobs'>;
    productId: Id<'products'>;
    categoryId: Id<'categories'>;
    confidence: number;
    rationale: string;
  }
) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) throw new Error('User not found');

  const job = await ctx.db.get(args.jobId);
  if (!job) throw new Error('Job not found');

  // Verify user has access
  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', job.organizationId).eq('userId', user._id)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership || membership.role === 'viewer')
    throw new Error('Insufficient permissions');

  // Create the assignment
  await ctx.db.insert('categoryProductAssignments', {
    productId: args.productId,
    categoryId: args.categoryId,
    assignedBy: 'ai',
    assignedAt: Date.now(),
    confidence: args.confidence,
    rationale: args.rationale,
    updatedAt: Date.now(),
  });

  return args.productId;
};

// Create a test context that uses extracted handlers
export function createTestContext() {
  const ctx = t;
  
  return {
    // Database operations (already available through t)
    db: ctx.db,
    auth: ctx.auth,
    scheduler: ctx.scheduler,
    
    // Direct handler wrappers
    handlers: {
      // AI Categorization
      getCategorizationJob: async (args: { jobId: Id<'aiCategorizationJobs'> }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getCategorizationJobHandler(queryCtx, args);
      },
      
      applyCategorization: async (args: {
        jobId: Id<'aiCategorizationJobs'>;
        productId: Id<'products'>;
        categoryId: Id<'categories'>;
        confidence: number;
        rationale: string;
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return applyCategorizationHandler(mutationCtx, args);
      },
      
      // User/Auth handlers
      store: async () => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return storeHandler(mutationCtx);
      },
      
      current: async () => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return currentHandler(queryCtx);
      },
      
      ensureUser: async () => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return ensureUserHandler(mutationCtx);
      },
      
      currentWithOrganizations: async () => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return currentWithOrganizationsHandler(queryCtx);
      },
      
      getUserById: async (args: { userId: Id<'users'> }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getUserByIdHandler(queryCtx, args);
      },
      
      getOrganizationUsers: async (args: { 
        organizationId: Id<'organizations'>;
        includeInvited?: boolean;
      }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getOrganizationUsersHandler(queryCtx, args);
      },
      
      searchUsers: async (args: { 
        query: string;
        organizationId?: Id<'organizations'>;
      }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return searchUsersHandler(queryCtx, args);
      },
      
      // Category query handlers
      getProjectCategories: async (args: {
        organizationId: Id<'organizations'>;
        projectId: Id<'projects'>;
        parentId?: Id<'categories'>;
        level?: number;
      }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getProjectCategoriesHandler(queryCtx, args);
      },
      
      getCategoryTree: async (args: {
        organizationId: Id<'organizations'>;
        projectId: Id<'projects'>;
      }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getCategoryTreeHandler(queryCtx, args);
      },
      
      getCategory: async (args: { categoryId: Id<'categories'> }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getCategoryHandler(queryCtx, args);
      },
      
      getBreadcrumb: async (args: { categoryId: Id<'categories'> }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getBreadcrumbHandler(queryCtx, args);
      },
      
      // Category mutation handlers
      createCategory: async (args: {
        organizationId: Id<'organizations'>;
        projectId: Id<'projects'>;
        name: string;
        description?: string;
        handle?: string;
        parentId?: Id<'categories'>;
        color?: string;
        icon?: string;
        seoTitle?: string;
        seoDescription?: string;
        metadata: any;
        sortOrder?: number;
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return createCategoryHandler(mutationCtx, args);
      },
      
      updateCategory: async (args: {
        categoryId: Id<'categories'>;
        name?: string;
        description?: string;
        handle?: string;
        color?: string;
        icon?: string;
        seoTitle?: string;
        seoDescription?: string;
        metadata?: any;
        isVisible?: boolean;
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return updateCategoryHandler(mutationCtx, args);
      },
      
      deleteCategory: async (args: { categoryId: Id<'categories'> }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return deleteCategoryHandler(mutationCtx, args);
      },
      
      // Product query handlers
      getProductBySku: async (args: {
        organizationId: Id<'organizations'>;
        sku: string;
      }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getProductBySkuHandler(queryCtx, args);
      },
      
      // Product mutation handlers
      createProduct: async (args: {
        organizationId: Id<'organizations'>;
        projectId: Id<'projects'>;
        title: string;
        description?: string;
        vendor?: string;
        productType?: string;
        handle?: string;
        sku?: string;
        seoTitle?: string;
        seoDescription?: string;
        tags: string[];
        metadata: any;
        status?: 'active' | 'draft' | 'archived';
        type?: 'physical' | 'digital' | 'service';
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        
        // Monkey-patch the requireRole import to use our mock version
        const authModule = require('../../lib/auth');
        authModule.requireRole = async (ctx: AuthContext, orgId: Id<'organizations'>, roles: string[]) => {
          return mockRequireRole(ctx, orgId, roles as any);
        };
        
        return createProductHandler(mutationCtx, args);
      },
      
      updateProduct: async (args: {
        productId: Id<'products'>;
        title?: string;
        description?: string;
        vendor?: string;
        productType?: string;
        handle?: string;
        sku?: string;
        seoTitle?: string;
        seoDescription?: string;
        tags?: string[];
        metadata?: any;
        status?: 'active' | 'draft' | 'archived';
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return updateProductHandler(mutationCtx, args);
      },
      
      deleteProduct: async (args: { productId: Id<'products'> }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return deleteProductHandler(mutationCtx, args);
      },
      
      // Organization query handlers
      getOrganizationBySlug: async (args: { slug: string }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getOrganizationBySlugHandler(queryCtx, args);
      },
      
      getUserOrganizations: async (args: { userId: Id<'users'> }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getUserOrganizationsHandler(queryCtx, args);
      },
      
      checkUserPermission: async (args: {
        userId: Id<'users'>;
        organizationId: Id<'organizations'>;
        permission: string;
      }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return checkUserPermissionHandler(queryCtx, args);
      },
      
      // Organization mutation handlers
      createOrganization: async (args: { name: string; slug: string }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return createOrganizationHandler(mutationCtx, args);
      },
      
      updateOrganization: async (args: {
        organizationId: Id<'organizations'>;
        name?: string;
        slug?: string;
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return updateOrganizationHandler(mutationCtx, args);
      },
      
      updateOrganizationSettings: async (args: {
        organizationId: Id<'organizations'>;
        settings: any;
        updatedBy: Id<'users'>;
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return updateOrganizationSettingsHandler(mutationCtx, args);
      },
      
      // Project query handlers
      getOrganizationProjects: async (args: { organizationId: Id<'organizations'> }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getOrganizationProjectsHandler(queryCtx, args);
      },
      
      getProjectBySlug: async (args: {
        organizationId: Id<'organizations'>;
        slug: string;
      }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getProjectBySlugHandler(queryCtx, args);
      },
      
      getProjectStats: async (args: { projectId: Id<'projects'> }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getProjectStatsHandler(queryCtx, args);
      },
      
      // Project mutation handlers
      createProject: async (args: {
        organizationId: Id<'organizations'>;
        name: string;
        slug: string;
        description?: string;
        createdBy: Id<'users'>;
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return createProjectHandler(mutationCtx, args);
      },
      
      updateProject: async (args: {
        projectId: Id<'projects'>;
        name?: string;
        description?: string;
        status?: 'active' | 'archived' | 'draft';
        settings?: {
          defaultCurrency: string;
          defaultTaxRate?: number;
          importSettings: {
            autoValidate: boolean;
            duplicateHandling: 'skip' | 'update' | 'create';
            requiredFields: string[];
          };
        };
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return updateProjectHandler(mutationCtx, args);
      },
      
      deleteProject: async (args: { projectId: Id<'projects'> }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return deleteProjectHandler(mutationCtx, args);
      },
      
      archiveProject: async (args: {
        projectId: Id<'projects'>;
        archivedBy: Id<'users'>;
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return archiveProjectHandler(mutationCtx, args);
      },
      
      // Import query handlers
      getImportJobs: async (args: {
        organizationId: Id<'organizations'>;
        projectId?: Id<'projects'>;
        importType?: 'products' | 'categories' | 'variants';
        status?: 'uploaded' | 'validating' | 'importing' | 'completed' | 'failed';
        limit?: number;
      }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getImportJobsHandler(queryCtx, args);
      },
      
      getImportJob: async (args: { jobId: Id<'importJobs'> }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getImportJobHandler(queryCtx, args);
      },
      
      getFileEntry: async (args: { storageId: Id<'_storage'> }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getFileEntryHandler(queryCtx, args);
      },
      
      // Import mutation handlers
      createImportJob: async (args: {
        organizationId: Id<'organizations'>;
        projectId: Id<'projects'>;
        importType: 'products' | 'categories' | 'variants';
        fileName: string;
        fileSize: number;
        fileStorageId: string;
        fieldMapping: {
          mappings: any;
          options: {
            hasHeaders: boolean;
            delimiter: string;
            skipEmptyRows: boolean;
            duplicateHandling: 'skip' | 'update' | 'create';
          };
        };
        validationRules: Array<{
          field: string;
          type: string;
          required: boolean;
          pattern?: string;
          minLength?: number;
          maxLength?: number;
          allowedValues?: string[];
        }>;
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return createImportJobHandler(mutationCtx, args);
      },
      
      updateJobStatus: async (args: {
        jobId: Id<'importJobs'>;
        status: 'uploaded' | 'validating' | 'importing' | 'completed' | 'failed';
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return updateJobStatusHandler(mutationCtx, args);
      },
      
      completeImport: async (args: {
        jobId: Id<'importJobs'>;
        results: any;
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
        } as MutationCtx;
        return completeImportHandler(mutationCtx, args);
      },
      
      generateUploadUrl: async () => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
          storage: ctx.storage,
        } as MutationCtx;
        return generateUploadUrlHandler(mutationCtx);
      },
      
      completeFileUpload: async (args: {
        organizationId: Id<'organizations'>;
        fileName: string;
        fileSize: number;
        mimeType: string;
        storageId: Id<'_storage'>;
      }) => {
        const mutationCtx = {
          db: ctx.db,
          auth: ctx.auth,
          scheduler: ctx.scheduler,
          storage: ctx.storage,
        } as MutationCtx;
        return completeFileUploadHandler(mutationCtx, args);
      },
      
      // Dashboard query handlers
      getDashboardStats: async (args: { organizationId: Id<'organizations'> }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getDashboardStatsHandler(queryCtx, args);
      },
      
      getRecentActivity: async (args: {
        organizationId: Id<'organizations'>;
        limit?: number;
      }) => {
        const queryCtx = {
          db: ctx.db,
          auth: ctx.auth,
        } as QueryCtx;
        return getRecentActivityHandler(queryCtx, args);
      },
      
      // Add more handlers here as we convert tests
    },
    
    // Legacy compatibility - these will be removed
    runQuery: ctx.runQuery,
    runMutation: ctx.runMutation,
    runAction: ctx.runAction,
  };
}

// Type helper for the test context
export type TestContext = ReturnType<typeof createTestContext>;