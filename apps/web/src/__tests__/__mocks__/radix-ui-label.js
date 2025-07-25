import React from 'react';

// Mock @radix-ui/react-label
export const Root = ({ children, ...props }) => React.createElement('label', { ...props }, children);

const Label = { Root };
export default Label;