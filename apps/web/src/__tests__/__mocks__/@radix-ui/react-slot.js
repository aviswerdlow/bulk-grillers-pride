// Mock for @radix-ui/react-slot
// eslint-disable-next-line @typescript-eslint/no-require-imports
const React = require('react');

// Slot component that merges props and renders children
const Slot = React.forwardRef(({ children, ...props }, ref) => {
  // If children is a single React element, merge props
  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ...children.props,
      ref,
    });
  }
  // Otherwise render children as-is
  return children;
});

Slot.displayName = 'Slot';

module.exports = {
  Slot,
};
