/**
 * Cache configuration and TTL settings for multi-layer caching strategy
 * Based on ADR-003-caching-strategy.md
 */

export interface CacheConfig {
  ttl: number; // TTL in seconds
  invalidateOn: string[]; // Event patterns that trigger invalidation
  maxSize?: number; // Maximum number of items to cache
  refreshInterval?: number; // Background refresh interval in seconds
}

/**
 * Cache configuration by data type
 * These settings balance freshness requirements with performance gains
 */
export const CACHE_CONFIG = {
  // Frequently accessed, rarely changed
  staticData: {
    categories: {
      ttl: 3600, // 1 hour
      invalidateOn: ['category.created', 'category.updated', 'category.deleted'],
    },
    organizationSettings: {
      ttl: 1800, // 30 minutes
      invalidateOn: ['settings.updated', 'organization.updated'],
    },
    aiProviderConfigs: {
      ttl: 600, // 10 minutes
      invalidateOn: ['config.updated', 'organization.settings.updated'],
    },
  },

  // User-specific data
  userData: {
    permissions: {
      ttl: 300, // 5 minutes
      invalidateOn: ['membership.created', 'membership.updated', 'membership.deleted', 'role.updated'],
    },
    preferences: {
      ttl: 900, // 15 minutes
      invalidateOn: ['preference.updated', 'user.updated'],
    },
    currentOrganization: {
      ttl: 300, // 5 minutes
      invalidateOn: ['user.switchOrganization', 'membership.updated'],
    },
  },

  // Computed/aggregated data
  computedData: {
    productCounts: {
      ttl: 300, // 5 minutes
      invalidateOn: ['product.created', 'product.deleted', 'product.restored'],
    },
    categoryTrees: {
      ttl: 1800, // 30 minutes
      invalidateOn: ['category.created', 'category.updated', 'category.deleted', 'category.moved'],
    },
    dashboardStats: {
      ttl: 60, // 1 minute
      refreshInterval: 30, // Refresh every 30 seconds
      invalidateOn: ['product.created', 'product.updated', 'product.deleted', 'category.assigned'],
    },
    deletionStats: {
      ttl: 300, // 5 minutes
      invalidateOn: ['product.deleted', 'product.restored', 'trash.cleaned'],
    },
  },

  // Search and filter results
  searchResults: {
    productSearch: {
      ttl: 120, // 2 minutes
      maxSize: 100,
      invalidateOn: ['product.created', 'product.updated', 'product.deleted'],
    },
    categoryFilter: {
      ttl: 300, // 5 minutes
      invalidateOn: ['product.categorized', 'category.assigned', 'category.removed'],
    },
    trashSearch: {
      ttl: 120, // 2 minutes
      maxSize: 50,
      invalidateOn: ['product.deleted', 'product.restored', 'trash.cleaned'],
    },
  },

  // AI-related caching
  aiData: {
    categorizationSuggestions: {
      ttl: 3600, // 1 hour - AI suggestions are expensive to compute
      invalidateOn: ['product.updated', 'category.structure.changed'],
    },
    jobResults: {
      ttl: 86400, // 24 hours - Completed job results
      invalidateOn: ['job.reprocessed'],
    },
    providerStatus: {
      ttl: 60, // 1 minute - Provider availability
      invalidateOn: ['provider.status.changed'],
    },
  },

  // File and media caching
  mediaData: {
    imageUrls: {
      ttl: 3600, // 1 hour
      invalidateOn: ['image.updated', 'image.deleted'],
    },
    thumbnails: {
      ttl: 86400, // 24 hours
      invalidateOn: ['image.regenerated'],
    },
  },
} as const;

/**
 * Cache key prefixes for different data types
 * Used to organize and namespace cache keys
 */
export const CACHE_KEY_PREFIXES = {
  // Organization-scoped keys
  org: (orgId: string) => `org:${orgId}`,
  
  // Project-scoped keys
  project: (orgId: string, projectId: string) => `org:${orgId}:project:${projectId}`,
  
  // User-scoped keys
  user: (userId: string) => `user:${userId}`,
  
  // Combined scopes
  userOrg: (userId: string, orgId: string) => `user:${userId}:org:${orgId}`,
  
  // Data type prefixes
  categories: 'categories',
  products: 'products',
  search: 'search',
  stats: 'stats',
  permissions: 'permissions',
  settings: 'settings',
  ai: 'ai',
  trash: 'trash',
} as const;

/**
 * Generate a cache key with proper namespacing
 */
export function generateCacheKey(
  scope: 'org' | 'project' | 'user' | 'userOrg',
  dataType: keyof typeof CACHE_KEY_PREFIXES,
  ids: Record<string, string>,
  ...additionalParts: string[]
): string {
  let key = '';
  
  // Add scope prefix
  switch (scope) {
    case 'org':
      key = CACHE_KEY_PREFIXES.org(ids.orgId!);
      break;
    case 'project':
      key = CACHE_KEY_PREFIXES.project(ids.orgId!, ids.projectId!);
      break;
    case 'user':
      key = CACHE_KEY_PREFIXES.user(ids.userId!);
      break;
    case 'userOrg':
      key = CACHE_KEY_PREFIXES.userOrg(ids.userId!, ids.orgId!);
      break;
  }
  
  // Add data type
  key += `:${CACHE_KEY_PREFIXES[dataType] || dataType}`;
  
  // Add additional parts
  if (additionalParts.length > 0) {
    key += `:${additionalParts.join(':')}`;
  }
  
  return key;
}

/**
 * Cache warming configuration
 * Defines which caches should be pre-warmed on startup or schedule
 */
export const CACHE_WARMING_CONFIG = {
  onStartup: [
    'categories', // Load category tree on startup
    'organizationSettings', // Load org settings
  ],
  scheduled: {
    dashboardStats: {
      interval: 30, // Warm every 30 seconds
      priority: 'high',
    },
    productCounts: {
      interval: 300, // Warm every 5 minutes
      priority: 'medium',
    },
  },
};

/**
 * Browser cache headers configuration
 */
export const BROWSER_CACHE_CONFIG = {
  static: {
    maxAge: 31536000, // 1 year for static assets
    sMaxAge: 31536000,
    immutable: true,
  },
  api: {
    categories: {
      maxAge: 300, // 5 minutes
      sMaxAge: 3600, // 1 hour at CDN
      staleWhileRevalidate: 86400, // 1 day
    },
    products: {
      maxAge: 60, // 1 minute
      sMaxAge: 300, // 5 minutes at CDN
      staleWhileRevalidate: 3600, // 1 hour
    },
    search: {
      maxAge: 0, // No browser cache
      sMaxAge: 120, // 2 minutes at CDN
      staleWhileRevalidate: 300, // 5 minutes
    },
  },
};