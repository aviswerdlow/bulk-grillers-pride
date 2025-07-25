import React from 'react';

export const Checkbox = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean; onCheckedChange?: (checked: boolean) => void }
>(({ checked = false, onCheckedChange, ...props }, ref) => (
  <button
    ref={ref}
    role="checkbox"
    aria-checked={checked}
    data-testid="checkbox"
    onClick={() => onCheckedChange?.(!checked)}
    {...props}
  />
));
Checkbox.displayName = 'Checkbox';