const React = require('react');

// Mock all lucide-react icons
module.exports = new Proxy(
  {},
  {
    get: (target, prop) => {
      // Return a mock component for any icon
      return ({ className, ...props }) => React.createElement('svg', { className, ...props });
    },
  }
);
