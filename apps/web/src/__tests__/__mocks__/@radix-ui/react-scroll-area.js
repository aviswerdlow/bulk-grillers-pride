// Mock for @radix-ui/react-scroll-area
// eslint-disable-next-line @typescript-eslint/no-require-imports
const React = require('react');

// ScrollArea component
const ScrollArea = React.forwardRef(({ children, className, ...props }, ref) => {
  return React.createElement(
    'div',
    {
      ...props,
      ref,
      className: `scrollarea-root ${className || ''}`,
      style: { overflow: 'auto', ...props.style },
      'data-testid': 'scroll-area'
    },
    children
  );
});

ScrollArea.displayName = 'ScrollArea';

// Viewport component
const ScrollAreaViewport = React.forwardRef(({ children, ...props }, ref) => {
  return React.createElement(
    'div',
    { ...props, ref, className: 'scrollarea-viewport', 'data-testid': 'scroll-area-viewport' },
    children
  );
});

ScrollAreaViewport.displayName = 'ScrollAreaViewport';

// Scrollbar components
const ScrollAreaScrollbar = React.forwardRef(({ orientation = 'vertical', children, ...props }, ref) => {
  return React.createElement(
    'div',
    {
      ...props,
      ref,
      className: `scrollarea-scrollbar scrollarea-scrollbar-${orientation}`,
      'data-orientation': orientation,
      'data-testid': `scroll-area-scrollbar-${orientation}`
    },
    children
  );
});

ScrollAreaScrollbar.displayName = 'ScrollAreaScrollbar';

const ScrollAreaThumb = React.forwardRef((props, ref) => {
  return React.createElement('div', {
    ...props,
    ref,
    className: 'scrollarea-thumb',
    'data-testid': 'scroll-area-thumb'
  });
});

ScrollAreaThumb.displayName = 'ScrollAreaThumb';

const ScrollAreaCorner = React.forwardRef((props, ref) => {
  return React.createElement('div', {
    ...props,
    ref,
    className: 'scrollarea-corner',
    'data-testid': 'scroll-area-corner'
  });
});

ScrollAreaCorner.displayName = 'ScrollAreaCorner';

// Export all components
module.exports = {
  Root: ScrollArea,
  ScrollArea,
  Viewport: ScrollAreaViewport,
  ScrollAreaViewport,
  Scrollbar: ScrollAreaScrollbar,
  ScrollAreaScrollbar,
  Thumb: ScrollAreaThumb,
  ScrollAreaThumb,
  Corner: ScrollAreaCorner,
  ScrollAreaCorner,
};