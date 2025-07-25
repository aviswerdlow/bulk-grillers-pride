// Mock for @radix-ui/react-tabs
const Tabs = ({ children, defaultValue, value, _onValueChange }) => (
  <div data-testid="tabs-root" data-value={value || defaultValue}>
    {children}
  </div>
);

const TabsList = ({ children, className }) => (
  <div className={className} data-testid="tabs-list">
    {children}
  </div>
);

const TabsTrigger = ({ children, value, className }) => (
  <button className={className} data-testid={`tabs-trigger-${value}`} data-value={value}>
    {children}
  </button>
);

const TabsContent = ({ children, value, className }) => (
  <div className={className} data-testid={`tabs-content-${value}`} data-value={value}>
    {children}
  </div>
);

module.exports = {
  Root: Tabs,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};
