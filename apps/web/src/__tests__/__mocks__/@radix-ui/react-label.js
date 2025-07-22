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

// Export Label component
export const Root = createComponent('Label', 'label');