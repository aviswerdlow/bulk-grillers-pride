# TypeScript Errors for Backend Agent - Issue #139

## Overview
This document contains TypeScript errors found in Convex backend code that must be fixed before tests can pass in CI. These errors are outside the infra-agent's scope and need to be addressed by the backend-agent.

## Critical TypeScript Errors

### 1. Convex Functions - Migration Files
**File: convex/functions/migrations/schemaVersion.ts**
- Property 'settings' does not exist on audit logs (lines 125, 141, 149, 166, 221)
- Type instantiation is excessively deep (lines 156, 209)

### 2. Convex Functions - Monitoring
**File: convex/functions/monitoring/aggregation.ts**
- Property mismatches between different metric types
- Type instantiation depth issues

**File: convex/functions/monitoring/alerts.ts**
- RegisteredQuery type has no call signatures (lines 231, 248)

**File: convex/functions/monitoring/dashboard.ts**
- Multiple RegisteredQuery call signature errors
- Type instantiation depth issues

**File: convex/functions/monitoring/performance.ts**
- Property 'monitoring' does not exist (lines 33, 51)
- Missing required properties in argument (line 89)

### 3. Convex Functions - Products
**File: convex/functions/products/deletion.ts**
- Property 'functions' does not exist (line 568)
- Missing required properties in user type (line 761)

**File: convex/functions/products/handlers/mutations.ts**
- Property 'defaultProductStatus' does not exist (line 63)
- Type mismatch for product creation (line 79)
- Object literal specifying unknown properties (lines 84, 184, 255)
- 'archivedAt' does not exist in product type (line 246)

### 4. Convex Functions - Cache Service
**File: convex/functions/cache/service.ts**
- Property 'scheduler' does not exist on GenericQueryCtx (lines 52, 59)
- RegisteredQuery has no call signatures (line 305)

### 5. Convex Functions - Deletion
**File: convex/functions/deletion/cascadeCalculationEngine.ts**
- Cannot find name 'Category' (lines 139, 152, 199, 223, 240, 266)

**File: convex/functions/deletion/cascadeDeletionProgress.ts**
- Object literal may only specify known properties:
  - 'progress' does not exist (line 33)
  - 'averageOperationTime' does not exist (line 42)
  - 'notifications' does not exist (line 156)
- Property 'progress' does not exist on transaction type (lines 66, 181)
- Property 'notifications' does not exist on transaction type (line 147)

**File: convex/functions/deletion/cascadeVisualization.ts**
- RegisteredQuery has no call signatures (line 278)

### 6. Convex Functions - Categories
**File: convex/functions/categories/helpers.ts**
- Property 'categories' does not exist (multiple instances)

**File: convex/functions/categories/queries.ts**
- Various type mismatches and missing properties

### 7. Convex Functions - Auth
**File: convex/lib/auth.ts**
- Multiple type errors related to auth context and user properties

## Action Required

The backend-agent needs to:
1. Review all TypeScript errors listed above
2. Fix schema mismatches (many errors suggest the schema is out of sync with the code)
3. Resolve "Type instantiation is excessively deep" errors (may indicate circular dependencies)
4. Fix RegisteredQuery call signature errors (API change in Convex?)
5. Add missing properties to types and interfaces
6. Ensure all imports are correct (e.g., 'Category' type)

## Testing Approach

After fixing these errors:
1. Run `npm run type-check` to verify all TypeScript errors are resolved
2. Run `npm test` to check if tests pass
3. Run `npm run lint` to ensure code quality

## Notes
- The "Type instantiation is excessively deep" errors often indicate overly complex type definitions or circular dependencies that need refactoring
- Many errors seem to be related to schema changes that weren't properly propagated to the code
- The RegisteredQuery errors suggest a potential Convex API change that needs to be addressed