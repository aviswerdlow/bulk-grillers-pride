import { v } from 'convex/values';
import { mutation } from '../../_generated/server';
import { api } from '../../_generated/api';
import { 
  withRateLimit, 
  RATE_LIMIT_RESOURCES,
  checkRateLimit,
  consumeRateLimit,
  recordViolation
} from '../../lib/rateLimit';
import { authenticateAndAuthorize } from '../../lib/auth';

// Create a new AI categorization job with rate limiting
export const createCategorizationJob = withRateLimit(
  RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
  async (ctx, args: {
    organizationId: Id<'organizations'>;
    projectId: Id<'projects'>;
    jobType: 'bulk_categorization' | 'single_product' | 'validation';
    productIds: Id<'products'>[];
    aiProvider: string;
    aiModel: string;
    prompt: string;
    batchSize?: number;
    notifications: {
      email: boolean;
      dashboard: boolean;
      recipients: string[];
    };
  }) => {
    // Authenticate user and get membership
    const { user, membership } = await authenticateAndAuthorize(ctx, args.organizationId);
    
    // Check role permissions
    if (!['owner', 'admin', 'editor'].includes(membership.role)) {
      throw new Error('Insufficient permissions');
    }

    // Estimate token usage for this job
    const estimatedTokensPerProduct = 500; // Rough estimate
    const estimatedTotalTokens = args.productIds.length * estimatedTokensPerProduct;
    
    // Check if we have token budget
    const rateLimitCheck = await checkRateLimit(ctx, {
      resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
      identifier: user._id,
      organizationId: args.organizationId,
      userId: user._id,
      tokensUsed: estimatedTotalTokens,
    });
    
    if (!rateLimitCheck.allowed) {
      // Record the violation
      await recordViolation(ctx, {
        resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
        identifier: user._id,
        organizationId: args.organizationId,
        userId: user._id,
        endpoint: 'createCategorizationJob',
        method: 'MUTATION',
        requestCount: rateLimitCheck.limit + 1,
        limit: rateLimitCheck.limit,
      });
      
      throw new Error(`Rate limit exceeded. Please try again after ${rateLimitCheck.retryAfter} seconds.`);
    }
    
    // Call the original categorization job creation through internal API
    const jobId = await ctx.scheduler.runNow(
      api.ai.categorization.createCategorizationJob,
      args
    );
    
    // Consume the rate limit with estimated tokens
    await consumeRateLimit(ctx, {
      resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
      identifier: user._id,
      organizationId: args.organizationId,
      userId: user._id,
      tokensUsed: estimatedTotalTokens,
    });
    
    return jobId;
  }
);

// Alternative implementation using manual rate limiting
export const createCategorizationJobManual = mutation({
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
    // Authenticate user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    // Estimate token usage
    const estimatedTokensPerProduct = 500;
    const estimatedTotalTokens = args.productIds.length * estimatedTokensPerProduct;
    
    // Check rate limit
    const rateLimitCheck = await checkRateLimit(ctx, {
      resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
      identifier: user._id,
      organizationId: args.organizationId,
      userId: user._id,
      tokensUsed: estimatedTotalTokens,
    });
    
    if (!rateLimitCheck.allowed) {
      await recordViolation(ctx, {
        resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
        identifier: user._id,
        organizationId: args.organizationId,
        userId: user._id,
        endpoint: 'createCategorizationJob',
        method: 'MUTATION',
        requestCount: rateLimitCheck.limit + 1,
        limit: rateLimitCheck.limit,
      });
      
      throw new Error(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for AI categorization',
          retryAfter: rateLimitCheck.retryAfter,
          limit: rateLimitCheck.limit,
          remaining: rateLimitCheck.remaining,
          resetAt: rateLimitCheck.resetAt,
        })
      );
    }
    
    // Consume rate limit
    await consumeRateLimit(ctx, {
      resource: RATE_LIMIT_RESOURCES.AI_CATEGORIZATION,
      identifier: user._id,
      organizationId: args.organizationId,
      userId: user._id,
      tokensUsed: estimatedTotalTokens,
    });
    
    // Create the job using the original function
    const jobId = await ctx.scheduler.runNow(
      api.ai.categorization.createCategorizationJob,
      args
    );
    
    return jobId;
  },
});