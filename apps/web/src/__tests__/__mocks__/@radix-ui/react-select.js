// Mock for @radix-ui/react-select
// eslint-disable-next-line @typescript-eslint/no-require-imports
const React = require('react');

// Select Context
const SelectContext = React.createContext({
  value: undefined,
  onValueChange: () => {},
  open: false,
  onOpenChange: () => {},
});

// Root Select component
const Select = ({ value: controlledValue, defaultValue, onValueChange, open: controlledOpen, defaultOpen = false, onOpenChange, children, ...props }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const handleValueChange = React.useCallback((newValue) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  }, [controlledValue, onValueChange]);
  
  const handleOpenChange = React.useCallback((newOpen) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  }, [controlledOpen, onOpenChange]);
  
  return React.createElement(
    SelectContext.Provider,
    { value: { value, onValueChange: handleValueChange, open: isOpen, onOpenChange: handleOpenChange } },
    React.createElement('div', { ...props, 'data-testid': 'select-root' }, children)
  );
};

// Trigger component
const SelectTrigger = React.forwardRef(({ children, ...props }, ref) => {
  const { value, onOpenChange } = React.useContext(SelectContext);
  
  return React.createElement(
    'button',
    {
      ...props,
      ref,
      type: 'button',
      role: 'combobox',
      'aria-expanded': false,
      'aria-haspopup': 'listbox',
      onClick: () => onOpenChange(true),
      'data-testid': 'select-trigger'
    },
    children
  );
});

SelectTrigger.displayName = 'SelectTrigger';

// Value component
const SelectValue = ({ placeholder, ...props }) => {
  const { value } = React.useContext(SelectContext);
  
  return React.createElement(
    'span',
    { ...props, 'data-testid': 'select-value' },
    value || placeholder
  );
};

// Content component
const SelectContent = ({ children, ...props }) => {
  const { open } = React.useContext(SelectContext);
  
  if (!open) return null;
  
  return React.createElement(
    'div',
    { ...props, role: 'listbox', 'data-testid': 'select-content' },
    children
  );
};

// Item component
const SelectItem = React.forwardRef(({ value, children, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  
  return React.createElement(
    'div',
    {
      ...props,
      ref,
      role: 'option',
      'aria-selected': context.value === value,
      onClick: () => {
        context.onValueChange(value);
        context.onOpenChange(false);
      },
      'data-testid': `select-item-${value}`
    },
    children
  );
});

SelectItem.displayName = 'SelectItem';

// Other components
const SelectItemText = ({ children, ...props }) => React.createElement('span', props, children);
const SelectPortal = ({ children, ...props }) => children;
const SelectViewport = ({ children, ...props }) => React.createElement('div', props, children);
const SelectGroup = ({ children, ...props }) => React.createElement('div', { ...props, role: 'group' }, children);
const SelectLabel = ({ children, ...props }) => React.createElement('div', { ...props, role: 'label' }, children);
const SelectSeparator = (props) => React.createElement('hr', { ...props, role: 'separator' });
const SelectScrollUpButton = ({ children, ...props }) => React.createElement('button', { ...props, type: 'button' }, children);
const SelectScrollDownButton = ({ children, ...props }) => React.createElement('button', { ...props, type: 'button' }, children);

// Export all components
module.exports = {
  Root: Select,
  Select,
  Trigger: SelectTrigger,
  SelectTrigger,
  Value: SelectValue,
  SelectValue,
  Content: SelectContent,
  SelectContent,
  Item: SelectItem,
  SelectItem,
  ItemText: SelectItemText,
  SelectItemText,
  Portal: SelectPortal,
  SelectPortal,
  Viewport: SelectViewport,
  SelectViewport,
  Group: SelectGroup,
  SelectGroup,
  Label: SelectLabel,
  SelectLabel,
  Separator: SelectSeparator,
  SelectSeparator,
  ScrollUpButton: SelectScrollUpButton,
  SelectScrollUpButton,
  ScrollDownButton: SelectScrollDownButton,
  SelectScrollDownButton,
};