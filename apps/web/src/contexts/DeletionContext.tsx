'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import { useMachine, useActor } from '@xstate/react';
import { 
  deletionWizardMachine, 
  DeletionWizardContext as MachineContext,
  DeletionWizardEvent,
  DeletionDraft,
  DeletionOptions,
  canUndo,
  getUndoEvent
} from '@/machines/deletionWizard';
import { DeletionImpactItem, DeletionImpactSummary } from '@/components/deletion/visualization/types';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { saveDeletionDraft, loadDeletionDraft } from '@/lib/deletion-draft-storage';
import { useDeletionUndoRedo } from '@/hooks/useDeletionUndoRedo';

// Context value interface following existing patterns
interface DeletionContextValue {
  // State machine state and context
  state: string;
  context: MachineContext;
  
  // Core actions
  send: (event: DeletionWizardEvent) => void;
  
  // Navigation helpers
  canGoNext: boolean;
  canGoBack: boolean;
  goNext: () => void;
  goBack: () => void;
  cancel: () => void;
  
  // Selection management
  selectItems: (items: DeletionImpactItem[]) => void;
  deselectItems: (itemIds: string[]) => void;
  toggleItem: (itemId: string) => void;
  selectedCount: number;
  
  // Options management
  updateOptions: (options: Partial<DeletionOptions>) => void;
  
  // Draft management
  saveDraft: () => Promise<void>;
  loadDraft: (draft: DeletionDraft) => void;
  hasDraft: boolean;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Processing
  confirmDeletion: () => void;
  retry: () => void;
  
  // State checks
  isLoading: boolean;
  isProcessing: boolean;
  hasError: boolean;
  error: string | null;
  isCompleted: boolean;
}

// Create context
const DeletionContext = createContext<DeletionContextValue | null>(null);

// Service implementations (to be replaced with actual API calls)
const services = {
  calculateImpactService: async (context: MachineContext) => {
    // Simulate API call - replace with actual Convex mutation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock data - replace with actual calculation
    const impact: DeletionImpactSummary = {
      totalItems: context.selectedItems.length * 3,
      directItems: context.selectedItems.length,
      cascadeItems: context.selectedItems.length * 2,
      referenceItems: 0,
      byType: {
        product: context.selectedItems.length,
        variant: context.selectedItems.length * 2,
      },
      bySeverity: {
        low: 2,
        medium: 1,
        high: 0,
        critical: 0,
      },
    };
    
    const affectedItems: DeletionImpactItem[] = [
      ...context.selectedItems,
      // Add cascade items here
    ];
    
    return { impact, affectedItems };
  },
  
  processDeletionService: async (context: MachineContext) => {
    // Simulate API call - replace with actual Convex mutation
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true };
  },
  
  saveDraftService: async (context: MachineContext) => {
    const draft: DeletionDraft = {
      id: context.draftId || Date.now().toString(),
      selectedItems: context.selectedItems,
      impact: context.impact,
      affectedItems: context.affectedItems,
      options: context.options,
      currentState: state.value as string,
      savedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
    
    const draftId = await saveDeletionDraft(draft);
    return { draftId };
  },
  
  loadDraftService: async (context: MachineContext) => {
    if (!context.draftId) {
      throw new Error('No draft ID provided');
    }
    
    const draft = await loadDeletionDraft(context.draftId);
    if (!draft) {
      throw new Error('Draft not found or expired');
    }
    
    return draft;
  },
};

// Provider component
export function DeletionProvider({ children }: { children: React.ReactNode }) {
  const [state, send, service] = useMachine(deletionWizardMachine, {
    services,
  });
  
  const context = state.context;
  
  // Initialize undo/redo
  const {
    undo: undoAction,
    redo: redoAction,
    canUndo: canUndoValue,
    canRedo: canRedoValue,
    addToHistory,
    clearHistory,
  } = useDeletionUndoRedo(state.value as string, context, send);
  
  // Wrap send to track history
  const sendWithHistory = useCallback((event: DeletionWizardEvent) => {
    // Don't track certain events in history
    const skipHistoryEvents = ['SAVE_DRAFT', 'LOAD_DRAFT', 'ERROR'];
    if (!skipHistoryEvents.includes(event.type)) {
      addToHistory(event, state.value as string, context);
    }
    send(event);
  }, [send, addToHistory, state.value, context]);
  
  // Navigation helpers
  const canGoNext = useMemo(() => {
    switch (state.value) {
      case 'selecting':
        return context.selectedItems.length > 0;
      case 'previewing':
        return true;
      case 'configuring':
        return true; // Add validation logic
      case 'confirming':
        return true;
      default:
        return false;
    }
  }, [state.value, context.selectedItems.length]);
  
  const canGoBack = useMemo(() => {
    return ['previewing', 'configuring', 'confirming', 'error'].includes(state.value as string);
  }, [state.value]);
  
  const goNext = useCallback(() => sendWithHistory({ type: 'NEXT' }), [sendWithHistory]);
  const goBack = useCallback(() => sendWithHistory({ type: 'BACK' }), [sendWithHistory]);
  const cancel = useCallback(() => {
    clearHistory();
    send({ type: 'CANCEL' });
  }, [send, clearHistory]);
  
  // Selection management
  const selectItems = useCallback((items: DeletionImpactItem[]) => {
    sendWithHistory({ type: 'SELECT_ITEMS', items });
  }, [sendWithHistory]);
  
  const deselectItems = useCallback((itemIds: string[]) => {
    sendWithHistory({ type: 'DESELECT_ITEMS', itemIds });
  }, [sendWithHistory]);
  
  const toggleItem = useCallback((itemId: string) => {
    sendWithHistory({ type: 'TOGGLE_ITEM', itemId });
  }, [sendWithHistory]);
  
  const selectedCount = context.selectedItems.length;
  
  // Options management
  const updateOptions = useCallback((options: Partial<DeletionOptions>) => {
    sendWithHistory({ type: 'UPDATE_OPTIONS', options });
  }, [sendWithHistory]);
  
  // Draft management
  const saveDraft = useCallback(async () => {
    send({ type: 'SAVE_DRAFT' });
  }, [send]);
  
  const loadDraft = useCallback((draft: DeletionDraft) => {
    send({ type: 'LOAD_DRAFT', draft });
  }, [send]);
  
  const hasDraft = Boolean(context.draftId);
  
  // Use the undo/redo from the hook
  const undo = undoAction;
  const redo = redoAction;
  
  // Processing actions
  const confirmDeletion = useCallback(() => {
    send({ type: 'CONFIRM' });
  }, [send]);
  
  const retry = useCallback(() => {
    send({ type: 'RETRY' });
  }, [send]);
  
  // State checks
  const isLoading = state.matches('calculatingImpact') || state.matches('processing');
  const isProcessing = state.matches('processing');
  const hasError = Boolean(context.error);
  const error = context.error;
  const isCompleted = state.matches('completed');
  
  // Create context value
  const value: DeletionContextValue = useMemo(() => ({
    state: state.value as string,
    context,
    send,
    canGoNext,
    canGoBack,
    goNext,
    goBack,
    cancel,
    selectItems,
    deselectItems,
    toggleItem,
    selectedCount,
    updateOptions,
    saveDraft,
    loadDraft,
    hasDraft,
    undo,
    redo,
    canUndo: canUndoValue,
    canRedo: canRedoValue,
    confirmDeletion,
    retry,
    isLoading,
    isProcessing,
    hasError,
    error,
    isCompleted,
  }), [
    state.value,
    context,
    send,
    canGoNext,
    canGoBack,
    goNext,
    goBack,
    cancel,
    selectItems,
    deselectItems,
    toggleItem,
    selectedCount,
    updateOptions,
    saveDraft,
    loadDraft,
    hasDraft,
    undo,
    redo,
    canUndoValue,
    canRedoValue,
    confirmDeletion,
    retry,
    isLoading,
    isProcessing,
    hasError,
    error,
    isCompleted,
  ]);
  
  return (
    <DeletionContext.Provider value={value}>
      {children}
    </DeletionContext.Provider>
  );
}

// Hook to use the context
export function useDeletion() {
  const context = useContext(DeletionContext);
  if (!context) {
    throw new Error('useDeletion must be used within a DeletionProvider');
  }
  return context;
}

// Export everything needed
export { DeletionContext };