import React, { PropsWithChildren } from 'react';

interface AlertProps extends PropsWithChildren {
  variant?: 'default' | 'destructive';
}

export const Alert = ({ children, variant }: AlertProps) => <div role="alert" aria-live={variant === 'destructive' ? 'assertive' : 'polite'}>{children}</div>;
export const AlertTitle = ({ children }: PropsWithChildren) => <h5>{children}</h5>;
export const AlertDescription = ({ children }: PropsWithChildren) => <div>{children}</div>;