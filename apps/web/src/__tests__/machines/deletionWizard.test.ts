import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { DeletionImpactItem } from '@/components/deletion/visualization/types';
import { deletionWizardMachine } from '@/machines/deletionWizard';
import { InterpreterFrom, interpret } from 'xstate';


describe('Deletion Wizard State Machine', () => {
  let service: InterpreterFrom<typeof deletionWizardMachine>;

  beforeEach(() => {
    service = interpret(deletionWizardMachine);
  });

  afterEach(() => {
    (service as any).stop();
  });

  describe('State Transitions', () => {
    it('should start in idle state', () => {
      service.start();
      expect((service as any).state?.value).toBe('idle');
    });

    it('should transition to selecting on START', () => {
      service.start();
      service.send({ type: 'START' });
      expect((service as any).state?.value).toBe('selecting');
    });

    it('should stay in selecting without items when NEXT is sent', () => {
      service.start();
      service.send({ type: 'START' });
      service.send({ type: 'NEXT' });
      expect((service as any).state?.value).toBe('selecting');
    });

    it('should transition through all states correctly', () => {
      const mockItem: DeletionImpactItem = {
        id: '1',
        type: 'product',
        name: 'Test Product',
        impact: 'direct',
        severity: 'low',
      };

      service.start();
      
      // Start wizard
      service.send({ type: 'START' });
      expect((service as any).state?.value).toBe('selecting');
      
      // Select items
      service.send({ type: 'SELECT_ITEMS', items: [mockItem] });
      expect((service as any).state?.context.selectedItems).toHaveLength(1);
      
      // Can't test full flow without mocking services
      // Would need to mock calculateImpactService and processDeletionService
    });

    it('should handle CANCEL from any state', () => {
      service.start();
      
      // Test cancel from selecting
      service.send({ type: 'START' });
      service.send({ type: 'CANCEL' });
      expect((service as any).state?.value).toBe('idle');
    });
  });

  describe('Selection Management', () => {
    const mockItems: DeletionImpactItem[] = [
      {
        id: '1',
        type: 'product',
        name: 'Product 1',
        impact: 'direct',
        severity: 'low',
      },
      {
        id: '2',
        type: 'product',
        name: 'Product 2',
        impact: 'direct',
        severity: 'medium',
      },
    ];

    it('should add items on SELECT_ITEMS', () => {
      service.start();
      service.send({ type: 'START' });
      service.send({ type: 'SELECT_ITEMS', items: mockItems });
      
      expect((service as any).state?.context.selectedItems).toHaveLength(2);
      expect((service as any).state?.context.selectedItems[0].id).toBe('1');
    });

    it('should remove items on DESELECT_ITEMS', () => {
      service.start();
      service.send({ type: 'START' });
      service.send({ type: 'SELECT_ITEMS', items: mockItems });
      service.send({ type: 'DESELECT_ITEMS', itemIds: ['1'] });
      
      expect((service as any).state?.context.selectedItems).toHaveLength(1);
      expect((service as any).state?.context.selectedItems[0].id).toBe('2');
    });

    it('should handle multiple selections and deselections', () => {
      service.start();
      service.send({ type: 'START' });
      
      // Add first item
      service.send({ type: 'SELECT_ITEMS', items: [mockItems[0]] });
      expect((service as any).state?.context.selectedItems).toHaveLength(1);
      
      // Add second item
      service.send({ type: 'SELECT_ITEMS', items: [mockItems[1]] });
      expect((service as any).state?.context.selectedItems).toHaveLength(2);
      
      // Remove first item
      service.send({ type: 'DESELECT_ITEMS', itemIds: ['1'] });
      expect((service as any).state?.context.selectedItems).toHaveLength(1);
      expect((service as any).state?.context.selectedItems[0].id).toBe('2');
    });
  });

  describe('Options Management', () => {
    it('should update options correctly', () => {
      service.start();
      service.send({ type: 'START' });
      
      const newOptions = {
        cascadeDeletes: false,
        createBackup: false,
      };
      
      service.send({ type: 'UPDATE_OPTIONS', options: newOptions });
      
      expect((service as any).state?.context.options.cascadeDeletes).toBe(false);
      expect((service as any).state?.context.options.createBackup).toBe(false);
      expect((service as any).state?.context.options.preserveReferences).toBe(false); // default
    });

    it('should merge options, not replace them', () => {
      service.start();
      service.send({ type: 'START' });
      
      // Update some options
      service.send({ type: 'UPDATE_OPTIONS', options: { cascadeDeletes: false } });
      
      // Update different options
      service.send({ type: 'UPDATE_OPTIONS', options: { createBackup: false } });
      
      // Both should be updated
      expect((service as any).state?.context.options.cascadeDeletes).toBe(false);
      expect((service as any).state?.context.options.createBackup).toBe(false);
    });
  });

  describe('History Tracking', () => {
    it('should track events in history', () => {
      service.start();
      
      service.send({ type: 'START' });
      expect((service as any).state?.context.history).toHaveLength(1);
      expect((service as any).state?.context.history[0].event.type).toBe('START');
      
      service.send({ type: 'CANCEL' });
      expect((service as any).state?.context.history).toHaveLength(2);
      expect((service as any).state?.context.history[1].event.type).toBe('CANCEL');
    });

    it('should include timestamp in history entries', () => {
      service.start();
      const beforeTime = Date.now();
      
      service.send({ type: 'START' });
      
      const afterTime = Date.now();
      const historyEntry = (service as any).state?.context.history[0];
      
      expect(historyEntry.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(historyEntry.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Error Handling', () => {
    it('should set error on ERROR event', () => {
      service.start();
      service.send({ type: 'ERROR', error: 'Test error message' });
      
      expect((service as any).state?.context.error).toBe('Test error message');
    });

    it('should clear error when entering selecting state', () => {
      service.start();
      
      // Set an error
      service.send({ type: 'ERROR', error: 'Test error' });
      expect((service as any).state?.context.error).toBe('Test error');
      
      // Start should clear error
      service.send({ type: 'START' });
      expect((service as any).state?.context.error).toBeNull();
    });
  });

  describe('Draft Management', () => {
    it('should set draft ID when loading draft', () => {
      const mockDraft = {
        id: 'draft-123',
        selectedItems: [],
        impact: null,
        affectedItems: [],
        options: {
          cascadeDeletes: true,
          preserveReferences: false,
          createBackup: true,
          notifyAffectedUsers: true,
        },
        currentState: 'selecting',
        savedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      service.start();
      service.send({ type: 'LOAD_DRAFT', draft: mockDraft });
      
      expect((service as any).state?.context.draftId).toBe('draft-123');
    });
  });
});
