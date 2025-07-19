/**
 * Radix UI Import Optimization
 * 
 * This file demonstrates how to optimize Radix UI imports
 * to reduce bundle size by only importing what's needed.
 */

import dynamic from 'next/dynamic';

// ❌ BAD - Imports entire packages
// import * as Dialog from '@radix-ui/react-dialog';
// import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// ✅ GOOD - Import only needed components
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@radix-ui/react-dialog';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@radix-ui/react-dropdown-menu';

// For components that need client-side only rendering
export const ClientOnlyDialog = dynamic(
  () => import('@radix-ui/react-dialog').then(mod => mod.Dialog),
  { ssr: false }
);

// Re-export pattern for tree-shaking
export type {
  DialogProps,
  DialogTriggerProps,
  DialogContentProps,
} from '@radix-ui/react-dialog';