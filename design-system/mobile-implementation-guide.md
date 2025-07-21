# Mobile Implementation Guide

## Quick Start

This guide provides practical implementation details for adding mobile interactions to the Bulk Grillers Pride application.

## 1. Essential Setup

### Add Viewport Meta Tag
Add to `apps/web/src/app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  // ... existing metadata
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
}
```

### Install Required Dependencies
```bash
npm install framer-motion react-use-gesture @radix-ui/react-dialog
```

## 2. Mobile Navigation Component

Create `apps/web/src/components/layout/mobile-nav.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Home, Package, BarChart, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/analytics', label: 'Analytics', icon: BarChart },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 -m-3 transition-colors hover:bg-gray-100 rounded-lg"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        <div className="w-6 h-6 relative">
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X size={24} />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu size={24} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-[280px] max-w-[85vw] bg-white shadow-xl z-50"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold">Menu</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 -m-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto py-4">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 transition-colors",
                          "hover:bg-gray-100 active:bg-gray-200",
                          isActive && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <Icon size={20} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div>
                      <p className="text-sm font-medium">User Name</p>
                      <p className="text-xs text-gray-500">user@example.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
```

## 3. Swipeable List Items

Create `apps/web/src/components/ui/swipeable-item.tsx`:

```tsx
'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  threshold?: number;
}

export function SwipeableItem({ 
  children, 
  onDelete, 
  threshold = 100 
}: SwipeableItemProps) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const controls = useAnimation();
  
  const background = useTransform(
    x,
    [-threshold, 0],
    ['rgb(239, 68, 68)', 'rgb(229, 231, 235)']
  );

  const handleDragEnd = async (_: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -threshold || velocity < -500) {
      await controls.start({ x: -300, transition: { duration: 0.2 } });
      onDelete();
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300 } });
    }
  };

  return (
    <div ref={constraintsRef} className="relative overflow-hidden">
      <motion.div
        className="absolute inset-0 flex items-center justify-end px-4"
        style={{ backgroundColor: background }}
      >
        <Trash2 className="text-white" size={24} />
      </motion.div>
      
      <motion.div
        drag="x"
        dragConstraints={{ left: -threshold, right: 0 }}
        dragElastic={0.2}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative bg-white"
      >
        {children}
      </motion.div>
    </div>
  );
}
```

## 4. Bottom Sheet Component

Create `apps/web/src/components/ui/bottom-sheet.tsx`:

```tsx
'use client';

import { motion, useAnimation, useDragControls } from 'framer-motion';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[]; // Percentages of screen height
  title?: string;
}

export function BottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  snapPoints = [0.5, 0.9],
  title 
}: BottomSheetProps) {
  const [windowHeight, setWindowHeight] = useState(0);
  const controls = useAnimation();
  const dragControls = useDragControls();

  useEffect(() => {
    setWindowHeight(window.innerHeight);
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      controls.start({ 
        y: windowHeight * (1 - snapPoints[0]),
        transition: { type: 'spring', damping: 30, stiffness: 300 }
      });
    } else {
      controls.start({ 
        y: windowHeight,
        transition: { type: 'spring', damping: 30, stiffness: 300 }
      });
    }
  }, [isOpen, windowHeight, snapPoints, controls]);

  const handleDragEnd = (_: any, info: any) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 500 || offset > 100) {
      onClose();
    } else {
      // Snap to nearest point
      const currentY = windowHeight * (1 - snapPoints[0]) + offset;
      const snapDistances = snapPoints.map(point => 
        Math.abs(currentY - windowHeight * (1 - point))
      );
      const nearestIndex = snapDistances.indexOf(Math.min(...snapDistances));
      
      controls.start({ 
        y: windowHeight * (1 - snapPoints[nearestIndex]),
        transition: { type: 'spring', damping: 30, stiffness: 300 }
      });
    }
  };

  if (!isOpen && !controls.mount) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragConstraints={{ top: windowHeight * (1 - snapPoints[1]), bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={controls}
        initial={{ y: windowHeight }}
        className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl z-50"
        style={{ maxHeight: '90vh' }}
      >
        {/* Handle */}
        <div 
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 -m-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          {children}
        </div>
      </motion.div>
    </>
  );
}
```

## 5. Pull to Refresh

Create `apps/web/src/components/ui/pull-to-refresh.tsx`:

```tsx
'use client';

import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 80 
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  
  const rotation = useTransform(y, [0, threshold], [0, 360]);
  const opacity = useTransform(y, [0, threshold / 2], [0, 1]);

  const handleDragEnd = async () => {
    if (y.get() >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Refresh Indicator */}
      <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none">
        <motion.div
          style={{ 
            y, 
            opacity,
            height: threshold,
          }}
          className="flex items-center justify-center"
        >
          <motion.div style={{ rotate: rotation }}>
            <RefreshCw 
              size={24} 
              className={cn(
                "text-primary",
                isRefreshing && "animate-spin"
              )}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: threshold }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDragEnd={handleDragEnd}
        animate={{ y: isRefreshing ? threshold : 0 }}
        transition={{ type: 'spring', stiffness: 300 }}
        style={{ y }}
      >
        {children}
      </motion.div>
    </div>
  );
}
```

## 6. Touch-Optimized Form Components

### Mobile Input
Create `apps/web/src/components/ui/mobile-input.tsx`:

```tsx
'use client';

import { useState, forwardRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  clearable?: boolean;
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({ label, error, clearable = true, className, ...props }, ref) => {
    const [value, setValue] = useState(props.value || '');
    const [isFocused, setIsFocused] = useState(false);

    const handleClear = () => {
      setValue('');
      if (props.onChange) {
        const event = { target: { value: '' } } as React.ChangeEvent<HTMLInputElement>;
        props.onChange(event);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        
        <div className={cn(
          "relative rounded-lg border transition-all",
          isFocused ? "border-primary ring-2 ring-primary/20" : "border-gray-300",
          error && "border-red-500"
        )}>
          <input
            ref={ref}
            {...props}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (props.onChange) props.onChange(e);
            }}
            onFocus={(e) => {
              setIsFocused(true);
              if (props.onFocus) props.onFocus(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              if (props.onBlur) props.onBlur(e);
            }}
            className={cn(
              "w-full px-4 py-3 text-base rounded-lg bg-transparent",
              "focus:outline-none",
              "min-h-[48px]", // Touch-friendly height
              clearable && value && "pr-12",
              className
            )}
            style={{ fontSize: '16px' }} // Prevent zoom on iOS
          />
          
          {clearable && value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Clear input"
            >
              <X size={18} className="text-gray-400" />
            </button>
          )}
        </div>
        
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';
```

## 7. Mobile-Optimized Product Card

Create `apps/web/src/components/products/mobile-product-card.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { SwipeableItem } from '@/components/ui/swipeable-item';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import Image from 'next/image';

interface MobileProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
    description?: string;
    sku?: string;
  };
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}

export function MobileProductCard({ 
  product, 
  onEdit, 
  onDelete,
  onView 
}: MobileProductCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <SwipeableItem onDelete={onDelete}>
        <div 
          className="flex items-center gap-3 p-4 bg-white border-b active:bg-gray-50 transition-colors"
          onClick={() => setShowDetails(true)}
        >
          {/* Product Image */}
          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {product.image ? (
              <Image 
                src={product.image} 
                alt={product.name}
                width={64}
                height={64}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Package size={24} />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {product.name}
            </h3>
            <p className="text-sm text-gray-500">
              ${product.price.toFixed(2)}
            </p>
            {product.sku && (
              <p className="text-xs text-gray-400">
                SKU: {product.sku}
              </p>
            )}
          </div>

          {/* Actions */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Show action menu
            }}
            className="p-2 -m-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="More actions"
          >
            <MoreVertical size={20} className="text-gray-400" />
          </button>
        </div>
      </SwipeableItem>

      {/* Product Details Bottom Sheet */}
      <BottomSheet
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={product.name}
      >
        <div className="space-y-4">
          {product.image && (
            <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
              <Image 
                src={product.image} 
                alt={product.name}
                width={400}
                height={200}
                className="object-cover w-full h-full"
              />
            </div>
          )}
          
          <div>
            <p className="text-2xl font-bold">${product.price.toFixed(2)}</p>
            {product.sku && (
              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
            )}
          </div>

          {product.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-gray-600">{product.description}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <Edit size={18} />
              Edit
            </button>
            <button
              onClick={onView}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Eye size={18} />
              View Details
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
```

## 8. Responsive Table

Create `apps/web/src/components/ui/responsive-table.tsx`:

```tsx
'use client';

import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  columns: {
    key: string;
    label: string;
    priority?: 'high' | 'medium' | 'low';
    render?: (value: any, row: any) => React.ReactNode;
  }[];
  data: any[];
  mobileLayout?: 'cards' | 'scroll';
}

export function ResponsiveTable({ 
  columns, 
  data, 
  mobileLayout = 'cards' 
}: ResponsiveTableProps) {
  const highPriorityColumns = columns.filter(col => col.priority === 'high');
  const mediumPriorityColumns = columns.filter(col => col.priority === 'medium');
  const lowPriorityColumns = columns.filter(col => col.priority === 'low');

  if (mobileLayout === 'cards') {
    return (
      <>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {columns.map(col => (
                  <th key={col.key} className="text-left p-4 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  {columns.map(col => (
                    <td key={col.key} className="p-4">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {data.map((row, idx) => (
            <div key={idx} className="bg-white rounded-lg border p-4 space-y-3">
              {/* High Priority - Always visible */}
              <div className="space-y-1">
                {highPriorityColumns.map(col => (
                  <div key={col.key}>
                    <span className="text-sm text-gray-500">{col.label}: </span>
                    <span className="font-medium">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Medium Priority - Collapsible */}
              {mediumPriorityColumns.length > 0 && (
                <details className="group">
                  <summary className="text-sm text-primary cursor-pointer">
                    More details
                  </summary>
                  <div className="mt-2 space-y-1">
                    {mediumPriorityColumns.map(col => (
                      <div key={col.key}>
                        <span className="text-sm text-gray-500">{col.label}: </span>
                        <span>
                          {col.render ? col.render(row[col.key], row) : row[col.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }

  // Horizontal scroll layout
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b">
            {columns.map(col => (
              <th key={col.key} className="text-left p-4 font-medium whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              {columns.map(col => (
                <td key={col.key} className="p-4 whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## 9. Integration Example

Update your main layout to include mobile navigation:

```tsx
// apps/web/src/app/(dashboard)/layout.tsx
import { MobileNav } from '@/components/layout/mobile-nav';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">Bulk Grillers Pride</h1>
          <MobileNav />
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 w-64 h-full bg-white border-r">
        {/* Desktop navigation */}
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {children}
      </main>
    </div>
  );
}
```

## 10. Performance Tips

### 1. Lazy Load Heavy Components
```tsx
const BottomSheet = dynamic(() => import('@/components/ui/bottom-sheet'), {
  ssr: false,
});
```

### 2. Optimize Touch Handlers
```tsx
// Use passive listeners for better scroll performance
useEffect(() => {
  const handleTouchStart = (e: TouchEvent) => {
    // Handle touch
  };

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  return () => {
    document.removeEventListener('touchstart', handleTouchStart);
  };
}, []);
```

### 3. Debounce Expensive Operations
```tsx
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (value: string) => {
    // Perform search
  },
  300
);
```

## Testing Mobile Interactions

### 1. Chrome DevTools
- Use device emulation
- Test touch events
- Throttle network speed

### 2. Real Device Testing
- Test on actual iOS and Android devices
- Use Safari Web Inspector for iOS debugging
- Use Chrome Remote Debugging for Android

### 3. Accessibility Testing
- Use VoiceOver (iOS) and TalkBack (Android)
- Test keyboard navigation
- Verify touch target sizes

## Common Issues & Solutions

### Issue: Fixed elements jump on iOS
```css
/* Add to your global CSS */
.fixed-element {
  position: fixed;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}
```

### Issue: 300ms tap delay
```css
/* Already handled by modern browsers, but ensure: */
html {
  touch-action: manipulation;
}
```

### Issue: Viewport height on mobile browsers
```css
/* Use CSS custom properties for accurate viewport height */
:root {
  --vh: 1vh;
}

/* Update via JavaScript */
const setViewportHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

window.addEventListener('resize', setViewportHeight);
setViewportHeight();
```

## Next Steps

1. Implement components incrementally
2. Test on real devices
3. Gather user feedback
4. Monitor performance metrics
5. Iterate based on usage patterns

Remember: Mobile-first doesn't mean mobile-only. Ensure your desktop experience remains excellent while enhancing mobile usability.