import { v } from 'convex/values';
import {
  mutation,
  query,
  action,
  internalMutation,
  internalQuery,
  internalAction,
} from '../../_generated/server';
import { api, internal } from '../../_generated/api';
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
import { langchainToCrewAIAdapter } from './langchainToCrewAIAdapter';
import { determineSystem, recordABTestMetrics } from './monitoring/abTestingController';

// API Key validation utilities
const validateApiKey = (apiKey: string | undefined, provider: AIProvider): { valid: boolean; error?: string } => {
  if (!apiKey) {
    return { valid: false, error: `No API key configured for ${provider}. Please add your API key in organization settings.` };
  }

  // Basic format validation
  const trimmedKey = apiKey.trim();
  
  switch (provider) {
    case 'openai':
      // OpenAI keys start with 'sk-' and are typically 51 characters
      if (!trimmedKey.startsWith('sk-') || trimmedKey.length < 40) {
        return { valid: false, error: 'Invalid OpenAI API key format. Keys should start with "sk-" and be at least 40 characters.' };
      }
      break;
      
    case 'anthropic':
      // Anthropic keys typically start with 'sk-ant-' 
      if (!trimmedKey.includes('sk-ant-') || trimmedKey.length < 40) {
        return { valid: false, error: 'Invalid Anthropic API key format. Keys should contain "sk-ant-" and be at least 40 characters.' };
      }
      break;
      
    case 'gemini':
      // Gemini/Google AI keys are typically 39 characters
      if (trimmedKey.length < 35) {
        return { valid: false, error: 'Invalid Gemini API key format. Keys should be at least 35 characters.' };
      }
      break;
      
    default:
      return { valid: false, error: `Unsupported AI provider: ${provider}` };
  }
  
  return { valid: true };
};

// Model availability checking
const isModelAvailable = (provider: AIProvider, model: string): { available: boolean; error?: string; suggestion?: string } => {
  const availableModels: Record<AIProvider, { models: string[]; deprecated?: string[]; suggestions: Record<string, string> }> = {
    openai: {
      models: ['gpt-4-turbo-preview', 'gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'],
      deprecated: ['text-davinci-003', 'text-davinci-002'],
      suggestions: {
        'o3': 'gpt-4-turbo-preview',
        'o3-mini': 'gpt-4o-mini',
        'o4-mini': 'gpt-4o-mini',
        'o1': 'gpt-4o',
      }
    },
    anthropic: {
      models: ['claude-opus-4', 'claude-sonnet-4', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      deprecated: ['claude-2.1', 'claude-2.0', 'claude-instant-1.2'],
      suggestions: {
        'claude-2': 'claude-3-sonnet-20240229',
        'claude-instant': 'claude-3-haiku-20240307',
      }
    },
    gemini: {
      models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'],
      deprecated: ['gemini-pro', 'gemini-pro-vision'],
      suggestions: {
        'gemini-pro': 'gemini-1.5-pro',
        'gemini': 'gemini-1.5-flash',
      }
    }
  };

  const providerModels = availableModels[provider];
  if (!providerModels) {
    return { available: false, error: `Unsupported AI provider: ${provider}` };
  }

  // Check if model is directly available
  if (providerModels.models.includes(model)) {
    return { available: true };
  }

  // Check if model is deprecated
  if (providerModels.deprecated?.includes(model)) {
    const suggestion = providerModels.suggestions[model] || providerModels.models[0];
    return { 
      available: false, 
      error: `Model "${model}" is deprecated for ${provider}.`,
      suggestion: `Please use "${suggestion}" instead.`
    };
  }

  // Check if there's a suggestion for this model name
  if (providerModels.suggestions[model]) {
    return { 
      available: false, 
      error: `Model "${model}" is not recognized for ${provider}.`,
      suggestion: `Did you mean "${providerModels.suggestions[model]}"?`
    };
  }

  // Model not found
  return { 
    available: false, 
    error: `Model "${model}" is not available for ${provider}.`,
    suggestion: `Available models: ${providerModels.models.join(', ')}`
  };
};

// Validate API key configuration for an organization
export const validateApiKeyConfiguration = query({
  args: {
    organizationId: v.id('organizations'),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, provider }) => {
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

    // Get organization settings
    const organization = await ctx.db.get(organizationId);
    if (!organization) throw new Error('Organization not found');

    const aiProvider = provider || organization.settings.aiProvider;
    const apiKey = organization.settings.apiKeys[aiProvider as keyof typeof organization.settings.apiKeys];
    
    // Validate the API key
    const validation = validateApiKey(apiKey, aiProvider as AIProvider);
    
    // Don't expose the actual API key, just validation status
    return {
      provider: aiProvider,
      hasApiKey: !!apiKey,
      isValid: validation.valid,
      error: validation.error,
    };
  },
});

// Check model availability
export const checkModelAvailability = query({
  args: {
    provider: v.string(),
    model: v.string(),
  },
  handler: async (ctx, { provider, model }) => {
    const modelCheck = isModelAvailable(provider as AIProvider, model);
    return modelCheck;
  },
});

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

// Get detailed job information including product results
export const getJobDetails = query({
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

    // Get detailed product information for each result
    const productResults = await Promise.all(
      job.results.map(async (result) => {
        const product = await ctx.db.get(result.productId);
        if (!product) return null;

        // Get assigned categories with details
        const assignedCategories = await Promise.all(
          result.suggestions.map(async (suggestion) => {
            const category = await ctx.db.get(suggestion.categoryId);
            const assignment = await ctx.db
              .query('categoryProductAssignments')
              .withIndex('by_product', (q) => q.eq('productId', result.productId))
              .filter((q) => 
                q.eq(q.field('categoryId'), suggestion.categoryId) &&
                q.eq(q.field('status'), 'active')
              )
              .unique();

            return {
              categoryId: suggestion.categoryId,
              categoryName: category?.name || 'Unknown Category',
              categoryPath: category?.path || '',
              confidence: suggestion.confidence,
              rationale: suggestion.rationale,
              isAssigned: !!assignment,
              assignmentStatus: assignment?.status || 'not_assigned',
            };
          })
        );

        return {
          productId: product._id,
          title: product.title,
          description: product.description,
          vendor: product.vendor,
          productType: product.productType,
          handle: product.handle,
          status: product.status,
          imageUrl: product.images?.[0]?.url,
          suggestions: assignedCategories,
          newCategorySuggestions: result.newCategorySuggestions || [],
          error: result.error,
        };
      })
    );

    // Get error details with affected products
    const errorDetails = await Promise.all(
      job.errors.map(async (error) => {
        let productInfo = null;
        if (error.productId) {
          const product = await ctx.db.get(error.productId);
          if (product) {
            productInfo = {
              productId: product._id,
              title: product.title,
              handle: product.handle,
            };
          }
        }

        return {
          ...error,
          product: productInfo,
        };
      })
    );

    // Get user who created the job
    const createdByUser = await ctx.db.get(job.createdBy);

    // Calculate performance metrics
    const metrics = {
      totalProducts: job.progress.total,
      processedProducts: job.progress.processed,
      successfulProducts: job.progress.successful,
      failedProducts: job.progress.failed,
      skippedProducts: job.progress.skipped,
      successRate: job.progress.processed > 0 
        ? Math.round((job.progress.successful / job.progress.processed) * 100) 
        : 0,
      averageConfidence: productResults
        .filter(Boolean)
        .flatMap(p => p?.suggestions || [])
        .reduce((acc, s, _, arr) => acc + s.confidence / arr.length, 0) || 0,
      executionTime: job.executionTime || 0,
      categoriesUsed: new Set(
        productResults
          .filter(Boolean)
          .flatMap(p => p?.suggestions || [])
          .map(s => s.categoryId)
      ).size,
    };

    return {
      // Job metadata
      id: job._id,
      organizationId: job.organizationId,
      projectId: job.projectId,
      jobType: job.jobType,
      status: job.status,
      aiProvider: job.aiProvider,
      aiModel: job.aiModel,
      prompt: job.prompt,
      batchSize: job.batchSize,
      
      // Progress and metrics
      progress: job.progress,
      metrics,
      
      // Results
      productResults: productResults.filter(Boolean),
      errors: errorDetails,
      
      // Timing
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      executionTime: job.executionTime,
      
      // User info
      createdBy: {
        userId: job.createdBy,
        name: createdByUser ? `${createdByUser.firstName} ${createdByUser.lastName}` : 'Unknown User',
        email: createdByUser?.email || '',
      },
      
      // Notifications
      notifications: job.notifications,
      notificationsSent: job.notificationsSent,
    };
  },
});

// Subscribe to real-time job updates
export const subscribeToJobUpdates = query({
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

    // Return current job state and progress
    return {
      id: job._id,
      status: job.status,
      progress: job.progress,
      currentBatch: job.currentBatch,
      lastProcessedProduct: job.lastProcessedProduct,
      aiThoughts: job.aiThoughts || [],
      errors: job.errors,
      startedAt: job.startedAt,
      executionTime: job.executionTime,
      updatedAt: job.updatedAt,
    };
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

    // Validate API key exists and has proper format
    const apiKey = aiSettings.apiKeys[args.aiProvider as keyof typeof aiSettings.apiKeys];
    const keyValidation = validateApiKey(apiKey, args.aiProvider as AIProvider);
    if (!keyValidation.valid) {
      throw new Error(keyValidation.error);
    }

    // Validate model availability
    const modelCheck = isModelAvailable(args.aiProvider as AIProvider, args.aiModel);
    if (!modelCheck.available) {
      const errorMessage = modelCheck.suggestion 
        ? `${modelCheck.error} ${modelCheck.suggestion}`
        : modelCheck.error;
      throw new Error(errorMessage);
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
      currentBatch: 0,
      lastProcessedProduct: undefined,
      aiThoughts: [],
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
      
      // Re-validate API key (in case it was changed after job creation)
      const keyValidation = validateApiKey(apiKey, job.aiProvider as AIProvider);
      if (!keyValidation.valid) {
        console.error(`❌ [AI-CAT] API key validation failed: ${keyValidation.error}`);
        const errorDetails = {
          type: 'API_KEY_ERROR',
          message: keyValidation.error || 'Invalid API key',
          productId: undefined as Id<'products'> | undefined,
          timestamp: Date.now(),
        };
        
        // Update job with error
        await ctx.runMutation(internal.functions.ai.categorization.updateCategorizationJob, {
          jobId,
          updates: {
            status: 'failed',
            errors: [errorDetails],
            completedAt: Date.now(),
            executionTime: Date.now() - startTime,
          },
        });
        
        throw new Error(keyValidation.error);
      }
      
      // Only log in development with minimal key exposure
      if (process.env.NODE_ENV === 'development') {
        console.debug(`✅ [AI-CAT] API key validated for ${job.aiProvider} (length: ${apiKey!.length} chars)`);
        // Maximum 4 characters for security
        console.debug(`🔑 [AI-CAT] Key prefix: ${apiKey!.substring(0, 4)}***`);
      }

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
        const batchNumber = Math.floor(i / batchSize) + 1;

        // Update current batch in real-time
        await ctx.runMutation(internal.functions.ai.categorization.updateRealtimeProgress, {
          jobId,
          currentBatch: batchNumber,
        });

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
            
            // Add AI thought about batch processing
            await ctx.runMutation(internal.functions.ai.categorization.addAIThought, {
              jobId,
              thought: `Processing batch ${batchNumber} with ${uncachedProducts.length} products using ${job.aiModel}`,
            });
            
            // Determine which system to use based on A/B test configuration
            const systemDecision = await determineSystem(ctx, {
              organizationId: job.organizationId,
              userId: job.createdBy,
            });
            
            console.log(`🚀 [AI-CAT] Making ${systemDecision.system === 'crewai' ? 'CrewAI (via adapter)' : 'LangChain'} API call NOW... (${systemDecision.reason})`);
            const aiCallStart = Date.now();
            
            const aiResults = systemDecision.system === 'crewai' 
              ? await langchainToCrewAIAdapter.processBatchWithLangChain(
                  ctx,
                  uncachedProducts,
                  job.categoryContext as CategoryContext[],
                  job.prompt,
                  job.aiProvider as AIProvider,
                  apiKey!,
                  job.aiModel,
                  {
                    maxRetries: 3,
                    temperature: 0.3,
                    batchSize: batchSize,
                  }
                )
              : await processBatchWithLangChain(
                  uncachedProducts,
                  job.categoryContext as CategoryContext[],
                  job.prompt,
                  job.aiProvider as AIProvider,
                  apiKey!,
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

            // Add AI thought about results
            await ctx.runMutation(internal.functions.ai.categorization.addAIThought, {
              jobId,
              thought: `Analyzed ${aiResults.length} products in ${aiCallDuration}ms. Found ${aiResults.filter(r => r.status === 'success').length} successful categorizations.`,
              confidence: aiResults.filter(r => r.status === 'success').length / aiResults.length,
            });

            // Estimate output tokens
            const estimatedOutputTokens = estimateTokenCount(JSON.stringify(aiResults));
            totalOutputTokens += estimatedOutputTokens;
            
            // Record A/B test metrics
            const successCount = aiResults.filter(r => r.status === 'success').length;
            const errorCount = aiResults.filter(r => r.status === 'error').length;
            const accuracy = aiResults.length > 0 ? (successCount / aiResults.length) * 100 : 0;
            const errorRate = aiResults.length > 0 ? (errorCount / aiResults.length) * 100 : 0;
            
            // Estimate cost for this batch
            const estimatedTokens = uncachedProducts.reduce((sum, p) => 
              sum + estimateTokenCount(JSON.stringify(p)), 0
            );
            const costEstimate = estimateCost(
              job.aiProvider as AIProvider,
              job.aiModel,
              estimatedTokens,
              estimatedOutputTokens
            );
            
            await recordABTestMetrics(ctx, {
              organizationId: job.organizationId,
              system: systemDecision.system,
              responseTime: aiCallDuration,
              accuracy,
              errorRate,
              tokenUsage: estimatedTokens + estimatedOutputTokens,
              cost: costEstimate.totalCost,
                batchSize: uncachedProducts.length,
                categoryCount: job.categoryContext?.length || 0,
                cacheHitRate: (cachedResults.length / batch.length) * 100,
                timestamp: Date.now(),
                productIds: uncachedProducts.map(p => p._id),
                jobId: job._id,
              }
            );

            // Cache successful results and update real-time progress
            for (const result of aiResults) {
              if (result.status === 'success') {
                const product = uncachedProducts.find((p) => p._id === result.productId);
                if (product) {
                  const cacheKey = generateCacheKey(product);
                  categorizationCache.set(cacheKey, result);
                  
                  // Update last processed product
                  await ctx.runMutation(internal.functions.ai.categorization.updateRealtimeProgress, {
                    jobId,
                    lastProcessedProduct: {
                      productId: product._id,
                      title: product.title,
                      timestamp: Date.now(),
                    },
                  });
                  
                  // Add AI thought about individual product categorization
                  if (result.suggestions && result.suggestions.length > 0) {
                    const topSuggestion = result.suggestions[0];
                    if (topSuggestion) {
                      await ctx.runMutation(internal.functions.ai.categorization.addAIThought, {
                        jobId,
                        thought: `Categorized "${product.title}" with ${result.suggestions.length} suggestions. Top match: confidence ${topSuggestion.confidence.toFixed(2)}`,
                        productId: product._id,
                        confidence: topSuggestion.confidence,
                      });
                    }
                  }
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

          // Check if this is an API key error
          let errorMessage = error instanceof Error ? error.message : 'Unknown error';
          let errorType = 'PROCESSING_ERROR';
          
          if (error instanceof Error) {
            // Check for common API key error patterns
            if (error.message.includes('401') || 
                error.message.includes('Unauthorized') || 
                error.message.includes('Invalid API Key') ||
                error.message.includes('Incorrect API key provided') ||
                error.message.includes('authentication') ||
                error.message.includes('API key')) {
              errorType = 'API_KEY_ERROR';
              errorMessage = `API key error: ${error.message}. Please check your API key in organization settings.`;
            } else if (error.message.includes('404') || 
                       error.message.includes('model not found') ||
                       error.message.includes('does not exist')) {
              errorType = 'MODEL_ERROR';
              errorMessage = `Model error: ${error.message}. The specified model may not be available.`;
            } else if (error.message.includes('429') || 
                       error.message.includes('rate limit') ||
                       error.message.includes('quota')) {
              errorType = 'RATE_LIMIT_ERROR';
              errorMessage = `Rate limit error: ${error.message}. Please try again later or upgrade your API plan.`;
            }
          }

          // Mark batch as failed
          const failedResults = batch.map((product) => ({
            productId: product._id,
            suggestions: [],
            newCategorySuggestions: [],
            status: 'error' as const,
            error: errorMessage,
          }));

          totalProcessed += batch.length;
          totalFailed += batch.length;

          allResults.push(...failedResults);

          // Add error to job errors
          const errorDetails = {
            type: errorType,
            message: errorMessage,
            productId: undefined,
            timestamp: Date.now(),
          };

          await ctx.runMutation(internal.functions.ai.categorization.updateCategorizationJob, {
            jobId,
            updates: {
              errors: [errorDetails],
            },
          });
          
          // Add AI thought about the error
          await ctx.runMutation(internal.functions.ai.categorization.addAIThought, {
            jobId,
            thought: `Error in batch ${batchNumber}: ${errorType} - ${errorMessage}`,
            confidence: 0,
          });

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

// Internal mutation to update categorization job with errors
export const updateCategorizationJob = internalMutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    updates: v.object({
      status: v.optional(v.union(
        v.literal('pending'),
        v.literal('running'),
        v.literal('completed'),
        v.literal('failed'),
        v.literal('cancelled')
      )),
      errors: v.optional(v.array(v.object({
        type: v.string(),
        message: v.string(),
        productId: v.optional(v.id('products')),
        timestamp: v.number(),
      }))),
      completedAt: v.optional(v.number()),
      executionTime: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { jobId, updates }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error('Job not found');

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (updates.status) {
      updateData.status = updates.status;
    }

    if (updates.errors) {
      updateData.errors = [...job.errors, ...updates.errors];
    }

    if (updates.completedAt !== undefined) {
      updateData.completedAt = updates.completedAt;
    }

    if (updates.executionTime !== undefined) {
      updateData.executionTime = updates.executionTime;
    }

    await ctx.db.patch(jobId, updateData);
  },
});

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

// Internal mutation to update real-time progress
export const updateRealtimeProgress = internalMutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    currentBatch: v.optional(v.number()),
    lastProcessedProduct: v.optional(
      v.object({
        productId: v.id('products'),
        title: v.string(),
        timestamp: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.currentBatch !== undefined) {
      updates.currentBatch = args.currentBatch;
    }

    if (args.lastProcessedProduct) {
      updates.lastProcessedProduct = args.lastProcessedProduct;
    }

    await ctx.db.patch(args.jobId, updates);
  },
});

// Internal mutation to add AI thoughts
export const addAIThought = internalMutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    thought: v.string(),
    productId: v.optional(v.id('products')),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error('Job not found');

    const newThought = {
      timestamp: Date.now(),
      thought: args.thought,
      productId: args.productId,
      confidence: args.confidence,
    };

    const aiThoughts = job.aiThoughts || [];
    // Keep only the last 50 thoughts to avoid unbounded growth
    const updatedThoughts = [...aiThoughts, newThought].slice(-50);

    await ctx.db.patch(args.jobId, {
      aiThoughts: updatedThoughts,
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

// Export job results as CSV
export const exportJobResults = action({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    format: v.union(v.literal('summary'), v.literal('detailed')),
  },
  handler: async (ctx, args) => {
    const { jobId, format } = args;

    // Get job details using the query we just created
    const jobDetails = await ctx.runQuery(api.ai.categorization.getJobDetails, { jobId });

    if (!jobDetails) {
      throw new Error('Job not found or access denied');
    }

    // Prepare CSV headers based on format
    let csvContent = '';
    
    if (format === 'summary') {
      // Summary format: Product, Suggested Categories, Confidence
      csvContent = 'Product Handle,Product Title,Vendor,Product Type,Suggested Categories,Average Confidence,Status\n';
      
      jobDetails.productResults.forEach((result: any) => {
        const categories = result.suggestions
          .map((s: any) => s.categoryName)
          .join('; ');
        const avgConfidence = result.suggestions.length > 0
          ? (result.suggestions.reduce((sum: number, s: any) => sum + s.confidence, 0) / result.suggestions.length).toFixed(2)
          : '0';
        
        const row = [
          result.handle || '',
          result.title || '',
          result.vendor || '',
          result.productType || '',
          categories,
          avgConfidence,
          result.status,
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        
        csvContent += row + '\n';
      });
    } else {
      // Detailed format: Include AI reasoning and individual category confidence
      csvContent = 'Product Handle,Product Title,Product Description,Category,Confidence,AI Reasoning,Is Assigned,Status\n';
      
      jobDetails.productResults.forEach((result: any) => {
        if (result.suggestions.length === 0) {
          // No suggestions for this product
          const row = [
            result.handle || '',
            result.title || '',
            result.description || '',
            'No suggestions',
            '0',
            result.error || 'No categories matched',
            'N/A',
            result.status,
          ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
          
          csvContent += row + '\n';
        } else {
          // One row per suggestion
          result.suggestions.forEach((suggestion: any) => {
            const row = [
              result.handle || '',
              result.title || '',
              result.description || '',
              suggestion.categoryName,
              suggestion.confidence.toFixed(2),
              suggestion.rationale,
              suggestion.isAssigned ? 'Yes' : 'No',
              result.status,
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
            
            csvContent += row + '\n';
          });
        }
      });
    }

    // Add errors section if there are any
    if (jobDetails.errors.length > 0) {
      csvContent += '\n\n';
      csvContent += '"Errors"\n';
      csvContent += '"Type","Message","Product","Timestamp"\n';
      
      jobDetails.errors.forEach((error: any) => {
        const row = [
          error.type,
          error.message,
          error.product ? `${error.product.title} (${error.product.handle})` : 'N/A',
          new Date(error.timestamp).toISOString(),
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        
        csvContent += row + '\n';
      });
    }

    // Add metadata at the end
    csvContent += '\n\n';
    csvContent += `"Job Summary"\n`;
    csvContent += `"Job ID","${jobDetails.id}"\n`;
    csvContent += `"Job Type","${jobDetails.jobType}"\n`;
    csvContent += `"Status","${jobDetails.status}"\n`;
    csvContent += `"AI Provider","${jobDetails.aiProvider}"\n`;
    csvContent += `"Model","${jobDetails.aiModel}"\n`;
    csvContent += `"Total Products","${jobDetails.metrics.totalProducts}"\n`;
    csvContent += `"Processed","${jobDetails.metrics.processedProducts}"\n`;
    csvContent += `"Successful","${jobDetails.metrics.successfulProducts}"\n`;
    csvContent += `"Failed","${jobDetails.metrics.failedProducts}"\n`;
    csvContent += `"Success Rate","${jobDetails.metrics.successRate}%"\n`;
    csvContent += `"Average Confidence","${jobDetails.metrics.averageConfidence.toFixed(2)}"\n`;
    csvContent += `"Categories Used","${jobDetails.metrics.categoriesUsed}"\n`;
    csvContent += `"Execution Time","${(jobDetails.metrics.executionTime / 1000).toFixed(2)} seconds"\n`;
    csvContent += `"Created By","${jobDetails.createdBy.name} (${jobDetails.createdBy.email})"\n`;
    csvContent += `"Created At","${new Date(jobDetails.createdAt).toISOString()}"\n`;
    csvContent += `"Export Date","${new Date().toISOString()}"\n`;

    // Convert to base64 for easy transfer
    const base64Content = Buffer.from(csvContent, 'utf-8').toString('base64');
    
    return {
      fileName: `ai-categorization-${jobDetails.id}-${format}-${Date.now()}.csv`,
      mimeType: 'text/csv',
      base64Content,
      size: csvContent.length,
    };
  },
});
