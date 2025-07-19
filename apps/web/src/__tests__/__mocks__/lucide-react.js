const React = require('react');

// Mock all lucide-react icons
module.exports = new Proxy(
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
