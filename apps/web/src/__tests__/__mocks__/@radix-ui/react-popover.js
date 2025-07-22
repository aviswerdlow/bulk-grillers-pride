import React from 'react';

// Create a generic component factory
const createComponent = (displayName, element = 'div') => {
  const Component = React.forwardRef(({ children, asChild, ...props }, ref) => {
    // Handle asChild prop - when true, render the child with merged props
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        ...children.props,
        ref,
      });
    }

    return React.createElement(
      element,
      { ...props, ref, 'data-testid': displayName.toLowerCase() },
      children
    );
  });
  Component.displayName = displayName;
  return Component;
};

// Create Portal component that just renders children
const PopoverPortal = ({ children }) => children;
PopoverPortal.displayName = 'PopoverPortal';

// Export all Popover components
export const Root = createComponent('PopoverRoot');
export const Trigger = createComponent('PopoverTrigger', 'button');
export const Portal = PopoverPortal;
export const Content = createComponent('PopoverContent');
export const Anchor = createComponent('PopoverAnchor');