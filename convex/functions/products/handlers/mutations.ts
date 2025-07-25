import { MutationCtx } from '../../../_generated/server';
import { Id } from '../../../_generated/dataModel';
import { requireRole } from '../../../lib/auth';
// Import relative for easier mocking in tests
export { requireRole } from '../../../lib/auth';

// Handler for createProduct
export async function createProductHandler(
  ctx: MutationCtx,
  args: {
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
  }
) {
  // Verify user has access and edit permissions - reduces 3 DB queries to 2
  const { user, membership } = await requireRole(ctx, args.organizationId, [
    'owner',
    'admin',
    'editor',
  ]);

  const { organizationId, projectId, handle, sku, ...productData } = args;

  // Generate handle if not provided
  const productHandle = handle || productData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // If SKU is provided, check for uniqueness within organization
  if (sku) {
    const existingProduct = await ctx.db
      .query('products')
      .withIndex('by_sku', (q) => q.eq('organizationId', organizationId).eq('sku', sku))
      .first();

    if (existingProduct) {
      throw new Error(`Product with SKU "${sku}" already exists in this organization`);
    }

    // Also check variants
    const existingVariant = await ctx.db
      .query('productVariants')
      .withIndex('by_sku', (q) => q.eq('organizationId', organizationId).eq('sku', sku))
      .first();

    if (existingVariant) {
      throw new Error(`Product variant with SKU "${sku}" already exists in this organization`);
    }
  }

  // Get organization settings for default status
  const organization = await ctx.db.get(organizationId);
  if (!organization) throw new Error('Organization not found');

  const defaultStatus = 'draft' as const;

  const newProduct = {
    organizationId,
    projectId,
    handle: productHandle,
    sku: sku || undefined,
    ...productData,
    status: productData.status || defaultStatus,
    type: args.type || 'physical',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: user._id,
    lastModifiedBy: user._id,
  };

  const productId = await ctx.db.insert('products', {
    organizationId,
    projectId,
    title: productData.title,
    description: productData.description,
    vendor: productData.vendor,
    productType: productData.productType,
    handle: productHandle,
    sku: sku || undefined,
    status: productData.status || defaultStatus,
    seoTitle: productData.seoTitle,
    seoDescription: productData.seoDescription,
    tags: productData.tags,
    categories: [],
    images: [],
    metadata: productData.metadata,
    version: 1,
    createdBy: user._id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastModifiedBy: user._id,
  });

  // Create audit log
  await ctx.db.insert('auditLogs', {
    organizationId,
    eventType: 'CREATE',
    entityType: 'products',
    entityId: productId,
    changes: [
      {
        field: 'product',
        oldValue: null,
        newValue: { title: productData.title, sku: sku || null },
        changeType: 'added' as const,
      },
    ],
    context: {
      action: 'product.created',
      source: 'web' as const,
    },
    performedBy: {
      type: 'user' as const,
      userId: user._id,
      userEmail: user.email,
    },
    metadata: {
      title: productData.title,
      sku: sku || null,
    },
    timestamp: Date.now(),
    isRollbackable: false,
  });

  return productId;
}

// Handler for updateProduct
export async function updateProductHandler(
  ctx: MutationCtx,
  args: {
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
  }
) {
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

  if (!membership) throw new Error('Access denied');

  const allowedRoles = ['owner', 'admin', 'editor'];
  if (!allowedRoles.includes(membership.role)) {
    throw new Error('Insufficient permissions');
  }

  const { productId, sku, ...updates } = args;

  // If updating SKU, check for uniqueness
  if (sku !== undefined && sku !== product.sku) {
    if (sku) {
      // Check if new SKU is already used
      const existingProduct = await ctx.db
        .query('products')
        .withIndex('by_sku', (q) => q.eq('organizationId', product.organizationId).eq('sku', sku))
        .filter((q) => q.neq(q.field('_id'), productId))
        .first();

      if (existingProduct) {
        throw new Error(`Product with SKU "${sku}" already exists in this organization`);
      }

      // Also check variants
      const existingVariant = await ctx.db
        .query('productVariants')
        .withIndex('by_sku', (q) => q.eq('organizationId', product.organizationId).eq('sku', sku))
        .first();

      if (existingVariant) {
        throw new Error(`Product variant with SKU "${sku}" already exists in this organization`);
      }
    }
  }

  // Update the product
  await ctx.db.patch(productId, {
    ...updates,
    sku: sku !== undefined ? (sku || undefined) : product.sku,
    updatedAt: Date.now(),
    lastModifiedBy: user._id,
  });

  // Create audit log
  await ctx.db.insert('auditLogs', {
    organizationId: product.organizationId,
    eventType: 'UPDATE',
    entityType: 'products',
    entityId: productId,
    changes: Object.keys(updates).map((field) => ({
      field,
      oldValue: (product as any)[field],
      newValue: (updates as any)[field],
      changeType: 'modified' as const,
    })),
    context: {
      action: 'product.updated',
      source: 'web' as const,
    },
    performedBy: {
      type: 'user' as const,
      userId: user._id,
      userEmail: user.email,
    },
    metadata: {
      updates: Object.keys(updates),
      ...(sku !== undefined && { skuChanged: { from: product.sku, to: sku } }),
    },
    timestamp: Date.now(),
    isRollbackable: false,
  });
}

// Handler for deleteProduct
export async function deleteProductHandler(
  ctx: MutationCtx,
  { productId }: { productId: Id<'products'> }
) {
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

  if (!membership) throw new Error('Access denied');

  const allowedRoles = ['owner', 'admin'];
  if (!allowedRoles.includes(membership.role)) {
    throw new Error('Insufficient permissions to delete products');
  }

  // Check if product has variants
  const variants = await ctx.db
    .query('productVariants')
    .withIndex('by_product', (q) => q.eq('productId', productId))
    .collect();

  if (variants.length > 0) {
    // Delete all variants first
    for (const variant of variants) {
      await ctx.db.delete(variant._id);
    }
  }

  // Soft delete - set status to 'archived'
  await ctx.db.patch(productId, {
    status: 'archived' as const,
    updatedAt: Date.now(),
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
    context: {
      action: 'product.deleted',
      source: 'web' as const,
    },
    performedBy: {
      type: 'user' as const,
      userId: user._id,
      userEmail: user.email,
    },
    metadata: {
      title: product.title,
      sku: product.sku || null,
      variantsDeleted: variants.length,
    },
    timestamp: Date.now(),
    isRollbackable: false,
  });
}