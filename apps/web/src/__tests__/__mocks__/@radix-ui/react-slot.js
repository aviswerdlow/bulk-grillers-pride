import React from 'react';

// Slot component that merges props and renders the child element
export const Slot = React.forwardRef(({ children, ...props }, ref) => {
  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ...children.props,
      ref,
    });
  }
  return children;
});

Slot.displayName = 'Slot';