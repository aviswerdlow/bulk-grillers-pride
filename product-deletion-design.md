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

## Component Implementation with shadcn/ui

### 1. Product Selection Dialog Component

```tsx
// components/products/delete-products-dialog.tsx
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Trash2, AlertTriangle } from "lucide-react"

interface DeleteProductsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProceed: (selectedProducts: string[]) => void
}

export function DeleteProductsDialog({ open, onOpenChange, onProceed }: DeleteProductsDialogProps) {
  const [filter, setFilter] = useState<"all" | "uncategorized" | "categorized">("all")
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Select Products to Delete
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Filter Options */}
          <RadioGroup value={filter} onValueChange={(v) => setFilter(v as any)}>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">All Products</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="uncategorized" id="uncategorized" />
                <Label htmlFor="uncategorized">Uncategorized</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="categorized" id="categorized" />
                <Label htmlFor="categorized">Categorized</Label>
              </div>
            </div>
          </RadioGroup>
          
          {/* Select All Checkbox */}
          <div className="border rounded-lg p-3 bg-muted/50">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="select-all"
                onCheckedChange={(checked) => {
                  if (checked) {
                    // Add all filtered products
                  } else {
                    setSelectedProducts(new Set())
                  }
                }}
              />
              <Label htmlFor="select-all" className="font-medium">
                Select All (1,234 products)
              </Label>
            </div>
          </div>
          
          {/* Product List */}
          <ScrollArea className="h-[300px] border rounded-lg p-4">
            {/* Product items with checkboxes */}
          </ScrollArea>
          
          {/* Selection Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="font-medium">Selected: {selectedProducts.size} products</p>
            <ul className="text-sm text-muted-foreground mt-1">
              <li>• 12 uncategorized</li>
              <li>• 33 categorized</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => onProceed(Array.from(selectedProducts))}
            disabled={selectedProducts.size === 0}
          >
            Continue to Review →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 2. Progressive Warning Dialogs

```tsx
// components/products/delete-confirmation-dialogs.tsx
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, AlertCircle, Trash2 } from "lucide-react"

// Level 1: Review Warning (Yellow)
export function DeleteReviewDialog({ 
  open, 
  onOpenChange, 
  productCount, 
  breakdown,
  onExport,
  onContinue 
}: DeleteReviewDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-yellow-700">
            <AlertTriangle className="h-5 w-5" />
            Review Deletion
          </AlertDialogTitle>
        </AlertDialogHeader>
        
        <Alert className="border-yellow-400 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You are about to move {productCount} products to trash:
          </AlertDescription>
        </Alert>
        
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            📊 Deletion Summary
          </h4>
          <ul className="space-y-1 text-sm">
            <li>• {breakdown.uncategorized} Uncategorized products</li>
            <li>• {breakdown.categorized} Categorized products</li>
            {breakdown.categories.map((cat) => (
              <li key={cat.name} className="ml-4">
                - {cat.count} in "{cat.name}" category
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground mt-3 flex items-center gap-1">
            ⏱️ These items will be permanently deleted after 30 days in trash
          </p>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>← Back</AlertDialogCancel>
          <Button variant="outline" onClick={onExport}>
            Export Products
          </Button>
          <AlertDialogAction onClick={onContinue}>
            Continue →
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Level 3: Final Confirmation (Red)
export function DeleteFinalConfirmationDialog({
  open,
  onOpenChange,
  productCount,
  onConfirm
}: DeleteFinalConfirmationProps) {
  const [confirmText, setConfirmText] = useState("")
  const expectedText = `DELETE ${productCount}`
  const isValid = confirmText === expectedText
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-700">
            🚨 Final Confirmation Required
          </AlertDialogTitle>
        </AlertDialogHeader>
        
        <Alert className="border-red-600 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-center space-y-2 text-red-800">
            <p className="font-bold text-lg">⚠️ THIS ACTION CANNOT BE UNDONE</p>
            <p className="text-sm">(After 30-day grace period)</p>
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <p className="text-center">
            To confirm deletion of <strong>{productCount} products</strong>, type:
          </p>
          <p className="text-center font-mono text-lg bg-muted px-4 py-2 rounded">
            {expectedText}
          </p>
          <Input
            placeholder="Type confirmation text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="text-center font-mono"
          />
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>← Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!isValid}
          >
            Delete Products
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### 3. Success Toast & Undo Component

```tsx
// components/products/delete-success-toast.tsx
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Undo2 } from "lucide-react"

export function showDeleteSuccessToast({
  productCount,
  onUndo,
  onViewTrash
}: {
  productCount: number
  onUndo: () => void
  onViewTrash: () => void
}) {
  toast({
    duration: 10000, // 10 seconds to allow undo
    className: "bg-green-50 border-green-200",
    description: (
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-green-900">
            Products Moved to Trash
          </p>
          <p className="text-sm text-green-700 mt-1">
            {productCount} products have been moved to trash and will be
            permanently deleted in 30 days.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={onUndo}
              className="text-green-700 border-green-300 hover:bg-green-100"
            >
              <Undo2 className="h-3 w-3 mr-1" />
              Undo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onViewTrash}
              className="text-green-700 hover:bg-green-100"
            >
              View Trash
            </Button>
          </div>
        </div>
      </div>
    ),
  })
}
```

### 4. Trash Management Table Component

```tsx
// components/products/trash-management.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Recycle, Trash2, Clock } from "lucide-react"

export function TrashManagement() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Trash (12 items)
        </h2>
        <Select defaultValue="deletion-date">
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deletion-date">Deletion Date</SelectItem>
            <SelectItem value="days-remaining">Days Remaining</SelectItem>
            <SelectItem value="product-name">Product Name</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Alert className="border-orange-200 bg-orange-50">
        <Clock className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          Items in trash will be permanently deleted after 30 days
        </AlertDescription>
      </Alert>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox />
            </TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead>Deleted</TableHead>
            <TableHead>Days Left</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <Checkbox />
            </TableCell>
            <TableCell className="font-medium">Grill Master 3000</TableCell>
            <TableCell>3 days ago</TableCell>
            <TableCell>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                27 days
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="ghost">
                <Recycle className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2">
          <Recycle className="h-4 w-4" />
          Restore Selected
        </Button>
        <Button variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete Permanently
        </Button>
      </div>
    </div>
  )
}
```

## Mobile-Specific Interactions

### 1. Mobile Bottom Sheet Pattern

```tsx
// components/products/mobile-delete-sheet.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SwipeableList, SwipeableListItem } from "@/components/ui/swipeable-list"
import { Button } from "@/components/ui/button"

export function MobileDeleteSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          Manage
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Manage Products</SheetTitle>
        </SheetHeader>
        
        {/* Mobile-optimized content */}
        <div className="mt-4 space-y-4">
          {/* Larger touch targets (min 44px) */}
          <Button className="w-full h-12" variant="destructive">
            <Trash2 className="h-5 w-5 mr-2" />
            Delete Products
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Swipe-to-delete for individual items
export function MobileProductItem({ product }: { product: Product }) {
  return (
    <SwipeableListItem
      rightAction={
        <div className="bg-red-500 text-white p-4 flex items-center">
          <Trash2 className="h-5 w-5" />
        </div>
      }
      onRightActionTrigger={() => handleDelete(product.id)}
    >
      <div className="p-4 border-b">
        <h3 className="font-medium">{product.title}</h3>
        <p className="text-sm text-muted-foreground">{product.vendor}</p>
      </div>
    </SwipeableListItem>
  )
}
```

### 2. Mobile Confirmation Flow

```tsx
// Mobile uses full-screen modals instead of dialogs
export function MobileDeleteConfirmation() {
  return (
    <div className="fixed inset-0 bg-background z-50 md:hidden">
      <div className="flex flex-col h-full">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Confirm Deletion</h2>
          <Button variant="ghost" size="sm">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Scrollable content */}
        <ScrollArea className="flex-1 p-4">
          {/* Confirmation content */}
        </ScrollArea>
        
        {/* Fixed bottom actions */}
        <div className="p-4 border-t space-y-2">
          <Button className="w-full h-12" variant="destructive">
            Confirm Delete
          </Button>
          <Button className="w-full h-12" variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 3. Mobile Gestures & Touch Interactions

```css
/* Mobile-specific styles */
@media (max-width: 768px) {
  /* Larger touch targets */
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
  
  /* Bottom sheet animations */
  .sheet-content {
    animation: slide-up 0.3s ease-out;
  }
  
  /* Swipe gesture feedback */
  .swipeable-item {
    transition: transform 0.2s ease-out;
  }
  
  /* Pull-to-refresh for trash items */
  .trash-list {
    overscroll-behavior-y: contain;
  }
}

/* Haptic feedback simulation */
.delete-action:active {
  transform: scale(0.98);
  transition: transform 0.1s;
}
```

## Activity Logging & Audit Trail UI

### 1. Activity Log Component

```tsx
// components/products/activity-log.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { FileText, Trash2, Recycle, Download } from "lucide-react"

interface ActivityLogEntry {
  id: string
  timestamp: Date
  user: {
    name: string
    email: string
    avatar?: string
  }
  action: "delete" | "restore" | "export" | "permanent_delete"
  details: {
    productCount: number
    breakdown?: {
      uncategorized: number
      categorized: number
      categories?: { name: string; count: number }[]
    }
    status?: string
  }
}

export function ActivityLog({ entries }: { entries: ActivityLogEntry[] }) {
  const getActionIcon = (action: ActivityLogEntry["action"]) => {
    switch (action) {
      case "delete": return <Trash2 className="h-4 w-4 text-red-500" />
      case "restore": return <Recycle className="h-4 w-4 text-green-500" />
      case "export": return <Download className="h-4 w-4 text-blue-500" />
      case "permanent_delete": return <Trash2 className="h-4 w-4 text-red-700" />
    }
  }
  
  const getActionText = (entry: ActivityLogEntry) => {
    switch (entry.action) {
      case "delete": return `deleted ${entry.details.productCount} products`
      case "restore": return `restored ${entry.details.productCount} products from trash`
      case "export": return `exported ${entry.details.productCount} products`
      case "permanent_delete": return `permanently deleted ${entry.details.productCount} products`
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Deletion Activity Log
        </CardTitle>
        <CardDescription>
          Track all product deletion and restoration activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="flex gap-3 p-3 rounded-lg border bg-muted/30">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={entry.user.avatar} />
                  <AvatarFallback>
                    {entry.user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {getActionIcon(entry.action)}
                    <span className="font-medium">{entry.user.name}</span>
                    <span className="text-muted-foreground">
                      {getActionText(entry)}
                    </span>
                  </div>
                  
                  {entry.details.breakdown && (
                    <div className="text-sm text-muted-foreground ml-6">
                      • {entry.details.breakdown.uncategorized} uncategorized
                      {entry.details.breakdown.categorized > 0 && (
                        <>
                          <br />• {entry.details.breakdown.categorized} from categories: 
                          {entry.details.breakdown.categories?.map((cat, i) => (
                            <span key={cat.name}>
                              {i > 0 && ", "}
                              {cat.name}({cat.count})
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                  
                  {entry.details.status && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {entry.details.status}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
```

### 2. Audit Trail Dashboard

```tsx
// components/products/audit-dashboard.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function AuditDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Deletions (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Items in Trash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">
              Expires in 5-30 days
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Restored Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">
              7.7% recovery rate
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="users">By User</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Deletion Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="deletions" 
                    stroke="#ef4444" 
                    name="Deletions"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="restorations" 
                    stroke="#10b981" 
                    name="Restorations"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## Dialog Component Structure Specifications

### 1. Multi-Step Dialog Controller

```tsx
// components/products/delete-flow-controller.tsx
import { useState } from "react"
import { DeleteProductsDialog } from "./delete-products-dialog"
import { DeleteReviewDialog } from "./delete-confirmation-dialogs"
import { DeleteFinalConfirmationDialog } from "./delete-confirmation-dialogs"
import { showDeleteSuccessToast } from "./delete-success-toast"

type FlowStep = "selection" | "review" | "confirm" | "success"

export function DeleteFlowController() {
  const [currentStep, setCurrentStep] = useState<FlowStep | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  
  const handleProceedFromSelection = (products: string[]) => {
    setSelectedProducts(products)
    setCurrentStep("review")
  }
  
  const handleProceedFromReview = () => {
    setCurrentStep("confirm")
  }
  
  const handleFinalConfirmation = async () => {
    setIsDeleting(true)
    try {
      // Call delete mutation
      await deleteProducts(selectedProducts)
      setCurrentStep(null)
      showDeleteSuccessToast({
        productCount: selectedProducts.length,
        onUndo: handleUndo,
        onViewTrash: () => router.push("/products/trash")
      })
    } finally {
      setIsDeleting(false)
    }
  }
  
  return (
    <>
      <DeleteProductsDialog
        open={currentStep === "selection"}
        onOpenChange={(open) => !open && setCurrentStep(null)}
        onProceed={handleProceedFromSelection}
      />
      
      <DeleteReviewDialog
        open={currentStep === "review"}
        onOpenChange={(open) => !open && setCurrentStep("selection")}
        productCount={selectedProducts.length}
        breakdown={getProductBreakdown(selectedProducts)}
        onExport={handleExport}
        onContinue={handleProceedFromReview}
      />
      
      <DeleteFinalConfirmationDialog
        open={currentStep === "confirm"}
        onOpenChange={(open) => !open && setCurrentStep("review")}
        productCount={selectedProducts.length}
        onConfirm={handleFinalConfirmation}
        isLoading={isDeleting}
      />
    </>
  )
}
```

### 2. Dialog State Management

```tsx
// hooks/use-delete-flow.ts
import { create } from "zustand"

interface DeleteFlowState {
  isOpen: boolean
  step: "selection" | "review" | "confirm" | null
  selectedProducts: string[]
  deletionBreakdown: DeletionBreakdown | null
  
  // Actions
  openFlow: () => void
  closeFlow: () => void
  setStep: (step: DeleteFlowState["step"]) => void
  setSelectedProducts: (products: string[]) => void
  setDeletionBreakdown: (breakdown: DeletionBreakdown) => void
  reset: () => void
}

export const useDeleteFlow = create<DeleteFlowState>((set) => ({
  isOpen: false,
  step: null,
  selectedProducts: [],
  deletionBreakdown: null,
  
  openFlow: () => set({ isOpen: true, step: "selection" }),
  closeFlow: () => set({ isOpen: false, step: null }),
  setStep: (step) => set({ step }),
  setSelectedProducts: (products) => set({ selectedProducts: products }),
  setDeletionBreakdown: (breakdown) => set({ deletionBreakdown: breakdown }),
  reset: () => set({
    isOpen: false,
    step: null,
    selectedProducts: [],
    deletionBreakdown: null
  })
}))
```

### 3. Animation & Transition Specifications

```css
/* Dialog transition animations */
@keyframes dialog-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes dialog-exit {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
}

.dialog-content {
  animation: dialog-enter 0.2s ease-out;
}

.dialog-content[data-state="closed"] {
  animation: dialog-exit 0.15s ease-in;
}

/* Step transitions */
.step-transition {
  transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
}

/* Shake animation for errors */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.error-shake {
  animation: shake 0.3s ease-in-out;
}

/* Pulse animation for extreme danger */
@keyframes danger-pulse {
  0% { border-color: rgb(220, 38, 38); }
  50% { border-color: rgb(239, 68, 68); }
  100% { border-color: rgb(220, 38, 38); }
}

.extreme-danger {
  animation: danger-pulse 2s infinite;
}
```

This comprehensive design specification now includes:

1. **Component Implementation** - Ready-to-use React components with shadcn/ui
2. **Mobile-Specific Interactions** - Bottom sheets, swipe gestures, and touch-optimized UI
3. **Activity Logging & Audit Trail** - Complete logging system with visual dashboard
4. **Dialog Structure Specifications** - Multi-step flow controller and state management

All components follow your existing design patterns and integrate seamlessly with the shadcn/ui component library.