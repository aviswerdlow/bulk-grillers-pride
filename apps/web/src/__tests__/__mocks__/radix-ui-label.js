import React from 'react';

// Mock @radix-ui/react-label
export const Root = ({ children, ...props }) => React.createElement('label', { ...props }, children);

export default { Root };