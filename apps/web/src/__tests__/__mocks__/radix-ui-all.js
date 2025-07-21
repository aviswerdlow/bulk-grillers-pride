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

// Export all necessary radix-ui components
const radixExports = {
  // Common pattern for all radix packages
  Root: createComponent('Root'),
  Item: createComponent('Item'),
  Content: createComponent('Content'),
  Trigger: createComponent('Trigger', 'button'),
  Portal: ({ children }) => children,

  // Select specific - these are used by the select.tsx component
  ScrollUpButton: createComponent('ScrollUpButton', 'button'),
  ScrollDownButton: createComponent('ScrollDownButton', 'button'),

  // Label specific
  Label: createComponent('Label', 'label'),

  // Dialog specific
  DialogRoot: createComponent('DialogRoot'),
  DialogTrigger: createComponent('DialogTrigger', 'button'),
  DialogPortal: ({ children }) => children,
  DialogOverlay: createComponent('DialogOverlay'),
  DialogContent: createComponent('DialogContent'),
  DialogHeader: createComponent('DialogHeader'),
  DialogFooter: createComponent('DialogFooter'),
  DialogTitle: createComponent('DialogTitle', 'h2'),
  DialogDescription: createComponent('DialogDescription', 'p'),
  DialogClose: createComponent('DialogClose', 'button'),

  // Popover specific
  PopoverTrigger: createComponent('PopoverTrigger', 'button'),
  PopoverContent: createComponent('PopoverContent'),
  PopoverPortal: ({ children }) => children,

  // Command specific (cmdk)
  Command: createComponent('Command'),
  CommandInput: createComponent('CommandInput', 'input'),
  CommandList: createComponent('CommandList'),
  CommandEmpty: createComponent('CommandEmpty'),
  CommandGroup: createComponent('CommandGroup'),
  CommandItem: createComponent('CommandItem'),
  CommandSeparator: createComponent('CommandSeparator'),
  Input: createComponent('Input', 'input'),
  Empty: createComponent('Empty'),

  // ScrollArea specific
  ScrollArea: createComponent('ScrollArea'),
  ScrollAreaViewport: createComponent('ScrollAreaViewport'),
  ScrollAreaScrollbar: createComponent('ScrollAreaScrollbar'),
  ScrollAreaThumb: createComponent('ScrollAreaThumb'),
  ScrollAreaCorner: createComponent('ScrollAreaCorner'),

  // Other components
  Image: createComponent('Image', 'img'),
  Fallback: createComponent('Fallback'),
  Toggle: createComponent('Toggle', 'button'),
  Overlay: createComponent('Overlay'),
  Header: createComponent('Header'),
  Footer: createComponent('Footer'),
  Title: createComponent('Title', 'h2'),
  Description: createComponent('Description', 'p'),
  Action: createComponent('Action', 'button'),
  Cancel: createComponent('Cancel', 'button'),
  ToggleGroup: createComponent('ToggleGroup'),
  Separator: createComponent('Separator'),
  Arrow: createComponent('Arrow'),
  Sub: createComponent('Sub'),
  SubTrigger: createComponent('SubTrigger', 'button'),
  SubContent: createComponent('SubContent'),
  RadioGroup: createComponent('RadioGroup'),
  RadioItem: createComponent('RadioItem'),
  ItemIndicator: createComponent('ItemIndicator'),
  CheckboxItem: createComponent('CheckboxItem'),
  ItemText: createComponent('ItemText'),
  Label: createComponent('Label', 'label'),
  Group: createComponent('Group'),
  Value: createComponent('Value'),
  Icon: createComponent('Icon'),
  Viewport: createComponent('Viewport'),
  SelectTrigger: createComponent('SelectTrigger', 'button'),
  SelectContent: createComponent('SelectContent'),
  SelectItem: createComponent('SelectItem'),
  SelectValue: createComponent('SelectValue'),
  SelectScrollUpButton: createComponent('SelectScrollUpButton', 'button'),
  SelectScrollDownButton: createComponent('SelectScrollDownButton', 'button'),
  SelectItemText: createComponent('SelectItemText'),
  SelectLabel: createComponent('SelectLabel'),
  SelectSeparator: createComponent('SelectSeparator'),
  Indicator: createComponent('Indicator'),
  List: createComponent('List'),
  Slot: createComponent('Slot'),
};

export default radixExports;
