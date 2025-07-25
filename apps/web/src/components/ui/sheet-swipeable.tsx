'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useSwipe } from '@/hooks/use-swipe';
import { SheetContent as BaseSheetContent } from './sheet';
import { cn } from '@/lib/utils';

interface SwipeableSheetContentProps extends React.ComponentPropsWithoutRef<typeof BaseSheetContent> {
  onSwipeClose?: () => void;
  side?: 'left' | 'right' | 'top' | 'bottom';
}

export const SwipeableSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SwipeableSheetContentProps
>(({ onSwipeClose, side = 'left', className, children, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const combinedRef = React.useCallback(
    (node: HTMLDivElement) => {
      contentRef.current = node;
      if (ref) {
        if (typeof ref === 'function') {
          ref(node);
        } else {
          ref.current = node;
        }
      }
    },
    [ref]
  );

  useSwipe(
    contentRef,
    {
      onSwipeLeft: side === 'left' ? onSwipeClose : undefined,
      onSwipeRight: side === 'right' ? onSwipeClose : undefined,
      onSwipeUp: side === 'top' ? onSwipeClose : undefined,
      onSwipeDown: side === 'bottom' ? onSwipeClose : undefined,
    },
    {
      threshold: 50,
      touchOnly: true,
    }
  );

  return (
    <BaseSheetContent
      ref={combinedRef}
      side={side}
      className={cn('touch-pan-y', className)}
      {...props}
    >
      {children}
    </BaseSheetContent>
  );
});

SwipeableSheetContent.displayName = 'SwipeableSheetContent';