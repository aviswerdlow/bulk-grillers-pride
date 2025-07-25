/**
 * Progressive Enhancement Layer Detection
 * Determines which layer to load based on device capabilities
 */

export type EnhancementLayer = 'core' | 'enhanced' | 'optimal';

export interface DeviceCapabilities {
  touch: boolean;
  memory: number; // GB
  connection: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  saveData: boolean;
  screenWidth: number;
  devicePixelRatio: number;
}

/**
 * Detect device capabilities
 */
interface NavigatorWithExtensions extends Navigator {
  deviceMemory?: number;
  connection?: {
    effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
    saveData?: boolean;
  };
  maxTouchPoints?: number;
}

export function detectCapabilities(): DeviceCapabilities {
  const nav = navigator as NavigatorWithExtensions;
  
  return {
    touch: 'ontouchstart' in window || nav.maxTouchPoints > 0,
    memory: nav.deviceMemory || 4,
    connection: nav.connection?.effectiveType || 'unknown',
    saveData: nav.connection?.saveData || false,
    screenWidth: window.screen.width,
    devicePixelRatio: window.devicePixelRatio || 1
  };
}

/**
 * Calculate performance score (0-100)
 */
function calculatePerformanceScore(capabilities: DeviceCapabilities): number {
  let score = 0;
  
  // Memory score (0-30)
  if (capabilities.memory >= 4) score += 30;
  else if (capabilities.memory >= 2) score += 20;
  else score += 10;
  
  // Connection score (0-40)
  switch (capabilities.connection) {
    case '4g': score += 40; break;
    case '3g': score += 25; break;
    case '2g': score += 10; break;
    case 'slow-2g': score += 5; break;
    default: score += 20; // Unknown, assume moderate
  }
  
  // Save data penalty
  if (capabilities.saveData) score -= 20;
  
  // Screen size score (0-30)
  if (capabilities.screenWidth >= 768) score += 30;
  else if (capabilities.screenWidth >= 480) score += 20;
  else score += 10;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Select appropriate enhancement layer
 */
export function selectLayer(
  capabilities?: DeviceCapabilities,
  forceLayer?: EnhancementLayer
): EnhancementLayer {
  // Allow manual override
  if (forceLayer) return forceLayer;
  
  // Check URL params for testing
  const params = new URLSearchParams(window.location.search);
  const urlLayer = params.get('layer') as EnhancementLayer;
  if (urlLayer && ['core', 'enhanced', 'optimal'].includes(urlLayer)) {
    return urlLayer;
  }
  
  // Use provided or detect capabilities
  const caps = capabilities || detectCapabilities();
  const score = calculatePerformanceScore(caps);
  
  // Layer selection thresholds
  if (score >= 70 && !caps.saveData) return 'optimal';
  if (score >= 40) return 'enhanced';
  return 'core';
}

/**
 * Get layer-specific bundle limits
 */
export function getLayerBudget(layer: EnhancementLayer): {
  maxSize: number;
  features: string[];
} {
  switch (layer) {
    case 'core':
      return {
        maxSize: 50 * 1024, // 50KB
        features: ['forms', 'basic-validation', 'css-only']
      };
    case 'enhanced':
      return {
        maxSize: 100 * 1024, // 100KB total
        features: ['progressive-forms', 'touch', 'basic-react']
      };
    case 'optimal':
      return {
        maxSize: 150 * 1024, // 150KB total
        features: ['full-wizard', 'visualizations', 'animations']
      };
  }
}

/**
 * Storage key for user preference
 */
const LAYER_PREFERENCE_KEY = 'bgp_enhancement_layer';

/**
 * Save user's layer preference
 */
export function saveLayerPreference(layer: EnhancementLayer): void {
  try {
    localStorage.setItem(LAYER_PREFERENCE_KEY, layer);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get user's layer preference
 */
export function getLayerPreference(): EnhancementLayer | null {
  try {
    return localStorage.getItem(LAYER_PREFERENCE_KEY) as EnhancementLayer;
  } catch {
    return null;
  }
}