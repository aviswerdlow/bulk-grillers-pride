/**
 * Progressive Deletion Component
 * Dynamically loads appropriate layer based on device capabilities
 */

'use client';

import { lazy, Suspense, useEffect, useState } from 'react';
import { Product } from '@/types/models';
import { 
  detectCapabilities, 
  selectLayer, 
  getLayerPreference,
  saveLayerPreference,
  type EnhancementLayer 
} from '@/lib/progressive-enhancement/layer-detection';
import { CoreDeletionForm, coreStyles } from './CoreDeletionForm';

// Lazy load enhanced layers
const EnhancedDeletionForm = lazy(() => 
  import(
    /* webpackChunkName: "deletion-enhanced" */
    /* webpackPrefetch: true */
    './EnhancedDeletionForm'
  ).then(mod => ({ default: mod.EnhancedDeletionForm }))
);

const OptimalDeletionWizard = lazy(() => 
  import(
    /* webpackChunkName: "deletion-optimal" */
    './OptimalDeletionWizard'
  ).then(mod => ({ default: mod.OptimalDeletionWizard }))
);

interface ProgressiveDeletionProps {
  product?: Product;
  items?: Product[];
  onDelete?: (itemIds: string[], reason?: string) => Promise<void>;
  onCancel?: () => void;
  forceLayer?: EnhancementLayer;
  showLayerSelector?: boolean;
}

export function ProgressiveDeletion({
  product,
  items = [],
  onDelete,
  onCancel,
  forceLayer,
  showLayerSelector = false
}: ProgressiveDeletionProps) {
  const [layer, setLayer] = useState<EnhancementLayer>('core');
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    // Detect layer on client side only
    setIsClient(true);
    
    // Check user preference first
    const preference = getLayerPreference();
    if (preference && !forceLayer) {
      setLayer(preference);
      return;
    }
    
    // Detect capabilities and select layer
    const capabilities = detectCapabilities();
    const selectedLayer = selectLayer(capabilities, forceLayer);
    setLayer(selectedLayer);
    
    // Preload next layer if performance allows
    if (selectedLayer === 'core' && capabilities.memory >= 2) {
      import('./EnhancedDeletionForm');
    } else if (selectedLayer === 'enhanced' && capabilities.memory >= 4) {
      import('./OptimalDeletionWizard');
    }
  }, [forceLayer]);
  
  const handleLayerChange = (newLayer: EnhancementLayer) => {
    setLayer(newLayer);
    saveLayerPreference(newLayer);
  };
  
  // Inject critical styles for core layer
  useEffect(() => {
    if (layer === 'core' && typeof document !== 'undefined') {
      const styleId = 'progressive-deletion-core-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = coreStyles;
        document.head.appendChild(style);
      }
    }
  }, [layer]);
  
  // Loading fallback component
  const LoadingFallback = () => (
    <div className="p-8 text-center">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto" />
      </div>
    </div>
  );
  
  return (
    <div className="progressive-deletion-container">
      {/* Layer selector for testing/demo */}
      {showLayerSelector && isClient && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium mb-2">
            Enhancement Layer (for testing)
          </label>
          <select
            value={layer}
            onChange={(e) => handleLayerChange(e.target.value as EnhancementLayer)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="core">Core (No JS, &lt;50KB)</option>
            <option value="enhanced">Enhanced (Minimal JS, &lt;100KB)</option>
            <option value="optimal">Optimal (Full Features, &lt;150KB)</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Current bundle: ~{layer === 'core' ? '50' : layer === 'enhanced' ? '100' : '150'}KB
          </p>
        </div>
      )}
      
      {/* Progressive enhancement layers */}
      {!isClient || layer === 'core' ? (
        // Core layer - no JS required
        <CoreDeletionForm
          product={product}
          items={items}
        />
      ) : layer === 'enhanced' ? (
        // Enhanced layer - minimal JS
        <Suspense fallback={<LoadingFallback />}>
          <EnhancedDeletionForm
            product={product}
            items={items}
            onDelete={onDelete}
            onCancel={onCancel}
          />
        </Suspense>
      ) : (
        // Optimal layer - full features
        <Suspense fallback={<LoadingFallback />}>
          <OptimalDeletionWizard
            product={product}
            items={items}
            onDelete={onDelete}
            onCancel={onCancel}
          />
        </Suspense>
      )}
      
      {/* Performance indicator */}
      {process.env.NODE_ENV === 'development' && isClient && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          Layer: {layer} | 
          Memory: {(navigator as any).deviceMemory || 'unknown'}GB | 
          Connection: {(navigator as any).connection?.effectiveType || 'unknown'}
        </div>
      )}
    </div>
  );
}

// Export individual components for testing
export { CoreDeletionForm, EnhancedDeletionForm, OptimalDeletionWizard };