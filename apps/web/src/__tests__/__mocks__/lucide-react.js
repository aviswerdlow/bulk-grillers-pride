import React from 'react';

// Mock all lucide-react icons
const handler = {
  get: (target, prop) => {
    // Return a mock component for any icon
    const iconName = prop.toString();
    return ({ className, ...props }) => React.createElement('svg', { 
      className: `lucide-${iconName.toLowerCase()} ${className || ''}`.trim(),
      'data-testid': iconName.toLowerCase() === 'check' ? 'check-icon' : undefined,
      ...props 
    });
  },
};

const lucideReactProxy = new Proxy({}, handler);
export default lucideReactProxy;

// Also export as named exports
export const ChevronRight = handler.get({}, 'ChevronRight');
export const ChevronDown = handler.get({}, 'ChevronDown');
export const ChevronDownIcon = handler.get({}, 'ChevronDownIcon');
export const ChevronUpIcon = handler.get({}, 'ChevronUpIcon');
export const Check = handler.get({}, 'Check');
export const CheckIcon = handler.get({}, 'CheckIcon');
export const FolderTree = handler.get({}, 'FolderTree');
export const MagnifyingGlassIcon = handler.get({}, 'MagnifyingGlassIcon');
export const Plus = handler.get({}, 'Plus');
export const Search = handler.get({}, 'Search');
export const Tag = handler.get({}, 'Tag');
export const Trash = handler.get({}, 'Trash');
export const X = handler.get({}, 'X');
export const XIcon = handler.get({}, 'XIcon');