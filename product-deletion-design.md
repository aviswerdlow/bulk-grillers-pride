# Product Deletion Feature - UI/UX Design Specification

## Overview
A comprehensive, admin-only product deletion system with multiple safeguards, soft delete functionality, and a 30-day recovery period.

## Design Principles
- **Safety First**: Multiple confirmation steps to prevent accidental deletion
- **Progressive Disclosure**: Increasing severity warnings based on deletion scope
- **Clear Communication**: Explicit information about consequences
- **Recoverability**: Soft delete with 30-day undo period

## Entry Points & Navigation

### 1. Dedicated Management Section
**Location**: New tab in products page or dedicated route `/[orgSlug]/products/manage`

```
Products
├── All Products (existing)
├── Import Products (existing) 
├── AI Categorization (existing)
└── Manage Products (new) 🔒 Admin Only
```

### 2. Access Control
- Visual indicator: Lock icon (🔒) next to "Manage Products"
- Tooltip on hover: "Admin access required"
- Non-admins see disabled state with explanation

## UI Components & Flow

### 1. Manage Products Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Manage Products                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Product Management Zone                              │ │
│ │ Actions performed here affect your product database     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Quick Stats ──────────────────────────────────────┐   │
│ │ Total Products: 1,234                                │   │
│ │ Uncategorized: 456                                   │   │
│ │ Categorized: 778                                     │   │
│ │ In Trash: 12 (expires in 25 days)                   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─── Actions ─────────────────────────────────────────┐    │
│ │                                                     │    │
│ │ [🗑️ Bulk Delete Products] [📥 Export Products]     │    │
│ │                                                     │    │
│ │ [🗑️ Empty Trash] [♻️ Restore from Trash]         │    │
│ │                                                     │    │
│ └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2. Bulk Delete Flow

#### Step 1: Product Selection Interface
```
┌─────────────────────────────────────────────────────────────┐
│ Select Products to Delete                                   │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Filter by:                                                  │
│ ┌────────────┐ ┌──────────────┐ ┌─────────────────┐      │
│ │ ◉ All      │ │ ○ Uncategorized│ │ ○ Categorized  │      │
│ └────────────┘ └──────────────┘ └─────────────────┘      │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ □ Select All (1,234 products)                      │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [List of products with checkboxes - paginated]             │
│                                                             │
│ Selected: 45 products                                       │
│ • 12 uncategorized                                         │
│ • 33 categorized                                           │
│                                                             │
│ [Cancel] [Continue to Review →]                            │
└─────────────────────────────────────────────────────────────┘
```

#### Step 2: Review & First Warning (Yellow)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Review Deletion                                         │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ You are about to move 45 products to trash:                │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 📊 Deletion Summary                                 │    │
│ │                                                     │    │
│ │ • 12 Uncategorized products                        │    │
│ │ • 33 Categorized products                          │    │
│ │   - 15 in "Grills" category                       │    │
│ │   - 10 in "Accessories" category                  │    │
│ │   - 8 in "Parts" category                         │    │
│ │                                                     │    │
│ │ ⏱️ These items will be permanently deleted        │    │
│ │    after 30 days in trash                         │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [← Back] [Export Products] [Continue →]                    │
└─────────────────────────────────────────────────────────────┘
```

#### Step 3: Final Confirmation (Red)
```
┌─────────────────────────────────────────────────────────────┐
│ 🚨 Final Confirmation Required                              │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │     ⚠️        THIS ACTION CANNOT BE UNDONE          │    │
│ │              (After 30-day grace period)            │    │
│ │                                                     │    │
│ │ To confirm deletion of 45 products, type:          │    │
│ │                                                     │    │
│ │ DELETE 45                                           │    │
│ │                                                     │    │
│ │ ┌─────────────────────────────────────────────┐   │    │
│ │ │                                             │   │    │
│ │ └─────────────────────────────────────────────┘   │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [← Cancel] [Delete Products]                               │
│            (disabled until correct text entered)           │
└─────────────────────────────────────────────────────────────┘
```

### 3. Delete All Products Flow

#### Additional Warning for Delete All
```
┌─────────────────────────────────────────────────────────────┐
│ 🚨🚨🚨 EXTREME CAUTION - DELETE ALL PRODUCTS              │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │              ⛔ DANGER ZONE ⛔                      │    │
│ │                                                     │    │
│ │ You are about to delete your ENTIRE product        │    │
│ │ catalog of 1,234 products!                         │    │
│ │                                                     │    │
│ │ This includes:                                      │    │
│ │ • All categorized products                         │    │
│ │ • All uncategorized products                       │    │
│ │ • All product relationships                        │    │
│ │ • All import history                               │    │
│ │                                                     │    │
│ │ 🔄 Consider exporting your data first!             │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Type your organization name to proceed:                     │
│ ┌─────────────────────────────────────────────────────┐    │
│ │                                                     │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [← Abort] [Export All First] [Continue →]                  │
└─────────────────────────────────────────────────────────────┘
```

### 4. Success & Recovery UI

#### Success Message with Undo
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Products Moved to Trash                                  │
│                                                             │
│ 45 products have been moved to trash and will be           │
│ permanently deleted in 30 days.                             │
│                                                             │
│ [↩️ Undo] [View Trash] [Done]                              │
└─────────────────────────────────────────────────────────────┘
```

#### Trash Management Interface
```
┌─────────────────────────────────────────────────────────────┐
│ 🗑️ Trash (12 items)                                        │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ ⏱️ Items in trash will be permanently deleted after 30 days │
│                                                             │
│ Sort by: [Deletion Date ▼] [Days Remaining ▼]             │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ □ Product Name         Deleted    Days Left  Action│    │
│ │ □ Grill Master 3000   3 days ago    27      [♻️]  │    │
│ │ □ BBQ Gloves          5 days ago    25      [♻️]  │    │
│ │ ...                                                │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [♻️ Restore Selected] [🗑️ Delete Permanently]             │
└─────────────────────────────────────────────────────────────┘
```

## Visual Design System

### Color Coding & Severity Levels

1. **Information (Blue)**: General info, stats
   - Background: `blue-50`
   - Border: `blue-200`
   - Icon: `ℹ️`

2. **Warning Level 1 (Yellow)**: First confirmation
   - Background: `yellow-50`
   - Border: `yellow-400`
   - Icon: `⚠️`

3. **Warning Level 2 (Orange)**: Delete many items
   - Background: `orange-50`
   - Border: `orange-500`
   - Icon: `⚠️⚠️`

4. **Danger Level 3 (Red)**: Final confirmation
   - Background: `red-50`
   - Border: `red-600`
   - Icon: `🚨`

5. **Extreme Danger (Red + Animation)**: Delete all
   - Background: `red-100`
   - Border: `red-700` with pulse animation
   - Icon: `🚨🚨🚨`

### Button States & Hierarchy

```scss
// Primary Danger Actions
.btn-delete {
  @apply bg-red-600 hover:bg-red-700 text-white;
  &:disabled {
    @apply bg-gray-300 cursor-not-allowed;
  }
}

// Secondary Actions
.btn-export {
  @apply bg-blue-600 hover:bg-blue-700 text-white;
}

// Undo/Restore Actions  
.btn-restore {
  @apply bg-green-600 hover:bg-green-700 text-white;
}
```

### Icons & Visual Indicators
- 🗑️ Delete/Trash
- ♻️ Restore/Undo
- 📥 Export
- ⚠️ Warning
- 🚨 Danger
- ✅ Success
- 🔒 Admin only
- ⏱️ Time-sensitive

## Responsive Design

### Mobile Considerations
- Stack confirmation dialogs vertically
- Larger touch targets (min 44px)
- Simplified table views on mobile
- Swipe actions for individual items
- Bottom sheet modals for confirmations

### Tablet/Desktop
- Side-by-side comparisons in review step
- Hover states for additional info
- Keyboard shortcuts (with confirmation)
- Bulk selection with shift+click

## Accessibility

### WCAG 2.1 AA Compliance
- High contrast ratios for all warning text
- Screen reader announcements for state changes
- Focus management through multi-step flow
- Clear error messages with recovery instructions
- No reliance on color alone (icons + text)

### Keyboard Navigation
- Tab through all interactive elements
- Escape to cancel at any step
- Enter to confirm (when enabled)
- Space to select/deselect items

## Animation & Micro-interactions

### Transitions
- Smooth slide between confirmation steps
- Fade in/out for success messages
- Subtle shake animation on error
- Progress indicator for bulk operations

### Loading States
```
Deleting products... [=====>    ] 45%
```

## Error Handling

### Common Error States
1. **Permission Denied**: "Only admins can delete products"
2. **Network Error**: "Unable to delete. Please check connection."
3. **Partial Failure**: "23 of 45 products deleted. View errors."

## Activity Logging UI

### Deletion Log Entry Format
```
📋 Deletion Activity Log
─────────────────────────
[2024-01-15 14:32] Admin Jane deleted 45 products
  • 12 uncategorized
  • 33 from categories: Grills(15), Accessories(10), Parts(8)
  • Status: In Trash (expires 2024-02-14)
  
[2024-01-10 09:15] Admin John restored 5 products from trash
  • Restored to: Uncategorized
```

This design provides a comprehensive, safe, and user-friendly deletion system that prioritizes data safety while still allowing necessary cleanup operations. The progressive warning system, combined with soft delete and recovery options, ensures that accidental data loss is minimized while maintaining efficiency for intentional bulk operations.