// Mock for @radix-ui/react-primitive
const React = require('react');

// Re-export react-slot functionality for compatibility
const { Slot, createSlot } = require('./react-slot');

// Primitive component that renders the appropriate HTML element
const Primitive = React.forwardRef(({ as: Component = 'div', asChild, children, ...props }, ref) => {
  if (asChild) {
    return React.createElement(Slot, { ...props, ref }, children);
  }
  return React.createElement(Component, { ...props, ref }, children);
});

Primitive.displayName = 'Primitive';

// Create primitive components for common HTML elements
const NODES = [
  'a',
  'button',
  'div',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'img',
  'input',
  'label',
  'li',
  'nav',
  'ol',
  'p',
  'span',
  'svg',
  'ul',
];

const PrimitiveNodes = NODES.reduce((acc, node) => {
  const Component = React.forwardRef((props, ref) => {
    return React.createElement(Primitive, { ...props, ref, as: node });
  });
  Component.displayName = `Primitive.${node}`;
  acc[node] = Component;
  return acc;
}, {});

module.exports = {
  Primitive,
  ...PrimitiveNodes,
  // Re-export for compatibility
  Slot,
  createSlot,
};