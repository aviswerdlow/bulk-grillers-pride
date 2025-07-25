import React from 'react';

const Progress = React.forwardRef(({ children, className, value, max = 100, ...props }, ref) => {
  const percentage = value ? Math.round((value / max) * 100) : 0;
  
  return React.createElement(
    'div',
    {
      ref,
      className,
      'data-testid': 'progress-root',
      'aria-valuemax': max,
      'aria-valuemin': 0,
      'aria-valuenow': value,
      'aria-valuetext': `${percentage}%`,
      role: 'progressbar',
      ...props,
    },
    children
  );
});

const ProgressIndicator = React.forwardRef(({ className, style, ...props }, ref) => {
  return React.createElement('div', {
    ref,
    className,
    style,
    'data-testid': 'progress-indicator',
    ...props,
  });
});

Progress.displayName = 'Progress';
ProgressIndicator.displayName = 'ProgressIndicator';

export {
  Progress as Root,
  Progress,
  ProgressIndicator as Indicator,
  ProgressIndicator,
};