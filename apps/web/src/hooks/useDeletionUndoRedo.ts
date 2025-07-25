import { useState, useCallback, useEffect } from 'react';
import { DeletionWizardEvent, DeletionWizardContext } from '@/machines/deletionWizard';

// Event history entry
export interface HistoryEntry {
  event: DeletionWizardEvent;
  timestamp: number;
  state: string;
  context: Partial<DeletionWizardContext>;
}

// Undo/Redo hook for deletion wizard
export function useDeletionUndoRedo(
  currentState: string,
  currentContext: DeletionWizardContext,
  send: (event: DeletionWizardEvent) => void
) {
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  
  // Add event to history
  const addToHistory = useCallback((
    event: DeletionWizardEvent,
    state: string,
    context: DeletionWizardContext
  ) => {
    // Skip certain events that shouldn't be in history
    const skipEvents = ['SAVE_DRAFT', 'LOAD_DRAFT', 'ERROR'];
    if (skipEvents.includes(event.type)) return;
    
    const entry: HistoryEntry = {
      event,
      timestamp: Date.now(),
      state,
      context: {
        selectedItems: [...context.selectedItems],
        options: { ...context.options },
        impact: context.impact ? { ...context.impact } : null,
        affectedItems: [...context.affectedItems],
      },
    };
    
    setUndoStack(prev => [...prev, entry]);
    setRedoStack([]); // Clear redo stack on new action
  }, []);
  
  // Create inverse event
  const createInverseEvent = useCallback((entry: HistoryEntry): DeletionWizardEvent | null => {
    switch (entry.event.type) {
      case 'SELECT_ITEMS': {
        const selectEvent = entry.event as { type: 'SELECT_ITEMS'; items: { id: string }[] };
        return { 
          type: 'DESELECT_ITEMS', 
          itemIds: selectEvent.items.map((i) => i.id) 
        };
      }
        
      case 'DESELECT_ITEMS':
        // Would need to store the items that were deselected
        return null;
        
      case 'TOGGLE_ITEM':
        return { 
          type: 'TOGGLE_ITEM', 
          itemId: (entry.event as unknown).itemId 
        };
        
      case 'UPDATE_OPTIONS':
        // Restore previous options
        return { 
          type: 'UPDATE_OPTIONS', 
          options: entry.context.options || {} 
        };
        
      case 'NEXT':
        return { type: 'BACK' };
        
      case 'BACK':
        return { type: 'NEXT' };
        
      default:
        return null;
    }
  }, []);
  
  // Undo action
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const lastEntry = undoStack[undoStack.length - 1];
    const inverseEvent = createInverseEvent(lastEntry);
    
    if (inverseEvent) {
      // Move from undo to redo stack
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, lastEntry]);
      
      // Send inverse event
      send(inverseEvent);
    }
  }, [undoStack, createInverseEvent, send]);
  
  // Redo action
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const lastEntry = redoStack[redoStack.length - 1];
    
    // Move from redo to undo stack
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, lastEntry]);
    
    // Send original event
    send(lastEntry.event);
  }, [redoStack, send]);
  
  // Check if actions are available
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  
  // Get history for debugging/display
  const getHistory = useCallback(() => {
    return {
      undoStack,
      redoStack,
      totalActions: undoStack.length + redoStack.length,
    };
  }, [undoStack, redoStack]);
  
  // Clear history
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Cmd/Ctrl + Shift + Z for redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [undo, redo]);
  
  return {
    undo,
    redo,
    canUndo,
    canRedo,
    addToHistory,
    getHistory,
    clearHistory,
  };
}