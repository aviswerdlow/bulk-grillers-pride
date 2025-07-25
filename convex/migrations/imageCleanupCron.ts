import { internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import { CASCADE_DELETION_FLAGS, MIGRATION_CONFIG } from './001_cascade_deletion_schema';

/**
 * Image Cleanup Cron Job
 * 
 * Processes the imageCleanupQueue to delete orphaned images from storage
 * Runs every 5 minutes to clean up images from deleted products
 * 
 * Author: migration-agent
 * Issue: #67
 */

// Process a batch of images from the cleanup queue
export const processImageCleanupQueue = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if cleanup queue is enabled
    if (!CASCADE_DELETION_FLAGS.USE_IMAGE_CLEANUP_QUEUE) {
      return {
        success: false,
        message: 'Image cleanup queue is disabled by feature flag',
        processed: 0,
      };
    }

    const batchSize = args.batchSize || MIGRATION_CONFIG.CLEANUP_BATCH_SIZE;
    const now = Date.now();
    
    try {
      // Get pending images that are past their retention time
      const pendingImages = await ctx.db
        .query('imageCleanupQueue')
        .withIndex('by_status', (q) => q.eq('status', 'pending'))
        .filter((q) => q.lte(q.field('retainUntil'), now))
        .take(batchSize);

      if (pendingImages.length === 0) {
        return {
          success: true,
          message: 'No images ready for cleanup',
          processed: 0,
        };
      }

      const results = {
        processed: 0,
        deleted: 0,
        failed: 0,
        skipped: 0,
        errors: [] as Array<{ storageId: string; error: string }>,
      };

      // Process each image
      for (const image of pendingImages) {
        try {
          // Skip if permanent retention is set
          if (image.permanentRetention) {
            await ctx.db.patch(image._id, {
              status: 'skipped',
              processedAt: now,
              lastError: {
                message: 'Permanent retention enabled',
                code: 'PERMANENT_RETENTION',
                timestamp: now,
              },
            });
            results.skipped++;
            continue;
          }

          // Update status to processing
          await ctx.db.patch(image._id, {
            status: 'processing',
            processingStartedAt: now,
            attempts: image.attempts + 1,
          });

          if (args.dryRun) {
            // In dry run mode, just mark as would be deleted
            console.log(`[DRY RUN] Would delete image: ${image.storageId}`);
            
            await ctx.db.patch(image._id, {
              status: 'pending',
              attempts: image.attempts, // Don't increment in dry run
              lastError: {
                message: 'Dry run - no action taken',
                code: 'DRY_RUN',
                timestamp: now,
              },
            });
            results.processed++;
            continue;
          }

          // Attempt to delete from storage
          try {
            await ctx.storage.delete(image.storageId);
            
            // Mark as completed
            await ctx.db.patch(image._id, {
              status: 'completed',
              processedAt: now,
              verifiedDeleted: true,
              verificationMethod: 'storage_api',
            });
            
            results.deleted++;
          } catch (storageError: any) {
            // Handle specific storage errors
            if (storageError.message?.includes('not found')) {
              // Image already deleted, mark as completed
              await ctx.db.patch(image._id, {
                status: 'completed',
                processedAt: now,
                verifiedDeleted: true,
                verificationMethod: 'storage_api',
                lastError: {
                  message: 'Image not found in storage (already deleted)',
                  code: 'NOT_FOUND',
                  timestamp: now,
                },
              });
              results.deleted++;
            } else {
              throw storageError;
            }
          }
        } catch (error: any) {
          // Handle processing errors
          const isLastAttempt = image.attempts >= image.maxAttempts;
          
          await ctx.db.patch(image._id, {
            status: isLastAttempt ? 'failed' : 'pending',
            lastAttemptAt: now,
            lastError: {
              message: error.message || 'Unknown error',
              code: error.code || 'UNKNOWN',
              timestamp: now,
            },
            processedAt: isLastAttempt ? now : undefined,
          });
          
          results.failed++;
          results.errors.push({
            storageId: image.storageId,
            error: error.message,
          });
          
          // Log error for monitoring
          console.error(`Failed to delete image ${image.storageId}:`, error);
        } finally {
          results.processed++;
        }
      }

      // Log summary for monitoring
      console.log('Image cleanup batch completed:', {
        processed: results.processed,
        deleted: results.deleted,
        failed: results.failed,
        skipped: results.skipped,
      });

      return {
        success: true,
        message: `Processed ${results.processed} images`,
        ...results,
      };
    } catch (error: any) {
      console.error('Image cleanup queue processing failed:', error);
      
      return {
        success: false,
        message: 'Queue processing failed',
        error: error.message,
        processed: 0,
      };
    }
  },
});

// Clean up completed/failed entries older than 30 days
export const cleanupQueueHistory = internalMutation({
  args: {
    daysToKeep: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const daysToKeep = args.daysToKeep || 30;
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    try {
      // Find old completed/failed entries
      const oldEntries = await ctx.db
        .query('imageCleanupQueue')
        .withIndex('by_status')
        .filter((q) => 
          q.and(
            q.or(
              q.eq(q.field('status'), 'completed'),
              q.eq(q.field('status'), 'failed'),
              q.eq(q.field('status'), 'skipped')
            ),
            q.lte(q.field('processedAt'), cutoffTime)
          )
        )
        .collect();

      if (oldEntries.length === 0) {
        return {
          success: true,
          message: 'No old entries to clean up',
          deleted: 0,
        };
      }

      if (args.dryRun) {
        return {
          success: true,
          message: `[DRY RUN] Would delete ${oldEntries.length} old entries`,
          deleted: 0,
          wouldDelete: oldEntries.length,
        };
      }

      // Delete old entries
      let deleted = 0;
      for (const entry of oldEntries) {
        await ctx.db.delete(entry._id);
        deleted++;
      }

      console.log(`Cleaned up ${deleted} old image cleanup queue entries`);

      return {
        success: true,
        message: `Deleted ${deleted} old entries`,
        deleted,
      };
    } catch (error: any) {
      console.error('Queue history cleanup failed:', error);
      
      return {
        success: false,
        message: 'History cleanup failed',
        error: error.message,
        deleted: 0,
      };
    }
  },
});

// Get queue statistics for monitoring
export const getQueueStats = internalMutation({
  handler: async (ctx) => {
    try {
      const stats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
        cancelled: 0,
        readyForProcessing: 0,
        futureRetention: 0,
        permanentRetention: 0,
        oldestPending: null as Date | null,
        newestPending: null as Date | null,
      };

      // Count by status
      const allEntries = await ctx.db.query('imageCleanupQueue').collect();
      const now = Date.now();

      for (const entry of allEntries) {
        stats[entry.status]++;
        
        if (entry.status === 'pending') {
          if (entry.retainUntil <= now) {
            stats.readyForProcessing++;
          } else {
            stats.futureRetention++;
          }
          
          if (entry.permanentRetention) {
            stats.permanentRetention++;
          }
          
          // Track oldest and newest
          const queuedDate = new Date(entry.queuedAt);
          if (!stats.oldestPending || queuedDate < stats.oldestPending) {
            stats.oldestPending = queuedDate;
          }
          if (!stats.newestPending || queuedDate > stats.newestPending) {
            stats.newestPending = queuedDate;
          }
        }
      }

      return {
        success: true,
        stats,
        totalEntries: allEntries.length,
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error('Failed to get queue stats:', error);
      
      return {
        success: false,
        error: error.message,
        stats: null,
      };
    }
  },
});

// Note: Cron jobs are registered in convex/crons.ts