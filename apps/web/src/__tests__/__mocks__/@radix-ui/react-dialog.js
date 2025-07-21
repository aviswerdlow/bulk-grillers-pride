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

// Create a Portal component that just renders children
const PortalComponent = ({ children }) => children;
PortalComponent.displayName = 'Portal';

// Dialog components
export const Root = createComponent('DialogRoot');
export const Trigger = createComponent('DialogTrigger', 'button');
export const Portal = PortalComponent;
export const Overlay = createComponent('DialogOverlay');
export const Content = createComponent('DialogContent');
export const Title = createComponent('DialogTitle', 'h2');
export const Description = createComponent('DialogDescription', 'p');
export const Close = createComponent('DialogClose', 'button');

// Also export as Dialog namespace for backward compatibility
export const Dialog = Root;
Dialog.displayName = 'Dialog';

export default {
  Root,
  Trigger,
  Portal,
  Overlay,
  Content,
  Title,
  Description,
  Close,
  Dialog,
};