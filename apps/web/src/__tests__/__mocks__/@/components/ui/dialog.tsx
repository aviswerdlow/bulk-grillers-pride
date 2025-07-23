import React from 'react';

export const Dialog = ({ children, open, defaultOpen }) => open || defaultOpen ? children : null;
export const DialogTrigger = ({ children }) => children;
export const DialogContent = ({ children }) => <div role="dialog">{children}</div>;
export const DialogHeader = ({ children }) => children;
export const DialogTitle = ({ children }) => <h2>{children}</h2>;
export const DialogDescription = ({ children }) => <p>{children}</p>;
export const DialogFooter = ({ children }) => children;
export const DialogClose = ({ children }) => <button>{children}</button>;
export const DialogPortal = ({ children }) => children;
export const DialogOverlay = ({ children }) => children;