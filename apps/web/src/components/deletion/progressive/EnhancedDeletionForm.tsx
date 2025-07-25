/**
 * Enhanced Layer Deletion Form
 * Progressive enhancement with minimal React hydration
 * Target: +50KB (100KB total)
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Product } from '@/types/models';
// import { CoreDeletionForm } from './CoreDeletionForm';

interface EnhancedDeletionFormProps {
  product?: Product;
  items?: Product[];
  onDelete?: (itemIds: string[], reason?: string) => Promise<void>;
  onCancel?: () => void;
}

export function EnhancedDeletionForm({
  product,
  items = [],
  onDelete,
  onCancel
}: EnhancedDeletionFormProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set((product ? [product] : items).map(item => item._id))
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  const itemsToDelete = product ? [product] : items;
  
  // Progressive enhancement - enhance form submission
  useEffect(() => {
    if (!formRef.current || !onDelete) return;
    
    const form = formRef.current;
    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const itemIds = formData.getAll('items[]') as string[];
      const reason = formData.get('reason') as string;
      
      setIsDeleting(true);
      try {
        await onDelete(itemIds, reason || undefined);
      } catch (error) {
        console.error('Deletion failed:', error);
        // Fallback to form submission
        form.submit();
      } finally {
        setIsDeleting(false);
      }
    };
    
    form.addEventListener('submit', handleSubmit);
    return () => form.removeEventListener('submit', handleSubmit);
  }, [onDelete]);
  
  // Touch gesture support for swipe-to-delete
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  
  const handleTouchEnd = (e: React.TouchEvent, itemId: string) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    // Swipe left to toggle selection
    if (diff > 50) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
        return next;
      });
    }
    
    setTouchStart(null);
  };
  
  // Enhance Core form with React features
  return (
    <div className="enhanced-deletion-form">
      <form 
        ref={formRef}
        action="/api/delete" 
        method="post"
        className="space-y-4"
      >
        {/* Enhanced header with selection count */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Confirm Deletion</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedIds.size} of {itemsToDelete.length} items selected
          </p>
        </div>
        
        {/* Enhanced item list with touch support */}
        <div className="p-4 space-y-3">
          <fieldset>
            <legend className="text-sm font-medium mb-2 sr-only">
              Items to be deleted
            </legend>
            
            {itemsToDelete.map((item, index) => (
              <div
                key={item._id}
                className={`
                  relative flex items-start gap-3 p-3 border rounded-lg mb-2
                  transition-all duration-200
                  ${selectedIds.has(item._id) ? 'bg-red-50 border-red-200' : ''}
                `}
                onTouchStart={(e) => handleTouchStart(e, item._id)}
                onTouchEnd={(e) => handleTouchEnd(e, item._id)}
              >
                <input
                  type="checkbox"
                  name="items[]"
                  value={item._id}
                  checked={selectedIds.has(item._id)}
                  onChange={(e) => {
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      if (e.target.checked) {
                        next.add(item._id);
                      } else {
                        next.delete(item._id);
                      }
                      return next;
                    });
                  }}
                  className="mt-1 h-4 w-4"
                  aria-describedby={`item-desc-${index}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{item.title}</div>
                  <div id={`item-desc-${index}`} className="text-xs text-muted-foreground">
                    SKU: {item.sku} • Type: {item.productType}
                  </div>
                </div>
                
                {/* Visual feedback for swipe gesture */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="swipe-indicator" />
                </div>
              </div>
            ))}
          </fieldset>
          
          {/* Deletion reason with character count */}
          <div className="mt-4">
            <label htmlFor="reason" className="block text-sm font-medium mb-1">
              Reason for deletion (optional)
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              maxLength={200}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Provide a reason for audit trail..."
              onChange={(e) => {
                const count = e.target.value.length;
                const counter = e.target.nextElementSibling;
                if (counter) {
                  counter.textContent = `${count}/200`;
                }
              }}
            />
            <div className="text-xs text-muted-foreground mt-1">0/200</div>
          </div>
        </div>
        
        {/* Enhanced actions with loading state */}
        <div className="p-4 border-t flex gap-3">
          <button
            type="button"
            onClick={onCancel || (() => window.history.back())}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium
                     hover:bg-gray-50 active:bg-gray-100 transition-colors
                     touch-manipulation disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={selectedIds.size === 0 || isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium
                     hover:bg-red-700 active:bg-red-800 transition-colors
                     touch-manipulation disabled:opacity-50 relative"
          >
            {isDeleting ? (
              <>
                <span className="opacity-0">Delete Items</span>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                </div>
              </>
            ) : (
              `Delete ${selectedIds.size} Items`
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Enhanced Layer Styles
 */
export const enhancedStyles = `
  .enhanced-deletion-form {
    /* Smooth transitions for selection */
    --transition-speed: 200ms;
  }
  
  /* Swipe indicator */
  .swipe-indicator {
    opacity: 0;
    background: linear-gradient(to left, transparent, rgba(239, 68, 68, 0.1));
    transition: opacity var(--transition-speed);
  }
  
  /* Touch feedback */
  @media (hover: none) {
    .enhanced-deletion-form input[type="checkbox"] {
      transform: scale(1.2);
    }
    
    .enhanced-deletion-form label:active {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
  
  /* Loading animation */
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
`;