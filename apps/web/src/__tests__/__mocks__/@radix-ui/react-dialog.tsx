import * as React from 'react';

// Context to share state between Dialog components
interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => {},
});

interface DialogProps extends React.PropsWithChildren {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Dialog = ({ children, open: controlledOpen, defaultOpen = false, onOpenChange, ...props }: DialogProps) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  }, [controlledOpen, onOpenChange]);

  return (
    <DialogContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      <div data-testid="dialog-root" {...props}>
        {children}
      </div>
    </DialogContext.Provider>
  );
};

interface DialogTriggerProps extends React.PropsWithChildren {
  asChild?: boolean;
  [key: string]: any;
}

const DialogTrigger = ({ children, asChild, ...props }: DialogTriggerProps) => {
  const { onOpenChange } = React.useContext(DialogContext);
  
  if (asChild) {
    const child = React.Children.only(children);
    return React.cloneElement(child as React.ReactElement, {
      onClick: (e: React.MouseEvent) => {
        (child as React.ReactElement).props.onClick?.(e);
        onOpenChange(true);
      },
      ...props
    });
  }
  
  return (
    <button
      type="button"
      onClick={() => onOpenChange(true)}
      data-testid="dialog-trigger"
      {...props}
    >
      {children}
    </button>
  );
};

const DialogPortal = ({ children, ...props }: React.PropsWithChildren<any>) => {
  const { open } = React.useContext(DialogContext);
  return open ? <div data-testid="dialog-portal" {...props}>{children}</div> : null;
};

interface DialogOverlayProps extends React.PropsWithChildren {
  className?: string;
  [key: string]: any;
}

const DialogOverlay = ({ children, className, ...props }: DialogOverlayProps) => {
  const { open, onOpenChange } = React.useContext(DialogContext);
  return open ? (
    <div 
      data-testid="dialog-overlay" 
      className={className} 
      onClick={(e) => {
        // Only close if clicking the overlay itself, not children
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
      {...props}
    >
      {children}
    </div>
  ) : null;
};

interface DialogContentProps extends React.PropsWithChildren {
  showCloseButton?: boolean;
  className?: string;
  [key: string]: any;
}

const DialogContent = ({ children, showCloseButton = true, className, ...props }: DialogContentProps) => {
  const { open, onOpenChange } = React.useContext(DialogContext);
  
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onOpenChange]);
  
  if (!open) return null;
  
  // Handle showCloseButton if it's in props
  const shouldShowClose = props.showCloseButton !== undefined ? props.showCloseButton : showCloseButton;
  const { showCloseButton: _, ...restProps } = props; // Remove from props to avoid warning
  
  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      data-testid="dialog-content" 
      className={className}
      {...restProps}
    >
      {shouldShowClose && (
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          data-testid="dialog-close-button"
          data-slot="dialog-close"
          className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        >
          <span aria-hidden="true">×</span>
          <span className="sr-only">Close</span>
        </button>
      )}
      {children}
    </div>
  );
};

interface DialogTitleProps extends React.PropsWithChildren {
  className?: string;
  [key: string]: any;
}

const DialogTitle = ({ children, className, ...props }: DialogTitleProps) => (
  <h2 role="heading" data-testid="dialog-title" className={className} {...props}>{children}</h2>
);

interface DialogDescriptionProps extends React.PropsWithChildren {
  className?: string;
  [key: string]: any;
}

const DialogDescription = ({ children, className, ...props }: DialogDescriptionProps) => (
  <p data-testid="dialog-description" className={className} {...props}>{children}</p>
);

const DialogClose = ({ children, ...props }: React.PropsWithChildren<any>) => {
  const { onOpenChange } = React.useContext(DialogContext);
  
  return (
    <button 
      type="button" 
      onClick={() => onOpenChange(false)}
      data-testid="dialog-close"
      data-slot="dialog-close"
      aria-label="Close"
      {...props}
    >
      {children}
    </button>
  );
};

// Additional components for compatibility
const DialogHeader = ({ children, ...props }: React.PropsWithChildren<any>) => (
  <div data-testid="dialog-header" {...props}>{children}</div>
);

const DialogFooter = ({ children, ...props }: React.PropsWithChildren<any>) => (
  <div data-testid="dialog-footer" {...props}>{children}</div>
);

// Export both named exports and namespaced exports
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
};

// Also export as namespace for compatibility
const DialogPrimitive = {
  Root: Dialog,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Close: DialogClose,
  Title: DialogTitle,
  Description: DialogDescription,
};

export default DialogPrimitive;