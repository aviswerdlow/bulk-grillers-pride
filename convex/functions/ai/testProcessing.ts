import { internalMutation } from '../../_generated/server';
import { internal } from '../../_generated/api';
import { Doc } from '../../_generated/dataModel';

/**
 * Test function to manually trigger processing of pending AI categorization jobs
 * This helps verify that the processCategorizationJob action is working
 */
export const triggerPendingJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log('[TEST] Looking for pending AI categorization jobs...');
    
    // Find all pending jobs
    const pendingJobs = await ctx.db
      .query('aiCategorizationJobs')
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .collect();
    
    console.log(`[TEST] Found ${pendingJobs.length} pending jobs`);
    
    const results = [];
    
    for (const job of pendingJobs) {
      try {
        console.log(`[TEST] Scheduling job ${job._id} for processing...`);
        
        // Schedule the job for immediate processing
        await ctx.scheduler.runAfter(0, internal.functions.ai.categorization.processCategorizationJob, {
          jobId: job._id,
        });
        
        results.push({
          jobId: job._id,
          organizationId: job.organizationId,
          productCount: job.productIds.length,
          status: 'scheduled',
        });
        
        console.log(`[TEST] Job ${job._id} scheduled successfully`);
      } catch (error) {
        console.error(`[TEST] Error scheduling job ${job._id}:`, error);
        results.push({
          jobId: job._id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return {
      success: true,
      pendingJobsFound: pendingJobs.length,
      jobsScheduled: results.filter(r => r.status === 'scheduled').length,
      results,
    };
  },
});

/**
 * Debug function to check the status of all AI categorization jobs
 */
export const debugJobStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db
      .query('aiCategorizationJobs')
      .order('desc')
      .take(10);
    
    const statuses = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };
    
    const jobDetails = jobs.map(job => {
      statuses[job.status as keyof typeof statuses]++;
      
      return {
        id: job._id,
        status: job.status,
        createdAt: new Date(job.createdAt).toISOString(),
        productCount: job.productIds.length,
        aiProvider: job.aiProvider,
        aiModel: job.aiModel,
        startedAt: job.startedAt ? new Date(job.startedAt).toISOString() : null,
        completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : null,
        executionTime: job.executionTime ? `${(job.executionTime / 1000).toFixed(2)}s` : null,
        progress: job.progress,
        errors: job.errors?.length || 0,
      };
    });
    
    console.log('[DEBUG] Job status summary:', statuses);
    console.log('[DEBUG] Recent jobs:', JSON.stringify(jobDetails, null, 2));
    
    return {
      summary: statuses,
      recentJobs: jobDetails,
    };
  },
});