import { createMachine, assign } from 'xstate';
import type { DeletionImpactItem, DeletionImpactSummary } from '@/components/deletion/visualization/types';

// Event types for the state machine
export type DeletionWizardEvent =
  | { type: 'START' }
  | { type: 'SELECT_ITEMS'; items: DeletionImpactItem[] }
  | { type: 'DESELECT_ITEMS'; itemIds: string[] }
  | { type: 'TOGGLE_ITEM'; itemId: string }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'CANCEL' }
  | { type: 'CONFIRM' }
  | { type: 'RETRY' }
  | { type: 'SAVE_DRAFT' }
  | { type: 'LOAD_DRAFT'; draft: DeletionDraft }
  | { type: 'CALCULATE_IMPACT' }
  | { type: 'IMPACT_CALCULATED'; impact: DeletionImpactSummary; affectedItems: DeletionImpactItem[] }
  | { type: 'UPDATE_OPTIONS'; options: Partial<DeletionOptions> }
  | { type: 'ERROR'; error: string }
  | { type: 'DELETION_COMPLETE' };

// Context types
export interface DeletionOptions {
  cascadeDeletes: boolean;
  preserveReferences: boolean;
  createBackup: boolean;
  notifyAffectedUsers: boolean;
  scheduleForLater?: Date;
}

export interface DeletionDraft {
  id: string;
  selectedItems: DeletionImpactItem[];
  impact: DeletionImpactSummary | null;
  affectedItems: DeletionImpactItem[];
  options: DeletionOptions;
  currentState: string;
  savedAt: Date;
  expiresAt: Date;
}

export interface DeletionWizardContext {
  selectedItems: DeletionImpactItem[];
  impact: DeletionImpactSummary | null;
  affectedItems: DeletionImpactItem[];
  options: DeletionOptions;
  error: string | null;
  history: Array<{
    event: DeletionWizardEvent;
    timestamp: number;
    previousState: string;
  }>;
  draftId: string | null;
}

// Guard functions
const hasSelectedItems = (context: DeletionWizardContext) => context.selectedItems.length > 0;
const hasImpactData = (context: DeletionWizardContext) => context.impact !== null;
const hasValidOptions = (context: DeletionWizardContext) => {
  // Validate that options are properly configured
  return true; // Simplified for now
};

// Default options
const defaultOptions: DeletionOptions = {
  cascadeDeletes: true,
  preserveReferences: false,
  createBackup: true,
  notifyAffectedUsers: true,
};

// Create the state machine
export const deletionWizardMachine = createMachine({
  id: 'deletionWizard',
  initial: 'idle',
  predictableActionArguments: true,
  context: {
    selectedItems: [],
    impact: null,
    affectedItems: [],
    options: defaultOptions,
    error: null,
    history: [],
    draftId: null,
  } as DeletionWizardContext,
  states: {
    idle: {
      on: {
        START: {
          target: 'selecting',
        },
        LOAD_DRAFT: {
          target: 'loadingDraft',
          actions: assign({
            draftId: (_, event) => event.draft.id,
            selectedItems: (_, event) => event.draft.selectedItems,
            impact: (_, event) => event.draft.impact,
            affectedItems: (_, event) => event.draft.affectedItems,
            options: (_, event) => event.draft.options,
          }),
        },
      },
    },
    
    selecting: {
      entry: assign({
        error: null,
      }),
      on: {
        SELECT_ITEMS: {
          actions: assign({
            selectedItems: (context, event) => [...context.selectedItems, ...event.items],
          }),
        },
        DESELECT_ITEMS: {
          actions: assign({
            selectedItems: (context, event) => 
              context.selectedItems.filter(item => !event.itemIds.includes(item.id)),
          }),
        },
        TOGGLE_ITEM: {
          actions: assign({
            selectedItems: (context, event) => {
              const exists = context.selectedItems.some(item => item.id === event.itemId);
              if (exists) {
                return context.selectedItems.filter(item => item.id !== event.itemId);
              }
              // Note: In real implementation, we'd need to find the item to add
              return context.selectedItems;
            },
          }),
        },
        NEXT: {
          target: 'calculatingImpact',
          cond: hasSelectedItems,
        },
        CANCEL: {
          target: 'idle',
        },
        SAVE_DRAFT: {
          target: 'savingDraft',
        },
      },
    },
    
    calculatingImpact: {
      entry: assign({
        error: null,
      }),
      invoke: {
        id: 'calculateImpact',
        src: 'calculateImpactService',
        onDone: {
          target: 'previewing',
          actions: assign({
            impact: (_, event) => event.data.impact,
            affectedItems: (_, event) => event.data.affectedItems,
          }),
        },
        onError: {
          target: 'selecting',
          actions: assign({
            error: (_, event) => event.data?.message || 'Failed to calculate impact',
          }),
        },
      },
    },
    
    previewing: {
      on: {
        NEXT: {
          target: 'configuring',
        },
        BACK: {
          target: 'selecting',
        },
        CANCEL: {
          target: 'idle',
        },
        SAVE_DRAFT: {
          target: 'savingDraft',
        },
      },
    },
    
    configuring: {
      on: {
        UPDATE_OPTIONS: {
          actions: assign({
            options: (context, event) => ({ ...context.options, ...event.options }),
          }),
        },
        NEXT: {
          target: 'confirming',
          cond: hasValidOptions,
        },
        BACK: {
          target: 'previewing',
        },
        CANCEL: {
          target: 'idle',
        },
        SAVE_DRAFT: {
          target: 'savingDraft',
        },
      },
    },
    
    confirming: {
      on: {
        CONFIRM: {
          target: 'processing',
        },
        BACK: {
          target: 'configuring',
        },
        CANCEL: {
          target: 'idle',
        },
        SAVE_DRAFT: {
          target: 'savingDraft',
        },
      },
    },
    
    processing: {
      invoke: {
        id: 'processDeletion',
        src: 'processDeletionService',
        onDone: {
          target: 'completed',
        },
        onError: {
          target: 'error',
          actions: assign({
            error: (_, event) => event.data?.message || 'Deletion failed',
          }),
        },
      },
    },
    
    completed: {
      type: 'final',
      entry: 'clearDraft',
    },
    
    error: {
      on: {
        RETRY: {
          target: 'processing',
        },
        BACK: {
          target: 'confirming',
        },
        CANCEL: {
          target: 'idle',
        },
      },
    },
    
    savingDraft: {
      invoke: {
        id: 'saveDraft',
        src: 'saveDraftService',
        onDone: {
          target: 'selecting', // Return to current state
          actions: assign({
            draftId: (_, event) => event.data.draftId,
          }),
        },
        onError: {
          actions: assign({
            error: (_, event) => event.data?.message || 'Failed to save draft',
          }),
        },
      },
    },
    
    loadingDraft: {
      invoke: {
        id: 'loadDraft',
        src: 'loadDraftService',
        onDone: {
          target: 'selecting', // Could be dynamic based on draft.currentState
        },
        onError: {
          target: 'idle',
          actions: assign({
            error: (_, event) => event.data?.message || 'Failed to load draft',
          }),
        },
      },
    },
  },
  on: {
    // Global event handlers for history tracking
    '*': {
      actions: assign({
        history: (context, event, { state }) => {
          if (event.type === 'xstate.init') return context.history;
          
          return [
            ...context.history,
            {
              event,
              timestamp: Date.now(),
              previousState: state.value as string,
            },
          ];
        },
      }),
    },
    // Handle ERROR event globally
    ERROR: {
      actions: assign({
        error: (_, event) => event.error,
      }),
    },
  },
});

// Helper functions for undo/redo
export const canUndo = (history: DeletionWizardContext['history']) => history.length > 0;

export const getUndoEvent = (history: DeletionWizardContext['history']) => {
  if (history.length === 0) return null;
  const lastEvent = history[history.length - 1];
  // Map events to their inverse operations
  switch (lastEvent.event.type) {
    case 'SELECT_ITEMS':
      return { type: 'DESELECT_ITEMS', itemIds: lastEvent.event.items.map(i => i.id) } as const;
    case 'NEXT':
      return { type: 'BACK' } as const;
    case 'BACK':
      return { type: 'NEXT' } as const;
    default:
      return null;
  }
};