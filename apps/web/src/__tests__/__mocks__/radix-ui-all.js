import React from 'react';

// Create a generic component factory
const createComponent = (displayName, element = 'div') => {
  const Component = React.forwardRef(({ children, asChild, ...props }, ref) => {
    // Handle asChild prop - when true, render the child with merged props
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        ...children.props,
        ref,
      });
    }

    return React.createElement(
      element,
      { ...props, ref, 'data-testid': displayName.toLowerCase() },
      children
    );
  });
  Component.displayName = displayName;
  return Component;
};

// Create a Portal component that just renders children
const Portal = ({ children }) => children;
Portal.displayName = 'Portal';

// Dialog components
const DialogRoot = createComponent('DialogRoot');
const DialogTrigger = createComponent('DialogTrigger', 'button');
const DialogPortal = Portal;
const DialogOverlay = createComponent('DialogOverlay');
const DialogContent = createComponent('DialogContent');
const DialogHeader = createComponent('DialogHeader');
const DialogFooter = createComponent('DialogFooter');
const DialogTitle = createComponent('DialogTitle', 'h2');
const DialogDescription = createComponent('DialogDescription', 'p');
const DialogClose = createComponent('DialogClose', 'button');

// Popover components
const PopoverRoot = createComponent('PopoverRoot');
const PopoverTrigger = createComponent('PopoverTrigger', 'button');
const PopoverPortal = Portal;
const PopoverContent = createComponent('PopoverContent');
const PopoverAnchor = createComponent('PopoverAnchor');

// ScrollArea components
const ScrollAreaRoot = createComponent('ScrollAreaRoot');
const ScrollAreaViewport = createComponent('ScrollAreaViewport');
const ScrollAreaScrollbar = createComponent('ScrollAreaScrollbar');
const ScrollAreaThumb = createComponent('ScrollAreaThumb');
const ScrollAreaCorner = createComponent('ScrollAreaCorner');

// Label component
const LabelRoot = createComponent('Label', 'label');

// Select components
const SelectRoot = createComponent('SelectRoot');
const SelectTrigger = createComponent('SelectTrigger', 'button');
const SelectContent = createComponent('SelectContent');
const SelectItem = createComponent('SelectItem');
const SelectValue = createComponent('SelectValue');
const SelectScrollUpButton = createComponent('SelectScrollUpButton', 'button');
const SelectScrollDownButton = createComponent('SelectScrollDownButton', 'button');
const SelectItemText = createComponent('SelectItemText');
const SelectLabel = createComponent('SelectLabel');
const SelectSeparator = createComponent('SelectSeparator');
const SelectPortal = Portal;
const SelectViewport = createComponent('SelectViewport');
const SelectGroup = createComponent('SelectGroup');
const SelectIcon = createComponent('SelectIcon');

// Checkbox components
const CheckboxRoot = createComponent('CheckboxRoot', 'button');
const CheckboxIndicator = createComponent('CheckboxIndicator');

// RadioGroup components
const RadioGroupRoot = createComponent('RadioGroupRoot');
const RadioGroupItem = createComponent('RadioGroupItem');
const RadioGroupIndicator = createComponent('RadioGroupIndicator');

// Switch components
const SwitchRoot = createComponent('SwitchRoot', 'button');
const SwitchThumb = createComponent('SwitchThumb');

// Separator component
const SeparatorRoot = createComponent('Separator');

// Toggle components
const ToggleRoot = createComponent('Toggle', 'button');
const ToggleGroupRoot = createComponent('ToggleGroup');
const ToggleGroupItem = createComponent('ToggleGroupItem', 'button');

// Dropdown Menu components
const DropdownMenuRoot = createComponent('DropdownMenuRoot');
const DropdownMenuTrigger = createComponent('DropdownMenuTrigger', 'button');
const DropdownMenuContent = createComponent('DropdownMenuContent');
const DropdownMenuItem = createComponent('DropdownMenuItem');
const DropdownMenuCheckboxItem = createComponent('DropdownMenuCheckboxItem');
const DropdownMenuRadioGroup = createComponent('DropdownMenuRadioGroup');
const DropdownMenuRadioItem = createComponent('DropdownMenuRadioItem');
const DropdownMenuItemIndicator = createComponent('DropdownMenuItemIndicator');
const DropdownMenuLabel = createComponent('DropdownMenuLabel');
const DropdownMenuSeparator = createComponent('DropdownMenuSeparator');
const DropdownMenuSub = createComponent('DropdownMenuSub');
const DropdownMenuSubContent = createComponent('DropdownMenuSubContent');
const DropdownMenuSubTrigger = createComponent('DropdownMenuSubTrigger', 'button');
const DropdownMenuPortal = Portal;

// Avatar components
const AvatarRoot = createComponent('AvatarRoot');
const AvatarImage = createComponent('AvatarImage', 'img');
const AvatarFallback = createComponent('AvatarFallback');

// Tooltip components
const TooltipProvider = ({ children }) => children;
const TooltipRoot = createComponent('TooltipRoot');
const TooltipTrigger = createComponent('TooltipTrigger', 'button');
const TooltipContent = createComponent('TooltipContent');
const TooltipPortal = Portal;

// Tabs components
const TabsRoot = createComponent('TabsRoot');
const TabsList = createComponent('TabsList');
const TabsTrigger = createComponent('TabsTrigger', 'button');
const TabsContent = createComponent('TabsContent');

// Collapsible components
const CollapsibleRoot = createComponent('CollapsibleRoot');
const CollapsibleTrigger = createComponent('CollapsibleTrigger', 'button');
const CollapsibleContent = createComponent('CollapsibleContent');

// AlertDialog components
const AlertDialogRoot = createComponent('AlertDialogRoot');
const AlertDialogTrigger = createComponent('AlertDialogTrigger', 'button');
const AlertDialogPortal = Portal;
const AlertDialogOverlay = createComponent('AlertDialogOverlay');
const AlertDialogContent = createComponent('AlertDialogContent');
const AlertDialogHeader = createComponent('AlertDialogHeader');
const AlertDialogFooter = createComponent('AlertDialogFooter');
const AlertDialogTitle = createComponent('AlertDialogTitle', 'h2');
const AlertDialogDescription = createComponent('AlertDialogDescription', 'p');
const AlertDialogAction = createComponent('AlertDialogAction', 'button');
const AlertDialogCancel = createComponent('AlertDialogCancel', 'button');

// Progress components
const ProgressRoot = createComponent('ProgressRoot');
const ProgressIndicator = createComponent('ProgressIndicator');

// Slot component (special)
const Slot = createComponent('Slot');

// Form components
const FormRoot = createComponent('FormRoot', 'form');
const FormField = createComponent('FormField');
const FormItem = createComponent('FormItem');
const FormLabel = createComponent('FormLabel', 'label');
const FormControl = createComponent('FormControl');
const FormDescription = createComponent('FormDescription');
const FormMessage = createComponent('FormMessage');
const FormSubmit = createComponent('FormSubmit', 'button');

// Create namespace exports for each Radix UI package
const dialogExports = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Header: DialogHeader,
  Footer: DialogFooter,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};

const popoverExports = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Portal: PopoverPortal,
  Content: PopoverContent,
  Anchor: PopoverAnchor,
};

const scrollAreaExports = {
  Root: ScrollAreaRoot,
  Viewport: ScrollAreaViewport,
  Scrollbar: ScrollAreaScrollbar,
  Thumb: ScrollAreaThumb,
  Corner: ScrollAreaCorner,
};

const labelExports = {
  Root: LabelRoot,
};

const selectExports = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Content: SelectContent,
  Item: SelectItem,
  Value: SelectValue,
  ScrollUpButton: SelectScrollUpButton,
  ScrollDownButton: SelectScrollDownButton,
  ItemText: SelectItemText,
  Label: SelectLabel,
  Separator: SelectSeparator,
  Portal: SelectPortal,
  Viewport: SelectViewport,
  Group: SelectGroup,
  Icon: SelectIcon,
};

const checkboxExports = {
  Root: CheckboxRoot,
  Indicator: CheckboxIndicator,
};

const radioGroupExports = {
  Root: RadioGroupRoot,
  Item: RadioGroupItem,
  Indicator: RadioGroupIndicator,
};

const switchExports = {
  Root: SwitchRoot,
  Thumb: SwitchThumb,
};

const separatorExports = {
  Root: SeparatorRoot,
};

const toggleExports = {
  Root: ToggleRoot,
};

const toggleGroupExports = {
  Root: ToggleGroupRoot,
  Item: ToggleGroupItem,
};

const dropdownMenuExports = {
  Root: DropdownMenuRoot,
  Trigger: DropdownMenuTrigger,
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
  CheckboxItem: DropdownMenuCheckboxItem,
  RadioGroup: DropdownMenuRadioGroup,
  RadioItem: DropdownMenuRadioItem,
  ItemIndicator: DropdownMenuItemIndicator,
  Label: DropdownMenuLabel,
  Separator: DropdownMenuSeparator,
  Sub: DropdownMenuSub,
  SubContent: DropdownMenuSubContent,
  SubTrigger: DropdownMenuSubTrigger,
  Portal: DropdownMenuPortal,
};

const avatarExports = {
  Root: AvatarRoot,
  Image: AvatarImage,
  Fallback: AvatarFallback,
};

const tooltipExports = {
  Provider: TooltipProvider,
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Portal: TooltipPortal,
};

const tabsExports = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};

const collapsibleExports = {
  Root: CollapsibleRoot,
  Trigger: CollapsibleTrigger,
  Content: CollapsibleContent,
};

const alertDialogExports = {
  Root: AlertDialogRoot,
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  Header: AlertDialogHeader,
  Footer: AlertDialogFooter,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Action: AlertDialogAction,
  Cancel: AlertDialogCancel,
};

const progressExports = {
  Root: ProgressRoot,
  Indicator: ProgressIndicator,
};

const slotExports = {
  Slot: Slot,
};

const formExports = {
  Root: FormRoot,
  Field: FormField,
  Item: FormItem,
  Label: FormLabel,
  Control: FormControl,
  Description: FormDescription,
  Message: FormMessage,
  Submit: FormSubmit,
};

// Main exports object that handles all packages
const allExports = {
  // Dialog exports
  ...dialogExports,
  Dialog: dialogExports,
  // Popover exports
  ...popoverExports,
  Popover: popoverExports,
  // ScrollArea exports
  ...scrollAreaExports,
  ScrollArea: scrollAreaExports,
  // Label exports
  ...labelExports,
  Label: labelExports,
  // Select exports
  ...selectExports,
  Select: selectExports,
  // Checkbox exports
  ...checkboxExports,
  Checkbox: checkboxExports,
  // RadioGroup exports
  ...radioGroupExports,
  RadioGroup: radioGroupExports,
  // Switch exports
  ...switchExports,
  Switch: switchExports,
  // Separator exports
  ...separatorExports,
  Separator: separatorExports,
  // Toggle exports
  ...toggleExports,
  Toggle: toggleExports,
  // ToggleGroup exports
  ...toggleGroupExports,
  ToggleGroup: toggleGroupExports,
  // DropdownMenu exports
  ...dropdownMenuExports,
  DropdownMenu: dropdownMenuExports,
  // Avatar exports
  ...avatarExports,
  Avatar: avatarExports,
  // Tooltip exports
  ...tooltipExports,
  Tooltip: tooltipExports,
  // Tabs exports
  ...tabsExports,
  Tabs: tabsExports,
  // Collapsible exports
  ...collapsibleExports,
  Collapsible: collapsibleExports,
  // AlertDialog exports
  ...alertDialogExports,
  AlertDialog: alertDialogExports,
  // Progress exports
  ...progressExports,
  Progress: progressExports,
  // Slot
  Slot,
  // Form exports
  ...formExports,
  Form: formExports,
};

// Export everything as both default and named exports
export default allExports;

// Also export all individual components as named exports
export {
  // Dialog
  DialogRoot as Root,
  DialogTrigger as Trigger,
  DialogPortal as Portal,
  DialogOverlay as Overlay,
  DialogContent as Content,
  DialogHeader as Header,
  DialogFooter as Footer,
  DialogTitle as Title,
  DialogDescription as Description,
  DialogClose as Close,
  
  // Keep specific exports for backwards compatibility
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  
  // Popover
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  PopoverAnchor,
  
  // ScrollArea
  ScrollAreaRoot,
  ScrollAreaViewport,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaCorner,
  
  // Label
  LabelRoot,
  
  // Other exports
  Slot,
  Portal,
};

// Also export package-specific namespaces
export {
  dialogExports,
  popoverExports,
  scrollAreaExports,
  labelExports,
  selectExports,
  checkboxExports,
  radioGroupExports,
  switchExports,
  separatorExports,
  toggleExports,
  toggleGroupExports,
  dropdownMenuExports,
  avatarExports,
  tooltipExports,
  tabsExports,
  collapsibleExports,
  alertDialogExports,
  progressExports,
  slotExports,
  formExports,
};