import React, { PropsWithChildren } from 'react';

interface DialogProps extends PropsWithChildren {
  open?: boolean;
  defaultOpen?: boolean;
}

export const Dialog = ({ children, open, defaultOpen }: DialogProps) => open || defaultOpen ? children : null;
export const DialogTrigger = ({ children }: PropsWithChildren) => children;
export const DialogContent = ({ children }: PropsWithChildren) => <div role="dialog">{children}</div>;
export const DialogHeader = ({ children }: PropsWithChildren) => children;
export const DialogTitle = ({ children }: PropsWithChildren) => <h2>{children}</h2>;
export const DialogDescription = ({ children }: PropsWithChildren) => <p>{children}</p>;
export const DialogFooter = ({ children }: PropsWithChildren) => children;
export const DialogClose = ({ children }: PropsWithChildren) => <button>{children}</button>;
export const DialogPortal = ({ children }: PropsWithChildren) => children;
export const DialogOverlay = ({ children }: PropsWithChildren) => children;