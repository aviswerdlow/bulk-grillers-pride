'use client';

import React from 'react';
import { useDeletion } from '@/contexts/DeletionContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, X, Undo, Redo, Save } from 'lucide-react';

/**
 * Example component demonstrating the deletion wizard state management
 * This shows how to integrate the XState machine with React components
 */
export function DeletionWizardExample() {
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
    updateOptions,
    confirmDeletion,
    retry,
    isLoading,
    hasError,
    error,
  } = useDeletion();

  // Render different content based on current state
  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold mb-4">Ready to Delete Items</h3>
            <p className="text-muted-foreground mb-6">
              Start the deletion wizard to select items for removal
            </p>
            <Button onClick={() => send({ type: 'START' })}>
              Start Deletion Wizard
            </Button>
          </div>
        );

      case 'selecting':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Select Items to Delete</h3>
            <p className="text-muted-foreground mb-6">
              Choose the items you want to delete. You can select multiple items.
            </p>
            <div className="mb-4">
              <Badge variant="secondary">{selectedCount} items selected</Badge>
            </div>
            {/* Here you would integrate with actual item selection UI */}
            <div className="text-sm text-muted-foreground">
              Integrate your item selection component here
            </div>
          </div>
        );

      case 'calculatingImpact':
        return (
          <div className="text-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Calculating deletion impact...</p>
          </div>
        );

      case 'previewing':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Review Impact</h3>
            {context.impact && (
              <div className="space-y-2 mb-6">
                <p>Total items affected: {context.impact.totalItems}</p>
                <p>Direct deletions: {context.impact.directItems}</p>
                <p>Cascade deletions: {context.impact.cascadeItems}</p>
              </div>
            )}
            {/* Here you would show the actual impact visualization */}
          </div>
        );

      case 'configuring':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Configure Options</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={context.options.cascadeDeletes}
                  onChange={(e) => 
                    updateOptions({ cascadeDeletes: e.target.checked })
                  }
                />
                <span>Delete cascade items</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={context.options.createBackup}
                  onChange={(e) => 
                    updateOptions({ createBackup: e.target.checked })
                  }
                />
                <span>Create backup before deletion</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={context.options.notifyAffectedUsers}
                  onChange={(e) => 
                    updateOptions({ notifyAffectedUsers: e.target.checked })
                  }
                />
                <span>Notify affected users</span>
              </label>
            </div>
          </div>
        );

      case 'confirming':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <p className="text-sm">
                Are you sure you want to delete {selectedCount} items?
                This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={confirmDeletion}
              className="w-full"
            >
              Confirm Deletion
            </Button>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-destructive border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Processing deletion...</p>
          </div>
        );

      case 'completed':
        return (
          <div className="text-center p-8">
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h3 className="text-lg font-semibold mb-2">Deletion Complete</h3>
            <p className="text-muted-foreground">
              Successfully deleted {selectedCount} items
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-destructive mb-4">Error</h3>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <p className="text-sm">{error || 'An error occurred during deletion'}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={goBack}>
                Go Back
              </Button>
              <Button onClick={retry}>
                Retry
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      {/* Header with state indicator */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Deletion Wizard</h2>
          <Badge>{state}</Badge>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[300px]">
        {renderContent()}
      </div>

      {/* Footer with navigation and actions */}
      <div className="border-t px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Cmd+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Cmd+Shift+Z)"
            >
              <Redo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={saveDraft}
              disabled={state === 'idle' || isLoading}
              title="Save Draft"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={cancel}
              disabled={state === 'idle' || isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={goBack}
              disabled={!canGoBack || isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={goNext}
              disabled={!canGoNext || isLoading}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}