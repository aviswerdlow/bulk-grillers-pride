import React from 'react';

// RadioGroup Root component
const Root = React.forwardRef(({ children, ...props }, ref) => {
  return React.createElement(
    'div',
    { ...props, ref, 'data-testid': 'radiogrouproot', role: 'radiogroup' },
    children
  );
});
Root.displayName = 'RadioGroupRoot';

// RadioGroup Item component
const Item = React.forwardRef(({ children, ...props }, ref) => {
  return React.createElement(
    'button',
    { 
      ...props, 
      ref, 
      'data-testid': 'radiogroupitem',
      role: 'radio',
      type: 'button',
      'aria-checked': props.checked || false
    },
    children
  );
});
Item.displayName = 'RadioGroupItem';

// RadioGroup Indicator component
const Indicator = React.forwardRef(({ children, ...props }, ref) => {
  return React.createElement(
    'span',
    { ...props, ref, 'data-testid': 'radiogroupindicator' },
    children
  );
});
Indicator.displayName = 'RadioGroupIndicator';

// Export all components
export { Root, Item, Indicator };

// Also export as default
export default { Root, Item, Indicator };