import React from 'react';

// Mock all UI components with simple implementations

// Input
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ ...props }, ref) => <input ref={ref} {...props} />
);
Input.displayName = 'Input';

// Textarea
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ ...props }, ref) => <textarea ref={ref} {...props} />
);
Textarea.displayName = 'Textarea';

// Label
export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ htmlFor, ...props }, ref) => <label ref={ref} htmlFor={htmlFor} {...props} />
);
Label.displayName = 'Label';

// Badge
export const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => <span ref={ref} {...props}>{children}</span>
);
Badge.displayName = 'Badge';

// Export everything
const uiComponents = {
  Input,
  Textarea,
  Label,
  Badge,
};

export default uiComponents;