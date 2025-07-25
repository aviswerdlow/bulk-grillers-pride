import React from 'react';

// Mock Popover components
interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Popover = ({ children, open, onOpenChange }: PopoverProps) => {
  const [isOpen, setIsOpen] = React.useState(open || false);

  React.useEffect(() => {
    setIsOpen(open || false);
  }, [open]);

  return (
    <div data-testid="popover" data-open={isOpen}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { isOpen, setIsOpen, onOpenChange });
        }
        return child;
      })}
    </div>
  );
};

export const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isOpen?: boolean;
    setIsOpen?: (open: boolean) => void;
    onOpenChange?: (open: boolean) => void;
    asChild?: boolean;
  }
>(({ children, onClick, isOpen, setIsOpen, onOpenChange, asChild, ...props }, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const newState = !isOpen;
    setIsOpen?.(newState);
    onOpenChange?.(newState);
    onClick?.(e);
  };

  if (asChild && React.isValidElement(children)) {
    // Clone the child element and add the trigger props
    const childProps = (children as React.ReactElement).props || {};
    return React.cloneElement(children as React.ReactElement, {
      ...props,
      ...childProps,
      ref,
      onClick: handleClick,
      'aria-expanded': isOpen,
      'aria-haspopup': 'true',
      'data-testid': 'popover-trigger',
    });
  }

  return (
    <button
      ref={ref}
      data-testid="popover-trigger"
      onClick={handleClick}
      aria-expanded={isOpen}
      aria-haspopup="true"
      {...props}
    >
      {children}
    </button>
  );
});
PopoverTrigger.displayName = 'PopoverTrigger';

export const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { isOpen?: boolean }
>(({ children, isOpen, ...props }, ref) => {
  if (!isOpen) return null;

  return (
    <div ref={ref} data-testid="popover-content" role="dialog" {...props}>
      {children}
    </div>
  );
});
PopoverContent.displayName = 'PopoverContent';
