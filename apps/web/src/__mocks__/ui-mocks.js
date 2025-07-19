
// Mock all UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }) => <div className={className}>{children}</div>,
  CardDescription: ({ children, className }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }) => <div className={className}>{children}</div>,
  CardFooter: ({ children, className }) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }) => <span className={className}>{children}</span>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }) => <div className={className} role="progressbar" aria-valuenow={value}>{value}%</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props) => <input {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }) => <label {...props}>{children}</label>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }) => <div {...props}>{children}</div>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }) => <button>{children}</button>,
  SelectValue: ({ placeholder }) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, ...props }) => <div {...props}>{children}</div>,
  TabsContent: ({ children, value }) => <div data-value={value}>{children}</div>,
  TabsList: ({ children }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }) => <button role="tab" data-value={value}>{children}</button>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogDescription: ({ children }) => <div>{children}</div>,
  DialogFooter: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }) => <div className={className} role="alert">{children}</div>,
  AlertDescription: ({ children }) => <div>{children}</div>,
  AlertTitle: ({ children }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }) => <div className={className}>{children}</div>,
  AvatarFallback: ({ children }) => <div>{children}</div>,
  AvatarImage: ({ src, alt }) => <img src={src} alt={alt} />,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }) => <div onClick={onClick}>{children}</div>,
  DropdownMenuLabel: ({ children }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }) => <button>{children}</button>,
}));

jest.mock('@/components/ui/toggle', () => ({
  Toggle: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/toggle-group', () => ({
  ToggleGroup: ({ children, ...props }) => <div {...props}>{children}</div>,
  ToggleGroupItem: ({ children, value }) => <button data-value={value}>{children}</button>,
}));

// Mock loading components
jest.mock('@/components/loading', () => ({
  PageLoading: ({ text }) => <div>Loading... {text}</div>,
  Loading: () => <div>Loading...</div>,
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
  toast: jest.fn(),
}));

// If using sonner instead
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
  Toaster: () => null,
}));
