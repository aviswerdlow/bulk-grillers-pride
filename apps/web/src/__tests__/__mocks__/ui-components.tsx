import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
}

// Mock Button component
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant = 'default', size = 'default', disabled, loading, onClick, ...props }, ref) => (
    <button
      ref={ref}
      className={className}
      data-variant={variant}
      data-size={size}
      data-loading={loading}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = 'Button';

type CardProps = React.HTMLAttributes<HTMLDivElement>

// Mock Card components
export const Card = ({ children, className, ...props }: CardProps) => (
  <div className={className} data-slot="card" {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className, ...props }: CardProps) => (
  <div className={className} data-slot="card-header" {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className, ...props }: CardProps) => (
  <h3 className={className} data-slot="card-title" {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className, ...props }: CardProps) => (
  <p className={className} data-slot="card-description" {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className, ...props }: CardProps) => (
  <div className={className} data-slot="card-content" {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className, ...props }: CardProps) => (
  <div className={className} data-slot="card-footer" {...props}>
    {children}
  </div>
);

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

// Mock Input component
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={className} {...props} />
  )
);
Input.displayName = 'Input';

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

// Mock Label component
export const Label = ({ children, className, htmlFor, ...props }: LabelProps) => (
  <label className={className} htmlFor={htmlFor} {...props}>
    {children}
  </label>
);

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

// Mock Badge component
export const Badge = ({ children, className, variant = 'default', ...props }: BadgeProps) => (
  <span className={className} data-variant={variant} {...props}>
    {children}
  </span>
);

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

// Mock Select components
export const Select = ({ children, value, onValueChange, disabled }: SelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div data-testid="select" data-value={value} data-disabled={disabled}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const childElement = child as React.ReactElement<SelectTriggerProps | SelectContentProps>;
          if (childElement.type === SelectTrigger) {
            return React.cloneElement(childElement, {
              onClick: () => !disabled && setIsOpen(!isOpen),
              'aria-expanded': isOpen,
              'aria-disabled': disabled,
              role: 'combobox',
              value,
            });
          }
          if (childElement.type === SelectContent && isOpen) {
            return React.cloneElement(childElement, {
              onItemSelect: (itemValue: string) => {
                onValueChange?.(itemValue);
                setIsOpen(false);
              },
            });
          }
        }
        return child;
      })}
    </div>
  );
};

type SelectTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export const SelectTrigger = ({ children, className, disabled, ...props }: SelectTriggerProps) => (
  <button className={className} disabled={disabled} type="button" {...props}>
    {children}
  </button>
);

interface SelectContentProps {
  children: React.ReactNode;
  onItemSelect?: (value: string) => void;
}

export const SelectContent = ({ children, onItemSelect }: SelectContentProps) => (
  <div role="listbox">
    {React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        const childElement = child as React.ReactElement<SelectItemProps>;
        if (childElement.type === SelectItem) {
          return React.cloneElement(childElement, { onItemSelect });
        }
      }
      return child;
    })}
  </div>
);

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  onItemSelect?: (value: string) => void;
}

export const SelectItem = ({ children, value, onItemSelect }: SelectItemProps) => (
  <div role="option" aria-selected="false" onClick={() => onItemSelect?.(value)} data-value={value}>
    {children}
  </div>
);

interface SelectValueProps {
  children?: React.ReactNode;
}

export const SelectValue = ({ children }: SelectValueProps) => children || null;

// Mock ScrollUpButton and ScrollDownButton
export const SelectScrollUpButton = () => null;
export const SelectScrollDownButton = () => null;

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Mock Dialog components
export const Dialog = ({ children, open }: DialogProps) => (
  <div data-testid="dialog" data-open={open}>
    {children}
  </div>
);

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogTrigger = ({ children, asChild, ...props }: DialogTriggerProps) => {
  if (asChild && React.isValidElement(children)) {
    const childElement = children as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>;
    return React.cloneElement(childElement, props);
  }
  return <button {...props}>{children}</button>;
};

export const DialogContent = ({ children, className, ...props }: CardProps) => (
  <div className={className} data-testid="dialog-content" {...props}>
    {children}
  </div>
);

export const DialogHeader = ({ children, className, ...props }: CardProps) => (
  <div className={className} data-testid="dialog-header" {...props}>
    {children}
  </div>
);

export const DialogTitle = ({ children, className, ...props }: CardProps) => (
  <h2 className={className} data-testid="dialog-title" {...props}>
    {children}
  </h2>
);

export const DialogDescription = ({ children, className, ...props }: CardProps) => (
  <p className={className} data-testid="dialog-description" {...props}>
    {children}
  </p>
);

export const DialogFooter = ({ children, className, ...props }: CardProps) => (
  <div className={className} data-testid="dialog-footer" {...props}>
    {children}
  </div>
);

type TableProps = React.TableHTMLAttributes<HTMLTableElement>

// Mock Table components
export const Table = ({ children, className, ...props }: TableProps) => (
  <table className={className} {...props}>
    {children}
  </table>
);

type TableSectionProps = React.HTMLAttributes<HTMLTableSectionElement>

export const TableHeader = ({ children, className, ...props }: TableSectionProps) => (
  <thead className={className} {...props}>
    {children}
  </thead>
);

export const TableBody = ({ children, className, ...props }: TableSectionProps) => (
  <tbody className={className} {...props}>
    {children}
  </tbody>
);

type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>

export const TableRow = ({ children, className, ...props }: TableRowProps) => (
  <tr className={className} {...props}>
    {children}
  </tr>
);

type TableCellProps = React.ThHTMLAttributes<HTMLTableCellElement>

export const TableHead = ({ children, className, ...props }: TableCellProps) => (
  <th className={className} {...props}>
    {children}
  </th>
);

type TableDataProps = React.TdHTMLAttributes<HTMLTableCellElement>

export const TableCell = ({ children, className, ...props }: TableDataProps) => (
  <td className={className} {...props}>
    {children}
  </td>
);

interface DropdownMenuProps {
  children: React.ReactNode;
}

// Mock DropdownMenu components
export const DropdownMenu = ({ children }: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div data-testid="dropdown-menu">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const childElement = child as React.ReactElement<DropdownMenuTriggerProps | DropdownMenuContentProps>;
          if (childElement.type === DropdownMenuTrigger) {
            return React.cloneElement(childElement, {
              onClick: () => setIsOpen(!isOpen),
              'aria-expanded': isOpen,
            });
          }
          if (childElement.type === DropdownMenuContent && isOpen) {
            return child;
          }
          if (childElement.type === DropdownMenuContent && !isOpen) {
            return null;
          }
        }
        return child;
      })}
    </div>
  );
};

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = ({ children, asChild, onClick, ...props }: DropdownMenuTriggerProps) => {
  if (asChild && React.isValidElement(children)) {
    const childElement = children as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>;
    return React.cloneElement(childElement, {
      ...props,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        childElement.props.onClick?.(e);
      },
    });
  }
  return <button onClick={onClick} {...props}>{children}</button>;
};

export const DropdownMenuContent = ({ children, ...props }: CardProps) => (
  <div data-testid="dropdown-menu-content" {...props}>
    {children}
  </div>
);

type DropdownMenuItemProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export const DropdownMenuItem = ({ children, onClick, ...props }: DropdownMenuItemProps) => (
  <button data-testid="dropdown-menu-item" onClick={onClick} {...props}>
    {children}
  </button>
);

export const DropdownMenuLabel = ({ children, ...props }: CardProps) => (
  <div data-testid="dropdown-menu-label" {...props}>
    {children}
  </div>
);

export const DropdownMenuSeparator = () => <hr data-testid="dropdown-menu-separator" />;

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

// Mock Tabs components
export const Tabs = ({ children, defaultValue, value, onValueChange, ...props }: TabsProps) => {
  const [activeTab, setActiveTab] = React.useState(value || defaultValue);
  
  return (
    <div data-testid="tabs" data-value={activeTab} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const childElement = child as React.ReactElement<TabsListProps | TabsContentProps>;
          if (childElement.type === TabsList || childElement.type === TabsContent) {
            return React.cloneElement(childElement, {
              activeTab,
              onTabChange: (newValue: string) => {
                setActiveTab(newValue);
                onValueChange?.(newValue);
              },
            });
          }
        }
        return child;
      })}
    </div>
  );
};

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

export const TabsList = ({ children, activeTab, onTabChange, ...props }: TabsListProps) => (
  <div data-testid="tabs-list" {...props}>
    {React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        const childElement = child as React.ReactElement<TabsTriggerProps>;
        if (childElement.type === TabsTrigger) {
          return React.cloneElement(childElement, { activeTab, onTabChange });
        }
      }
      return child;
    })}
  </div>
);

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

export const TabsTrigger = ({ children, value, activeTab, onTabChange, ...props }: TabsTriggerProps) => (
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

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  activeTab?: string;
}

export const TabsContent = ({ children, value, activeTab, ...props }: TabsContentProps) => {
  if (activeTab !== value) return null;
  return (
    <div data-testid="tabs-content" data-value={value} {...props}>
      {children}
    </div>
  );
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

// Mock Alert components
export const Alert = ({ children, className, variant = 'default', ...props }: AlertProps) => (
  <div className={className} data-variant={variant} role="alert" {...props}>
    {children}
  </div>
);

export const AlertTitle = ({ children, className, ...props }: CardProps) => (
  <h5 className={className} {...props}>
    {children}
  </h5>
);

export const AlertDescription = ({ children, className, ...props }: CardProps) => (
  <div className={className} {...props}>
    {children}
  </div>
);

// Mock Skeleton component
export const Skeleton = ({ className, ...props }: CardProps) => (
  <div className={className} data-testid="skeleton" {...props} />
);

// Mock lucide-react icons that are used in Select
export const ChevronUpIcon = () => null;
export const ChevronDownIcon = () => null;
export const CheckIcon = () => null;
