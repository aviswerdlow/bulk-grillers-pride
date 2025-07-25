import { ConvexError, v } from 'convex/values';
import { QueryCtx, MutationCtx, ActionCtx, DatabaseReader, DatabaseWriter } from '../_generated/server';
import { Doc, Id } from '../_generated/dataModel';

// Rate limit resources
export const RATE_LIMIT_RESOURCES = {
  // AI endpoints
  AI_CATEGORIZATION: 'ai.categorization',
  AI_VALIDATION: 'ai.validation',
  
  // Import/Export
  IMPORT_PRODUCTS: 'import.products',
  IMPORT_CATEGORIES: 'import.categories',
  EXPORT_PRODUCTS: 'export.products',
  
  // API endpoints
  API_PRODUCTS_READ: 'api.products.read',
  API_PRODUCTS_WRITE: 'api.products.write',
  API_CATEGORIES_READ: 'api.categories.read',
  API_CATEGORIES_WRITE: 'api.categories.write',
  
  // Organization management
  ORG_API_KEYS: 'org.apiKeys',
  ORG_SETTINGS: 'org.settings',
  
  // Bulk operations
  BULK_DELETE: 'bulk.delete',
  BULK_UPDATE: 'bulk.update',
} as const;

export type RateLimitResource = typeof RATE_LIMIT_RESOURCES[keyof typeof RATE_LIMIT_RESOURCES];

// Window durations in seconds
export const WINDOW_DURATIONS = {
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
} as const;

// Default rate limits by plan
export const DEFAULT_RATE_LIMITS: Record<string, Record<string, any>> = {
  free: {
    [RATE_LIMIT_RESOURCES.AI_CATEGORIZATION]: {
      requestsPerMinute: 5,
      requestsPerHour: 50,
      requestsPerDay: 200,
      tokensPerDay: 100000,
    },
    [RATE_LIMIT_RESOURCES.IMPORT_PRODUCTS]: {
      requestsPerHour: 2,
      requestsPerDay: 10,
    },
    [RATE_LIMIT_RESOURCES.API_PRODUCTS_WRITE]: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
    },
  },
  starter: {
    [RATE_LIMIT_RESOURCES.AI_CATEGORIZATION]: {
      requestsPerMinute: 20,
      requestsPerHour: 200,
      requestsPerDay: 1000,
      tokensPerDay: 500000,
    },
    [RATE_LIMIT_RESOURCES.IMPORT_PRODUCTS]: {
      requestsPerHour: 10,
      requestsPerDay: 50,
    },
    [RATE_LIMIT_RESOURCES.API_PRODUCTS_WRITE]: {
      requestsPerMinute: 50,
      requestsPerHour: 500,
    },
  },
  professional: {
    [RATE_LIMIT_RESOURCES.AI_CATEGORIZATION]: {
      requestsPerMinute: 50,
      requestsPerHour: 500,
      requestsPerDay: 5000,
      tokensPerDay: 2000000,
    },
    [RATE_LIMIT_RESOURCES.IMPORT_PRODUCTS]: {
      requestsPerHour: 50,
      requestsPerDay: 200,
    },
    [RATE_LIMIT_RESOURCES.API_PRODUCTS_WRITE]: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
    },
  },
  enterprise: {
    [RATE_LIMIT_RESOURCES.AI_CATEGORIZATION]: {
      requestsPerMinute: 200,
      requestsPerHour: 2000,
      requestsPerDay: 20000,
      tokensPerDay: 10000000,
    },
    [RATE_LIMIT_RESOURCES.IMPORT_PRODUCTS]: {
      requestsPerHour: 200,
      requestsPerDay: 1000,
    },
    [RATE_LIMIT_RESOURCES.API_PRODUCTS_WRITE]: {
      requestsPerMinute: 500,
      requestsPerHour: 5000,
    },
  },
};

interface RateLimitCheck {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

interface RateLimitOptions {
  resource: RateLimitResource;
  identifier: string;
  organizationId: Id<'organizations'>;
  userId?: Id<'users'>;
  tokensUsed?: number;
  cost?: number;
}

// Get rate limit configuration for a resource and plan
async function getRateLimitConfig(
  db: DatabaseReader,
  resource: string,
  plan: string
): Promise<Doc<'rateLimitConfigurations'> | null> {
  const config = await db
    .query('rateLimitConfigurations')
    .withIndex('by_resource_plan', (q) => 
      q.eq('resource', resource).eq('plan', plan)
    )
    .filter((q) => q.eq(q.field('isEnabled'), true))
    .first();
    
  return config;
}

// Get or create rate limit record
async function getOrCreateRateLimit(
  db: DatabaseWriter,
  options: RateLimitOptions,
  windowDuration: number,
  limit: number,
  tokenLimit?: number
): Promise<Doc<'rateLimits'>> {
  const now = Date.now();
  const windowStart = Math.floor(now / (windowDuration * 1000)) * (windowDuration * 1000);
  
  const existing = await db
    .query('rateLimits')
    .withIndex('by_identifier_resource', (q: any) =>
      q.eq('identifier', options.identifier).eq('resource', options.resource)
    )
    .filter((q: any) => q.eq(q.field('windowStart'), windowStart))
    .first();
    
  if (existing) {
    return existing;
  }
  
  // Create new rate limit record
  const rateLimitId = await db.insert('rateLimits', {
    organizationId: options.organizationId,
    userId: options.userId,
    identifier: options.identifier,
    resource: options.resource,
    windowStart,
    windowDuration,
    requestCount: 0,
    limit,
    tokensUsed: 0,
    tokenLimit,
    isBlocked: false,
    lastRequest: now,
    createdAt: now,
    updatedAt: now,
  });
  
  const newRecord = await db.get(rateLimitId);
  if (!newRecord) {
    throw new Error('Failed to create rate limit record');
  }
  
  return newRecord;
}

// Check if request is allowed under rate limits
export async function checkRateLimit(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  options: RateLimitOptions
): Promise<RateLimitCheck> {
  const db = 'db' in ctx ? ctx.db : (ctx as any).db;
  const now = Date.now();
  
  // Get organization to determine plan
  const organization = await db.get(options.organizationId);
  if (!organization) {
    throw new ConvexError('Organization not found');
  }
  
  const plan = organization.subscription.plan || 'free';
  
  // Get rate limit configuration
  const config = await getRateLimitConfig(db, options.resource, plan);
  const defaultLimits = DEFAULT_RATE_LIMITS[plan]?.[options.resource] || {};
  
  // Use configured limits or defaults
  const requestsPerMinute = config?.requestsPerMinute || defaultLimits.requestsPerMinute;
  const tokensPerDay = config?.tokensPerDay || defaultLimits.tokensPerDay;
  
  if (!requestsPerMinute) {
    // No rate limit configured for this resource
    return {
      allowed: true,
      limit: Infinity,
      remaining: Infinity,
      resetAt: now + WINDOW_DURATIONS.MINUTE * 1000,
    };
  }
  
  // Check minute-based rate limit
  const windowDuration = WINDOW_DURATIONS.MINUTE;
  const rateLimit = await getOrCreateRateLimit(
    db as DatabaseWriter,
    options,
    windowDuration,
    requestsPerMinute,
    tokensPerDay
  );
  
  // Check if currently blocked
  if (rateLimit.isBlocked && rateLimit.blockedUntil && rateLimit.blockedUntil > now) {
    return {
      allowed: false,
      limit: rateLimit.limit,
      remaining: 0,
      resetAt: rateLimit.blockedUntil,
      retryAfter: Math.ceil((rateLimit.blockedUntil - now) / 1000),
    };
  }
  
  // Check if window has expired
  const windowEnd = rateLimit.windowStart + (windowDuration * 1000);
  if (now >= windowEnd) {
    // Window has expired, this will be handled by creating a new record
    return {
      allowed: true,
      limit: requestsPerMinute,
      remaining: requestsPerMinute - 1,
      resetAt: windowEnd + (windowDuration * 1000),
    };
  }
  
  // Check request count
  const remaining = rateLimit.limit - rateLimit.requestCount;
  if (remaining <= 0) {
    return {
      allowed: false,
      limit: rateLimit.limit,
      remaining: 0,
      resetAt: windowEnd,
      retryAfter: Math.ceil((windowEnd - now) / 1000),
    };
  }
  
  // Check token limit for AI endpoints
  if (options.tokensUsed && rateLimit.tokenLimit) {
    const tokensRemaining = rateLimit.tokenLimit - (rateLimit.tokensUsed || 0);
    if (options.tokensUsed > tokensRemaining) {
      return {
        allowed: false,
        limit: rateLimit.tokenLimit,
        remaining: 0,
        resetAt: windowEnd,
        retryAfter: Math.ceil((windowEnd - now) / 1000),
      };
    }
  }
  
  return {
    allowed: true,
    limit: rateLimit.limit,
    remaining: remaining - 1,
    resetAt: windowEnd,
  };
}

// Consume rate limit
export async function consumeRateLimit(
  ctx: MutationCtx | ActionCtx,
  options: RateLimitOptions
): Promise<void> {
  const db = 'db' in ctx ? ctx.db : (ctx as any).db;
  const now = Date.now();
  
  // Get organization to determine plan
  const organization = await db.get(options.organizationId);
  if (!organization) {
    throw new ConvexError('Organization not found');
  }
  
  const plan = organization.subscription.plan || 'free';
  
  // Get rate limit configuration
  const config = await getRateLimitConfig(db, options.resource, plan);
  const defaultLimits = DEFAULT_RATE_LIMITS[plan]?.[options.resource] || {};
  
  const requestsPerMinute = config?.requestsPerMinute || defaultLimits.requestsPerMinute;
  const tokensPerDay = config?.tokensPerDay || defaultLimits.tokensPerDay;
  
  if (!requestsPerMinute) {
    // No rate limit configured
    return;
  }
  
  const windowDuration = WINDOW_DURATIONS.MINUTE;
  const windowStart = Math.floor(now / (windowDuration * 1000)) * (windowDuration * 1000);
  
  // Get existing rate limit record
  const existing = await db
    .query('rateLimits')
    .withIndex('by_identifier_resource', (q: any) =>
      q.eq('identifier', options.identifier).eq('resource', options.resource)
    )
    .filter((q: any) => q.eq(q.field('windowStart'), windowStart))
    .first();
    
  if (existing) {
    // Update existing record
    await db.patch(existing._id, {
      requestCount: existing.requestCount + 1,
      tokensUsed: options.tokensUsed ? (existing.tokensUsed || 0) + options.tokensUsed : existing.tokensUsed,
      lastRequest: now,
      updatedAt: now,
    });
  } else {
    // Create new record with first request
    await db.insert('rateLimits', {
      organizationId: options.organizationId,
      userId: options.userId,
      identifier: options.identifier,
      resource: options.resource,
      windowStart,
      windowDuration,
      requestCount: 1,
      limit: requestsPerMinute,
      tokensUsed: options.tokensUsed || 0,
      tokenLimit: tokensPerDay,
      isBlocked: false,
      lastRequest: now,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// Record rate limit violation
export async function recordViolation(
  ctx: MutationCtx | ActionCtx,
  options: RateLimitOptions & {
    endpoint: string;
    method: string;
    requestCount: number;
    limit: number;
    userAgent?: string;
    ipAddress?: string;
  }
): Promise<void> {
  const db = 'db' in ctx ? ctx.db : (ctx as any).db;
  const now = Date.now();
  
  // Calculate severity
  const ratio = options.requestCount / options.limit;
  let severity: 'low' | 'medium' | 'high' | 'critical';
  if (ratio < 2) {
    severity = 'low';
  } else if (ratio < 5) {
    severity = 'medium';
  } else if (ratio < 10) {
    severity = 'high';
  } else {
    severity = 'critical';
  }
  
  // Count violations in last 24 hours
  const dayAgo = now - (24 * 60 * 60 * 1000);
  const recentViolations = await db
    .query('rateLimitViolations')
    .withIndex('by_identifier_time', (q: any) =>
      q.eq('identifier', options.identifier).gte('timestamp', dayAgo)
    )
    .collect();
    
  const violationCount24h = recentViolations.length + 1;
  const isRepeatOffender = violationCount24h > 5;
  
  // Record violation
  await db.insert('rateLimitViolations', {
    organizationId: options.organizationId,
    userId: options.userId,
    identifier: options.identifier,
    resource: options.resource,
    timestamp: now,
    requestCount: options.requestCount,
    limit: options.limit,
    endpoint: options.endpoint,
    method: options.method,
    userAgent: options.userAgent,
    ipAddress: options.ipAddress,
    statusCode: 429,
    retryAfter: 60, // Default 60 seconds
    severity,
    violationCount24h,
    isRepeatOffender,
  });
  
  // Block repeat offenders
  if (isRepeatOffender) {
    const rateLimit = await db
      .query('rateLimits')
      .withIndex('by_identifier_resource', (q: any) =>
        q.eq('identifier', options.identifier).eq('resource', options.resource)
      )
      .order('desc')
      .first();
      
    if (rateLimit) {
      await db.patch(rateLimit._id, {
        isBlocked: true,
        blockedUntil: now + (5 * 60 * 1000), // Block for 5 minutes
        updatedAt: now,
      });
    }
  }
}

// Rate limit middleware for mutations
export function withRateLimit<Args extends Record<string, any>, Output>(
  resource: RateLimitResource,
  handler: (ctx: MutationCtx, args: Args) => Promise<Output>
) {
  return async (ctx: MutationCtx, args: Args): Promise<Output> => {
    // Get user and organization from auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError('Not authenticated');
    }
    
    // This is a simplified version - you'd need to get the actual user and org
    // from your auth system
    const userId = identity.subject as Id<'users'>;
    const organizationId = (args as any).organizationId as Id<'organizations'>;
    
    if (!organizationId) {
      throw new ConvexError('Organization ID required');
    }
    
    const rateLimitOptions: RateLimitOptions = {
      resource,
      identifier: userId,
      organizationId,
      userId,
    };
    
    // Check rate limit
    const rateLimitCheck = await checkRateLimit(ctx, rateLimitOptions);
    
    if (!rateLimitCheck.allowed) {
      // Record violation
      await recordViolation(ctx, {
        ...rateLimitOptions,
        endpoint: resource,
        method: 'MUTATION',
        requestCount: rateLimitCheck.limit + 1,
        limit: rateLimitCheck.limit,
      });
      
      throw new ConvexError({
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimitCheck.retryAfter,
        limit: rateLimitCheck.limit,
        resetAt: rateLimitCheck.resetAt,
      });
    }
    
    // Consume rate limit
    await consumeRateLimit(ctx, rateLimitOptions);
    
    // Execute the actual handler
    return handler(ctx, args);
  };
}

// Helper to get rate limit status for a user
export async function getRateLimitStatus(
  ctx: QueryCtx,
  organizationId: Id<'organizations'>,
  userId: Id<'users'>,
  resource: RateLimitResource
): Promise<{
  limits: Record<string, number>;
  usage: Record<string, number>;
  resetTimes: Record<string, number>;
}> {
  const db = 'db' in ctx ? ctx.db : (ctx as any).db;
  const now = Date.now();
  
  // Get organization plan
  const organization = await db.get(organizationId);
  if (!organization) {
    throw new ConvexError('Organization not found');
  }
  
  const plan = organization.subscription.plan || 'free';
  const config = await getRateLimitConfig(db, resource, plan);
  const defaultLimits = DEFAULT_RATE_LIMITS[plan]?.[resource] || {};
  
  const limits: Record<string, number> = {
    requestsPerMinute: config?.requestsPerMinute || defaultLimits.requestsPerMinute || 0,
    requestsPerHour: config?.requestsPerHour || defaultLimits.requestsPerHour || 0,
    requestsPerDay: config?.requestsPerDay || defaultLimits.requestsPerDay || 0,
    tokensPerDay: config?.tokensPerDay || defaultLimits.tokensPerDay || 0,
  };
  
  const usage: Record<string, number> = {};
  const resetTimes: Record<string, number> = {};
  
  // Get usage for each window
  for (const [windowName, duration] of Object.entries(WINDOW_DURATIONS)) {
    const windowStart = Math.floor(now / (duration * 1000)) * (duration * 1000);
    const windowEnd = windowStart + (duration * 1000);
    
    const rateLimit = await db
      .query('rateLimits')
      .withIndex('by_identifier_resource', (q: any) =>
        q.eq('identifier', userId).eq('resource', resource)
      )
      .filter((q: any) => q.gte(q.field('windowStart'), windowStart - duration * 1000))
      .order('desc')
      .first();
      
    if (rateLimit && rateLimit.windowStart >= windowStart) {
      usage[`requests${windowName}`] = rateLimit.requestCount;
      if (windowName === 'DAY') {
        usage.tokensDay = rateLimit.tokensUsed || 0;
      }
    } else {
      usage[`requests${windowName}`] = 0;
      if (windowName === 'DAY') {
        usage.tokensDay = 0;
      }
    }
    
    resetTimes[windowName.toLowerCase()] = windowEnd;
  }
  
  return { limits, usage, resetTimes };
}