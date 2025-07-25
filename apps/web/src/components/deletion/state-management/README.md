# Deletion Wizard State Management

This directory contains the XState-based state management implementation for the multi-step deletion wizard as specified in issue #170.

## Overview

The deletion wizard uses XState for predictable state transitions and React Context for state distribution. It supports:

- Multi-step wizard flow with validation
- Event sourcing for undo/redo functionality
- IndexedDB persistence for draft saving
- CQRS pattern implementation
- Comprehensive error handling

## Architecture

### State Machine (`/machines/deletionWizard.ts`)
- Defines all states: idle, selecting, calculatingImpact, previewing, configuring, confirming, processing, completed, error
- Handles transitions and guards
- Tracks history for undo/redo
- Manages context including selected items, impact data, and options

### React Context (`/contexts/DeletionContext.tsx`)
- Provides React integration for the state machine
- Exposes convenient hooks and methods
- Handles service implementations (API calls)
- Manages undo/redo functionality

### IndexedDB Storage (`/lib/deletion-draft-storage.ts`)
- Persists drafts locally
- Handles expiration (7 days default)
- Provides CRUD operations for drafts
- Automatic cleanup of expired drafts

### Undo/Redo Hook (`/hooks/useDeletionUndoRedo.ts`)
- Event sourcing implementation
- Keyboard shortcuts (Cmd/Ctrl+Z)
- Maintains separate undo/redo stacks
- Filters non-undoable events

## Usage

```tsx
import { DeletionProvider, useDeletion } from '@/contexts/DeletionContext';

// Wrap your component tree
function App() {
  return (
    <DeletionProvider>
      <YourDeletionWizard />
    </DeletionProvider>
  );
}

// Use in components
function YourDeletionWizard() {
  const {
    state,
    context,
    send,
    canGoNext,
    canGoBack,
    goNext,
    goBack,
    cancel,
    selectedCount,
    canUndo,
    canRedo,
    undo,
    redo,
    saveDraft,
    loadDraft,
    updateOptions,
    confirmDeletion,
    retry,
    isLoading,
    hasError,
    error,
  } = useDeletion();

  // Render based on state
  switch (state) {
    case 'selecting':
      // Show selection UI
      break;
    case 'previewing':
      // Show impact visualization
      break;
    // ... etc
  }
}
```

## Testing

Tests are located in:
- `/src/__tests__/machines/deletionWizard.test.ts` - State machine tests
- `/src/__tests__/contexts/DeletionContext.test.tsx` - Context integration tests

Run tests with: `npm test -- --testNamePattern="Deletion"`

## Integration Points

### With Existing Deletion Components
- Integrates with `/components/deletion/visualization/*` for impact display
- Uses existing `DeletionImpactItem` and `DeletionImpactSummary` types
- Compatible with current deletion dialogs

### With Convex Backend
The service implementations in `DeletionContext.tsx` are currently mocked. Replace with actual Convex mutations:
- `calculateImpactService` → Call impact calculation mutation
- `processDeletionService` → Call deletion processing mutation

### With Accessibility Features
- Integrates with existing AccessibilityContext
- Supports keyboard navigation (undo/redo shortcuts)
- Ready for screen reader announcements

## Next Steps

1. Replace mock services with actual Convex mutations
2. Integrate with existing deletion UI components
3. Add progressive enhancement layers (issue #168)
4. Implement focus management (issue #174)
5. Add service worker support (issue #169)

## Dependencies

- `xstate`: ^5.20.1 - State machine library
- `@xstate/react`: ^6.0.0 - React bindings
- `idb`: ^8.0.3 - IndexedDB wrapper

## Performance Considerations

- State transitions are synchronous and fast
- API calls are handled asynchronously
- Draft saving is debounced
- History is limited to prevent memory issues
- IndexedDB operations are async and non-blocking