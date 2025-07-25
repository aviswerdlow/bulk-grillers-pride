import React from 'react';

// Mock Command component with combobox role
export const Command = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div 
    ref={ref}
    role="combobox"
    aria-expanded="false"
    aria-haspopup="listbox"
    data-testid="command"
    className={className}
    {...props}
  >
    {children}
  </div>
));
Command.displayName = 'Command';

export const CommandDialog = ({ children, ...props }: any) => {
  return (
    <div data-testid="command-dialog" {...props}>
      {children}
    </div>
  );
};

export const CommandInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="text"
    data-testid="command-input"
    className={className}
    {...props}
  />
));
CommandInput.displayName = 'CommandInput';

export const CommandList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div 
    ref={ref}
    role="listbox"
    data-testid="command-list"
    className={className}
    {...props}
  >
    {children}
  </div>
));
CommandList.displayName = 'CommandList';

export const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <div ref={ref} data-testid="command-empty" {...props} />
));
CommandEmpty.displayName = 'CommandEmpty';

export const CommandGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    data-testid="command-group"
    className={className}
    {...props}
  >
    {children}
  </div>
));
CommandGroup.displayName = 'CommandGroup';

export const CommandItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: string }
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    role="option"
    aria-selected="false"
    data-testid="command-item"
    className={className}
    {...props}
  >
    {children}
  </div>
));
CommandItem.displayName = 'CommandItem';

export const CommandSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    data-testid="command-separator"
    className={className}
    {...props}
  />
));
CommandSeparator.displayName = 'CommandSeparator';

export const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      data-testid="command-shortcut"
      className={className}
      {...props}
    />
  );
};
CommandShortcut.displayName = 'CommandShortcut';