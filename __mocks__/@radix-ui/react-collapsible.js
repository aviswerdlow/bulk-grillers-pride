// Mock for @radix-ui/react-collapsible
const Collapsible = ({ children, open, defaultOpen }) => (
  <div data-testid="collapsible-root" data-state={open || defaultOpen ? "open" : "closed"}>
    {children}
  </div>
);

const CollapsibleTrigger = ({ children, className, asChild }) => {
  if (asChild) {
    return children;
  }
  return (
    <button className={className} data-testid="collapsible-trigger">
      {children}
    </button>
  );
};

const CollapsibleContent = ({ children, className }) => (
  <div className={className} data-testid="collapsible-content">
    {children}
  </div>
);

module.exports = {
  Root: Collapsible,
  Trigger: CollapsibleTrigger,
  Content: CollapsibleContent,
};