# Contributing to Bulk Grillers Pride

Thank you for your interest in contributing to Bulk Grillers Pride! This guide will help you get started with contributing to our project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Process](#development-process)
4. [Code Standards](#code-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Testing Guidelines](#testing-guidelines)
8. [Documentation](#documentation)
9. [Multi-Agent Development](#multi-agent-development)
10. [Issue Guidelines](#issue-guidelines)
11. [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a friendly, safe, and welcoming environment for all contributors, regardless of experience level, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, nationality, or any other characteristic.

### Expected Behavior

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept feedback gracefully
- Prioritize the community's best interests

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Public or private harassment
- Publishing others' private information
- Any conduct that could reasonably be considered inappropriate

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18+ and npm 9+
- Git installed and configured
- A GitHub account
- Familiarity with TypeScript and React
- Basic understanding of Convex (we'll help you learn!)

### Setting Up Your Development Environment

1. **Fork the Repository**

   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/bulk-grillers-pride.git
   cd bulk-grillers-pride
   ```

2. **Set Up the Project**

   ```bash
   # Run the interactive setup script
   npm run setup

   # Or manually:
   npm install
   cp .env.example .env.local
   # Add your API keys to .env.local
   ```

3. **Start Development**

   ```bash
   # Start all services
   npm run dev

   # Or start individually:
   npm run dev:web    # Frontend
   npm run dev:convex # Backend
   ```

4. **Run Tests**
   ```bash
   npm test           # Run all tests
   npm run test:watch # Watch mode
   npm run test:e2e   # E2E tests
   ```

## Development Process

### 1. Find or Create an Issue

- Check existing issues for something you'd like to work on
- If creating a new issue, provide clear description and context
- Wait for maintainer feedback before starting major features
- Comment on the issue to claim it

### 2. Create a Feature Branch

```bash
# Create a new branch from main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# Branch naming conventions:
# feature/description - New features
# fix/description - Bug fixes
# docs/description - Documentation
# refactor/description - Code refactoring
# test/description - Test additions
# chore/description - Maintenance tasks
```

### 3. Make Your Changes

- Write clean, readable code
- Follow our code standards
- Add tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 4. Test Your Changes

```bash
# Run all quality checks
npm test              # Unit tests
npm run type-check    # TypeScript
npm run lint         # ESLint
npm run test:e2e     # E2E tests (optional)
```

### 5. Submit a Pull Request

- Push your branch to your fork
- Create a PR against our `main` branch
- Fill out the PR template completely
- Link related issues
- Wait for review and address feedback

## Code Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Use explicit types
interface ProductProps {
  product: Product;
  onUpdate: (id: string, data: ProductUpdate) => Promise<void>;
}

// ❌ Bad: Avoid any
function processData(data: any) {
  // ...
}

// ✅ Good: Use type inference where obvious
const products = ['grill', 'smoker']; // string[] inferred

// ✅ Good: Use enums for fixed sets
enum Status {
  Active = 'active',
  Draft = 'draft',
  Archived = 'archived',
}
```

### React/Next.js Guidelines

```typescript
// ✅ Good: Use function components with TypeScript
export function ProductCard({ product, onEdit }: ProductCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.title}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// ✅ Good: Use proper hooks
function useProductData(productId: string) {
  const product = useQuery(api.products.getProduct, { productId });
  const updateProduct = useMutation(api.products.update);

  return { product, updateProduct };
}

// ✅ Good: Colocate related code
// ProductCard.tsx
export function ProductCard() { /* ... */ }
export function ProductCardSkeleton() { /* ... */ }
export function ProductCardError() { /* ... */ }
```

### Convex Guidelines

```typescript
// ✅ Good: Validate all inputs
export const createProduct = mutation({
  args: {
    title: v.string(),
    price: v.number(),
    status: v.union(v.literal("active"), v.literal("draft")),
  },
  handler: async (ctx, args) => {
    // Always check authentication
    const { user, membership } = await authenticateAndAuthorize(
      ctx,
      args.organizationId
    );

    // Validate permissions
    if (!canEditProducts(membership)) {
      throw new Error("Insufficient permissions");
    }

    // Business logic here
  },
});

// ✅ Good: Use indexes for queries
.query("products")
.withIndex("by_organization_project", (q) =>
  q.eq("organizationId", orgId).eq("projectId", projectId)
)
```

### Styling Guidelines

```tsx
// ✅ Good: Use Tailwind utilities
<div className="flex items-center gap-4 p-6">
  <Badge variant="secondary">New</Badge>
</div>

// ✅ Good: Use component variants
<Button variant="destructive" size="sm">
  Delete
</Button>

// ❌ Bad: Avoid inline styles
<div style={{ display: 'flex', padding: '24px' }}>
```

### File Organization

```
src/
├── components/
│   ├── ui/           # Base UI components
│   ├── products/     # Product-related components
│   └── layout/       # Layout components
├── app/              # Next.js app router
├── lib/              # Utilities and helpers
├── types/            # TypeScript types
└── hooks/            # Custom React hooks
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or fixes
- `chore`: Maintenance tasks
- `build`: Build system changes
- `ci`: CI/CD changes

### Examples

```bash
# Feature
feat(products): add bulk import functionality

# Bug fix
fix(auth): resolve token refresh issue

# Documentation
docs(api): update authentication examples

# Refactoring
refactor(categories): simplify tree traversal logic

# With breaking change
feat(api)!: change product API response format

BREAKING CHANGE: Product API now returns nested category objects
instead of category IDs.
```

### Commit Best Practices

1. **Keep commits atomic**: One logical change per commit
2. **Write clear messages**: Explain what and why, not how
3. **Reference issues**: Include issue numbers when applicable
4. **Use present tense**: "add feature" not "added feature"
5. **Keep line length reasonable**: 72 chars for body, 50 for subject

## Pull Request Process

### Before Submitting

1. **Update from main**

   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Run all checks**

   ```bash
   npm test
   npm run type-check
   npm run lint
   ```

3. **Update documentation**
   - Add JSDoc comments for new functions
   - Update README if needed
   - Add examples for new features

### PR Guidelines

1. **Title**: Use conventional commit format

   - Example: `feat(products): add CSV export functionality`

2. **Description**: Fill out the PR template

   - Summarize changes
   - Link related issues
   - Include screenshots for UI changes
   - List breaking changes

3. **Size**: Keep PRs focused

   - Aim for <500 lines changed
   - Split large features into multiple PRs
   - One concern per PR

4. **Tests**: Include appropriate tests
   - Unit tests for utilities
   - Integration tests for API
   - Component tests for UI
   - E2E tests for critical flows

### Code Review Process

1. **Automated Checks**: CI runs automatically

   - Tests must pass
   - Type checking must pass
   - Linting must pass
   - Build must succeed

2. **Review Assignment**: Maintainers will review

   - Usually within 48 hours
   - May request changes
   - Discuss feedback constructively

3. **Address Feedback**

   - Make requested changes
   - Push new commits (don't force-push)
   - Reply to all comments
   - Re-request review when ready

4. **Merge Process**
   - Maintainer will merge when approved
   - We use squash and merge
   - PR branch will be deleted

## Testing Guidelines

### Test Structure

```typescript
// Component test example
describe('ProductCard', () => {
  it('renders product information', () => {
    const product = createMockProduct();
    render(<ProductCard product={product} />);

    expect(screen.getByText(product.title)).toBeInTheDocument();
    expect(screen.getByText(`$${product.price}`)).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', async () => {
    const onEdit = jest.fn();
    const product = createMockProduct();
    render(<ProductCard product={product} onEdit={onEdit} />);

    await userEvent.click(screen.getByLabelText('Edit product'));
    expect(onEdit).toHaveBeenCalledWith(product);
  });
});

// API test example
describe('products.create', () => {
  it('creates product with valid data', async () => {
    const ctx = createMockContext();
    const args = {
      title: 'Test Product',
      price: 99.99,
      status: 'draft' as const,
    };

    const id = await createProduct(ctx, args);
    expect(id).toBeDefined();

    const product = await ctx.db.get(id);
    expect(product?.title).toBe(args.title);
  });

  it('throws on invalid permissions', async () => {
    const ctx = createMockContext({ role: 'viewer' });

    await expect(createProduct(ctx, {})).rejects.toThrow(
      'Insufficient permissions'
    );
  });
});
```

### Testing Best Practices

1. **Test behavior, not implementation**
2. **Use descriptive test names**
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Test edge cases and errors**
5. **Keep tests independent**
6. **Mock external dependencies**
7. **Aim for 80% coverage on critical paths**

## Documentation

### Code Documentation

```typescript
/**
 * Creates a new product in the catalog
 *
 * @param args - Product creation arguments
 * @param args.title - Product display name
 * @param args.price - Product price in cents
 * @param args.status - Publication status
 * @returns Promise<Id<"products">> - Created product ID
 * @throws {Error} If user lacks permissions
 *
 * @example
 * const productId = await createProduct({
 *   title: "Premium Grill",
 *   price: 59999,
 *   status: "draft"
 * });
 */
export const createProduct = mutation({
  // Implementation
});
```

### README Updates

Update relevant documentation when:

- Adding new features
- Changing configuration
- Modifying setup process
- Adding dependencies
- Changing API interfaces

### Component Documentation

For new components, add to component library docs:

````markdown
### YourComponent

Description of what the component does.

\```tsx
import { YourComponent } from "@/components/your-component"

// Basic usage
<YourComponent prop="value" />

// Advanced usage
<YourComponent
prop="value"
onAction={(data) => handleAction(data)}
/>
\```

**Props:**

- `prop`: Type - Description
- `onAction`: (data: Type) => void - Callback description
````

## Multi-Agent Development

This project uses an AI-powered multi-agent system. When contributing:

### Understanding Agents

- **frontend-agent**: Owns `apps/web/`
- **backend-agent**: Owns `convex/`
- **infra-agent**: Owns build configuration
- **quality-agent**: Handles testing
- **docs-agent**: Maintains documentation
- **migration-agent**: Manages schema changes

### Working with Agents

1. **Respect Ownership**: Don't modify files owned by other agents without coordination
2. **Check Locks**: Some files require locks before editing
3. **Update Status**: Keep GitHub Issues updated with task progress
4. **Coordinate Changes**: Major changes may need multi-agent coordination

### Agent Guidelines

If you're working alongside the AI agents:

1. Communicate changes clearly
2. Follow the same standards they use
3. Update relevant documentation
4. Run tests before committing

## Issue Guidelines

### Creating Issues

Use issue templates when available:

- **Bug Report**: For reporting bugs
- **Feature Request**: For suggesting features
- **Documentation**: For docs improvements

### Issue Format

```markdown
## Description

Clear description of the issue or feature

## Steps to Reproduce (for bugs)

1. Go to...
2. Click on...
3. See error

## Expected Behavior

What should happen

## Actual Behavior

What actually happens

## Environment

- Browser:
- OS:
- Version:

## Additional Context

Any other relevant information
```

### Good First Issues

Look for issues labeled:

- `good first issue` - Beginner-friendly
- `help wanted` - Community help needed
- `documentation` - Documentation improvements

## Community

### Getting Help

- **Discord**: Join our Discord server (link in README)
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: For bugs and feature requests
- **Email**: support@bulkgrillerspride.com

### Ways to Contribute

Beyond code:

- **Testing**: Try new features and report bugs
- **Documentation**: Improve docs and examples
- **Translation**: Help translate the app
- **Design**: Suggest UI/UX improvements
- **Community**: Help others in discussions

### Recognition

We recognize contributors in:

- README.md contributors section
- Release notes
- Monthly community updates
- Special badges for regular contributors

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing:

1. Check existing documentation
2. Search closed issues
3. Ask in GitHub Discussions
4. Reach out on Discord

Thank you for contributing to Bulk Grillers Pride! 🎉
