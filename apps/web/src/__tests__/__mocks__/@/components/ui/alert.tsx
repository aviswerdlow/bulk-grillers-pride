import React from 'react';

export const Alert = ({ children, variant }) => <div role="alert" aria-live={variant === 'destructive' ? 'assertive' : 'polite'}>{children}</div>;
export const AlertTitle = ({ children }) => <h5>{children}</h5>;
export const AlertDescription = ({ children }) => <div>{children}</div>;