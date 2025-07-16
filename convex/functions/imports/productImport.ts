import { v } from 'convex/values';
import {
  mutation,
  action,
  internalMutation,
  internalAction,
  internalQuery,
} from '../../_generated/server';
import { internal } from '../../_generated/api';
import { Doc, Id } from '../../_generated/dataModel';
import { authenticateAndAuthorize } from '../../lib/auth';

// Product import validation schema
const productImportSchema = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  vendor: v.optional(v.string()),
  productType: v.optional(v.string()),
  handle: v.optional(v.string()),
  status: v.optional(v.union(v.literal('active'), v.literal('draft'), v.literal('archived'))),
  sku: v.optional(v.string()),
  barcode: v.optional(v.string()),
  price: v.optional(v.number()),
  compareAtPrice: v.optional(v.number()),
  cost: v.optional(v.number()),
  tags: v.optional(v.array(v.string())),
  categories: v.optional(v.array(v.string())), // Category IDs or handles
  weight: v.optional(v.number()),
  weightUnit: v.optional(v.string()),
  inventoryQuantity: v.optional(v.number()),
  trackInventory: v.optional(v.boolean()),
  requiresShipping: v.optional(v.boolean()),
  imageUrl: v.optional(v.string()),
});

// Start a product import job
export const startProductImport = mutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    fileName: v.string(),
    fileSize: v.number(),
    fileStorageId: v.id('_storage'),
    fieldMapping: v.object({
      // CSV column to product field mapping
      mappings: v.record(v.string(), v.string()),
      options: v.object({
        hasHeaders: v.boolean(),
        delimiter: v.string(),
        skipEmptyRows: v.boolean(),
        duplicateHandling: v.union(v.literal('skip'), v.literal('update'), v.literal('create')),
        createMissingCategories: v.boolean(),
        defaultStatus: v.union(v.literal('active'), v.literal('draft'), v.literal('archived')),
      }),
    }),
  },
  handler: async (ctx, args) => {
    // Authenticate and authorize with editor permissions
    const { user, membership } = await authenticateAndAuthorize(ctx, args.organizationId);

    if (!['owner', 'admin', 'editor'].includes(membership.role)) {
      throw new Error('Insufficient permissions to import products');
    }

    // Define validation rules for products
    const validationRules = [
      { field: 'title', type: 'string', required: true, minLength: 1, maxLength: 200 },
      { field: 'handle', type: 'string', required: false, pattern: '^[a-z0-9-]+$', maxLength: 200 },
      { field: 'price', type: 'number', required: false },
      { field: 'compareAtPrice', type: 'number', required: false },
      { field: 'cost', type: 'number', required: false },
      { field: 'inventoryQuantity', type: 'number', required: false },
      { field: 'weight', type: 'number', required: false },
      {
        field: 'status',
        type: 'string',
        required: false,
        allowedValues: ['active', 'draft', 'archived'],
      },
    ];

    // Create the import job
    const jobId = await ctx.db.insert('importJobs', {
      organizationId: args.organizationId,
      projectId: args.projectId,
      importType: 'products',
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileStorageId: args.fileStorageId,
      fieldMapping: args.fieldMapping,
      validationRules,
      status: 'uploaded',
      progress: {
        totalRows: 0,
        processedRows: 0,
        validRows: 0,
        invalidRows: 0,
        importedRows: 0,
        skippedRows: 0,
      },
      validationErrors: [],
      importResults: {
        createdRecords: [],
        updatedRecords: [],
        skippedRecords: [],
      },
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      organizationId: args.organizationId,
      eventType: 'CREATE',
      entityType: 'importJobs',
      entityId: jobId,
      changes: [
        {
          field: '*',
          oldValue: null,
          newValue: {
            importType: 'products',
            fileName: args.fileName,
            fileSize: args.fileSize,
          },
          changeType: 'added' as const,
        },
      ],
      context: {
        action: 'start_product_import',
        source: 'web' as const,
      },
      performedBy: {
        type: 'user' as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: {
        projectId: args.projectId,
        fileName: args.fileName,
      },
      timestamp: Date.now(),
      isRollbackable: false,
    });

    // Schedule the processing job
    await ctx.scheduler.runAfter(0, internal.functions.imports.productImport.processProductImport, {
      jobId,
    });

    return jobId;
  },
});

// Process product import (internal action)
export const processProductImport = internalAction({
  args: { jobId: v.id('importJobs') },
  handler: async (ctx, { jobId }) => {
    // Get the job
    const job = await ctx.runQuery(internal.functions.imports.productImport.getImportJobInternal, {
      jobId,
    });
    if (!job) throw new Error('Import job not found');

    if (job.status !== 'uploaded') {
      console.log(`Job ${jobId} is not in uploaded status, skipping`);
      return;
    }

    try {
      // Update status to validating
      await ctx.runMutation(internal.functions.imports.productImport.updateJobStatusInternal, {
        jobId,
        status: 'validating',
      });

      // Get the file content
      const fileContent = await ctx.storage.get(job.fileStorageId);
      if (!fileContent) throw new Error('File not found in storage');

      // Convert blob to text
      const text = await fileContent.text();

      // Parse the CSV file
      const rows = parseCSV(text, job.fieldMapping.options);

      // Update total rows count
      await ctx.runMutation(internal.functions.imports.productImport.updateJobProgressInternal, {
        jobId,
        progress: { totalRows: rows.length },
      });

      // Validate the data
      const validationResult = await validateProductData(rows, job.fieldMapping.mappings);

      // Update validation results
      await ctx.runMutation(internal.functions.imports.productImport.updateJobProgressInternal, {
        jobId,
        progress: {
          processedRows: rows.length,
          validRows: validationResult.validRows.length,
          invalidRows: validationResult.errors.length,
        },
        validationErrors: validationResult.errors,
      });

      if (validationResult.validRows.length === 0) {
        throw new Error('No valid rows found to import');
      }

      // Update status to importing
      await ctx.runMutation(internal.functions.imports.productImport.updateJobStatusInternal, {
        jobId,
        status: 'importing',
      });

      // Import the valid products
      const importResult = await ctx.runAction(
        internal.functions.imports.productImport.importProducts,
        {
          jobId,
          organizationId: job.organizationId,
          projectId: job.projectId,
          products: validationResult.validRows,
          options: job.fieldMapping.options,
        }
      );

      // Complete the import
      await ctx.runMutation(internal.functions.imports.productImport.completeImportInternal, {
        jobId,
        results: {
          progress: {
            totalRows: rows.length,
            processedRows: rows.length,
            validRows: validationResult.validRows.length,
            invalidRows: validationResult.errors.length,
            importedRows: importResult.created + importResult.updated,
            skippedRows: importResult.skipped,
          },
          validationErrors: validationResult.errors,
          importResults: {
            createdRecords: importResult.createdIds,
            updatedRecords: importResult.updatedIds,
            skippedRecords: importResult.skippedIds,
          },
        },
      });
    } catch (error) {
      console.error(`Error processing product import ${jobId}:`, error);

      // Mark job as failed
      await ctx.runMutation(internal.functions.imports.productImport.failImportInternal, {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  },
});

// Import products action
export const importProducts = internalAction({
  args: {
    jobId: v.id('importJobs'),
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    products: v.array(v.any()),
    options: v.any(),
  },
  handler: async (ctx, { jobId, organizationId, projectId, products, options }) => {
    const result = {
      created: 0,
      updated: 0,
      skipped: 0,
      createdIds: [] as Id<'products'>[],
      updatedIds: [] as Id<'products'>[],
      skippedIds: [] as string[],
    };

    const batchSize = 10; // Process in batches to avoid timeouts
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      for (const product of batch) {
        try {
          // Check if product exists (by handle or SKU)
          const existingProduct = await ctx.runQuery(
            internal.functions.imports.productImport.findExistingProduct,
            {
              organizationId,
              projectId,
              handle: product.handle,
              sku: product.sku,
            }
          );

          if (existingProduct) {
            if (options.duplicateHandling === 'skip') {
              result.skipped++;
              result.skippedIds.push(existingProduct._id);
              continue;
            } else if (options.duplicateHandling === 'update') {
              // Update existing product
              await ctx.runMutation(
                internal.functions.imports.productImport.updateProductInternal,
                {
                  productId: existingProduct._id,
                  updates: product,
                }
              );
              result.updated++;
              result.updatedIds.push(existingProduct._id);
              continue;
            }
          }

          // Create new product
          const productId = await ctx.runMutation(
            internal.functions.imports.productImport.createProductInternal,
            {
              organizationId,
              projectId,
              product,
              defaultStatus: options.defaultStatus || 'draft',
            }
          );

          result.created++;
          result.createdIds.push(productId);
        } catch (error) {
          console.error(`Error importing product: ${product.title}`, error);
          result.skipped++;
          result.skippedIds.push(product.title || 'unknown');
        }
      }

      // Update progress after each batch
      await ctx.runMutation(internal.functions.imports.productImport.updateJobProgressInternal, {
        jobId,
        progress: {
          importedRows: result.created + result.updated,
          skippedRows: result.skipped,
        },
      });
    }

    return result;
  },
});

// Internal mutations and queries
export const getImportJobInternal = internalQuery({
  args: { jobId: v.id('importJobs') },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.get(jobId);
  },
});

export const updateJobStatusInternal = internalMutation({
  args: {
    jobId: v.id('importJobs'),
    status: v.union(
      v.literal('uploaded'),
      v.literal('validating'),
      v.literal('importing'),
      v.literal('completed'),
      v.literal('failed')
    ),
  },
  handler: async (ctx, { jobId, status }) => {
    await ctx.db.patch(jobId, {
      status,
      updatedAt: Date.now(),
    });
  },
});

export const updateJobProgressInternal = internalMutation({
  args: {
    jobId: v.id('importJobs'),
    progress: v.optional(v.any()),
    validationErrors: v.optional(v.any()),
  },
  handler: async (ctx, { jobId, progress, validationErrors }) => {
    const updates: any = { updatedAt: Date.now() };

    if (progress) {
      const job = await ctx.db.get(jobId);
      if (job) {
        updates.progress = { ...job.progress, ...progress };
      }
    }

    if (validationErrors !== undefined) {
      updates.validationErrors = validationErrors;
    }

    await ctx.db.patch(jobId, updates);
  },
});

export const completeImportInternal = internalMutation({
  args: {
    jobId: v.id('importJobs'),
    results: v.any(),
  },
  handler: async (ctx, { jobId, results }) => {
    await ctx.db.patch(jobId, {
      status: 'completed',
      progress: results.progress,
      validationErrors: results.validationErrors,
      importResults: results.importResults,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const failImportInternal = internalMutation({
  args: {
    jobId: v.id('importJobs'),
    error: v.string(),
  },
  handler: async (ctx, { jobId, error }) => {
    await ctx.db.patch(jobId, {
      status: 'failed',
      validationErrors: [
        {
          row: 0,
          column: '*',
          value: '',
          error,
          severity: 'error' as const,
        },
      ],
      updatedAt: Date.now(),
    });
  },
});

export const findExistingProduct = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    handle: v.optional(v.string()),
    sku: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, projectId, handle, sku }) => {
    // Try to find by handle first
    if (handle) {
      const byHandle = await ctx.db
        .query('products')
        .withIndex('by_organization_project', (q) =>
          q.eq('organizationId', organizationId).eq('projectId', projectId)
        )
        .filter((q) => q.eq(q.field('handle'), handle))
        .first();

      if (byHandle) return byHandle;
    }

    // Try to find by SKU in variants
    if (sku) {
      const variant = await ctx.db
        .query('productVariants')
        .filter((q) => q.eq(q.field('sku'), sku))
        .first();

      if (variant) {
        const product = await ctx.db.get(variant.productId);
        if (
          product &&
          product.organizationId === organizationId &&
          product.projectId === projectId
        ) {
          return product;
        }
      }
    }

    return null;
  },
});

export const createProductInternal = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    product: v.any(),
    defaultStatus: v.union(v.literal('active'), v.literal('draft'), v.literal('archived')),
  },
  handler: async (ctx, { organizationId, projectId, product, defaultStatus }) => {
    const now = Date.now();

    // Generate handle if not provided
    const handle = product.handle || generateHandle(product.title);

    // Create the product
    const productId = await ctx.db.insert('products', {
      organizationId,
      projectId,
      title: product.title,
      description: product.description,
      vendor: product.vendor,
      productType: product.productType,
      handle,
      status: product.status || defaultStatus,
      seoTitle: product.seoTitle || product.title,
      seoDescription: product.seoDescription || product.description,
      tags: product.tags || [],
      categories: [], // Will be handled separately
      images: product.imageUrl
        ? [
            {
              id: generateId(),
              url: product.imageUrl,
              alt: product.title,
              position: 0,
              storageId: 'external',
            },
          ]
        : [],
      metadata: {},
      version: 1,
      createdAt: now,
      updatedAt: now,
      importedAt: now,
    });

    // Create default variant if pricing info is provided
    if (product.price !== undefined || product.sku || product.inventoryQuantity !== undefined) {
      await ctx.db.insert('productVariants', {
        productId,
        organizationId,
        title: 'Default',
        sku: product.sku || generateSKU(product.title),
        barcode: product.barcode,
        price: product.price || 0,
        compareAtPrice: product.compareAtPrice,
        cost: product.cost,
        inventoryQuantity: product.inventoryQuantity || 0,
        trackInventory: product.trackInventory !== false,
        requiresShipping: product.requiresShipping !== false,
        weight: product.weight,
        weightUnit: product.weightUnit || 'lb',
        position: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return productId;
  },
});

export const updateProductInternal = internalMutation({
  args: {
    productId: v.id('products'),
    updates: v.any(),
  },
  handler: async (ctx, { productId, updates }) => {
    const now = Date.now();

    // Update the product
    await ctx.db.patch(productId, {
      title: updates.title,
      description: updates.description,
      vendor: updates.vendor,
      productType: updates.productType,
      status: updates.status,
      tags: updates.tags,
      updatedAt: now,
    });

    // Update default variant if pricing info is provided
    if (updates.price !== undefined || updates.inventoryQuantity !== undefined) {
      const variants = await ctx.db
        .query('productVariants')
        .withIndex('by_product', (q) => q.eq('productId', productId))
        .collect();

      if (variants.length > 0) {
        // Update the first variant
        await ctx.db.patch(variants[0]._id, {
          price: updates.price,
          compareAtPrice: updates.compareAtPrice,
          cost: updates.cost,
          inventoryQuantity: updates.inventoryQuantity,
          weight: updates.weight,
          updatedAt: now,
        });
      }
    }
  },
});

// Helper functions
function parseCSV(text: string, options: any): any[] {
  const lines = text
    .split('\n')
    .filter((line) => (options.skipEmptyRows ? line.trim().length > 0 : true));

  if (lines.length === 0) return [];

  const delimiter = options.delimiter || ',';
  let headers: string[] = [];
  let dataStartIndex = 0;

  if (options.hasHeaders && lines.length > 0) {
    headers = parseCSVLine(lines[0], delimiter);
    dataStartIndex = 1;
  } else {
    // Generate default headers
    const firstRow = parseCSVLine(lines[0], delimiter);
    headers = firstRow.map((_, index) => `column_${index}`);
  }

  const rows = [];
  for (let i = dataStartIndex; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip the next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

async function validateProductData(rows: any[], fieldMapping: Record<string, string>) {
  const validRows: any[] = [];
  const errors: any[] = [];

  rows.forEach((row, index) => {
    const product: any = {};
    let hasError = false;

    // Map CSV columns to product fields
    for (const [csvColumn, productField] of Object.entries(fieldMapping)) {
      const value = row[csvColumn];

      // Skip empty values for optional fields
      if (!value || value.trim() === '') {
        if (productField === 'title') {
          errors.push({
            row: index + 1,
            column: csvColumn,
            value: '',
            error: 'Product title is required',
            severity: 'error',
          });
          hasError = true;
        }
        continue;
      }

      // Type conversion and validation
      switch (productField) {
        case 'price':
        case 'compareAtPrice':
        case 'cost':
        case 'weight':
        case 'inventoryQuantity':
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push({
              row: index + 1,
              column: csvColumn,
              value,
              error: `${productField} must be a valid number`,
              severity: 'error',
            });
            hasError = true;
          } else {
            product[productField] = numValue;
          }
          break;

        case 'tags':
          // Parse tags as comma-separated values
          product.tags = value
            .split(',')
            .map((tag: string) => tag.trim())
            .filter(Boolean);
          break;

        case 'status':
          if (!['active', 'draft', 'archived'].includes(value.toLowerCase())) {
            errors.push({
              row: index + 1,
              column: csvColumn,
              value,
              error: 'Status must be one of: active, draft, archived',
              severity: 'warning',
            });
          } else {
            product.status = value.toLowerCase();
          }
          break;

        case 'handle':
          // Validate handle format
          if (!/^[a-z0-9-]+$/.test(value)) {
            errors.push({
              row: index + 1,
              column: csvColumn,
              value,
              error: 'Handle must contain only lowercase letters, numbers, and hyphens',
              severity: 'warning',
            });
          } else {
            product.handle = value;
          }
          break;

        default:
          product[productField] = value;
      }
    }

    if (!hasError && product.title) {
      validRows.push(product);
    }
  });

  return { validRows, errors };
}

function generateHandle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function generateSKU(title: string): string {
  const prefix = title.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
