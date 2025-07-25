import React from 'react';

export const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: string; onValueChange?: (value: string) => void }
>(({ children, ...props }, ref) => (
  <div ref={ref} role="radiogroup" data-testid="radio-group" {...props}>
    {children}
  </div>
));
RadioGroup.displayName = 'RadioGroup';

export const RadioGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ value, ...props }, ref) => (
  <button
    ref={ref}
    role="radio"
    data-testid={`radio-item-${value}`}
    aria-checked="false"
    {...props}
  />
));
RadioGroupItem.displayName = 'RadioGroupItem';