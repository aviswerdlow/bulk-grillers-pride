import React from 'react';

// Mock Button component
export const Button = React.forwardRef<HTMLButtonElement, any>(
  ({ children, className, variant = 'default', size = 'default', disabled, onClick, ...props }, ref) => (
    <button
      ref={ref}
      className={className}
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = 'Button';

// Mock Card components
export const Card = ({ children, className, ...props }: any) => (
  <div className={className} data-slot="card" {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className, ...props }: any) => (
  <div className={className} data-slot="card-header" {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className, ...props }: any) => (
  <h3 className={className} data-slot="card-title" {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className, ...props }: any) => (
  <p className={className} data-slot="card-description" {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className, ...props }: any) => (
  <div className={className} data-slot="card-content" {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className, ...props }: any) => (
  <div className={className} data-slot="card-footer" {...props}>
    {children}
  </div>
);

// Mock Input component
export const Input = React.forwardRef<HTMLInputElement, any>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={className} {...props} />
  )
);
Input.displayName = 'Input';

// Mock Label component
export const Label = ({ children, className, htmlFor, ...props }: any) => (
  <label className={className} htmlFor={htmlFor} {...props}>
    {children}
  </label>
);

// Mock Badge component
export const Badge = ({ children, className, variant = 'default', ...props }: any) => (
  <span className={className} data-variant={variant} {...props}>
    {children}
  </span>
);

// Mock Select components
export const Select = ({ children, value, onValueChange, disabled }: any) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div data-testid="select" data-value={value} data-disabled={disabled}>
      {React.Children.map(children, (child) => {
        if (child?.type === SelectTrigger) {
          return React.cloneElement(child, {
            onClick: () => !disabled && setIsOpen(!isOpen),
            'aria-expanded': isOpen,
            'aria-disabled': disabled,
            role: 'combobox',
            value,
          });
        }
        if (child?.type === SelectContent && isOpen) {
          return React.cloneElement(child, {
            onItemSelect: (itemValue: string) => {
              onValueChange?.(itemValue);
              setIsOpen(false);
            },
          });
        }
        return child;
      })}
    </div>
  );
};

export const SelectTrigger = ({ children, className, disabled, ...props }: any) => (
  <button className={className} disabled={disabled} type="button" {...props}>
    {children}
  </button>
);

export const SelectContent = ({ children, onItemSelect }: any) => (
  <div role="listbox">
    {React.Children.map(children, (child) => {
      if (child?.type === SelectItem) {
        return React.cloneElement(child, { onItemSelect });
      }
      return child;
    })}
  </div>
);

export const SelectItem = ({ children, value, onItemSelect }: any) => (
  <div role="option" onClick={() => onItemSelect?.(value)} data-value={value}>
    {children}
  </div>
);

export const SelectValue = ({ children }: any) => children || null;

// Mock ScrollUpButton and ScrollDownButton
export const SelectScrollUpButton = () => null;
export const SelectScrollDownButton = () => null;

// Mock Dialog components
export const Dialog = ({ children, open, onOpenChange }: any) => (
  <div data-testid="dialog" data-open={open}>
    {children}
  </div>
);

export const DialogTrigger = ({ children, asChild, ...props }: any) => {
  if (asChild) {
    return React.cloneElement(children, props);
  }
  return <button {...props}>{children}</button>;
};

export const DialogContent = ({ children, className, ...props }: any) => (
  <div className={className} data-testid="dialog-content" {...props}>
    {children}
  </div>
);

export const DialogHeader = ({ children, className, ...props }: any) => (
  <div className={className} data-testid="dialog-header" {...props}>
    {children}
  </div>
);

export const DialogTitle = ({ children, className, ...props }: any) => (
  <h2 className={className} data-testid="dialog-title" {...props}>
    {children}
  </h2>
);

export const DialogDescription = ({ children, className, ...props }: any) => (
  <p className={className} data-testid="dialog-description" {...props}>
    {children}
  </p>
);

export const DialogFooter = ({ children, className, ...props }: any) => (
  <div className={className} data-testid="dialog-footer" {...props}>
    {children}
  </div>
);

// Mock Table components
export const Table = ({ children, className, ...props }: any) => (
  <table className={className} {...props}>
    {children}
  </table>
);

export const TableHeader = ({ children, className, ...props }: any) => (
  <thead className={className} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ children, className, ...props }: any) => (
  <tbody className={className} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({ children, className, ...props }: any) => (
  <tr className={className} {...props}>
    {children}
  </tr>
);

export const TableHead = ({ children, className, ...props }: any) => (
  <th className={className} {...props}>
    {children}
  </th>
);

export const TableCell = ({ children, className, ...props }: any) => (
  <td className={className} {...props}>
    {children}
  </td>
);

// Mock DropdownMenu components
export const DropdownMenu = ({ children }: any) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div data-testid="dropdown-menu">
      {React.Children.map(children, (child) => {
        if (child?.type === DropdownMenuTrigger) {
          return React.cloneElement(child, {
            onClick: () => setIsOpen(!isOpen),
            'aria-expanded': isOpen,
          });
        }
        if (child?.type === DropdownMenuContent && isOpen) {
          return child;
        }
        if (child?.type === DropdownMenuContent && !isOpen) {
          return null;
        }
        return child;
      })}
    </div>
  );
};

export const DropdownMenuTrigger = ({ children, asChild, onClick, ...props }: any) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (e: any) => {
        onClick?.(e);
        children.props.onClick?.(e);
      },
    });
  }
  return <button onClick={onClick} {...props}>{children}</button>;
};

export const DropdownMenuContent = ({ children, ...props }: any) => (
  <div data-testid="dropdown-menu-content" {...props}>
    {children}
  </div>
);

export const DropdownMenuItem = ({ children, onClick, ...props }: any) => (
  <button data-testid="dropdown-menu-item" onClick={onClick} {...props}>
    {children}
  </button>
);

export const DropdownMenuLabel = ({ children, ...props }: any) => (
  <div data-testid="dropdown-menu-label" {...props}>
    {children}
  </div>
);

export const DropdownMenuSeparator = () => <hr data-testid="dropdown-menu-separator" />;

// Mock Tabs components
export const Tabs = ({ children, defaultValue, value, onValueChange, ...props }: any) => {
  const [activeTab, setActiveTab] = React.useState(value || defaultValue);
  
  return (
    <div data-testid="tabs" data-value={activeTab} {...props}>
      {React.Children.map(children, (child) => {
        if (child?.type === TabsList || child?.type === TabsContent) {
          return React.cloneElement(child, {
            activeTab,
            onTabChange: (newValue: string) => {
              setActiveTab(newValue);
              onValueChange?.(newValue);
            },
          });
        }
        return child;
      })}
    </div>
  );
};

export const TabsList = ({ children, activeTab, onTabChange, ...props }: any) => (
  <div data-testid="tabs-list" {...props}>
    {React.Children.map(children, (child) => {
      if (child?.type === TabsTrigger) {
        return React.cloneElement(child, { activeTab, onTabChange });
      }
      return child;
    })}
  </div>
);

export const TabsTrigger = ({ children, value, activeTab, onTabChange, ...props }: any) => (
  <button
    data-testid="tabs-trigger"
    data-value={value}
    data-active={activeTab === value}
    onClick={() => onTabChange?.(value)}
    {...props}
  >
    {children}
  </button>
);

export const TabsContent = ({ children, value, activeTab, ...props }: any) => {
  if (activeTab !== value) return null;
  return (
    <div data-testid="tabs-content" data-value={value} {...props}>
      {children}
    </div>
  );
};

// Mock Alert components
export const Alert = ({ children, className, variant = 'default', ...props }: any) => (
  <div className={className} data-variant={variant} role="alert" {...props}>
    {children}
  </div>
);

export const AlertTitle = ({ children, className, ...props }: any) => (
  <h5 className={className} {...props}>
    {children}
  </h5>
);

export const AlertDescription = ({ children, className, ...props }: any) => (
  <div className={className} {...props}>
    {children}
  </div>
);

// Mock Skeleton component
export const Skeleton = ({ className, ...props }: any) => (
  <div className={className} data-testid="skeleton" {...props} />
);

// Mock lucide-react icons that are used in Select
export const ChevronUpIcon = () => null;
export const ChevronDownIcon = () => null;
export const CheckIcon = () => null;
