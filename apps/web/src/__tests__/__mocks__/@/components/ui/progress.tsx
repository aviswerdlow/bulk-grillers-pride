import React from 'react';

export const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number; max?: number }
>(({ value = 0, max = 100, className, ...props }, ref) => (
  <div
    ref={ref}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={max}
    aria-valuenow={value}
    data-testid="progress"
    className={className}
    {...props}
  >
    <div
      data-testid="progress-indicator"
      style={{ width: `${(value / max) * 100}%` }}
    />
  </div>
));
Progress.displayName = 'Progress';