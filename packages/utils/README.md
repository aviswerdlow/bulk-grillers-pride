# @bulk-grillers-pride/utils

Shared utility functions for the Bulk Grillers Pride application.

## Installation

This package is part of the monorepo and is automatically available to other workspaces.

## Usage

```typescript
import {
  generateHandle,
  formatCurrency,
  formatRelativeTime,
  debounce,
  groupBy,
} from '@bulk-grillers-pride/utils';

// String utilities
const handle = generateHandle('My Category Name'); // 'my-category-name'

// Formatting utilities
const price = formatCurrency(29.99); // '$29.99'
const time = formatRelativeTime(new Date(Date.now() - 3600000)); // '1 hour ago'

// General utilities
const debouncedSearch = debounce(searchFunction, 300);
const groupedItems = groupBy(items, 'category');
```

## Available Utilities

### String Functions

- `generateHandle(name)` - Convert string to URL-friendly handle
- `slugify(str)` - Alias for generateHandle
- `capitalize(str)` - Capitalize first letter
- `capitalizeWords(str)` - Capitalize first letter of each word
- `truncate(str, length, suffix?)` - Truncate string with ellipsis
- `cleanWhitespace(str)` - Remove extra whitespace
- `isBlank(str)` - Check if string is empty/whitespace
- `randomString(length)` - Generate random string
- `toCamelCase(str)` - Convert to camelCase
- `toPascalCase(str)` - Convert to PascalCase

### Formatting Functions

- `formatCurrency(amount, currency?, locale?)` - Format as currency
- `formatNumber(num, locale?, options?)` - Format with separators
- `formatDate(date, locale?, options?)` - Format date
- `formatRelativeTime(date)` - Format as relative time
- `formatBytes(bytes, decimals?)` - Format bytes (KB, MB, etc)
- `formatPercentage(value, decimals?, includeSign?)` - Format percentage
- `formatPhoneNumber(phone)` - Format phone number
- `formatDuration(ms)` - Format duration

### General Utilities

- `debounce(func, wait)` - Debounce function calls
- `throttle(func, limit)` - Throttle function calls
- `deepClone(obj)` - Deep clone object
- `deepEqual(a, b)` - Deep equality check
- `groupBy(array, key)` - Group array by key
- `unique(array, key?)` - Remove duplicates
- `sleep(ms)` - Async sleep function
- `retry(fn, options)` - Retry with exponential backoff
