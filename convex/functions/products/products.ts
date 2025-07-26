import { v } from 'convex/values';
import { mutation, query, internalQuery } from '../../_generated/server';
import { Doc, Id } from '../../_generated/dataModel';
import { authenticateAndAuthorize, requireRole } from '../../lib/auth';

// Get all products for an organization and project
export const getProjectProducts = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    status: v.optional(v.union(v.literal('active'), v.literal('draft'), v.literal('archived'))),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, projectId, status, limit = 50, cursor }) => {
    // Authenticate and authorize in one call - reduces 3 DB queries to 2
    const { user, membership } = await authenticateAndAuthorize(ctx, organizationId);

    // Build query
    let query = ctx.db
      .query('products')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', organizationId).eq('projectId', projectId)
      );

    if (status) {
      query = query.filter((q) => q.eq(q.field('status'), status));
    }

    const products = await query.order('desc').paginate({ numItems: limit, cursor: cursor as any });

    return products;
  },
});

// Get a single product by ID
export const getProduct = query({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const product = await ctx.db.get(productId);
    if (!product) throw new Error('Product not found');

    // Verify user has access to this organization
    await authenticateAndAuthorize(ctx, product.organizationId);

    return product;
  },
});

// Get product variants for a product
export const getProductVariants = query({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const product = await ctx.db.get(productId);
    if (!product) throw new Error('Product not found');

    // Verify user has access
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', product.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership) throw new Error('Access denied');

    const variants = await ctx.db
      .query('productVariants')
      .withIndex('by_product', (q) => q.eq('productId', productId))
      .collect();

    return variants;
  },
});

// Search products by SKU
export const searchProductsBySku = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    sku: v.string(),
    exact: v.optional(v.boolean()),
  },
  handler: async (ctx, { organizationId, projectId, sku, exact = false }) => {
    // Authenticate and authorize
    await authenticateAndAuthorize(ctx, organizationId);

    if (!sku || sku.trim().length === 0) {
      return { products: [], variants: [] };
    }

    const searchTerm = sku.trim().toUpperCase();

    // Search products by SKU
    const products = await ctx.db
      .query('products')
      .withIndex('by_sku', (q) => q.eq('organizationId', organizationId))
      .filter((q) => {
        const skuFilter = exact
          ? q.eq(q.field('sku'), searchTerm)
          : q.neq(q.field('sku'), undefined);
        
        if (projectId) {
          return q.and(
            q.eq(q.field('projectId'), projectId),
            skuFilter
          );
        }
        return skuFilter;
      })
      .collect();

    // Filter by partial match if not exact
    const matchedProducts = exact
      ? products
      : products.filter((p) => p.sku?.toUpperCase().includes(searchTerm));

    // Also search in variants
    let variantQuery = ctx.db
      .query('productVariants')
      .withIndex('by_sku', (q) => q.eq('organizationId', organizationId));

    if (exact) {
      variantQuery = variantQuery.filter((q) => q.eq(q.field('sku'), searchTerm));
    }

    const variants = await variantQuery.collect();

    // Filter variants by partial match and project if needed
    const matchedVariants = variants.filter((v) => {
      const skuMatch = exact
        ? v.sku === searchTerm
        : v.sku.toUpperCase().includes(searchTerm);
      
      if (!skuMatch) return false;
      if (!projectId) return true;
      
      return v.projectId === projectId;
    });

    // Get product details for matched variants
    const variantProductIds = [...new Set(matchedVariants.map((v) => v.productId))];
    const variantProducts = await Promise.all(
      variantProductIds.map((id) => ctx.db.get(id))
    );

    return {
      products: matchedProducts,
      variants: matchedVariants,
      variantProducts: variantProducts.filter((p) => p !== null),
    };
  },
});

// Get product by exact SKU
export const getProductBySku = query({
  args: {
    organizationId: v.id('organizations'),
    sku: v.string(),
  },
  handler: async (ctx, { organizationId, sku }) => {
    // Authenticate and authorize
    await authenticateAndAuthorize(ctx, organizationId);

    // Try to find product by SKU
    const product = await ctx.db
      .query('products')
      .withIndex('by_sku', (q) => q.eq('organizationId', organizationId).eq('sku', sku))
      .first();

    if (product) {
      return { type: 'product' as const, data: product };
    }

    // If not found, try variants
    const variant = await ctx.db
      .query('productVariants')
      .withIndex('by_sku', (q) => q.eq('organizationId', organizationId).eq('sku', sku))
      .first();

    if (variant) {
      const parentProduct = await ctx.db.get(variant.productId);
      return { 
        type: 'variant' as const, 
        data: variant,
        product: parentProduct 
      };
    }

    return null;
  },
});

// Full-text search for products (includes title and SKU)
export const searchProducts = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    searchTerm: v.string(),
    status: v.optional(v.union(v.literal('active'), v.literal('draft'), v.literal('archived'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, projectId, searchTerm, status, limit = 50 }) => {
    // Authenticate and authorize
    await authenticateAndAuthorize(ctx, organizationId);

    if (!searchTerm || searchTerm.trim().length === 0) {
      return { products: [], skuMatches: [] };
    }

    const term = searchTerm.trim();

    // First, try exact SKU match (highest priority)
    // Inline the getProductBySku logic since we can't call queries from within queries
    const exactSkuProduct = await ctx.db
      .query('products')
      .withIndex('by_sku', (q) => q.eq('organizationId', organizationId).eq('sku', term))
      .first();

    let exactSkuMatch = null;
    if (exactSkuProduct) {
      exactSkuMatch = { type: 'product' as const, data: exactSkuProduct };
    } else {
      // If not found, try variants
      const exactSkuVariant = await ctx.db
        .query('productVariants')
        .withIndex('by_sku', (q) => q.eq('organizationId', organizationId).eq('sku', term))
        .first();

      if (exactSkuVariant) {
        const parentProduct = await ctx.db.get(exactSkuVariant.productId);
        exactSkuMatch = { 
          type: 'variant' as const, 
          data: exactSkuVariant,
          product: parentProduct 
        };
      }
    }

    // Full-text search on title
    let titleQuery = ctx.db
      .query('products')
      .withSearchIndex('search_products', (q) => 
        q.search('title', term)
          .eq('organizationId', organizationId)
      );

    if (projectId) {
      titleQuery = titleQuery.filter((q) => q.eq(q.field('projectId'), projectId));
    }

    if (status) {
      titleQuery = titleQuery.filter((q) => q.eq(q.field('status'), status));
    }

    const titleResults = await titleQuery.take(limit);

    // SKU partial match search
    // Inline the searchProductsBySku logic since we can't call queries from within queries
    const upperTerm = term.toUpperCase();

    // Search products by SKU
    const productsWithSku = await ctx.db
      .query('products')
      .withIndex('by_sku', (q) => q.eq('organizationId', organizationId))
      .filter((q) => {
        if (projectId) {
          return q.and(
            q.eq(q.field('projectId'), projectId),
            q.neq(q.field('sku'), undefined)
          );
        }
        return q.neq(q.field('sku'), undefined);
      })
      .collect();

    // Filter by partial match
    const matchedProducts = productsWithSku.filter((p) => p.sku?.toUpperCase().includes(upperTerm));

    // Also search in variants
    let variantQuery = ctx.db
      .query('productVariants')
      .withIndex('by_sku', (q) => q.eq('organizationId', organizationId));

    const variants = await variantQuery.collect();

    // Filter variants by partial match and project if needed
    const matchedVariants = variants.filter((v) => {
      const skuMatch = v.sku.toUpperCase().includes(upperTerm);
      
      if (!skuMatch) return false;
      if (!projectId) return true;
      
      return v.projectId === projectId;
    });

    // Get product details for matched variants
    const variantProductIds = [...new Set(matchedVariants.map((v) => v.productId))];
    const variantProducts = await Promise.all(
      variantProductIds.map((id) => ctx.db.get(id))
    );

    const skuSearchResults = {
      products: matchedProducts,
      variants: matchedVariants,
      variantProducts: variantProducts.filter((p) => p !== null),
    };

    // Combine and deduplicate results
    const allProducts = new Map<string, Doc<'products'>>();
    
    // Add exact SKU match first (highest priority)
    if (exactSkuMatch) {
      if (exactSkuMatch.type === 'product') {
        allProducts.set(exactSkuMatch.data._id, exactSkuMatch.data);
      } else if (exactSkuMatch.product) {
        allProducts.set(exactSkuMatch.product._id, exactSkuMatch.product);
      }
    }

    // Add SKU partial matches
    skuSearchResults.products.forEach((p) => {
      allProducts.set(p._id, p);
    });
    skuSearchResults.variantProducts.forEach((p) => {
      if (p) allProducts.set(p._id, p);
    });

    // Add title matches
    titleResults.forEach((p) => {
      allProducts.set(p._id, p);
    });

    return {
      products: Array.from(allProducts.values()),
      exactSkuMatch,
      skuMatches: {
        products: skuSearchResults.products,
        variants: skuSearchResults.variants,
      },
    };
  },
});

// Create a new product
export const createProduct = mutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    title: v.string(),
    description: v.optional(v.string()),
    vendor: v.optional(v.string()),
    productType: v.optional(v.string()),
    handle: v.optional(v.string()),
    sku: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    tags: v.array(v.string()),
    metadata: v.any(),
    status: v.optional(v.union(v.literal('active'), v.literal('draft'), v.literal('archived'))),
  },
  handler: async (ctx, args) => {
    // Verify user has access and edit permissions - reduces 3 DB queries to 2
    const { user, membership } = await requireRole(ctx, args.organizationId, [
      'owner',
      'admin',
      'editor',
    ]);

    // Generate handle if not provided
    const handle =
      args.handle ||
      args.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');

    // Check if handle is unique within the project
    const existingProduct = await ctx.db
      .query('products')
      .withIndex('by_handle', (q) =>
        q
          .eq('organizationId', args.organizationId)
          .eq('projectId', args.projectId)
          .eq('handle', handle)
      )
      .unique();

    if (existingProduct) {
      throw new Error('Product handle already exists in this project');
    }

    // Check SKU uniqueness within organization if SKU is provided
    if (args.sku) {
      const existingProductWithSku = await ctx.db
        .query('products')
        .withIndex('by_sku', (q) =>
          q.eq('organizationId', args.organizationId).eq('sku', args.sku!)
        )
        .first();

      if (existingProductWithSku) {
        throw new Error(`SKU "${args.sku}" already exists in this organization`);
      }

      // Also check if SKU exists in variants
      const existingVariantWithSku = await ctx.db
        .query('productVariants')
        .withIndex('by_sku', (q) =>
          q.eq('organizationId', args.organizationId).eq('sku', args.sku!)
        )
        .first();

      if (existingVariantWithSku) {
        throw new Error(`SKU "${args.sku}" already exists as a variant SKU in this organization`);
      }
    }

    const now = Date.now();
    const productId = await ctx.db.insert('products', {
      organizationId: args.organizationId,
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      vendor: args.vendor,
      productType: args.productType,
      handle,
      sku: args.sku,
      status: args.status || 'draft',
      seoTitle: args.seoTitle,
      seoDescription: args.seoDescription,
      tags: args.tags,
      categories: [],
      images: [],
      metadata: args.metadata || {},
      version: 1,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
      lastModifiedBy: user._id,
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      organizationId: args.organizationId,
      eventType: 'CREATE',
      entityType: 'products',
      entityId: productId,
      changes: [
        {
          field: '*',
          oldValue: null,
          newValue: args,
          changeType: 'added' as const,
        },
      ],
      context: {
        action: 'create_product',
        source: 'web' as const,
      },
      performedBy: {
        type: 'user' as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { projectId: args.projectId },
      timestamp: now,
      isRollbackable: true,
    });

    return productId;
  },
});

// Update a product
export const updateProduct = mutation({
  args: {
    productId: v.id('products'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    vendor: v.optional(v.string()),
    productType: v.optional(v.string()),
    handle: v.optional(v.string()),
    sku: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
    status: v.optional(v.union(v.literal('active'), v.literal('draft'), v.literal('archived'))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error('Product not found');

    // Verify user has access and edit permissions
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', product.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership || !['owner', 'admin', 'editor'].includes(membership.role)) {
      throw new Error('Insufficient permissions');
    }

    // Track changes for audit log
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      changeType: 'added' | 'modified' | 'removed';
    }> = [];

    const { productId, ...updates } = args;

    // Check handle uniqueness if handle is being changed
    if (args.handle && args.handle !== product.handle) {
      const existingProduct = await ctx.db
        .query('products')
        .withIndex('by_handle', (q) =>
          q
            .eq('organizationId', product.organizationId)
            .eq('projectId', product.projectId)
            .eq('handle', args.handle!)
        )
        .unique();

      if (existingProduct) {
        throw new Error('Product handle already exists in this project');
      }
    }

    // Check SKU uniqueness if SKU is being changed
    if (args.sku !== undefined && args.sku !== product.sku) {
      if (args.sku) {
        const sku = args.sku;
        // Check if another product has this SKU
        const existingProductWithSku = await ctx.db
          .query('products')
          .withIndex('by_sku', (q) =>
            q.eq('organizationId', product.organizationId).eq('sku', sku)
          )
          .filter((q) => q.neq(q.field('_id'), productId))
          .first();

        if (existingProductWithSku) {
          throw new Error(`SKU "${sku}" already exists in this organization`);
        }

        // Also check if SKU exists in variants
        const existingVariantWithSku = await ctx.db
          .query('productVariants')
          .withIndex('by_sku', (q) =>
            q.eq('organizationId', product.organizationId).eq('sku', sku)
          )
          .first();

        if (existingVariantWithSku) {
          throw new Error(`SKU "${sku}" already exists as a variant SKU in this organization`);
        }
      }
    }

    // Track changes
    Object.entries(updates).forEach(([field, newValue]) => {
      if (newValue !== undefined) {
        const oldValue = (product as any)[field];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({
            field,
            oldValue,
            newValue,
            changeType: oldValue === undefined ? 'added' : 'modified',
          });
        }
      }
    });

    if (changes.length === 0) {
      return args.productId; // No changes to make
    }

    const now = Date.now();
    await ctx.db.patch(args.productId, {
      ...updates,
      version: product.version + 1,
      updatedAt: now,
      lastModifiedBy: user._id,
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      organizationId: product.organizationId,
      eventType: 'UPDATE',
      entityType: 'products',
      entityId: args.productId,
      changes,
      beforeSnapshot: product,
      context: {
        action: 'update_product',
        source: 'web' as const,
      },
      performedBy: {
        type: 'user' as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { projectId: product.projectId },
      timestamp: now,
      isRollbackable: true,
      rollbackData: product,
    });

    return args.productId;
  },
});

// Delete a product (soft delete)
export const deleteProduct = mutation({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    const product = await ctx.db.get(productId);
    if (!product) throw new Error('Product not found');

    // Verify user has access and delete permissions
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', product.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Insufficient permissions');
    }

    const now = Date.now();
    await ctx.db.patch(productId, {
      status: 'archived',
      updatedAt: now,
      lastModifiedBy: user._id,
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      organizationId: product.organizationId,
      eventType: 'DELETE',
      entityType: 'products',
      entityId: productId,
      changes: [
        {
          field: 'status',
          oldValue: product.status,
          newValue: 'archived',
          changeType: 'modified' as const,
        },
      ],
      beforeSnapshot: product,
      context: {
        action: 'delete_product',
        source: 'web' as const,
      },
      performedBy: {
        type: 'user' as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { projectId: product.projectId },
      timestamp: now,
      isRollbackable: true,
      rollbackData: product,
    });

    return productId;
  },
});

// Create a product variant
export const createProductVariant = mutation({
  args: {
    productId: v.id('products'),
    title: v.optional(v.string()),
    sku: v.string(),
    barcode: v.optional(v.string()),
    price: v.number(),
    compareAtPrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    inventoryQuantity: v.optional(v.number()),
    inventoryPolicy: v.union(v.literal('deny'), v.literal('continue')),
    trackQuantity: v.boolean(),
    weight: v.optional(v.number()),
    weightUnit: v.optional(v.string()),
    dimensions: v.optional(
      v.object({
        length: v.number(),
        width: v.number(),
        height: v.number(),
        unit: v.string(),
      })
    ),
    options: v.array(
      v.object({
        name: v.string(),
        value: v.string(),
      })
    ),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error('Product not found');

    // Verify user has access and edit permissions
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', product.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership || !['owner', 'admin', 'editor'].includes(membership.role)) {
      throw new Error('Insufficient permissions');
    }

    // Check SKU uniqueness within organization
    const existingVariant = await ctx.db
      .query('productVariants')
      .withIndex('by_sku', (q) =>
        q.eq('organizationId', product.organizationId).eq('sku', args.sku)
      )
      .unique();

    if (existingVariant) {
      throw new Error('SKU already exists in this organization');
    }

    const now = Date.now();
    const variantId = await ctx.db.insert('productVariants', {
      organizationId: product.organizationId,
      projectId: product.projectId,
      productId: args.productId,
      title: args.title,
      sku: args.sku,
      barcode: args.barcode,
      price: args.price,
      compareAtPrice: args.compareAtPrice,
      costPrice: args.costPrice,
      inventoryQuantity: args.inventoryQuantity,
      inventoryPolicy: args.inventoryPolicy,
      trackQuantity: args.trackQuantity,
      weight: args.weight,
      weightUnit: args.weightUnit,
      dimensions: args.dimensions,
      options: args.options,
      images: [],
      metadata: args.metadata || {},
      status: 'active',
      version: 1,
      createdAt: now,
      updatedAt: now,
      lastModifiedBy: user._id,
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      organizationId: product.organizationId,
      eventType: 'CREATE',
      entityType: 'productVariants',
      entityId: variantId,
      changes: [
        {
          field: '*',
          oldValue: null,
          newValue: args,
          changeType: 'added' as const,
        },
      ],
      context: {
        action: 'create_product_variant',
        source: 'web' as const,
      },
      performedBy: {
        type: 'user' as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { productId: args.productId, projectId: product.projectId },
      timestamp: now,
      isRollbackable: true,
    });

    return variantId;
  },
});

// Internal query for CrewAI to get a product by ID
export const getById = internalQuery({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    return await ctx.db.get(productId);
  },
});
