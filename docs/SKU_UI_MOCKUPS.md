# SKU UI/UX Design Mockups

## Overview
This document provides detailed UI mockups and specifications for displaying SKUs throughout the application.

## 1. Product List Table View

### Desktop View (Enhanced with SKU)
```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Products                                                    [+ Add Product]     │
├────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search by name, SKU, vendor...                  [All Status ▼] [Grid|List]  │
├────────────────────────────────────────────────────────────────────────────────┤
│ □ Product Name              SKU         Status    Vendor      Categories    ⋮  │
├────────────────────────────────────────────────────────────────────────────────┤
│ □ Premium Ribeye Steak      RIB-001    ● Active  Angus F.    Beef > Steaks ⋮  │
│   premium-ribeye-steak                                                         │
│                                                                                │
│ □ Organic Chicken Breast    CHK-001    ● Active  Green V.    Poultry       ⋮  │
│   organic-chicken-breast                                                       │
│                                                                                │
│ □ Wild Salmon Fillet        SAL-001    ● Active  Ocean F.    Seafood       ⋮  │
│   wild-salmon-fillet                                                          │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Mobile Table View (Responsive)
```
┌─────────────────────────┐
│ Products      [+ Add]   │
├─────────────────────────┤
│ 🔍 Search...   [Filter] │
├─────────────────────────┤
│ Premium Ribeye Steak    │
│ SKU: RIB-001           │
│ Status: ● Active       │
│ Angus Farms            │
├─────────────────────────┤
│ Organic Chicken Breast  │
│ SKU: CHK-001           │
│ Status: ● Active       │
│ Green Valley Farms     │
└─────────────────────────┘
```

## 2. Product Card Grid View

### Enhanced Product Card
```
┌──────────────────────────────┐
│         ● Active             │
│ ┌────────────────────────┐  │
│ │                        │  │
│ │    [Product Image]     │  │
│ │                        │  │
│ └────────────────────────┘  │
│                              │
│ Premium Ribeye Steak         │
│ SKU: RIB-001                │
│                              │
│ 🏪 Angus Farms              │
│ 🏷️ Beef                     │
│                              │
│ Categories: Beef > Steaks    │
│                              │
│ Updated: Jan 19, 2025    ⋮  │
└──────────────────────────────┘
```

### Compact Card (Mobile)
```
┌─────────────────────┐
│ [Img] Premium Rib.. │
│       SKU: RIB-001  │
│       ● Active      │
│       Angus Farms   │
└─────────────────────┘
```

## 3. Product Search Experience

### Search Results with SKU Highlighting
```
┌──────────────────────────────────────────────────────────┐
│ 🔍 RIB-001                                              │
├──────────────────────────────────────────────────────────┤
│ Search Results (1 match)                                 │
│                                                          │
│ ⭐ Exact SKU Match                                       │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Premium Ribeye Steak                              │   │
│ │ SKU: [RIB-001] ← Highlighted                     │   │
│ │ USDA Prime grade ribeye steak...                 │   │
│ └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Search Suggestions
```
┌──────────────────────────────────────────┐
│ 🔍 rib                                   │
├──────────────────────────────────────────┤
│ 📦 Products                              │
│   Premium Ribeye Steak (RIB-001)        │
│   Baby Back Ribs (RIB-002)              │
│                                          │
│ 🔢 SKUs                                  │
│   RIB-001 - Premium Ribeye Steak        │
│   RIB-002 - Baby Back Ribs              │
└──────────────────────────────────────────┘
```

## 4. Product Detail View

### Product Header with SKU
```
┌────────────────────────────────────────────────────────────┐
│ ← Back to Products                                         │
├────────────────────────────────────────────────────────────┤
│ ┌─────────────┐  Premium Ribeye Steak                     │
│ │             │  SKU: RIB-001                              │
│ │   [Image]   │  Handle: premium-ribeye-steak             │
│ │             │  Status: ● Active                         │
│ └─────────────┘  Vendor: Angus Farms                      │
│                  Type: Beef                                │
│                                                [Edit] [⋮]  │
└────────────────────────────────────────────────────────────┘
```

## 5. Create/Edit Product Forms

### SKU Field in Product Form
```
┌──────────────────────────────────────────────────┐
│ Create New Product                            X  │
├──────────────────────────────────────────────────┤
│ Product Title *                                  │
│ [________________________________]               │
│                                                  │
│ SKU (Stock Keeping Unit) *                       │
│ [________________________________]               │
│ ℹ️ Unique identifier for inventory management    │
│                                                  │
│ Handle (URL)                                     │
│ [premium-ribeye-steak___________] Auto-generated│
│                                                  │
│ Description                                      │
│ [________________________________]               │
│ [________________________________]               │
│                                                  │
│ Vendor                                           │
│ [Select vendor...              ▼]               │
│                                                  │
│ Product Type                                     │
│ [Select type...                ▼]               │
│                                                  │
│ Status                                           │
│ ○ Active  ○ Draft  ○ Archived                   │
│                                                  │
│ [Cancel]                      [Create Product]   │
└──────────────────────────────────────────────────┘
```

### SKU Validation States
```
SKU Field States:

1. Empty (Required)
   [________________________________]
   ⚠️ SKU is required

2. Valid
   [RIB-001________________________] ✓
   ✓ SKU is available

3. Duplicate
   [CHK-001________________________] ✗
   ❌ This SKU is already in use

4. Invalid Format
   [rib 001________________________] ✗
   ⚠️ SKU can only contain letters, numbers, and hyphens
```

## 6. Import Preview with SKU

### CSV Import Mapping
```
┌─────────────────────────────────────────────────────────┐
│ Map CSV Columns to Product Fields                       │
├─────────────────────────────────────────────────────────┤
│ CSV Column          →  Product Field                    │
│                                                         │
│ "Product Name"      →  [Title               ▼]         │
│ "Item Code"         →  [SKU                 ▼] ⭐      │
│ "Description"       →  [Description         ▼]         │
│ "Brand"             →  [Vendor              ▼]         │
│ "Category"          →  [Product Type        ▼]         │
│ "Price"             →  [Price               ▼]         │
│                                                         │
│ ⭐ SKU is a required field for product identification   │
└─────────────────────────────────────────────────────────┘
```

## 7. Mobile-First Considerations

### Mobile Product List
```
┌─────────────────────────┐
│ 🔍 Search SKU...       │
├─────────────────────────┤
│ ┌─────────────────────┐│
│ │ Premium Ribeye      ││
│ │ RIB-001 | Active    ││
│ │ Angus Farms         ││
│ └─────────────────────┘│
│ ┌─────────────────────┐│
│ │ Organic Chicken     ││
│ │ CHK-001 | Active    ││
│ │ Green Valley        ││
│ └─────────────────────┘│
└─────────────────────────┘
```

## Design Tokens

### SKU Display Styling
```css
/* SKU Typography */
--sku-font-family: var(--font-mono);
--sku-font-size: 0.875rem;
--sku-font-weight: 500;
--sku-color: var(--muted-foreground);

/* SKU Badge Style */
--sku-badge-bg: var(--muted);
--sku-badge-border: var(--border);
--sku-badge-padding: 0.25rem 0.5rem;
--sku-badge-radius: var(--radius-sm);

/* Search Highlight */
--sku-highlight-bg: oklch(0.95 0.05 85);
--sku-highlight-color: oklch(0.4 0.15 85);
```

## Interaction Patterns

### SKU Copy to Clipboard
- Hover over SKU shows copy icon
- Click copies SKU to clipboard
- Show toast: "SKU copied: RIB-001"

### SKU Search Behavior
1. Typing in search checks SKU first
2. Exact SKU match appears at top
3. Partial SKU matches shown separately
4. Then regular product name matches

### SKU Validation Rules
- Required field (cannot be empty)
- Unique within organization
- Alphanumeric + hyphens only
- Max length: 50 characters
- Case-insensitive uniqueness check

## Accessibility

### Screen Reader Announcements
- "SKU: RIB-001" read as "Stock Keeping Unit: R-I-B-dash-zero-zero-one"
- Search results announce "Exact SKU match found"
- Validation errors announced immediately

### Keyboard Navigation
- Tab order includes SKU field after title
- SKU field in tables is selectable
- Copy SKU shortcut: Ctrl/Cmd + Shift + C when focused

## Implementation Priority

1. **Phase 1**: Display SKU in existing views
   - Add to table view
   - Add to product cards
   - Add to search results

2. **Phase 2**: SKU Management
   - Add to create/edit forms
   - Implement validation
   - Add copy functionality

3. **Phase 3**: Enhanced Features
   - Advanced SKU search
   - Bulk SKU operations
   - SKU history tracking