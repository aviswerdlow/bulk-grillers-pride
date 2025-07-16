# Convex Backend Documentation

This directory contains all backend functions, database schema, and API logic for the Bulk Grillers Pride application.

## 📁 Directory Structure

```
convex/
├── functions/           # API functions organized by domain
│   ├── auth/           # Authentication and authorization
│   ├── categories/     # Category management
│   ├── products/       # Product operations
│   ├── ai/            # AI categorization
│   ├── imports/       # Import/export operations
│   ├── organizations/ # Organization management
│   └── projects/      # Project management
├── schema.ts          # Database schema definition
├── auth.config.ts     # Clerk JWT configuration
└── _generated/        # Auto-generated Convex types
```

## 🔑 Key Concepts

### Multi-Tenancy

The application uses organization-based multi-tenancy:

- All data is scoped to organizations
- Users can belong to multiple organizations
- Role-based access control per organization

### Authentication

- Uses Clerk for authentication
- JWT tokens validated by Convex
- User records synced on-demand via `auth.users.store`

### Real-time Updates

- All queries are reactive by default
- Mutations trigger real-time updates
- Use `useQuery` hooks for live data

## 📚 API Documentation

For comprehensive API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 🗄️ Database Schema

### Core Tables

- **users**: User accounts synced from Clerk
- **organizations**: Multi-tenant organizations
- **organizationMemberships**: User-organization relationships with roles
- **projects**: Projects within organizations
- **products**: Product catalog
- **productVariants**: Product variations (size, color, etc.)
- **categories**: Hierarchical category tree
- **categoryProductAssignments**: Product-category relationships

### Supporting Tables

- **aiCategorizationJobs**: AI categorization job tracking
- **importJobs**: Bulk import job management
- **fileStorageEntries**: File upload tracking
- **auditLogs**: Comprehensive audit trail
- **dataVersions**: Entity versioning

See [schema.ts](./schema.ts) for detailed schema definitions.

## 🚀 Quick Start

### Running Locally

```bash
# Start Convex dev server
npx convex dev

# Deploy to production
npx convex deploy
```

### Environment Variables

Required in `.env.local`:

```
CONVEX_DEPLOYMENT=<your-deployment>
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
```

## 🧪 Testing

Tests are located in `__tests__/` directory:

```bash
# Run all Convex tests
npm test convex/

# Run specific test file
npm test convex/__tests__/functions/products/products.test.ts
```

### Test Structure

- Unit tests for individual functions
- Integration tests for workflows
- Mock helpers in `__tests__/setup/`

## 🔒 Security

### Authentication Flow

1. User authenticates with Clerk
2. JWT token passed to Convex
3. Token validated using auth.config.ts
4. User permissions checked via organizationMemberships

### Authorization Patterns

```typescript
// All functions check authentication
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error('Not authenticated');

// Check organization membership
const membership = await ctx.db
  .query('organizationMemberships')
  .withIndex('by_organization_user', (q) => q.eq('organizationId', orgId).eq('userId', userId))
  .filter((q) => q.eq(q.field('status'), 'active'))
  .unique();

if (!membership) throw new Error('Access denied');

// Check specific permissions
if (!membership.permissions.includes('products:write')) {
  throw new Error('Insufficient permissions');
}
```

## 🎯 Best Practices

### Query Optimization

- Use indexes for common queries
- Paginate large result sets
- Filter at database level, not in code

### Error Handling

- Consistent error messages
- Proper error types for client handling
- Log errors for debugging

### Type Safety

- Use generated types from \_generated/
- Define validators with convex/values
- Avoid `any` types

### Performance

- Batch operations when possible
- Use transactions for consistency
- Implement caching for expensive queries

## 🔄 Common Patterns

### Paginated Queries

```typescript
export const getProducts = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 50, cursor }) => {
    return await ctx.db.query('products').order('desc').paginate({ numItems: limit, cursor });
  },
});
```

### Soft Deletes

```typescript
// Don't actually delete - mark as archived
await ctx.db.patch(productId, {
  status: 'archived',
  updatedAt: Date.now(),
});
```

### Audit Logging

```typescript
// Log important actions
await ctx.db.insert("auditLogs", {
  organizationId,
  eventType: "UPDATE",
  entityType: "products",
  entityId: productId,
  changes: [...],
  performedBy: { type: "user", userId, userEmail },
  timestamp: Date.now(),
});
```

## 🐛 Debugging

### Convex Dashboard

- View real-time logs
- Inspect database contents
- Monitor function execution

### Local Development

```typescript
// Add console.logs for debugging
console.log("Processing product:", productId);

// Use Convex dev server logs
npx convex logs
```

## 📈 Performance Monitoring

### Query Performance

- Monitor slow queries in dashboard
- Add indexes for frequently filtered fields
- Use explain to analyze query plans

### Function Metrics

- Track execution time
- Monitor error rates
- Set up alerts for failures

## 🚧 Migration Guide

### Adding New Tables

1. Update schema.ts
2. Run `npx convex dev` to sync
3. Create migration function if needed
4. Update types in frontend

### Modifying Existing Tables

1. Add new fields as optional
2. Create migration to backfill data
3. Make fields required after migration
4. Update all queries/mutations

## 📝 Contributing

### Code Style

- Use TypeScript strictly
- Follow existing patterns
- Add JSDoc comments
- Write tests for new functions

### Pull Request Process

1. Create feature branch
2. Write/update tests
3. Update API documentation
4. Submit PR with description

## 🆘 Troubleshooting

### Common Issues

**"Not authenticated" errors**

- Check Clerk configuration
- Verify JWT token format
- Ensure auth.config.ts is correct

**"Access denied" errors**

- Verify organization membership
- Check user role and permissions
- Ensure membership status is "active"

**Type errors**

- Run `npx convex dev` to regenerate types
- Check for schema changes
- Verify import paths

**Performance issues**

- Add appropriate indexes
- Implement pagination
- Use caching for repeated queries

## 📞 Support

- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API docs
- Review test files for usage examples
- Check Convex documentation at https://docs.convex.dev
