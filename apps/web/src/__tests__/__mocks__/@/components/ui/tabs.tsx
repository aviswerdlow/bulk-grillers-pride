import React from 'react';

export const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: string; defaultValue?: string; onValueChange?: (value: string) => void }
>(({ children, ...props }, ref) => (
  <div ref={ref} data-testid="tabs" {...props}>
    {children}
  </div>
));
Tabs.displayName = 'Tabs';

export const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div ref={ref} role="tablist" data-testid="tabs-list" className={className} {...props}>
    {children}
  </div>
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ children, value, ...props }, ref) => (
  <button
    ref={ref}
    role="tab"
    data-testid={`tabs-trigger-${value}`}
    aria-selected="false"
    {...props}
  >
    {children}
  </button>
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ children, value, ...props }, ref) => (
  <div
    ref={ref}
    role="tabpanel"
    data-testid={`tabs-content-${value}`}
    hidden={false}
    {...props}
  >
    {children}
  </div>
));
TabsContent.displayName = 'TabsContent';