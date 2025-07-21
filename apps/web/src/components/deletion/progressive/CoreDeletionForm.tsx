/**
 * Core Layer Deletion Form
 * Works without JavaScript, pure HTML forms with server-side handling
 * Target: <50KB bundle
 */

import { Product } from '@/types/models';

interface CoreDeletionFormProps {
  product?: Product;
  items?: Product[];
  action?: string;
  method?: 'get' | 'post';
  csrfToken?: string;
}

export function CoreDeletionForm({
  product,
  items = [],
  action = '/api/delete',
  method = 'post',
  csrfToken
}: CoreDeletionFormProps) {
  const itemsToDelete = product ? [product] : items;
  
  return (
    <form 
      action={action} 
      method={method}
      className="core-deletion-form"
    >
      {/* CSRF Protection */}
      {csrfToken && (
        <input type="hidden" name="_csrf" value={csrfToken} />
      )}
      
      {/* Mobile-optimized header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Confirm Deletion</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This action cannot be undone
        </p>
      </div>
      
      {/* Items to delete */}
      <div className="p-4 space-y-3">
        <fieldset>
          <legend className="text-sm font-medium mb-2">
            Items to be deleted ({itemsToDelete.length})
          </legend>
          
          {itemsToDelete.map((item, index) => (
            <label 
              key={item._id} 
              className="flex items-start gap-3 p-3 border rounded-lg mb-2"
            >
              <input
                type="checkbox"
                name="items[]"
                value={item._id}
                defaultChecked
                className="mt-1 h-4 w-4"
                aria-describedby={`item-desc-${index}`}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{item.title}</div>
                <div id={`item-desc-${index}`} className="text-xs text-muted-foreground">
                  SKU: {item.sku} • Type: {item.productType}
                </div>
              </div>
            </label>
          ))}
        </fieldset>
        
        {/* Deletion reason (optional) */}
        <div className="mt-4">
          <label htmlFor="reason" className="block text-sm font-medium mb-1">
            Reason for deletion (optional)
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Provide a reason for audit trail..."
          />
        </div>
        
        {/* Progressive enhancement hook */}
        <noscript>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <strong>Note:</strong> JavaScript is disabled. The page will reload after submission.
          </div>
        </noscript>
      </div>
      
      {/* Mobile-optimized actions */}
      <div className="p-4 border-t flex gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium
                   hover:bg-gray-50 active:bg-gray-100 transition-colors
                   touch-manipulation"
        >
          Cancel
        </button>
        <button
          type="submit"
          name="action"
          value="delete"
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium
                   hover:bg-red-700 active:bg-red-800 transition-colors
                   touch-manipulation"
        >
          Delete Items
        </button>
      </div>
    </form>
  );
}

/**
 * Core Layer Styles
 * Inline critical CSS for fastest render
 */
export const coreStyles = `
  .core-deletion-form {
    max-width: 100%;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  @media (min-width: 640px) {
    .core-deletion-form {
      max-width: 32rem;
      margin: 0 auto;
    }
  }
  
  /* Touch target optimization */
  .core-deletion-form button,
  .core-deletion-form input[type="checkbox"] {
    min-height: 44px;
    min-width: 44px;
  }
  
  /* Improve tap targets on mobile */
  @media (hover: none) {
    .core-deletion-form label {
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
    }
  }
  
  /* Reduce motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    .core-deletion-form * {
      transition: none !important;
    }
  }
`;