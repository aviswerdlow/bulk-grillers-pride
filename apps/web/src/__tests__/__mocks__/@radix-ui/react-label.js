// Mock for @radix-ui/react-label
// eslint-disable-next-line @typescript-eslint/no-require-imports
const React = require('react');

// Label component that forwards ref and renders a label element
const Label = React.forwardRef(({ children, asChild, ...props }, ref) => {
  if (asChild) {
    const child = React.Children.only(children);
    return React.cloneElement(child, { ...props, ref });
  }
  
  return React.createElement('label', { ...props, ref }, children);
});

Label.displayName = 'Label';

// Export both named and default exports for compatibility
module.exports = Label;
module.exports.Label = Label;
module.exports.Root = Label;