import { QueryCtx } from '../../../_generated/server';
import { Id } from '../../../_generated/dataModel';
import { authenticateAndAuthorize } from '../../../lib/auth';
// Re-export for easier mocking in tests
export { authenticateAndAuthorize } from '../../../lib/auth';

// Handler for getProductBySku
export async function getProductBySkuHandler(
  ctx: QueryCtx,
  { organizationId, sku }: { organizationId: Id<'organizations'>; sku: string }
) {
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
}