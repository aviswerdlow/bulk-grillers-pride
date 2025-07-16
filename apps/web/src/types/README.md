# Frontend Shared Types

This directory contains all shared TypeScript type definitions for the frontend application. These types ensure consistency across components and prevent interface drift.

## File Structure

### `models.ts`

Contains UI-specific model types that represent data structures used throughout the application:

- `Product`, `Category`, `User`, `Organization`, `Project`
- `ImportJob`, `CategorizationJob`
- `TeamMember`, `Invitation`, `Permission`
- Configuration objects for roles, statuses, and jobs
- Helper types for forms and selections
- Pagination and filtering types

### `ui.ts`

Common UI component types for consistent component interfaces:

- `BaseDialogProps` - Standard props for all dialog components
- `LoadingState`, `FormState` - State management types
- `CommonEventHandlers` - Reusable event handler types
- `TableColumn`, `ToastConfig` - Component configuration types
- `TreeNode` - For hierarchical components
- View modes, sort directions, and other UI enums

### `forms.ts`

Form-related types for validation and submission:

- `FormField`, `SelectOption` - Field configuration
- `FormSubmitHandler`, `FormErrorHandler` - Handler types
- `FileUploadConfig` - File upload configuration
- `MultiStepFormConfig` - Multi-step form support
- `CSVFieldMapping`, `ImportConfig` - Import functionality
- `SearchFormConfig`, `FilterFormConfig` - Search and filter forms

### `api.ts`

API communication types:

- `ApiResponse`, `ApiError` - Response wrappers
- `PaginatedResponse`, `QueryParams` - Query types
- `BatchRequest`, `BatchResponse` - Batch operations
- `FileUploadResponse`, `UploadProgress` - Upload tracking
- `WebSocketMessage`, `SubscriptionConfig` - Real-time updates
- `ImportJobResult`, `ExportJobStatus` - Job tracking

### `index.ts`

Central export point that re-exports all types and includes utility types:

- Re-exports from all type files
- Utility types: `Nullable`, `Optional`, `Maybe`
- Helper types: `PartialBy`, `RequiredBy`, `DeepPartial`
- Generic types: `AsyncFunction`, `ValueOf`, `ArrayElement`

## Usage

Import types from the central index file:

```typescript
import { Product, BaseDialogProps, FormSubmitHandler, ApiResponse } from '@/types';
```

Or import from specific files:

```typescript
import { BaseDialogProps } from '@/types/ui';
import { Product } from '@/types/models';
```

## Best Practices

1. **Always extend `BaseDialogProps`** for dialog components:

   ```typescript
   interface MyDialogProps extends BaseDialogProps {
     // additional props
   }
   ```

2. **Use form types** for consistent form handling:

   ```typescript
   const handleSubmit: FormSubmitHandler<MyFormData> = async (data) => {
     // handle submission
   };
   ```

3. **Leverage configuration objects** for consistent UI:

   ```typescript
   import { roleConfig, productStatusConfig } from '@/types';

   const roleLabel = roleConfig.labels[user.role];
   const statusColor = productStatusConfig.colors[product.status];
   ```

4. **Use utility types** to avoid repetition:

   ```typescript
   // Make specific fields optional
   type PartialProduct = PartialBy<Product, '_id' | 'createdAt' | 'updatedAt'>;

   // Make fields required
   type RequiredUser = RequiredBy<User, 'email' | 'name'>;
   ```

## Adding New Types

When adding new types:

1. Place them in the appropriate file based on their category
2. Export them from the file
3. Ensure they're re-exported from `index.ts` if needed
4. Document complex types with JSDoc comments
5. Consider if existing types can be extended rather than duplicated

## Type Safety

These shared types help ensure:

- Consistent prop interfaces across similar components
- Type-safe form handling and validation
- Proper API response handling
- Reduced code duplication
- Better IntelliSense support
- Easier refactoring

## Migration Guide

When updating existing components to use shared types:

1. Import the shared type
2. Replace inline interface with extension:

   ```typescript
   // Before
   interface Props {
     open: boolean;
     onOpenChange: (open: boolean) => void;
     // other props
   }

   // After
   interface Props extends BaseDialogProps {
     // other props
   }
   ```

3. Update any type references to use shared types
4. Run `npm run type-check` to verify no errors
