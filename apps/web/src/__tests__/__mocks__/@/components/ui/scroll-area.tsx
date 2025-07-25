import React from 'react';

// Mock ScrollArea component
export const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div 
    ref={ref}
    data-testid="scroll-area"
    className={className}
    style={{ overflow: 'auto' }}
    {...props}
  >
    {children}
  </div>
));
ScrollArea.displayName = 'ScrollArea';

export const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref}
    data-testid="scroll-bar"
    className={className}
    {...props}
  />
));
ScrollBar.displayName = 'ScrollBar';