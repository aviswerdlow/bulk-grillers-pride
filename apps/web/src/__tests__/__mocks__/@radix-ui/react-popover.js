import React from 'react';

// Mock implementation of Radix UI Popover components
export const Root = ({ children, open, onOpenChange }) => {
  // Simply pass through children
  return <>{children}</>;
};

export const Trigger = React.forwardRef(({ children, asChild, ...props }, ref) => {
  if (asChild) {
    return React.cloneElement(React.Children.only(children), {
      ...props,
      ref,
      role: 'combobox',
      'aria-expanded': false,
    });
  }
  
  return (
    <button {...props} ref={ref} role="combobox" aria-expanded="false">
      {children}
    </button>
  );
});
Trigger.displayName = 'PopoverTrigger';

export const Portal = ({ children }) => children;

export const Content = React.forwardRef(({ children, ...props }, ref) => {
  return (
    <div {...props} ref={ref}>
      {children}
    </div>
  );
});
Content.displayName = 'PopoverContent';

export const Anchor = React.forwardRef(({ children, ...props }, ref) => {
  return (
    <div {...props} ref={ref}>
      {children}
    </div>
  );
});
Anchor.displayName = 'PopoverAnchor';