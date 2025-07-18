import { v } from 'convex/values';
import {
  mutation,
  query,
  action,
  internalMutation,
  internalQuery,
  internalAction,
} from '../../_generated/server';
import { internal } from '../../_generated/api';
import { Doc, Id } from '../../_generated/dataModel';
import {
  processBatchWithLangChain,
  CategoryContext,
  ProductCategorizationCache,
  generateCacheKey,
  estimateTokenCount,
  estimateCost,
  AIProvider,
} from './langchain';

// Get AI categorization jobs for an organization
export const getCategorizationJobs = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('running'),
        v.literal('completed'),
        v.literal('failed'),
        v.literal('cancelled')
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, projectId, status, limit = 50 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Verify user has access to this organization
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership) throw new Error('Access denied');

    let query = ctx.db
      .query('aiCategorizationJobs')
      .withIndex('by_organization_project', (q) => q.eq('organizationId', organizationId));

    if (projectId) {
      query = query.filter((q) => q.eq(q.field('projectId'), projectId));
    }

    if (status) {
      query = query.filter((q) => q.eq(q.field('status'), status));
    }

    const jobs = await query.order('desc').take(limit);

    return jobs;
  },
});

// Get a single AI categorization job
export const getCategorizationJob = query({
  args: { jobId: v.id('aiCategorizationJobs') },
  handler: async (ctx, { jobId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get the job from database
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error('Job not found');

    // Verify user has access to this organization
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', job.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership) throw new Error('Access denied');

    return job;
  },
});

// Create a new AI categorization job
export const createCategorizationJob = mutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    jobType: v.union(
      v.literal('bulk_categorization'),
      v.literal('single_product'),
      v.literal('validation')
    ),
    productIds: v.array(v.id('products')),
    aiProvider: v.string(),
    aiModel: v.string(),
    prompt: v.string(),
    batchSize: v.optional(v.number()),
    notifications: v.object({
      email: v.boolean(),
      dashboard: v.boolean(),
      recipients: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    // Verify user has access and permissions
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership || !['owner', 'admin', 'editor'].includes(membership.role)) {
      throw new Error('Insufficient permissions');
    }

    // Get organization to access AI settings
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) throw new Error('Organization not found');

    // Validate AI provider and model
    const aiSettings = organization.settings;
    if (args.aiProvider !== aiSettings.aiProvider) {
      throw new Error('AI provider does not match organization settings');
    }

    // Get available categories for context
    const categories = await ctx.db
      .query('categories')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', args.organizationId).eq('projectId', args.projectId)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();

    const categoryContext = categories.map((cat) => ({
      id: cat._id,
      name: cat.name,
      handle: cat.handle,
      path: cat.path,
      description: cat.description,
    }));

    const now = Date.now();
    const jobId = await ctx.db.insert('aiCategorizationJobs', {
      organizationId: args.organizationId,
      projectId: args.projectId,
      jobType: args.jobType,
      batchSize: args.batchSize || aiSettings.categorization.batchSize,
      aiProvider: args.aiProvider,
      aiModel: args.aiModel,
      prompt: args.prompt,
      productIds: args.productIds,
      categoryContext,
      status: 'pending',
      progress: {
        total: args.productIds.length,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
      },
      results: [],
      errors: [],
      notifications: args.notifications,
      notificationsSent: false,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      organizationId: args.organizationId,
      eventType: 'CREATE',
      entityType: 'aiCategorizationJobs',
      entityId: jobId,
      changes: [
        {
          field: '*',
          oldValue: null,
          newValue: {
            jobType: args.jobType,
            productCount: args.productIds.length,
            aiProvider: args.aiProvider,
            aiModel: args.aiModel,
          },
          changeType: 'added' as const,
        },
      ],
      context: {
        action: 'create_ai_categorization_job',
        source: 'web' as const,
      },
      performedBy: {
        type: 'user' as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: {
        projectId: args.projectId,
        productCount: args.productIds.length,
      },
      timestamp: now,
      isRollbackable: false,
    });

    // Schedule the job for processing
    await ctx.scheduler.runAfter(0, internal.functions.ai.categorization.processCategorizationJob, {
      jobId,
    });

    console.log(`[AI-CAT] Job ${jobId} created and scheduled for processing`);

    return jobId;
  },
});

// Process an AI categorization job (action for external AI calls)
export const processCategorizationJob = internalAction({
  args: { jobId: v.id('aiCategorizationJobs') },
  handler: async (ctx, { jobId }) => {
    console.log(`🚀 [AI-CAT] ========== STARTING AI CATEGORIZATION JOB ${jobId} ==========`);
    // Rate limiting state (simple in-memory counter, use Redis in production)
    const startTime = Date.now();

    try {
      console.log(`📋 [AI-CAT] Step 1: Fetching job details for ${jobId}`);
      // Get the job using internal API
      const job = await ctx.runQuery(
        internal.functions.ai.categorization.getCategorizationJobInternal,
        { jobId }
      );
      if (!job) {
        console.error(`❌ [AI-CAT] Job ${jobId} not found in database`);
        throw new Error('Job not found');
      }
      console.log(`✅ [AI-CAT] Job found: status=${job.status}, products=${job.productIds.length}, provider=${job.aiProvider}, model=${job.aiModel}`);

      if (job.status !== 'pending') {
        console.log(
          `⚠️ [AI-CAT] Job ${jobId} is not pending (status: ${job.status}), skipping processing`
        );
        return;
      }

      console.log(`📋 [AI-CAT] Step 2: Updating job status to running`);
      // Update job status to running
      await ctx.runMutation(internal.functions.ai.categorization.updateJobStatusInternal, {
        jobId,
        status: 'running',
        startedAt: Date.now(),
      });

      console.log(`🎯 [AI-CAT] Starting job ${jobId} with ${job.productIds.length} products`);

      console.log(`📋 [AI-CAT] Step 3: Fetching organization and API keys`);
      // Get organization with API keys
      const organization = await ctx.runQuery(
        internal.functions.ai.categorization.getOrganizationWithKeys,
        {
          organizationId: job.organizationId,
        }
      );

      if (!organization) {
        console.error(`❌ [AI-CAT] Organization ${job.organizationId} not found`);
        throw new Error('Organization not found');
      }

      console.log(`✅ [AI-CAT] Organization found: ${organization.name}`);
      console.log(`🔑 [AI-CAT] Checking API key for provider: ${job.aiProvider}`);
      
      // Get the API key for the selected provider
      const apiKey =
        organization.settings.apiKeys[job.aiProvider as keyof typeof organization.settings.apiKeys];
      if (!apiKey) {
        console.error(`❌ [AI-CAT] No API key configured for provider: ${job.aiProvider}`);
        console.error(`❌ [AI-CAT] Available keys: ${Object.keys(organization.settings.apiKeys).join(', ')}`);
        throw new Error(`No API key configured for provider: ${job.aiProvider}`);
      }
      
      console.log(`✅ [AI-CAT] API key found for ${job.aiProvider} (length: ${apiKey.length} chars)`);
      console.log(`🔑 [AI-CAT] Key starts with: ${apiKey.substring(0, 10)}...`);

      // Get products to categorize
      const products = await ctx.runQuery(internal.functions.ai.categorization.getProductsByIds, {
        productIds: job.productIds,
      });

      if (products.length === 0) {
        throw new Error('No valid products found to categorize');
      }

      console.log(`[AI-CAT] Processing ${products.length} products in batches of ${job.batchSize}`);

      // Process products in batches with rate limiting
      const batchSize = job.batchSize || 10;
      const allResults: any[] = [];
      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;
      let totalSkipped = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const batchStart = Date.now();

        try {
          // Check cache for similar products
          const uncachedProducts: Doc<'products'>[] = [];
          const cachedResults: any[] = [];

          for (const product of batch) {
            const cacheKey = generateCacheKey(product);
            const cached = categorizationCache.get(cacheKey);

            if (cached) {
              cachedResults.push({
                ...cached,
                productId: product._id,
                fromCache: true,
              });
              totalSkipped++;
              console.log(`[AI-CAT] Using cached result for product: ${product.title}`);
            } else {
              uncachedProducts.push(product);
            }
          }

          let batchResults = [...cachedResults];

          if (uncachedProducts.length > 0) {
            // Estimate tokens for cost tracking
            const inputText =
              JSON.stringify(uncachedProducts) + JSON.stringify(job.categoryContext) + job.prompt;
            const estimatedInputTokens = estimateTokenCount(inputText);
            totalInputTokens += estimatedInputTokens;

            // Process uncached products with LangChain
            console.log(
              `🤖 [AI-CAT] Processing ${uncachedProducts.length} uncached products with ${job.aiProvider}`
            );
            console.log(`📊 [AI-CAT] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}`);
            console.log(`🔧 [AI-CAT] Using model: ${job.aiModel}`);
            console.log(`📝 [AI-CAT] Custom prompt: ${job.prompt || 'Default'}`);
            console.log(`🔢 [AI-CAT] Category context: ${job.categoryContext?.length || 0} categories provided`);
            
            console.log(`🚀 [AI-CAT] Making LangChain API call NOW...`);
            const aiCallStart = Date.now();
            
            const aiResults = await processBatchWithLangChain(
              uncachedProducts,
              job.categoryContext as CategoryContext[],
              job.prompt,
              job.aiProvider as AIProvider,
              apiKey,
              job.aiModel,
              {
                maxRetries: 3,
                temperature: 0.3,
                streaming: false,
              }
            );
            
            const aiCallDuration = Date.now() - aiCallStart;
            console.log(`✅ [AI-CAT] LangChain API call completed in ${aiCallDuration}ms`);
            console.log(`📊 [AI-CAT] Results: ${aiResults.length} items processed`);

            // Estimate output tokens
            const estimatedOutputTokens = estimateTokenCount(JSON.stringify(aiResults));
            totalOutputTokens += estimatedOutputTokens;

            // Cache successful results
            for (const result of aiResults) {
              if (result.status === 'success') {
                const product = uncachedProducts.find((p) => p._id === result.productId);
                if (product) {
                  const cacheKey = generateCacheKey(product);
                  categorizationCache.set(cacheKey, result);
                }
              }
            }

            batchResults.push(...aiResults);
          }

          // Count results
          const successCount = batchResults.filter((r) => r.status === 'success').length;
          const errorCount = batchResults.filter((r) => r.status === 'error').length;

          totalProcessed += batch.length;
          totalSuccessful += successCount;
          totalFailed += errorCount;

          allResults.push(...batchResults);

          // Update progress
          await ctx.runMutation(internal.functions.ai.categorization.updateJobProgressInternal, {
            jobId,
            progress: {
              total: products.length,
              processed: totalProcessed,
              successful: totalSuccessful,
              failed: totalFailed,
              skipped: totalSkipped,
            },
            results: batchResults,
          });

          console.log(
            `[AI-CAT] Batch ${i / batchSize + 1} completed: ${successCount} success, ${errorCount} errors`
          );

          // Rate limiting - ensure minimum time between batches
          const batchDuration = Date.now() - batchStart;
          const minBatchTime = 1000; // 1 second minimum between batches
          if (batchDuration < minBatchTime && i + batchSize < products.length) {
            await new Promise((resolve) => setTimeout(resolve, minBatchTime - batchDuration));
          }
        } catch (error) {
          console.error(`[AI-CAT] Error processing batch ${i / batchSize + 1}:`, error);

          // Mark batch as failed
          const failedResults = batch.map((product) => ({
            productId: product._id,
            suggestions: [],
            newCategorySuggestions: [],
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Unknown error',
          }));

          totalProcessed += batch.length;
          totalFailed += batch.length;

          allResults.push(...failedResults);

          // Update progress with failures
          await ctx.runMutation(internal.functions.ai.categorization.updateJobProgressInternal, {
            jobId,
            progress: {
              total: products.length,
              processed: totalProcessed,
              successful: totalSuccessful,
              failed: totalFailed,
              skipped: totalSkipped,
            },
            results: failedResults,
          });
        }
      }

      // Calculate costs
      const estimatedCost = estimateCost(
        job.aiProvider as AIProvider,
        job.aiModel,
        totalInputTokens,
        totalOutputTokens
      );

      // Complete the job
      const executionTime = Date.now() - startTime;
      await ctx.runMutation(internal.functions.ai.categorization.completeJobInternal, {
        jobId,
        status: 'completed',
        completedAt: Date.now(),
        executionTime,
      });

      console.log(
        `[AI-CAT] Job ${jobId} completed in ${executionTime}ms. Cost: $${estimatedCost.totalCost.toFixed(4)}`
      );
      console.log(
        `[AI-CAT] Final stats: ${totalSuccessful} successful, ${totalFailed} failed, ${totalSkipped} cached`
      );
    } catch (error) {
      console.error(`[AI-CAT] Fatal error processing job ${jobId}:`, error);

      // Mark job as failed
      await ctx.runMutation(internal.functions.ai.categorization.updateJobStatusInternal, {
        jobId,
        status: 'failed',
        completedAt: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
});

// Initialize cache instance
const categorizationCache = new ProductCategorizationCache(3600000); // 1 hour TTL

// Internal query to get organization with decrypted API keys
export const getOrganizationWithKeys = internalQuery({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, { organizationId }) => {
    const organization = await ctx.db.get(organizationId);
    if (!organization) throw new Error('Organization not found');

    // In production, API keys should be encrypted in the database
    // and decrypted here. For now, we'll return them as-is.
    return organization;
  },
});

// Internal query to get products by IDs
export const getProductsByIds = internalQuery({
  args: { productIds: v.array(v.id('products')) },
  handler: async (ctx, { productIds }) => {
    const products = await Promise.all(productIds.map((id) => ctx.db.get(id)));
    return products.filter(Boolean) as Doc<'products'>[];
  },
});

// Internal mutation to update job status
export const updateJobStatusInternal = internalMutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('cancelled')
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.startedAt) updates.startedAt = args.startedAt;
    if (args.completedAt) updates.completedAt = args.completedAt;
    if (args.error) {
      // Determine error type based on the error message
      let errorType = 'general_error';
      
      if (args.error.includes('API key') || args.error.includes('provider')) {
        errorType = 'configuration_error';
      } else if (args.error.includes('not found')) {
        errorType = 'not_found_error';
      } else if (args.error.includes('permission') || args.error.includes('Access denied')) {
        errorType = 'permission_error';
      } else if (args.error.includes('authenticated')) {
        errorType = 'authentication_error';
      }
      
      updates.errors = [{ 
        type: errorType,
        message: args.error, 
        timestamp: Date.now() 
      }];
    }

    await ctx.db.patch(args.jobId, updates);
  },
});

// Internal mutation to update job progress
export const updateJobProgressInternal = internalMutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    progress: v.object({
      total: v.number(),
      processed: v.number(),
      successful: v.number(),
      failed: v.number(),
      skipped: v.number(),
    }),
    results: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      progress: args.progress,
      updatedAt: Date.now(),
    };

    if (args.results) {
      const job = await ctx.db.get(args.jobId);
      if (job) {
        updates.results = [...(job.results || []), ...args.results];
      }
    }

    await ctx.db.patch(args.jobId, updates);
  },
});

// Internal mutation to complete job
export const completeJobInternal = internalMutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    status: v.union(v.literal('completed'), v.literal('failed')),
    completedAt: v.number(),
    executionTime: v.number(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      completedAt: args.completedAt,
      executionTime: args.executionTime,
      updatedAt: Date.now(),
    });
  },
});

// Internal query to get job details
export const getCategorizationJobInternal = internalQuery({
  args: { jobId: v.id('aiCategorizationJobs') },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.get(jobId);
  },
});

// Update job status
export const updateJobStatus = mutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('cancelled')
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, { jobId, status, startedAt, completedAt }) => {
    const updates: any = { status, updatedAt: Date.now() };
    if (startedAt) updates.startedAt = startedAt;
    if (completedAt) updates.completedAt = completedAt;

    await ctx.db.patch(jobId, updates);
  },
});

// Update job progress
export const updateJobProgress = mutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    processed: v.number(),
    successful: v.number(),
    failed: v.number(),
    skipped: v.number(),
  },
  handler: async (ctx, { jobId, processed, successful, failed, skipped }) => {
    // Get the job from database
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error('Job not found');

    await ctx.db.patch(jobId, {
      progress: {
        total: job.progress.total,
        processed,
        successful,
        failed,
        skipped,
      },
      updatedAt: Date.now(),
    });
  },
});

// Complete job with results
export const completeJob = mutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    results: v.any(),
    completedAt: v.number(),
  },
  handler: async (ctx, { jobId, results, completedAt }) => {
    const executionTime = completedAt - (await ctx.db.get(jobId))!.startedAt!;

    await ctx.db.patch(jobId, {
      status: 'completed',
      results,
      completedAt,
      executionTime,
      updatedAt: Date.now(),
    });
  },
});

// Cancel a categorization job
export const cancelCategorizationJob = mutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
  },
  handler: async (ctx, { jobId }) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get the job to validate its status
    const job = await ctx.db.get(jobId);

    if (!job) {
      throw new Error(
        'Job not found. The categorization job may have been deleted or does not exist.'
      );
    }

    // Validate job belongs to user's organization
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has access to this job's organization
    const orgMembership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', job.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!orgMembership) {
      throw new Error('You do not have permission to cancel this job');
    }

    // Check job status - only pending or running jobs can be cancelled
    if (job.status === 'completed') {
      throw new Error(
        'Cannot cancel a completed job. The categorization process has already finished successfully.'
      );
    }

    if (job.status === 'failed') {
      throw new Error(
        'Cannot cancel a failed job. The categorization process has already failed and stopped.'
      );
    }

    if (job.status === 'cancelled') {
      throw new Error('This job has already been cancelled.');
    }

    // Job must be in 'pending' or 'running' status
    if (job.status !== 'pending' && job.status !== 'running') {
      throw new Error(
        `Cannot cancel job with status "${job.status}". Only pending or running jobs can be cancelled.`
      );
    }

    // Update job status to cancelled
    await ctx.db.patch(jobId, {
      status: 'cancelled',
      completedAt: Date.now(),
      executionTime: job.startedAt ? Date.now() - job.startedAt : 0,
      updatedAt: Date.now(),
      // Add cancellation info to errors array
      errors: [
        ...job.errors,
        {
          type: 'cancelled',
          message: `Job cancelled by user ${user.email || user._id}`,
          timestamp: Date.now(),
        },
      ],
    });

    // Return success message
    return {
      success: true,
      message: `Categorization job ${job.status === 'running' ? 'stopped' : 'cancelled'} successfully`,
      jobId,
    };
  },
});

// Apply AI categorization suggestions
export const applyCategorization = mutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    productId: v.id('products'),
    categoryId: v.id('categories'),
    confidence: v.number(),
    rationale: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error('Job not found');

    // Verify permissions
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', job.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership || !['owner', 'admin', 'editor'].includes(membership.role)) {
      throw new Error('Insufficient permissions');
    }

    // Apply the categorization using the existing function
    await ctx.db.insert('categoryProductAssignments', {
      organizationId: job.organizationId,
      projectId: job.projectId,
      categoryId: args.categoryId,
      productId: args.productId,
      assignedBy: 'ai',
      assignedByUser: user._id,
      confidence: args.confidence,
      rationale: args.rationale,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.productId;
  },
});
