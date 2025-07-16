# Convex API Documentation

This document provides comprehensive documentation for all Convex functions in the Bulk Grillers Pride application.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [User Management](#user-management)
3. [Organization Management](#organization-management)
4. [Project Management](#project-management)
5. [Product Management](#product-management)
6. [Category Management](#category-management)
7. [AI Categorization](#ai-categorization)
8. [Import/Export](#importexport)
9. [File Storage](#file-storage)
10. [Audit & Versioning](#audit--versioning)

## Authentication & Authorization

All API endpoints require authentication via Clerk JWT tokens. The application uses role-based access control (RBAC) with the following roles:

- **owner**: Full access to all organization resources
- **admin**: Administrative access, can manage users and settings
- **editor**: Can create, edit, and delete products and categories
- **viewer**: Read-only access to all resources

### Authentication Flow

1. User authenticates via Clerk
2. JWT token is passed to Convex
3. User record is created/updated via `auth.users.store` mutation
4. Permissions are checked based on organization membership

## User Management

### `auth.users.store`

**Type**: Mutation  
**Purpose**: Create or update user when they access the application

```typescript
// No arguments required - uses JWT identity
const userId = await store();
```

**Returns**: User ID

### `auth.users.ensureUser`

**Type**: Mutation  
**Purpose**: Ensure user exists in database (called automatically by useEnsureUser hook)

```typescript
const userId = await ensureUser();
```

### `auth.users.getCurrentUser`

**Type**: Query  
**Purpose**: Get current authenticated user details

```typescript
const user = await getCurrentUser();
// Returns: { _id, clerkId, email, firstName, lastName, avatar, status, lastLogin }
```

### `auth.users.searchUsers`

**Type**: Query  
**Purpose**: Search for users by email or name

```typescript
const users = await searchUsers({
  query: 'john',
  organizationId: 'org_123', // Optional - filter by organization
  limit: 10,
});
```

### `auth.users.getUsersByOrganization`

**Type**: Query  
**Purpose**: Get all users in an organization with their roles

```typescript
const members = await getUsersByOrganization({
  organizationId: 'org_123',
});
// Returns array of users with membership details
```

## Organization Management

### `organizations.create`

**Type**: Mutation  
**Purpose**: Create a new organization

```typescript
const orgId = await createOrganization({
  name: 'My Company',
  slug: 'my-company',
  settings: {
    aiProvider: 'openai',
    aiModel: 'gpt-4',
    apiKeys: {
      openai: 'sk-...',
    },
    categorization: {
      batchSize: 10,
      prompt: 'Categorize this product...',
      autoApprove: false,
      confidenceThreshold: 0.8,
    },
    storage: {
      maxFileSize: 10485760, // 10MB
      totalStorageLimit: 1073741824, // 1GB
      allowedFileTypes: ['image/jpeg', 'image/png', 'text/csv'],
    },
  },
});
```

### `organizations.update`

**Type**: Mutation  
**Purpose**: Update organization settings

```typescript
await updateOrganization({
  organizationId: 'org_123',
  updates: {
    name: 'New Company Name',
    settings: {
      // Partial updates supported
      aiProvider: 'anthropic',
    },
  },
});
```

### `organizations.getBySlug`

**Type**: Query  
**Purpose**: Get organization by URL slug

```typescript
const org = await getOrganizationBySlug({
  slug: 'my-company',
});
```

### `organizations.getUserOrganizations`

**Type**: Query  
**Purpose**: Get all organizations for current user

```typescript
const orgs = await getUserOrganizations();
// Returns array of organizations with user's role in each
```

## Project Management

### `projects.create`

**Type**: Mutation  
**Purpose**: Create a new project within an organization

```typescript
const projectId = await createProject({
  organizationId: 'org_123',
  name: 'Summer Collection',
  slug: 'summer-collection',
  description: '2024 Summer product line',
  settings: {
    defaultCurrency: 'USD',
    defaultTaxRate: 0.08,
    importSettings: {
      autoValidate: true,
      duplicateHandling: 'update',
      requiredFields: ['title', 'sku', 'price'],
    },
  },
});
```

### `projects.update`

**Type**: Mutation  
**Purpose**: Update project settings

```typescript
await updateProject({
  projectId: 'proj_123',
  updates: {
    name: 'Fall Collection',
    status: 'archived',
  },
});
```

### `projects.getOrganizationProjects`

**Type**: Query  
**Purpose**: Get all projects for an organization

```typescript
const projects = await getOrganizationProjects({
  organizationId: 'org_123',
  status: 'active', // Optional filter
});
```

## Product Management

### `products.create`

**Type**: Mutation  
**Purpose**: Create a new product

```typescript
const productId = await createProduct({
  organizationId: 'org_123',
  projectId: 'proj_123',
  title: 'Premium BBQ Grill',
  description: 'Professional grade outdoor grill',
  vendor: 'GrillMaster',
  productType: 'Outdoor Cooking',
  handle: 'premium-bbq-grill',
  status: 'active',
  tags: ['outdoor', 'premium', 'bbq'],
  images: [
    {
      url: 'https://...',
      alt: 'Product front view',
      position: 0,
      storageId: 'storage_123',
    },
  ],
  metadata: {
    customField1: 'value1',
    specifications: {
      weight: '150lbs',
      dimensions: '60x24x48',
    },
  },
});
```

### `products.update`

**Type**: Mutation  
**Purpose**: Update product details

```typescript
await updateProduct({
  productId: 'prod_123',
  updates: {
    title: 'Premium BBQ Grill Pro',
    status: 'draft',
    categories: ['cat_123', 'cat_456'],
  },
});
```

### `products.delete`

**Type**: Mutation  
**Purpose**: Soft delete a product

```typescript
await deleteProduct({
  productId: 'prod_123',
});
```

### `products.getProjectProducts`

**Type**: Query  
**Purpose**: Get paginated products for a project

```typescript
const result = await getProjectProducts({
  organizationId: 'org_123',
  projectId: 'proj_123',
  status: 'active', // Optional filter
  limit: 50,
  cursor: 'cursor_string', // For pagination
});
// Returns: { page: Product[], continueCursor?: string }
```

### `products.searchProducts`

**Type**: Query  
**Purpose**: Full-text search products

```typescript
const results = await searchProducts({
  organizationId: 'org_123',
  projectId: 'proj_123',
  query: 'grill',
  filters: {
    status: 'active',
    productType: 'Outdoor Cooking',
  },
  limit: 20,
});
```

### `products.getProductsByCategory`

**Type**: Query  
**Purpose**: Get products assigned to a category

```typescript
const products = await getProductsByCategory({
  categoryId: 'cat_123',
  includeSubcategories: true,
  status: 'active',
});
```

## Category Management

### `categories.createCategory`

**Type**: Mutation  
**Purpose**: Create a new category

```typescript
const categoryId = await createCategory({
  organizationId: 'org_123',
  projectId: 'proj_123',
  name: 'Grills & Smokers',
  description: 'Outdoor cooking equipment',
  handle: 'grills-smokers',
  parentId: 'cat_parent', // Optional - for subcategories
  sortOrder: 1,
  color: '#FF5733',
  icon: 'flame',
  status: 'active',
  metadata: {
    featured: true,
    seasonality: 'summer',
  },
});
```

### `categories.updateCategory`

**Type**: Mutation  
**Purpose**: Update category details

```typescript
await updateCategory({
  categoryId: 'cat_123',
  updates: {
    name: 'Premium Grills',
    sortOrder: 2,
    status: 'hidden',
  },
});
```

### `categories.deleteCategory`

**Type**: Mutation  
**Purpose**: Delete a category (with cascade options)

```typescript
await deleteCategory({
  categoryId: 'cat_123',
  cascadeDelete: false, // If true, deletes subcategories
  reassignProductsTo: 'cat_456', // Optional - reassign products
});
```

### `categories.moveCategory`

**Type**: Mutation  
**Purpose**: Move category to different parent

```typescript
await moveCategory({
  categoryId: 'cat_123',
  newParentId: 'cat_789', // null for root level
  position: 2, // Sort order in new location
});
```

### `categories.getProjectCategories`

**Type**: Query  
**Purpose**: Get all categories for a project

```typescript
const categories = await getProjectCategories({
  organizationId: 'org_123',
  projectId: 'proj_123',
  level: 1, // Optional - filter by hierarchy level
  parentId: null, // Optional - get only root categories
});
```

### `categories.getCategoryTree`

**Type**: Query  
**Purpose**: Get hierarchical category tree

```typescript
const tree = await getCategoryTree({
  organizationId: 'org_123',
  projectId: 'proj_123',
  maxDepth: 3, // Optional - limit tree depth
  includeProductCounts: true,
});
// Returns nested structure with children arrays
```

### `categories.assignProductToCategory`

**Type**: Mutation  
**Purpose**: Assign product to category

```typescript
await assignProductToCategory({
  productId: 'prod_123',
  categoryId: 'cat_123',
  assignedBy: 'manual', // or "ai", "import"
  confidence: 0.95, // For AI assignments
  rationale: 'Product type matches category',
});
```

### `categories.removeProductFromCategory`

**Type**: Mutation  
**Purpose**: Remove product from category

```typescript
await removeProductFromCategory({
  productId: 'prod_123',
  categoryId: 'cat_123',
});
```

### `categories.createCategoryLevelDefinitions`

**Type**: Mutation  
**Purpose**: Define category hierarchy levels

```typescript
await createCategoryLevelDefinitions({
  organizationId: 'org_123',
  projectId: 'proj_123',
  levels: [
    {
      level: 0,
      friendlyName: 'Department',
      description: 'Top-level departments',
      icon: 'building',
      isRequired: true,
      maxCategories: 10,
    },
    {
      level: 1,
      friendlyName: 'Category',
      description: 'Product categories',
      icon: 'tag',
      isRequired: true,
    },
    {
      level: 2,
      friendlyName: 'Subcategory',
      description: 'Detailed subcategories',
      icon: 'folder',
      isRequired: false,
    },
  ],
});
```

## AI Categorization

### `ai.categorization.categorizeProducts`

**Type**: Mutation  
**Purpose**: Start AI categorization job

```typescript
const jobId = await categorizeProducts({
  organizationId: 'org_123',
  projectId: 'proj_123',
  productIds: ['prod_1', 'prod_2', 'prod_3'],
  options: {
    aiProvider: 'openai',
    aiModel: 'gpt-4',
    batchSize: 10,
    prompt: 'Custom categorization instructions...',
    includeNewCategorySuggestions: true,
    autoApprove: false,
    confidenceThreshold: 0.8,
  },
  notifications: {
    email: true,
    dashboard: true,
    recipients: ['user@example.com'],
  },
});
```

### `ai.categorization.getJobStatus`

**Type**: Query  
**Purpose**: Get categorization job status

```typescript
const job = await getCategorizationJobStatus({
  jobId: 'job_123',
});
// Returns job details with progress and results
```

### `ai.categorization.approveSuggestions`

**Type**: Mutation  
**Purpose**: Approve AI categorization suggestions

```typescript
await approveSuggestions({
  jobId: 'job_123',
  approvals: [
    {
      productId: 'prod_1',
      categoryId: 'cat_123',
      approved: true,
    },
    {
      productId: 'prod_2',
      categoryId: 'cat_456',
      approved: false,
      alternativeCategoryId: 'cat_789',
    },
  ],
});
```

## Import/Export

### `imports.createImportJob`

**Type**: Mutation  
**Purpose**: Create import job for bulk data

```typescript
const jobId = await createImportJob({
  organizationId: 'org_123',
  projectId: 'proj_123',
  importType: 'products', // or "categories", "variants"
  fileStorageId: 'storage_123',
  fieldMapping: {
    mappings: {
      'Product Name': 'title',
      SKU: 'sku',
      Price: 'price',
      Category: 'categories[0]',
    },
    options: {
      hasHeaders: true,
      delimiter: ',',
      skipEmptyRows: true,
      duplicateHandling: 'update',
    },
  },
  validationRules: [
    {
      field: 'title',
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 200,
    },
    {
      field: 'price',
      type: 'number',
      required: true,
      min: 0,
    },
  ],
});
```

### `imports.validateImport`

**Type**: Mutation  
**Purpose**: Validate import data before processing

```typescript
const validation = await validateImport({
  jobId: 'job_123',
});
// Returns validation errors and warnings
```

### `imports.processImport`

**Type**: Mutation  
**Purpose**: Process validated import

```typescript
await processImport({
  jobId: 'job_123',
  skipInvalidRows: false,
  notifyOnCompletion: true,
});
```

### `imports.getImportJobStatus`

**Type**: Query  
**Purpose**: Get import job status and results

```typescript
const job = await getImportJobStatus({
  jobId: 'job_123',
});
// Returns job progress, errors, and results
```

### `imports.bulkImportCategories`

**Type**: Mutation  
**Purpose**: Bulk import categories from JSON

```typescript
const results = await bulkImportCategories({
  organizationId: 'org_123',
  projectId: 'proj_123',
  categoriesData: {
    'department-1': {
      name: 'Outdoor Equipment',
      children: {
        'cat-1': {
          name: 'Grills',
          children: {
            'subcat-1': { name: 'Gas Grills' },
            'subcat-2': { name: 'Charcoal Grills' },
          },
        },
      },
    },
  },
  levelDefinitions: [
    { level: 0, friendlyName: 'Department' },
    { level: 1, friendlyName: 'Category' },
    { level: 2, friendlyName: 'Subcategory' },
  ],
});
```

## File Storage

### `storage.uploadFile`

**Type**: Mutation  
**Purpose**: Upload file to storage

```typescript
const fileEntry = await uploadFile({
  organizationId: 'org_123',
  fileName: 'products.csv',
  mimeType: 'text/csv',
  fileSize: 1024000,
  storageId: 'storage_123',
  fileType: 'csv_import',
  purpose: 'Product import for summer collection',
  isTemporary: true,
  expiresAt: Date.now() + 86400000, // 24 hours
});
```

### `storage.getFileUrl`

**Type**: Query  
**Purpose**: Get secure URL for file access

```typescript
const url = await getFileUrl({
  storageId: 'storage_123',
  expiresIn: 3600, // URL expires in 1 hour
});
```

### `storage.deleteFile`

**Type**: Mutation  
**Purpose**: Delete file from storage

```typescript
await deleteFile({
  storageId: 'storage_123',
  permanent: true, // If false, moves to trash
});
```

## Audit & Versioning

### `audit.getEntityHistory`

**Type**: Query  
**Purpose**: Get audit history for an entity

```typescript
const history = await getEntityHistory({
  organizationId: 'org_123',
  entityType: 'products',
  entityId: 'prod_123',
  limit: 50,
  startDate: Date.now() - 86400000, // Last 24 hours
  eventTypes: ['UPDATE', 'DELETE'],
});
```

### `audit.getEntityVersions`

**Type**: Query  
**Purpose**: Get all versions of an entity

```typescript
const versions = await getEntityVersions({
  organizationId: 'org_123',
  entityType: 'products',
  entityId: 'prod_123',
  includeData: true, // Include full data snapshots
});
```

### `audit.rollbackEntity`

**Type**: Mutation  
**Purpose**: Rollback entity to previous version

```typescript
await rollbackEntity({
  organizationId: 'org_123',
  entityType: 'products',
  entityId: 'prod_123',
  targetVersion: 5,
  reason: 'Reverting accidental changes',
});
```

## Error Handling

All API functions follow consistent error handling patterns:

```typescript
try {
  const result = await someApiFunction(args);
} catch (error) {
  if (error.message === 'Not authenticated') {
    // Handle authentication error
  } else if (error.message === 'Access denied') {
    // Handle authorization error
  } else if (error.message.includes('not found')) {
    // Handle not found error
  } else {
    // Handle other errors
  }
}
```

Common error types:

- **Authentication errors**: "Not authenticated", "Invalid token"
- **Authorization errors**: "Access denied", "Insufficient permissions"
- **Validation errors**: "Invalid [field]", "Required field missing"
- **Not found errors**: "[Entity] not found"
- **Conflict errors**: "[Entity] already exists", "Duplicate [field]"
- **Rate limit errors**: "Rate limit exceeded"

## Rate Limiting

API rate limits vary by endpoint type:

- **Queries**: 1000 requests/minute
- **Mutations**: 100 requests/minute
- **AI operations**: 10 requests/minute
- **Import operations**: 5 concurrent jobs

## Webhooks

The application supports webhooks for real-time notifications:

```typescript
// Configure webhook in organization settings
await updateOrganization({
  organizationId: 'org_123',
  updates: {
    webhooks: [
      {
        url: 'https://example.com/webhook',
        events: ['product.created', 'product.updated', 'category.created'],
        secret: 'webhook_secret',
        active: true,
      },
    ],
  },
});
```

Supported webhook events:

- `product.created`, `product.updated`, `product.deleted`
- `category.created`, `category.updated`, `category.deleted`
- `import.completed`, `import.failed`
- `categorization.completed`
- `user.joined`, `user.left`

## Best Practices

1. **Pagination**: Always use pagination for list queries to avoid performance issues
2. **Batch Operations**: Use bulk operations when working with multiple entities
3. **Caching**: Implement client-side caching for frequently accessed data
4. **Error Handling**: Always handle errors gracefully with user-friendly messages
5. **Permissions**: Check permissions client-side to improve UX, but always verify server-side
6. **Optimistic Updates**: Use optimistic updates for better perceived performance
7. **Real-time Updates**: Leverage Convex's real-time capabilities for live data

## SDK Usage Examples

### React (with Convex React hooks)

```typescript
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// Query example
const products = useQuery(api.products.getProjectProducts, {
  organizationId: 'org_123',
  projectId: 'proj_123',
  status: 'active',
});

// Mutation example
const createProduct = useMutation(api.products.create);

const handleCreate = async () => {
  await createProduct({
    organizationId: 'org_123',
    projectId: 'proj_123',
    title: 'New Product',
    // ... other fields
  });
};
```

### Node.js

```typescript
import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api';

const client = new ConvexHttpClient(process.env.CONVEX_URL);

// Set auth token
client.setAuth(authToken);

// Query example
const products = await client.query(api.products.getProjectProducts, {
  organizationId: 'org_123',
  projectId: 'proj_123',
});

// Mutation example
await client.mutation(api.products.create, {
  organizationId: 'org_123',
  projectId: 'proj_123',
  title: 'New Product',
});
```

## Migration Guide

For migrating from other systems, use the import APIs:

1. Export data from existing system
2. Transform to match schema
3. Create import job with field mappings
4. Validate import data
5. Process import with error handling
6. Verify imported data

See the [Import/Export](#importexport) section for detailed API usage.
