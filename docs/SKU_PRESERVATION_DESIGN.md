# SKU Preservation Design Specification

## Problem Statement

Currently, when importing CSV files containing products, the system does not properly preserve SKUs (Stock Keeping Units). SKUs are critical identifiers for Small and Medium Businesses (SMBs) as they serve as the central key for product identification, inventory management, and external system integration.

## Current State Analysis

### Issues Identified

1. **Database Structure**
   - SKUs are stored in the `productVariants` table, not the main `products` table
   - This means a product without variants has no place to store its SKU
   - The import process creates a default variant only if pricing info is provided
   - SKU generation falls back to an auto-generated value if not provided

2. **Import Process**
   - CSV import includes SKU field in the template
   - But SKU is treated as optional and only used when creating variants
   - If no pricing is provided, no variant is created, and SKU is lost

3. **UI Display**
   - Product cards and lists don't display SKUs
   - No SKU search functionality
   - SKU is not shown in product tables or cards

## Proposed Solution

### 1. Database Schema Changes

#### Option A: Add SKU to Products Table (Recommended)
```typescript
// In schema.ts - products table
products: defineTable({
  // ... existing fields
  sku: v.optional(v.string()), // Primary SKU for simple products
  // ... rest of fields
})
  .index('by_sku', ['organizationId', 'sku']) // New index for SKU search
```

**Pros:**
- Simple products can have SKUs without needing variants
- Faster SKU lookups for most common use case
- Backward compatible with existing data

**Cons:**
- Potential SKU duplication between product and variant
- Need to handle which SKU takes precedence

#### Option B: Always Create Default Variant
Keep SKU only in variants but ensure every product has at least one variant.

**Pros:**
- Consistent data model
- No schema changes needed

**Cons:**
- Adds complexity and storage overhead
- Counter-intuitive for simple products

### 2. Import Process Updates

```typescript
// Updated productImport.ts logic
export const createProductInternal = internalMutation({
  handler: async (ctx, { organizationId, projectId, product, defaultStatus, userId }) => {
    const now = Date.now();
    const handle = product.handle || generateHandle(product.title);
    
    // Create the product with SKU
    const productId = await ctx.db.insert('products', {
      organizationId,
      projectId,
      title: product.title,
      description: product.description,
      vendor: product.vendor,
      productType: product.productType,
      handle,
      sku: product.sku, // Store SKU at product level
      status: product.status || defaultStatus,
      // ... other fields
    });

    // Create default variant if additional variant data exists
    if (product.price !== undefined || product.inventoryQuantity !== undefined) {
      await ctx.db.insert('productVariants', {
        productId,
        organizationId,
        projectId,
        title: 'Default',
        sku: product.sku || generateSKU(product.title), // Use same SKU
        // ... other variant fields
      });
    }

    return productId;
  },
});
```

### 3. UI/UX Enhancements

#### Product List Table View
```
┌─────────────────────────────────────────────────────────────────────┐
│ Product               SKU        Status   Vendor    Categories      │
├─────────────────────────────────────────────────────────────────────┤
│ Premium Ribeye Steak  RIB-001   Active   Angus F.  Beef > Steaks  │
│ Organic Chicken       CHK-001   Active   Green V.  Poultry        │
│ Wild Salmon Fillet    SAL-001   Active   Ocean F.  Seafood        │
└─────────────────────────────────────────────────────────────────────┘
```

#### Product Card Enhancement
```
┌──────────────────────────┐
│ [Product Image]          │
│                          │
│ Premium Ribeye Steak     │
│ SKU: RIB-001            │
│ Vendor: Angus Farms      │
│ Status: Active ●         │
└──────────────────────────┘
```

#### Search Enhancement
- Add SKU to searchable fields
- Display SKU in search results
- Support direct SKU search with exact match priority

### 4. API Changes

#### Product Queries
```typescript
// Add SKU search capability
export const searchProducts = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    searchTerm: v.string(),
  },
  handler: async (ctx, { organizationId, projectId, searchTerm }) => {
    // First try exact SKU match
    const bySku = await ctx.db
      .query('products')
      .withIndex('by_sku', q => 
        q.eq('organizationId', organizationId)
         .eq('sku', searchTerm)
      )
      .first();
    
    if (bySku) return [bySku];
    
    // Then fall back to text search
    return await ctx.db
      .query('products')
      .withSearchIndex('search_products', q => 
        q.search('title', searchTerm)
         .eq('organizationId', organizationId)
         .eq('projectId', projectId)
      )
      .collect();
  },
});
```

### 5. Migration Strategy

1. **Add SKU field to products table**
2. **Backfill existing products**:
   - Copy SKU from default variant if exists
   - Generate SKU for products without variants
3. **Update import process**
4. **Update UI components**
5. **Add search functionality**

### 6. Implementation Tasks

#### Backend Tasks
- **T1**: Add SKU field to products schema with index
- **T2**: Update product import to preserve SKU at product level
- **T3**: Create migration to backfill existing products with SKUs
- **T4**: Add SKU search query with exact match priority
- **T5**: Update product mutations to handle SKU updates

#### Frontend Tasks
- **T6**: Add SKU column to products table view
- **T7**: Display SKU on product cards
- **T8**: Add SKU to search functionality
- **T9**: Update product creation/edit forms to include SKU field
- **T10**: Add SKU validation (uniqueness within organization)

## Benefits

1. **Business Value**
   - Preserves critical business identifiers
   - Enables SKU-based inventory management
   - Supports integration with external systems
   - Improves product searchability

2. **Technical Benefits**
   - Consistent data model
   - Efficient SKU lookups
   - Better search experience
   - Maintains backward compatibility

## Success Metrics

1. All imported products retain their SKUs
2. SKU search returns results in <100ms
3. Zero data loss during migration
4. SKU visible in all product views
5. Unique SKU validation prevents duplicates

## Risk Mitigation

1. **Data Migration Risk**: Test migration on staging first
2. **Performance Risk**: Add proper indexes for SKU queries
3. **Uniqueness Risk**: Implement org-level SKU validation
4. **UI Complexity**: Progressive enhancement approach

## Timeline Estimate

- Backend changes: 4-6 hours
- Frontend changes: 3-4 hours
- Testing & migration: 2-3 hours
- Total: 9-13 hours

## Decision Required

**Recommended Approach**: Option A - Add SKU to products table

This provides the best balance of:
- Simplicity for SMB users
- Performance for common operations
- Flexibility for future enhancements
- Minimal migration complexity