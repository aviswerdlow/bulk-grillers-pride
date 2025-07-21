# Cascade Deletion Wireframes & Component Specifications

**Agent**: design-agent  
**Task**: #59 - Cascade Deletion Visualization Wireframes  
**Date**: 2025-07-19

## Wireframe Overview

This document provides detailed wireframes and specifications for each visualization mode and component in the cascade deletion flow.

## 1. Main Dialog Layout

```
+----------------------------------------------------------+
| Cascade Deletion Impact                            [X]   |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| |  ⚠️  25 items will be affected by this deletion     | |
| |                                                      | |
| |  [15] Delete  [8] Orphan  [2] Update  [1.2GB] Free | |
| +------------------------------------------------------+ |
|                                                          |
| View Mode: [Tree ▼] [Graph] [List]    Filter [●●●]     |
|                                                          |
| +------------------------------------------------------+ |
| |                                                      | |
| |              [Visualization Area]                    | |
| |                                                      | |
| |                                                      | |
| |                                                      | |
| +------------------------------------------------------+ |
|                                                          |
| □ Select All  □ Invert  [Delete Selected] [Keep Safe]  |
|                                                          |
| [← Back] [Cancel]                 [Review & Confirm →] |
+----------------------------------------------------------+
```

## 2. Tree View Wireframe

### Desktop Layout
```
+------------------------------------------------------+
| Search: [_____________] [↓ Collapse All] [↑ Expand] |
+------------------------------------------------------+
| ▼ 📦 Premium Grill Set                    🗑️ Delete |
|   ├─ ▶ 🏷️ Categories (2)                 🔄 Update |
|   ├─ ▼ 📸 Images (5)                      🗑️ Delete |
|   │   ├─ □ main-image.jpg (450KB)        🗑️        |
|   │   ├─ □ thumb-image.jpg (45KB)        🗑️        |
|   │   ├─ □ gallery-1.jpg (380KB)         🗑️        |
|   │   ├─ □ gallery-2.jpg (420KB)         🗑️        |
|   │   └─ □ gallery-3.jpg (390KB)         🗑️        |
|   ├─ ▶ 🔗 References (3)                  ⚠️ Orphan |
|   └─ ▶ 📊 Analytics (1)                  🔄 Update |
|                                                      |
| ▼ 📦 Deluxe Smoker Kit                    🗑️ Delete |
|   ├─ ▶ 🏷️ Categories (1)                 🔄 Update |
|   └─ ▶ 📸 Images (3)                     🗑️ Delete |
+------------------------------------------------------+
| Showing 2 of 15 root items              [Load More] |
+------------------------------------------------------+
```

### Mobile Layout (Simplified)
```
+------------------------+
| [Search] [Filter ●●●] |
+------------------------+
| ▼ 📦 Premium Grill Set |
|    🗑️ Will be deleted  |
|   ├─ ▶ 🏷️ (2)         |
|   ├─ ▼ 📸 (5)         |
|   │   ├─ □ main.jpg   |
|   │   └─ □ +4 more    |
|   └─ ▶ 🔗 (3)         |
+------------------------+
| [Show More Items]      |
+------------------------+
```

## 3. Graph View Wireframe

```
+------------------------------------------------------+
| Zoom: [−][slider][+]  Layout: [Force ▼]  [Reset]   |
+------------------------------------------------------+
|                                                      |
|        Categories                                    |
|           ○─────┐                                   |
|                 │                                    |
|    Images       ▼        References                 |
|  ○──○──○──→ [Product] ←──○──○                      |
|     ○──○        ●         ○                         |
|                 │                                    |
|                 ▼                                    |
|             Analytics                                |
|                ○                                     |
|                                                      |
| Legend:                                              |
| ● Selected  ○ Affected  → Delete  ··> Orphan       |
+------------------------------------------------------+
| □ Show labels  □ Show connections  □ Animate       |
+------------------------------------------------------+
```

## 4. List View Wireframe

### Desktop Table
```
+------------------------------------------------------+
| Filters: Type [All ▼] Impact [All ▼] Size [All ▼]  |
+------------------------------------------------------+
| □ | Name              | Type    | Impact | Size    |
|---|-------------------|---------|--------|---------|
| □ | Premium Grill Set | Product | Delete | 2.5MB   |
| □ | ├ main-image.jpg  | Image   | Delete | 450KB   |
| □ | ├ thumb.jpg       | Image   | Delete | 45KB    |
| □ | └ Categories      | Ref     | Update | -       |
| □ | Deluxe Smoker Kit | Product | Delete | 1.8MB   |
| □ | └ Images (3)      | Group   | Delete | 890KB   |
+------------------------------------------------------+
| Selected: 0 items (0 KB)    [Select Page] [Clear]  |
+------------------------------------------------------+
```

### Mobile Card Layout
```
+------------------------+
| Sort: [Impact ▼]      |
+------------------------+
| +--------------------+ |
| | □ Premium Grill    | |
| | Product • 2.5MB    | |
| | 🗑️ Will be deleted | |
| +--------------------+ |
| +--------------------+ |
| | □ Main Image       | |
| | Image • 450KB      | |
| | 🗑️ Will be deleted | |
| +--------------------+ |
+------------------------+
```

## 5. Selection Controls Wireframe

### Desktop Inline Controls
```
+------------------------------------------------------+
| Quick Select:                                        |
| [All] [None] [Invert] | □ Products □ Images □ Refs |
|                                                      |
| By Impact: □ Delete All □ Keep Orphans □ Safe Only |
+------------------------------------------------------+
```

### Mobile Bottom Sheet
```
+------------------------+
| Selection Options   ↓  |
+------------------------+
| Select All         □   |
| Select None        ○   |
| Invert Selection   ○   |
|------------------------|
| By Type:              |
| □ Products (15)       |
| □ Images (23)         |
| □ References (8)      |
|------------------------|
| By Impact:            |
| □ Will Delete (38)    |
| □ Will Orphan (8)     |
| □ Will Update (3)     |
+------------------------+
```

## 6. Impact Summary Component

### Expanded View
```
+------------------------------------------------------+
| Deletion Impact Summary                      [↓ Less]|
|------------------------------------------------------|
| Total Affected:  25 items                           |
| Storage Impact:  1.2 GB will be freed               |
| Time Estimate:   ~5 seconds                         |
|                                                      |
| Breakdown by Type:                                   |
| • Products:    2 items (80% of selection)           |
| • Images:      18 items (1.1 GB)                    |
| • Categories:  3 items (will be updated)            |
| • References:  2 items (will be orphaned)           |
|                                                      |
| ⚠️ Warnings:                                         |
| • 2 items are referenced by active campaigns        |
| • 3 categories will have no products after deletion |
+------------------------------------------------------+
```

### Collapsed View (Mobile)
```
+------------------------+
| Impact: 25 items [↓]  |
| 🗑️15 ⚠️8 🔄2 | 1.2GB |
+------------------------+
```

## 7. Filter Panel Wireframe

```
+------------------------------------------------------+
| Filter Options                                [Reset]|
|------------------------------------------------------|
| Impact Type:                                         |
| ○ All items                                         |
| ○ Items to delete                                   |
| ○ Items to orphan                                   |
| ○ Items to update                                   |
|                                                      |
| Item Type:                                          |
| □ Products (15)                                     |
| □ Images (45)                                       |
| □ Categories (8)                                    |
| □ References (12)                                   |
|                                                      |
| Size Range:                                         |
| [0 KB ========|====== 5 MB]                        |
|                                                      |
| Other Options:                                      |
| □ Show only items with warnings                    |
| □ Show only user-created items                     |
| □ Group by parent                                  |
+------------------------------------------------------+
```

## 8. Confirmation Dialog Wireframe

```
+------------------------------------------------------+
| ⚠️ Confirm Cascade Deletion                          |
|------------------------------------------------------|
| You have selected 15 items for deletion.            |
|                                                      |
| Summary of actions:                                  |
| • 12 items will be permanently deleted              |
| • 2 items will become orphaned                      |
| • 1 category will be updated                        |
|                                                      |
| This action will:                                    |
| • Free 1.2 GB of storage                           |
| • Take approximately 5 seconds                      |
| • Be irreversible for permanently deleted items    |
|                                                      |
| Type "DELETE" to confirm: [___________]             |
|                                                      |
| [Cancel]                    [Delete Selected Items] |
+------------------------------------------------------+
```

## 9. Loading States

### Tree View Loading
```
+------------------------------------------------------+
| ▼ ░░░░░░░░░░░░░░░░░░░░░░░░░              Loading   |
|   ├─ ░░░░░░░░░░░░░░░░                              |
|   ├─ ░░░░░░░░░░░░░░░░░░░                           |
|   └─ ░░░░░░░░░░░░                                  |
+------------------------------------------------------+
```

### Impact Calculation Loading
```
+------------------------------------------------------+
| Calculating deletion impact...                       |
| [████████░░░░░░░░░░░░░░░░] 35%                     |
| Analyzing relationships...                           |
+------------------------------------------------------+
```

## 10. Error States

### Partial Loading Error
```
+------------------------------------------------------+
| ⚠️ Some items couldn't be loaded                     |
| We loaded 23 of 25 items. The following failed:    |
| • product-xyz (Network error)                       |
| • image-abc (Permission denied)                     |
|                                                      |
| [Retry Failed Items]         [Continue Without]     |
+------------------------------------------------------+
```

### Calculation Error
```
+------------------------------------------------------+
| ❌ Unable to calculate deletion impact               |
| The server couldn't determine the full impact of    |
| this deletion. This might be due to:               |
| • Complex circular dependencies                     |
| • Temporary server issues                          |
| • Insufficient permissions                         |
|                                                      |
| [Try Again]  [Contact Support]  [Cancel]          |
+------------------------------------------------------+
```

## Component Specifications

### Interactive Elements

1. **Checkboxes**
   - Size: 20x20px (mobile: 24x24px)
   - Touch target: 44x44px minimum
   - States: unchecked, checked, indeterminate, disabled

2. **Expand/Collapse Icons**
   - Size: 16x16px
   - Rotation animation: 90deg on expand
   - Touch target: 44x44px

3. **Action Buttons**
   - Height: 40px (mobile: 48px)
   - Padding: 16px horizontal
   - Border radius: 6px
   - States: default, hover, active, disabled, loading

4. **Filter Chips**
   - Height: 32px
   - Padding: 8px 12px
   - Removable with × icon
   - Max width: 200px with ellipsis

### Responsive Breakpoints

```scss
// Component visibility
@media (max-width: 640px) {
  .graph-view { display: none; }
  .advanced-filters { display: none; }
  .bulk-actions { 
    position: fixed;
    bottom: 0;
    width: 100%;
  }
}

// Layout changes
@media (max-width: 768px) {
  .tree-node-metadata { display: block; }
  .list-view { 
    display: block; // Convert to cards
  }
}

// Simplified controls
@media (max-width: 480px) {
  .filter-panel {
    full-screen: true;
    slide-in: from-bottom;
  }
}
```

### Animation Specifications

1. **Node Expansion**
   - Duration: 200ms
   - Easing: ease-out
   - Height: 0 → auto

2. **Selection Change**
   - Duration: 150ms
   - Scale: 1 → 0.95 → 1
   - Background fade: 100ms

3. **Loading Skeleton**
   - Pulse duration: 1.5s
   - Opacity: 1 → 0.5 → 1
   - Infinite loop

4. **Error Shake**
   - Duration: 300ms
   - Translation: ±4px horizontal
   - 3 iterations

## Implementation Notes

1. **State Management**
   - Use React Context for dialog state
   - Local state for UI preferences
   - Server state for impact data

2. **Performance**
   - Virtualize lists >50 items
   - Debounce filter changes by 300ms
   - Lazy load tree children

3. **Accessibility**
   - Announce selection changes
   - Maintain focus on mode switch
   - Provide keyboard shortcuts

4. **Testing**
   - Screenshot tests for each view mode
   - Interaction tests for selection
   - Performance tests with 1000+ items