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

// Special Icon component that always handles asChild
const IconComponent = React.forwardRef(({ children, asChild = true, ...props }, ref) => {
  // Icon is typically used with asChild, so default to true
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ...children.props,
      ref,
    });
  }
  return React.createElement('span', { ...props, ref }, children);
});
IconComponent.displayName = 'SelectIcon';

// Create a Portal component that just renders children
const PortalComponent = ({ children }) => children;
PortalComponent.displayName = 'Portal';

// Special Root component that handles onValueChange
const RootComponent = React.forwardRef(({ children, onValueChange, defaultValue, value, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || value || '');
  
  // Create a context-like behavior for the mock
  const contextValue = {
    value: value !== undefined ? value : internalValue,
    onValueChange: (newValue) => {
      setInternalValue(newValue);
      if (onValueChange) {
        onValueChange(newValue);
      }
    }
  };

  return React.createElement(
    'div',
    { ...props, ref, 'data-testid': 'selectroot', 'data-value': contextValue.value },
    children
  );
});
RootComponent.displayName = 'SelectRoot';

// Select components
export const Root = RootComponent;
export const Trigger = createComponent('SelectTrigger', 'button');
export const Portal = PortalComponent;
export const Content = createComponent('SelectContent');
export const Viewport = createComponent('SelectViewport');
export const Item = createComponent('SelectItem');
export const ItemText = createComponent('SelectItemText');
export const ItemIndicator = createComponent('SelectItemIndicator');
export const Value = createComponent('SelectValue');
export const Icon = IconComponent;
export const ScrollUpButton = createComponent('SelectScrollUpButton', 'button');
export const ScrollDownButton = createComponent('SelectScrollDownButton', 'button');
export const Label = createComponent('SelectLabel');
export const Separator = createComponent('SelectSeparator');
export const Group = createComponent('SelectGroup');

// Also export as Select namespace for backward compatibility
export const Select = Root;
Select.displayName = 'Select';

const selectExports = {
  Root,
  Trigger,
  Portal,
  Content,
  Viewport,
  Item,
  ItemText,
  ItemIndicator,
  Value,
  Icon,
  ScrollUpButton,
  ScrollDownButton,
  Label,
  Separator,
  Group,
  Select,
};

export default selectExports;