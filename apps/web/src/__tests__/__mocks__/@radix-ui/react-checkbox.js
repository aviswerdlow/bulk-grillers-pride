// Mock for @radix-ui/react-checkbox
const React = require('react');

// Checkbox component
const Checkbox = React.forwardRef(({ checked, defaultChecked, onCheckedChange, disabled, children, ...props }, ref) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked || false);
  const isChecked = checked !== undefined ? checked : internalChecked;
  
  const handleChange = React.useCallback((e) => {
    const newChecked = e.target.checked;
    if (checked === undefined) {
      setInternalChecked(newChecked);
    }
    onCheckedChange?.(newChecked);
  }, [checked, onCheckedChange]);
  
  return React.createElement(
    'button',
    {
      ...props,
      ref,
      type: 'button',
      role: 'checkbox',
      'aria-checked': isChecked,
      'data-state': isChecked ? 'checked' : 'unchecked',
      disabled,
      onClick: disabled ? undefined : () => handleChange({ target: { checked: !isChecked } }),
    },
    children
  );
});

Checkbox.displayName = 'Checkbox';

// Indicator component
const CheckboxIndicator = React.forwardRef(({ children, ...props }, ref) => {
  return React.createElement('span', { ...props, ref }, children);
});

CheckboxIndicator.displayName = 'CheckboxIndicator';

// Export both named and default exports
module.exports = Checkbox;
module.exports.Checkbox = Checkbox;
module.exports.Root = Checkbox;
module.exports.Indicator = CheckboxIndicator;
module.exports.CheckboxIndicator = CheckboxIndicator;