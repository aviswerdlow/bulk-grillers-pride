// Mock for @radix-ui/react-dropdown-menu
const React = require('react');

const DropdownMenu = ({ children }) => children;
const DropdownMenuTrigger = ({ children, asChild }) => {
  if (asChild) {
    return React.cloneElement(children, {
      'data-state': 'closed',
    });
  }
  return children;
};

const DropdownMenuContent = ({ children }) => {
  return React.createElement('div', { role: 'menu' }, children);
};

const DropdownMenuItem = ({ children, onClick, disabled }) => {
  return React.createElement(
    'div',
    { 
      role: 'menuitem',
      onClick: disabled ? undefined : onClick,
      'aria-disabled': disabled,
      style: { cursor: disabled ? 'not-allowed' : 'pointer' }
    },
    children
  );
};

const DropdownMenuSeparator = () => React.createElement('hr', { role: 'separator' });

const DropdownMenuLabel = ({ children }) => {
  return React.createElement('div', { role: 'label' }, children);
};

const DropdownMenuGroup = ({ children }) => children;
const DropdownMenuShortcut = ({ children }) => {
  return React.createElement('span', { className: 'ml-auto text-xs' }, children);
};

const DropdownMenuSub = ({ children }) => children;
const DropdownMenuSubTrigger = ({ children }) => children;
const DropdownMenuSubContent = ({ children }) => children;
const DropdownMenuRadioGroup = ({ children }) => children;
const DropdownMenuRadioItem = ({ children }) => children;
const DropdownMenuCheckboxItem = ({ children }) => children;
const DropdownMenuPortal = ({ children }) => children;

module.exports = {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuPortal,
};