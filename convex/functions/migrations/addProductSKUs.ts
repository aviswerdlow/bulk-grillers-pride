import { v } from 'convex/values';
import { mutation, internalMutation } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';

// Helper function to generate SKU from product title
function generateSKU(title: string): string {
  const base = title
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8);
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${base}-${timestamp}`;
}

// Internal mutation to update product SKU
export const updateProductSKU = internalMutation({
  args: {
    productId: v.id('products'),
    sku: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, { sku: args.sku });
  },
});

// Main migration to add SKUs to products
export const addProductSKUs = mutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    dryRun: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    // Check user permissions
    const member = await ctx.db
      .query('organizationMembers')
      .withIndex('by_user_org', (q) =>
        q.eq('userId', user._id).eq('organizationId', args.organizationId)
      )
      .unique();

    if (!member || !['admin', 'owner'].includes(member.role)) {
      throw new Error('Insufficient permissions to run migration');
    }

    const batchSize = args.batchSize || 100;
    const dryRun = args.dryRun || false;

    // Query products without SKUs
    let query = ctx.db
      .query('products')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', args.organizationId)
      );

    if (args.projectId) {
      query = query.filter((q) => q.eq(q.field('projectId'), args.projectId));
    }

    const products = await query.collect();
    const productsWithoutSKU = products.filter((p) => !p.sku);

    const results = {
      totalProducts: products.length,
      productsWithoutSKU: productsWithoutSKU.length,
      processed: 0,
      skipped: 0,
      updated: 0,
      errors: [] as Array<{ productId: string; title: string; error: string }>,
      skuMappings: [] as Array<{ productId: string; title: string; generatedSKU: string }>,
    };

    // Process products in batches
    for (let i = 0; i < productsWithoutSKU.length; i += batchSize) {
      const batch = productsWithoutSKU.slice(i, i + batchSize);

      for (const product of batch) {
        try {
          // Check if product has a default variant with SKU
          const defaultVariant = await ctx.db
            .query('productVariants')
            .withIndex('by_product', (q) => q.eq('productId', product._id))
            .filter((q) => q.eq(q.field('isDefault'), true))
            .first();

          let sku: string;
          if (defaultVariant?.sku) {
            // Use the default variant's SKU
            sku = defaultVariant.sku;
          } else {
            // Check for any variant with SKU
            const anyVariant = await ctx.db
              .query('productVariants')
              .withIndex('by_product', (q) => q.eq('productId', product._id))
              .first();

            if (anyVariant?.sku) {
              sku = anyVariant.sku;
            } else {
              // Generate new SKU
              sku = generateSKU(product.title);
            }
          }

          // Check if SKU is unique within organization
          const existingProduct = await ctx.db
            .query('products')
            .withIndex('by_sku', (q) => q.eq('organizationId', args.organizationId).eq('sku', sku))
            .first();

          if (existingProduct) {
            // SKU already exists, generate unique one
            sku = `${sku}-${product._id.substring(0, 4)}`;
          }

          results.skuMappings.push({
            productId: product._id,
            title: product.title,
            generatedSKU: sku,
          });

          if (!dryRun) {
            await ctx.runMutation(updateProductSKU, {
              productId: product._id,
              sku,
            });
            results.updated++;
          }

          results.processed++;
        } catch (error) {
          results.errors.push({
            productId: product._id,
            title: product.title,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          results.skipped++;
        }
      }
    }

    return {
      success: true,
      dryRun,
      summary: {
        totalProducts: results.totalProducts,
        productsWithoutSKU: results.productsWithoutSKU,
        processed: results.processed,
        updated: results.updated,
        skipped: results.skipped,
        errors: results.errors.length,
      },
      details: dryRun ? results.skuMappings : undefined,
      errors: results.errors.length > 0 ? results.errors : undefined,
    };
  },
});

// Query to check migration status
export const checkSKUMigrationStatus = mutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Query products
    let query = ctx.db
      .query('products')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', args.organizationId)
      );

    if (args.projectId) {
      query = query.filter((q) => q.eq(q.field('projectId'), args.projectId));
    }

    const products = await query.collect();
    const productsWithSKU = products.filter((p) => p.sku);
    const productsWithoutSKU = products.filter((p) => !p.sku);

    // Sample some products without SKUs
    const sampleProducts = productsWithoutSKU.slice(0, 10).map((p) => ({
      id: p._id,
      title: p.title,
      hasVariants: false, // Will check below
    }));

    // Check if these products have variants
    for (const sample of sampleProducts) {
      const variantCount = await ctx.db
        .query('productVariants')
        .withIndex('by_product', (q) => q.eq('productId', sample.id))
        .collect();
      sample.hasVariants = variantCount.length > 0;
    }

    return {
      totalProducts: products.length,
      productsWithSKU: productsWithSKU.length,
      productsWithoutSKU: productsWithoutSKU.length,
      completionPercentage: products.length > 0 
        ? Math.round((productsWithSKU.length / products.length) * 100)
        : 100,
      sampleProductsWithoutSKU: sampleProducts,
    };
  },
});