// Mock for @radix-ui/react-dialog
const React = require('react');

const Dialog = ({ children, open }) => open ? children : null;
const DialogTrigger = ({ children, asChild }) => children;
const DialogContent = ({ children, className }) => React.createElement(
  'div',
  { className, 'data-testid': 'dialog-content' },
  children
);
const DialogHeader = ({ children, className }) => React.createElement(
  'div',
  { className, 'data-testid': 'dialog-header' },
  children
);
const DialogTitle = ({ children, className }) => React.createElement(
  'h2',
  { className, 'data-testid': 'dialog-title' },
  children
);
const DialogDescription = ({ children, className }) => React.createElement(
  'p',
  { className, 'data-testid': 'dialog-description' },
  children
);
const DialogFooter = ({ children, className }) => React.createElement(
  'div',
  { className, 'data-testid': 'dialog-footer' },
  children
);
const DialogClose = ({ children }) => children;

module.exports = {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Root: Dialog,
  Trigger: DialogTrigger,
  Content: DialogContent,
  Close: DialogClose,
};