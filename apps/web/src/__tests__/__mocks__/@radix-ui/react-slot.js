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

// Slottable component - just renders children
const Slottable = ({ children }) => children;

// Create slot function for compatibility with @radix-ui/react-primitive
const createSlot = (name) => {
  const SlotComponent = React.forwardRef(({ children, ...props }, ref) => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        ...children.props,
        ref,
      });
    }
    return children;
  });
  SlotComponent.displayName = name;
  return SlotComponent;
};

module.exports = {
  Slot,
  Slottable,
  createSlot,
};