import React from 'react';

// Create a generic component factory
const createComponent = (displayName, element = 'div') => {
  const Component = React.forwardRef(({ children, ...props }, ref) =>
    React.createElement(
      element,
      { ...props, ref, 'data-testid': displayName.toLowerCase() },
      children
    )
  );
  Component.displayName = displayName;
  return Component;
};

// Mock Command component and its subcomponents
const Command = createComponent('Command');
Command.displayName = 'Command';

// Create Input with proper displayName
const Input = createComponent('CommandInput', 'input');
Input.displayName = 'CommandInput';

// Create List with proper displayName
const List = createComponent('CommandList');
List.displayName = 'CommandList';

// Create other components
const Empty = createComponent('CommandEmpty');
Empty.displayName = 'CommandEmpty';

const Group = createComponent('CommandGroup');
Group.displayName = 'CommandGroup';

const Item = createComponent('CommandItem');
Item.displayName = 'CommandItem';

const Separator = createComponent('CommandSeparator');
Separator.displayName = 'CommandSeparator';

const Loading = createComponent('CommandLoading');
Loading.displayName = 'CommandLoading';

// Attach subcomponents to Command
Command.Input = Input;
Command.List = List;
Command.Empty = Empty;
Command.Group = Group;
Command.Item = Item;
Command.Separator = Separator;
Command.Loading = Loading;

// Export as both default and named export
export { Command };
export default Command;
