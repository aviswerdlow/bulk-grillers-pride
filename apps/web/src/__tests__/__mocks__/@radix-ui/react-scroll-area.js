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

// Create components
const Root = createComponent('ScrollAreaRoot');
const Viewport = createComponent('ScrollAreaViewport');
const Scrollbar = createComponent('ScrollAreaScrollbar');
const Thumb = createComponent('ScrollAreaThumb');
const Corner = createComponent('ScrollAreaCorner');

// Export both ways to support different import patterns
export {
  Root,
  Viewport,
  Scrollbar,
  Thumb,
  Corner,
};

// Also export with full names for namespace imports
export const ScrollAreaRoot = Root;
export const ScrollAreaViewport = Viewport;
export const ScrollAreaScrollbar = Scrollbar;
export const ScrollAreaThumb = Thumb;
export const ScrollAreaCorner = Corner;