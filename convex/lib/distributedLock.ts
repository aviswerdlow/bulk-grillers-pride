import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { Doc } from '../_generated/dataModel';

/**
 * Distributed Lock Manager for Convex
 * 
 * Provides pessimistic locking to prevent concurrent operations on resources.
 * Supports exclusive and shared locks with automatic expiration.
 * 
 * Author: backend-agent
 * Issue: #67 - Prevent concurrent deletion conflicts
 */

// Lock configuration
const LOCK_CONFIG = {
  DEFAULT_TIMEOUT_MS: 30000, // 30 seconds
  MAX_TIMEOUT_MS: 300000, // 5 minutes
  RENEWAL_THRESHOLD_MS: 5000, // Renew when 5 seconds left
  MAX_RENEWALS: 10, // Maximum number of renewals
  CLEANUP_INTERVAL_MS: 60000, // 1 minute
};

/**
 * Acquire a distributed lock on a resource
 */
export const acquireLock = mutation({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
    operation: v.string(),
    lockType: v.optional(v.union(v.literal('exclusive'), v.literal('shared'))),
    timeoutMs: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();
    
    if (!user) throw new Error('User not found');

    // Check organization from resource
    let organizationId: string | null = null;
    
    if (args.resourceType === 'product') {
      const product = await ctx.db.get(args.resourceId as any);
      if (product && 'organizationId' in product) {
        organizationId = (product as any).organizationId;
      }
    }
    
    if (!organizationId) {
      throw new Error('Could not determine organization for resource');
    }

    const lockType = args.lockType || 'exclusive';
    const timeoutMs = Math.min(args.timeoutMs || LOCK_CONFIG.DEFAULT_TIMEOUT_MS, LOCK_CONFIG.MAX_TIMEOUT_MS);
    const now = Date.now();
    const expiresAt = now + timeoutMs;
    const lockId = `lock_${args.resourceType}_${args.resourceId}_${now}_${Math.random().toString(36).substring(7)}`;

    // Check for existing locks
    const existingLocks = await ctx.db
      .query('distributedLocks')
      .withIndex('by_resource', (q) => 
        q.eq('resourceType', args.resourceType)
         .eq('resourceId', args.resourceId)
         .eq('status', 'active')
      )
      .collect();

    // Clean up expired locks
    const activeLocks = [];
    for (const lock of existingLocks) {
      if (lock.expiresAt < now) {
        // Mark as expired
        await ctx.db.patch(lock._id, { status: 'expired' });
      } else {
        activeLocks.push(lock);
      }
    }

    // Check lock compatibility
    if (activeLocks.length > 0) {
      if (lockType === 'exclusive') {
        // Exclusive lock requested but resource is already locked
        throw new Error(`Resource ${args.resourceType}:${args.resourceId} is already locked`);
      }
      
      // Shared lock requested
      const hasExclusiveLock = activeLocks.some(lock => lock.lockType === 'exclusive');
      if (hasExclusiveLock) {
        throw new Error(`Resource ${args.resourceType}:${args.resourceId} has an exclusive lock`);
      }
    }

    // Create the lock
    const lockDocId = await ctx.db.insert('distributedLocks', {
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      organizationId: organizationId as any,
      lockId,
      lockType,
      operation: args.operation,
      ownerId: user._id,
      ownerType: 'user',
      acquiredAt: now,
      expiresAt,
      renewCount: 0,
      maxRenewals: LOCK_CONFIG.MAX_RENEWALS,
      status: 'active',
      metadata: args.metadata,
      reason: `${args.operation} operation by ${user.email}`,
    });

    return {
      success: true,
      lockId,
      expiresAt,
      timeoutMs,
    };
  },
});

/**
 * Release a distributed lock
 */
export const releaseLock = mutation({
  args: {
    lockId: v.string(),
  },
  handler: async (ctx, args) => {
    const lock = await ctx.db
      .query('distributedLocks')
      .filter((q) => 
        q.and(
          q.eq(q.field('lockId'), args.lockId),
          q.eq(q.field('status'), 'active')
        )
      )
      .first();

    if (!lock) {
      return {
        success: false,
        message: 'Lock not found or already released',
      };
    }

    // Verify ownership
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user || lock.ownerId !== user._id) {
      throw new Error('Only the lock owner can release it');
    }

    // Release the lock
    await ctx.db.patch(lock._id, {
      status: 'released',
    });

    return {
      success: true,
      message: 'Lock released successfully',
    };
  },
});

/**
 * Renew a distributed lock
 */
export const renewLock = mutation({
  args: {
    lockId: v.string(),
    extensionMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lock = await ctx.db
      .query('distributedLocks')
      .filter((q) => 
        q.and(
          q.eq(q.field('lockId'), args.lockId),
          q.eq(q.field('status'), 'active')
        )
      )
      .first();

    if (!lock) {
      return {
        success: false,
        message: 'Lock not found or expired',
      };
    }

    // Verify ownership
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user || lock.ownerId !== user._id) {
      throw new Error('Only the lock owner can renew it');
    }

    // Check renewal limit
    if (lock.renewCount >= lock.maxRenewals) {
      throw new Error('Maximum renewal limit reached');
    }

    const now = Date.now();
    const extensionMs = Math.min(
      args.extensionMs || LOCK_CONFIG.DEFAULT_TIMEOUT_MS,
      LOCK_CONFIG.MAX_TIMEOUT_MS
    );
    const newExpiresAt = now + extensionMs;

    // Renew the lock
    await ctx.db.patch(lock._id, {
      expiresAt: newExpiresAt,
      renewedAt: now,
      renewCount: lock.renewCount + 1,
    });

    return {
      success: true,
      newExpiresAt,
      renewalsRemaining: lock.maxRenewals - lock.renewCount - 1,
    };
  },
});

/**
 * Check if a resource is locked
 */
export const isResourceLocked = query({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const activeLocks = await ctx.db
      .query('distributedLocks')
      .withIndex('by_resource', (q) => 
        q.eq('resourceType', args.resourceType)
         .eq('resourceId', args.resourceId)
         .eq('status', 'active')
      )
      .filter((q) => q.gt(q.field('expiresAt'), now))
      .collect();

    return {
      isLocked: activeLocks.length > 0,
      lockCount: activeLocks.length,
      locks: activeLocks.map(lock => ({
        lockId: lock.lockId,
        lockType: lock.lockType,
        operation: lock.operation,
        expiresAt: lock.expiresAt,
        remainingMs: lock.expiresAt - now,
      })),
    };
  },
});

/**
 * Utility function to execute an operation with a lock
 */
export async function withLock<T>(
  ctx: any,
  resourceType: string,
  resourceId: string,
  operation: string,
  callback: () => Promise<T>,
  options?: {
    lockType?: 'exclusive' | 'shared';
    timeoutMs?: number;
    metadata?: any;
  }
): Promise<T> {
  let lockId: string | null = null;
  
  try {
    // Acquire lock
    const lockResult = await ctx.runMutation(acquireLock, {
      resourceType,
      resourceId,
      operation,
      lockType: options?.lockType,
      timeoutMs: options?.timeoutMs,
      metadata: options?.metadata,
    });
    
    lockId = lockResult.lockId;
    
    // Execute operation
    return await callback();
  } finally {
    // Always release lock
    if (lockId) {
      try {
        await ctx.runMutation(releaseLock, { lockId });
      } catch (error) {
        console.error('Failed to release lock:', error);
      }
    }
  }
}