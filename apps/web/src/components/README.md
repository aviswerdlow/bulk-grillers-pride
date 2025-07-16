# Component Library Documentation

This document provides comprehensive documentation for all UI components in the Bulk Grillers Pride application.

## Table of Contents

1. [Overview](#overview)
2. [Component Categories](#component-categories)
3. [UI Components](#ui-components)
4. [Business Components](#business-components)
5. [Usage Patterns](#usage-patterns)
6. [Best Practices](#best-practices)
7. [Theming & Styling](#theming--styling)

## Overview

The component library is built with:

- **React 18+** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** for accessible primitives
- **class-variance-authority** for variant management
- **lucide-react** for icons

### Design Principles

1. **Accessibility First**: All components meet WCAG 2.1 AA standards
2. **Composability**: Components are designed to work together
3. **Type Safety**: Full TypeScript support with strict types
4. **Performance**: Optimized for React Server Components
5. **Customization**: Flexible styling with Tailwind classes

## Component Categories

### 1. UI Components (`/ui`)

Base components built on Radix UI primitives with custom styling.

### 2. Auth Components (`/auth`)

Authentication and authorization related components.

### 3. Product Components (`/products`)

Product catalog and management components.

### 4. Category Components (`/categories`)

Category hierarchy and selection components.

### 5. Layout Components (`/layout`)

Page structure and navigation components.

### 6. AI Components (`/ai`)

AI-powered features and workflows.

## UI Components

### Button

A versatile button component with multiple variants and sizes.

```tsx
import { Button } from "@/components/ui/button"

// Basic usage
<Button>Click me</Button>

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Plus /></Button>

// With icon
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add Item
</Button>

// As child (for links)
<Button asChild>
  <Link href="/products">View Products</Link>
</Button>

// Loading state
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

**Props:**

- `variant`: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
- `size`: "default" | "sm" | "lg" | "icon"
- `asChild`: boolean - Render as child component
- `className`: string - Additional Tailwind classes
- All standard button HTML attributes

### Card

Container component for grouped content.

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Product Details</CardTitle>
    <CardDescription>Manage your product information</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Save Changes</Button>
  </CardFooter>
</Card>;
```

### Dialog

Modal dialog for important interactions.

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Product</DialogTitle>
      <DialogDescription>Make changes to your product here.</DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">{/* Form content */}</div>
    <DialogFooter>
      <Button type="submit">Save changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

### Form Components

Built with react-hook-form and zod validation.

```tsx
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Form setup
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    title: "",
    description: "",
    status: "draft",
  },
})

// Form usage
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="title"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Title</FormLabel>
          <FormControl>
            <Input placeholder="Product title" {...field} />
          </FormControl>
          <FormDescription>
            This is your product's display name.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Description</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Product description"
              className="resize-none"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="status"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Status</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />

    <Button type="submit">Submit</Button>
  </form>
</Form>
```

### Badge

Display status or category labels.

```tsx
import { Badge } from "@/components/ui/badge"

// Basic usage
<Badge>New</Badge>

// Variants
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Error</Badge>

// Custom colors with Tailwind
<Badge className="bg-green-500 text-white">Success</Badge>
```

### Alert

Display important messages to users.

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>

// Variants
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Your session has expired. Please log in again.
  </AlertDescription>
</Alert>
```

### Table

Display tabular data with sorting and actions.

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

<Table>
  <TableCaption>A list of your recent products.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Title</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Price</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {products.map((product) => (
      <TableRow key={product.id}>
        <TableCell className="font-medium">{product.title}</TableCell>
        <TableCell>
          <Badge variant={getStatusVariant(product.status)}>{product.status}</Badge>
        </TableCell>
        <TableCell>${product.price}</TableCell>
        <TableCell className="text-right">
          <Button size="sm" variant="ghost">
            Edit
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>;
```

### Skeleton

Loading placeholder for content.

```tsx
import { Skeleton } from "@/components/ui/skeleton"

// Basic skeleton
<Skeleton className="h-4 w-[250px]" />
<Skeleton className="h-4 w-[200px]" />

// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-[150px]" />
    <Skeleton className="h-4 w-[250px]" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-20 w-full" />
  </CardContent>
</Card>

// Avatar skeleton
<Skeleton className="h-12 w-12 rounded-full" />
```

## Business Components

### Product Card

Display product information in a card format.

```tsx
import { ProductCard } from '@/components/products/product-card';

<ProductCard
  product={product}
  onEdit={(product) => handleEdit(product)}
  onView={(product) => handleView(product)}
  onArchive={(product) => handleArchive(product)}
  className="hover:shadow-lg transition-shadow"
/>;
```

**Features:**

- Status badge with color coding
- Category tags display
- Action dropdown menu
- Hover effects
- Responsive design

### Product Card Mini

Compact product display for dashboards.

```tsx
import { ProductCardMini } from '@/components/products/product-card-mini';

<ProductCardMini product={product} onClick={() => router.push(`/products/${product.id}`)} />;
```

### Category Selector

Hierarchical category selection with search.

```tsx
import { CategorySelector } from '@/components/categories/category-selector';

<CategorySelector
  projectId={projectId}
  selectedCategories={selectedCategories}
  onSelect={(categories) => setSelectedCategories(categories)}
  maxSelections={3}
  placeholder="Select categories..."
/>;
```

**Features:**

- Tree view navigation
- Search functionality
- Multi-select support
- Breadcrumb display
- Loading states

### Organization Switcher

Switch between organizations or create new ones.

```tsx
import { OrganizationSwitcher } from "@/components/auth/organization-switcher"

// Dropdown variant (for headers)
<OrganizationSwitcher variant="dropdown" />

// Select variant (for settings)
<OrganizationSwitcher
  variant="select"
  onOrganizationChange={(org) => handleOrgChange(org)}
/>
```

### User Profile

Display and edit user information.

```tsx
import { UserProfile } from '@/components/auth/user-profile';

<UserProfile
  user={currentUser}
  editable={true}
  onUpdate={(updates) => handleUserUpdate(updates)}
/>;
```

### Team Members List

Display organization members with role management.

```tsx
import { TeamMembersList } from '@/components/auth/team-members-list';

<TeamMembersList
  organizationId={organizationId}
  canManageRoles={membership.role === 'owner'}
  onRoleChange={(userId, newRole) => handleRoleChange(userId, newRole)}
  onRemoveMember={(userId) => handleRemoveMember(userId)}
/>;
```

### Auth Loading

Loading state for authentication components.

```tsx
import { AuthLoading } from "@/components/auth/auth-loading"

// Full page loading
<AuthLoading fullPage />

// Inline loading
<AuthLoading message="Verifying credentials..." />
```

## Usage Patterns

### Loading States

Always provide loading feedback:

```tsx
// Component with loading state
function ProductList() {
  const products = useQuery(api.products.list);

  if (!products) {
    return <ProductListSkeleton />;
  }

  return (
    <div className="grid gap-4">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}

// Skeleton component
function ProductListSkeleton() {
  return (
    <div className="grid gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Error Handling

Graceful error states:

```tsx
function ProductForm() {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>{/* Form fields */}</Form>
    </>
  );
}
```

### Responsive Design

Mobile-first approach:

```tsx
// Responsive grid
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => (
    <Card key={item.id}>{/* ... */}</Card>
  ))}
</div>

// Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Page Title
</h1>

// Responsive spacing
<div className="p-4 md:p-6 lg:p-8">
  {/* Content */}
</div>
```

### Accessibility

All components support keyboard navigation and screen readers:

```tsx
// Accessible form
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel htmlFor="email">Email</FormLabel>
      <FormControl>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          aria-describedby="email-description"
          aria-invalid={!!form.formState.errors.email}
          {...field}
        />
      </FormControl>
      <FormDescription id="email-description">
        We'll never share your email.
      </FormDescription>
      <FormMessage role="alert" />
    </FormItem>
  )}
/>

// Accessible buttons
<Button
  onClick={handleDelete}
  variant="destructive"
  aria-label="Delete product"
>
  <Trash2 className="h-4 w-4" />
</Button>
```

## Best Practices

### 1. Component Composition

Compose complex UIs from simple components:

```tsx
// Good: Composed from primitives
function ProductActions({ product }: { product: Product }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleEdit(product)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDelete(product)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 2. Type Safety

Always use proper TypeScript types:

```tsx
// Good: Strongly typed props
interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
}

// Good: Type-safe form data
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  price: z.number().min(0, 'Price must be positive'),
  status: z.enum(['draft', 'active', 'archived']),
});

type ProductFormData = z.infer<typeof formSchema>;
```

### 3. Performance

Optimize for performance:

```tsx
// Good: Memoize expensive computations
const sortedProducts = useMemo(
  () => products.sort((a, b) => a.title.localeCompare(b.title)),
  [products]
);

// Good: Lazy load heavy components
const CategoryTree = lazy(() => import('./category-tree'));

// Good: Use React.memo for pure components
const ProductCard = memo(({ product }: { product: Product }) => {
  // Component implementation
});
```

### 4. Consistent Styling

Use Tailwind utilities consistently:

```tsx
// Good: Consistent spacing scale
<div className="space-y-4">
  <Card className="p-6">
    <h2 className="mb-4 text-lg font-semibold">Title</h2>
    <p className="text-sm text-muted-foreground">Description</p>
  </Card>
</div>

// Good: Consistent color usage
<Badge variant="secondary" className="bg-blue-100 text-blue-800">
  Featured
</Badge>
```

### 5. Error Boundaries

Implement error boundaries for robustness:

```tsx
// components/error-boundary.tsx
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryPrimitive
      fallback={
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>Please refresh the page or contact support.</AlertDescription>
        </Alert>
      }
    >
      {children}
    </ErrorBoundaryPrimitive>
  );
}
```

## Theming & Styling

### CSS Variables

The theme uses CSS custom properties defined in `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... more variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  /* ... more variables */
}
```

### Extending Components

Add custom variants using class-variance-authority:

```tsx
// Custom button variant
const customButtonVariants = cva('base-classes', {
  variants: {
    mood: {
      happy: 'bg-yellow-500 text-black',
      sad: 'bg-blue-500 text-white',
      angry: 'bg-red-500 text-white',
    },
  },
});

// Usage
<Button className={customButtonVariants({ mood: 'happy' })}>I'm Happy!</Button>;
```

### Dark Mode

All components support dark mode automatically:

```tsx
// Toggle dark mode
<Toggle
  pressed={theme === 'dark'}
  onPressedChange={(pressed) => setTheme(pressed ? 'dark' : 'light')}
>
  <Moon className="h-4 w-4" />
</Toggle>
```

## Component Testing

Example test patterns:

```tsx
// Button component test
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

## Migration Guide

### From v1 to v2

If migrating from shadcn/ui v1:

1. Update imports to use new paths
2. Replace `cn` utility imports
3. Update variant props to new names
4. Test dark mode compatibility

### Adding New Components

1. Use the CLI to add base components:

   ```bash
   npx shadcn-ui@latest add [component]
   ```

2. Customize for your needs
3. Add TypeScript types
4. Document usage
5. Write tests

## Resources

- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [Class Variance Authority](https://cva.style/docs)
