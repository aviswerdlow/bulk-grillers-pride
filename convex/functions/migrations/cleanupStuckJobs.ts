import { internalMutation } from '../../_generated/server';
import { Doc, Id } from '../../_generated/dataModel';

/**
 * Migration to clean up stuck AI categorization jobs
 * This will find all jobs that are stuck in 'running' state and cancel them
 */
export const cleanupStuckCategorizationJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log('[MIGRATION] Starting cleanup of stuck categorization jobs...');
    
    // Find all jobs in 'running' state
    const runningJobs = await ctx.db
      .query('aiCategorizationJobs')
      .filter((q) => q.eq(q.field('status'), 'running'))
      .collect();
    
    console.log(`[MIGRATION] Found ${runningJobs.length} jobs in 'running' state`);
    
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000); // 1 hour in milliseconds
    
    let cancelledCount = 0;
    const results = [];
    
    for (const job of runningJobs) {
      // Check if job has been running for more than 1 hour (likely stuck)
      const startedAt = job.startedAt || job.createdAt;
      const isStuck = startedAt < oneHourAgo;
      
      if (isStuck) {
        // Cancel the stuck job
        await ctx.db.patch(job._id, {
          status: 'cancelled',
          completedAt: now,
          executionTime: now - startedAt,
          updatedAt: now,
          // Add error to the errors array
          errors: [
            ...(job.errors || []),
            {
              type: 'stuck_job_cleanup',
              message: 'Job was stuck in running state for over 1 hour and was cancelled by cleanup migration',
              timestamp: now,
            },
          ],
        });
        
        cancelledCount++;
        results.push({
          jobId: job._id,
          organizationId: job.organizationId,
          projectId: job.projectId,
          startedAt: new Date(startedAt).toISOString(),
          runningDuration: Math.round((now - startedAt) / 1000), // seconds
          status: 'cancelled',
        });
        
        console.log(
          `[MIGRATION] Cancelled stuck job ${job._id} (running for ${Math.round((now - startedAt) / 1000 / 60)} minutes)`
        );
      }
    }
    
    console.log(`[MIGRATION] Cleanup complete. Cancelled ${cancelledCount} stuck jobs`);
    
    return {
      success: true,
      totalRunningJobs: runningJobs.length,
      cancelledJobs: cancelledCount,
      results,
    };
  },
});

/**
 * Admin function to manually cancel specific jobs
 * Use this to cancel specific jobs by their IDs
 */
export const cancelSpecificJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Hardcoded job IDs from the user's screenshot/report
    // These are the 4 jobs that were stuck
    const jobIdsToCancel: Id<'aiCategorizationJobs'>[] = [
      // Add the specific job IDs here if known
      // For now, we'll cancel all running jobs as requested
    ];
    
    const now = Date.now();
    const results = [];
    
    // If no specific IDs, cancel all running jobs
    if (jobIdsToCancel.length === 0) {
      const runningJobs = await ctx.db
        .query('aiCategorizationJobs')
        .filter((q) => q.eq(q.field('status'), 'running'))
        .collect();
      
      console.log(`[ADMIN] Found ${runningJobs.length} running jobs to cancel`);
      
      for (const job of runningJobs) {
        await ctx.db.patch(job._id, {
          status: 'cancelled',
          completedAt: now,
          executionTime: job.startedAt ? now - job.startedAt : 0,
          updatedAt: now,
          errors: [
            ...(job.errors || []),
            {
              type: 'manual_cleanup',
              message: 'Job cancelled by admin - manual cleanup of all running jobs',
              timestamp: now,
            },
          ],
        });
        
        results.push({
          jobId: job._id,
          organizationId: job.organizationId,
          status: 'cancelled',
        });
      }
      
      return {
        success: true,
        cancelledCount: runningJobs.length,
        results,
      };
    }
    
    // Cancel specific jobs
    for (const jobId of jobIdsToCancel) {
      try {
        const job = await ctx.db.get(jobId);
        if (job && job.status === 'running') {
          await ctx.db.patch(job._id, {
            status: 'cancelled',
            completedAt: now,
            executionTime: job.startedAt ? now - job.startedAt : 0,
            updatedAt: now,
            errors: [
              ...(job.errors || []),
              {
                type: 'manual_cleanup',
                message: 'Job cancelled by admin - manual cleanup',
                timestamp: now,
              },
            ],
          });
          
          results.push({
            jobId: job._id,
            status: 'cancelled',
          });
        }
      } catch (error) {
        console.error(`[ADMIN] Error cancelling job ${jobId}:`, error);
      }
    }
    
    return {
      success: true,
      cancelledCount: results.length,
      results,
    };
  },
});