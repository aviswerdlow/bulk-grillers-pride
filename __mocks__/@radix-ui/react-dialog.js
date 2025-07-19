// Mock for @radix-ui/react-dialog
const Dialog = ({ children, open }) => open ? children : null;
const DialogTrigger = ({ children, asChild }) => children;
const DialogContent = ({ children, className }) => (
  <div className={className} data-testid="dialog-content">
    {children}
  </div>
);
const DialogHeader = ({ children, className }) => (
  <div className={className} data-testid="dialog-header">
    {children}
  </div>
);
const DialogTitle = ({ children, className }) => (
  <h2 className={className} data-testid="dialog-title">
    {children}
  </h2>
);
const DialogDescription = ({ children, className }) => (
  <p className={className} data-testid="dialog-description">
    {children}
  </p>
);
const DialogFooter = ({ children, className }) => (
  <div className={className} data-testid="dialog-footer">
    {children}
  </div>
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