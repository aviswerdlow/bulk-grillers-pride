import React from 'react';

// Avatar Root component
const Root = React.forwardRef(({ children, ...props }, ref) => (
  <div ref={ref} data-testid="avatar-root" {...props}>
    {children}
  </div>
));
Root.displayName = 'Avatar.Root';

// Avatar Image component
const Image = React.forwardRef((props, ref) => (
  <img ref={ref} data-testid="avatar-image" {...props} />
));
Image.displayName = 'Avatar.Image';

// Avatar Fallback component
const Fallback = React.forwardRef(({ children, ...props }, ref) => (
  <div ref={ref} data-testid="avatar-fallback" {...props}>
    {children}
  </div>
));
Fallback.displayName = 'Avatar.Fallback';

// Export both named and as an object with components
export const Avatar = {
  Root,
  Image,
  Fallback,
};

export {
  Root,
  Image,
  Fallback,
};

// Default export
export default Avatar;