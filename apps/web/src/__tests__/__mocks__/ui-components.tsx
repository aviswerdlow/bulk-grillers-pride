import React from 'react';

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

// Mock lucide-react icons that are used in Select
export const ChevronUpIcon = () => null;
export const ChevronDownIcon = () => null;
export const CheckIcon = () => null;
