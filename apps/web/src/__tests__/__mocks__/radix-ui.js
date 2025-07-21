const React = require('react');

// Generic mock for all Radix UI components
module.exports = new Proxy(
  {},
  {
    get: (target, prop) => {
      // Handle specific components
      switch (prop) {
        case 'react-avatar':
          return {
            Root: ({ children }) => React.createElement('div', null, children),
            Image: ({ src, alt }) => React.createElement('img', { src, alt }),
            Fallback: ({ children }) => React.createElement('div', null, children),
          };
        case 'react-dropdown-menu':
          return {
            Root: ({ children }) => React.createElement('div', null, children),
            Trigger: ({ children, asChild }) => {
              if (asChild && React.isValidElement(children)) {
                return React.cloneElement(children);
              }
              return React.createElement('button', null, children);
            },
            Content: ({ children }) => React.createElement('div', null, children),
            Label: ({ children }) => React.createElement('div', null, children),
            Separator: () => React.createElement('hr'),
            Item: ({ children, onClick }) =>
              React.createElement('div', { role: 'menuitem', onClick }, children),
          };
        case 'react-select':
          return {
            Root: ({ children }) => React.createElement('div', null, children),
            Trigger: ({ children }) => React.createElement('div', { role: 'combobox' }, children),
            Value: ({ children }) => React.createElement('div', null, children),
            Content: ({ children }) => React.createElement('div', null, children),
            Item: ({ children, value }) =>
              React.createElement('div', { role: 'option', 'data-value': value }, children),
            ItemText: ({ children }) => React.createElement('span', null, children),
            Viewport: ({ children }) => React.createElement('div', null, children),
          };
        case 'react-dialog':
          return {
            Root: ({ children }) => React.createElement('div', null, children),
            Trigger: ({ children }) => React.createElement('button', null, children),
            Portal: ({ children }) => children,
            Overlay: ({ children }) => React.createElement('div', null, children),
            Content: ({ children }) => React.createElement('div', null, children),
            Title: ({ children }) => React.createElement('h2', null, children),
            Description: ({ children }) => React.createElement('p', null, children),
          };
        case 'react-slot':
          return {
            Slot: ({ children }) => children,
          };
        default:
          // Return a generic mock for unknown components
          return {
            Root: ({ children }) => React.createElement('div', null, children),
            Content: ({ children }) => React.createElement('div', null, children),
            Trigger: ({ children }) => React.createElement('button', null, children),
          };
      }
    },
  }
);
