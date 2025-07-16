const React = require('react');

// Mock @radix-ui/react-label
module.exports = {
  Root: ({ children, ...props }) => React.createElement('label', { ...props }, children),
};
