// Mock for @radix-ui/react-select
const Select = ({ children, onValueChange, value, defaultValue }) => {
  const mockOnChange = onValueChange || jest.fn();
  return (
    <div data-testid="select-root" data-value={value || defaultValue}>
      {children}
    </div>
  );
};

const SelectTrigger = ({ children, className }) => (
  <button className={className} data-testid="select-trigger">
    {children}
  </button>
);

const SelectValue = ({ placeholder }) => (
  <span data-testid="select-value">{placeholder}</span>
);

const SelectContent = ({ children, className }) => (
  <div className={className} data-testid="select-content">
    {children}
  </div>
);

const SelectItem = ({ children, value, className }) => (
  <div className={className} data-testid={`select-item-${value}`} data-value={value}>
    {children}
  </div>
);

const SelectGroup = ({ children }) => children;
const SelectLabel = ({ children }) => <div>{children}</div>;
const SelectSeparator = () => <hr />;

module.exports = {
  Root: Select,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Content: SelectContent,
  Item: SelectItem,
  Group: SelectGroup,
  Label: SelectLabel,
  Separator: SelectSeparator,
};