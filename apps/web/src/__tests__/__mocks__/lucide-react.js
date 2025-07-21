import React from 'react';

// Mock all lucide-react icons
const mockIcons = new Proxy(
  {},
  {
    get: (target, prop) => {
      // Return a mock component for any icon
      const iconName = prop.toString();
      return ({ className, ...props }) => React.createElement('svg', { 
        className: `lucide-${iconName.toLowerCase()} ${className || ''}`.trim(), 
        ...props 
      });
    },
  }
);

export default mockIcons;
