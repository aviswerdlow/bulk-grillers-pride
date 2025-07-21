import React from 'react';

// Mock all lucide-react icons
const handler = {
  get: (target, prop) => {
    // Return a mock component for any icon
    const iconName = prop.toString();
    return ({ className, ...props }) => React.createElement('svg', { 
      className: `lucide-${iconName.toLowerCase()} ${className || ''}`.trim(), 
      ...props 
    });
  },
};

const lucideReactProxy = new Proxy({}, handler);
export default lucideReactProxy;

// Also export as named exports
export const ChevronRight = handler.get({}, 'ChevronRight');
export const Plus = handler.get({}, 'Plus');
export const Search = handler.get({}, 'Search');
export const Trash = handler.get({}, 'Trash');
export const X = handler.get({}, 'X');