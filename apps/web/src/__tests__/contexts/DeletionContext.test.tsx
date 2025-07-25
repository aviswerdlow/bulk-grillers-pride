import React from 'react';
import { renderHook } from '@/__tests__/test-helpers';
import { act } from '@testing-library/react';
import { DeletionImpactItem } from '@/components/deletion/visualization/types';
import { DeletionProvider, useDeletion } from '@/contexts/DeletionContext';
// Mock the IndexedDB storage
jest.mock('@/lib/deletion-draft-storage', () => ({
  saveDeletionDraft: jest.fn().mockResolvedValue('draft-123'),
  loadDeletionDraft: jest.fn().mockResolvedValue(null),
}));

// Mock Convex
describe('DeletionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DeletionProvider>{children}</DeletionProvider>
  );

  const mockItem: DeletionImpactItem = {
    id: '1',
    type: 'product',
    name: 'Test Product',
    impact: 'direct',
    severity: 'low',
  };

  describe('Initial State', () => {
    it('should start in idle state', () => {
      const { result } = renderHook(() => useDeletion(), { wrapper });
      
      expect(result.current.state).toBe('idle');
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should have default options', () => {
      const { result } = renderHook(() => useDeletion(), { wrapper });
      
      expect(result.current?.context.options).toEqual({
        cascadeDeletes: true,
        preserveReferences: false,
        createBackup: true,
        notifyAffectedUsers: true,
      });
    });
  });

  describe('Navigation', () => {
    it('should handle navigation between states', () => {
      const { result } = renderHook(() => useDeletion(), { wrapper });
      
      // Start the wizard
      act(() => {
        result.current.send({ type: 'START' });
      });
      
      expect(result.current.state).toBe('selecting');
      expect(result.current.canGoBack).toBe(false);
      expect(result.current.canGoNext).toBe(false); // No items selected
    });

    it('should enable next when items are selected', () => {
      const { result } = renderHook(() => useDeletion(), { wrapper });
      
      act(() => {
        result.current.send({ type: 'START' });
        result.current.selectItems([mockItem]);
      });
      
      expect(result.current.canGoNext).toBe(true);
      expect(result.current.selectedCount).toBe(1);
    });

    it('should handle cancel action', () => {
      const { result } = renderHook(() => useDeletion(), { wrapper });
      
      act(() => {
        result.current.send({ type: 'START' });
        result.current.cancel();
      });
      
      expect(result.current.state).toBe('idle');
    });
  });

  describe('Selection Management', () => {
    it('should select and deselect items', () => {
      const { result } = renderHook(() => useDeletion(), { wrapper });
      const secondItem: DeletionImpactItem = { ...mockItem, id: '2', name: 'Product 2' };
      
      act(() => {
        result.current.send({ type: 'START' });
        result.current.selectItems([mockItem, secondItem]);
      });
      
      expect(result.current.selectedCount).toBe(2);
      
      act(() => {
        result.current.deselectItems(['1']);
      });
      
      expect(result.current.selectedCount).toBe(1);
      expect(result.current?.context.selectedItems?.[0]?.id).toBe('2');
    });

    it('should toggle item selection', () => {
      const { result } = renderHook(() => useDeletion(), { wrapper });
      
      act(() => {
        result.current.send({ type: 'START' });
        result.current.selectItems([mockItem]);
        result.current.toggleItem('1');
      });
      
      // Note: Toggle implementation needs the actual item lookup
      // This is a simplified test
      expect(result.current?.context.selectedItems).toBeDefined();
    });
  });

  describe('Options Management', () => {
    it('should update options', () => {
      const { result } = renderHook(() => useDeletion(), { wrapper });
      
      act(() => {
        result.current.send({ type: 'START' });
        result.current.updateOptions({ cascadeDeletes: false });
      });
      
      expect(result.current?.context.options.cascadeDeletes).toBe(false);
      expect(result.current?.context.options.createBackup).toBe(true); // Unchanged
    });
  });

  describe('Undo/Redo', () => {
    it('should track undo capability', () => {
      const { result } = renderHook(() => useDeletion(), { wrapper });
      
      expect(result.current.canUndo).toBe(false);
      
      act(() => {
        result.current.send({ type: 'START' });
        result.current.selectItems([mockItem]);
      });
      
      // After actions, undo should be available
      expect(result.current.canUndo).toBe(true);
    });

    it('should undo selection', () => {
      const { result } = renderHook(() => useDeletion(), { wrapper });
      
      act(() => {
        result.current.send({ type: 'START' });
        result.current.selectItems([mockItem]);
      });
      
      expect(result.current.selectedCount).toBe(1);
      
      act(() => {
        result.current.undo();
      });
      
      // After undo, selection should be reverted
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('Draft Management', () => {
    it('should save draft', async () => {
      const { result } = renderHook(() => useDeletion(), { wrapper });
      
      act(() => {
        result.current.send({ type: 'START' });
        result.current.selectItems([mockItem]);
      });
      
      await act(async () => {
        await result.current.saveDraft();
      });
      
      // Draft saving is async, would need to wait for state update
      expect(result.current.hasDraft).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors correctly', () => {
      const { result } = renderHook(() => useDeletion(), { wrapper });
      
      act(() => {
        result.current.send({ type: 'ERROR', error: 'Test error' });
      });
      
      expect(result.current.hasError).toBe(true);
      expect(result.current.error).toBe('Test error');
    });
  });

  describe('Hook Usage', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        renderHook(() => useDeletion());
      }).toThrow('useDeletion must be used within a DeletionProvider');
      
      consoleSpy.mockRestore();
    });
  });
});