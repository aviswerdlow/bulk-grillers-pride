import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';
import { Doc, Id } from '../../_generated/dataModel';

// Track user feedback on AI categorization suggestions
export const recordCategorizationFeedback = mutation({
  args: {
    productId: v.id('products'),
    jobId: v.id('aiCategorizationJobs'),
    categoryId: v.id('categories'),
    feedback: v.union(v.literal('accepted'), v.literal('rejected'), v.literal('corrected')),
    correctedCategoryId: v.optional(v.id('categories')),
    reason: v.optional(v.string()),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error('Product not found');

    // Create feedback record
    const now = Date.now();
    const feedbackId = await ctx.db.insert('aiCategorizationFeedback', {
      organizationId: product.organizationId,
      projectId: product.projectId,
      productId: args.productId,
      jobId: args.jobId,
      suggestedCategoryId: args.categoryId,
      feedback: args.feedback,
      correctedCategoryId: args.correctedCategoryId,
      reason: args.reason,
      confidence: args.confidence,
      userId: user._id,
      createdAt: now,
    });

    // Update product's AI categorization status
    if (product.aiCategorization?.suggestions) {
      const updatedSuggestions = product.aiCategorization.suggestions.map((suggestion) => {
        if (suggestion.categoryId === args.categoryId) {
          return {
            ...suggestion,
            status: args.feedback === 'accepted' ? ('accepted' as const) : ('rejected' as const),
          };
        }
        return suggestion;
      });

      await ctx.db.patch(args.productId, {
        aiCategorization: {
          ...product.aiCategorization,
          suggestions: updatedSuggestions,
        },
        updatedAt: now,
      });
    }

    // If accepted or corrected, update product categories
    if (
      args.feedback === 'accepted' ||
      (args.feedback === 'corrected' && args.correctedCategoryId)
    ) {
      const categoryToAssign =
        args.feedback === 'accepted' ? args.categoryId : args.correctedCategoryId!;

      // Add category if not already assigned
      if (!product.categories.includes(categoryToAssign)) {
        await ctx.db.patch(args.productId, {
          categories: [...product.categories, categoryToAssign],
          updatedAt: now,
        });
      }
    }

    return feedbackId;
  },
});

// Get feedback analytics for improving AI accuracy
export const getFeedbackAnalytics = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.optional(v.id('projects')),
    timeRange: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership) throw new Error('Access denied');

    // Query feedback records
    let query = ctx.db
      .query('aiCategorizationFeedback')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId));

    if (args.projectId) {
      query = query.filter((q) => q.eq(q.field('projectId'), args.projectId));
    }

    if (args.timeRange) {
      query = query.filter((q) =>
        q.and(
          q.gte(q.field('createdAt'), args.timeRange!.start),
          q.lte(q.field('createdAt'), args.timeRange!.end)
        )
      );
    }

    const feedbackRecords = await query.order('desc').take(args.limit || 1000);

    // Calculate analytics
    const totalFeedback = feedbackRecords.length;
    const acceptedCount = feedbackRecords.filter((f) => f.feedback === 'accepted').length;
    const rejectedCount = feedbackRecords.filter((f) => f.feedback === 'rejected').length;
    const correctedCount = feedbackRecords.filter((f) => f.feedback === 'corrected').length;

    // Group by category to find problematic categories
    const categoryStats = new Map<
      string,
      {
        accepted: number;
        rejected: number;
        corrected: number;
        total: number;
      }
    >();

    for (const feedback of feedbackRecords) {
      const categoryId = feedback.suggestedCategoryId;
      const stats = categoryStats.get(categoryId) || {
        accepted: 0,
        rejected: 0,
        corrected: 0,
        total: 0,
      };

      stats.total++;
      if (feedback.feedback === 'accepted') stats.accepted++;
      else if (feedback.feedback === 'rejected') stats.rejected++;
      else if (feedback.feedback === 'corrected') stats.corrected++;

      categoryStats.set(categoryId, stats);
    }

    // Find categories with low acceptance rates
    const problematicCategories = Array.from(categoryStats.entries())
      .map(([categoryId, stats]) => ({
        categoryId,
        ...stats,
        acceptanceRate: stats.total > 0 ? stats.accepted / stats.total : 0,
      }))
      .filter((cat) => cat.acceptanceRate < 0.5 && cat.total >= 5)
      .sort((a, b) => a.acceptanceRate - b.acceptanceRate);

    // Calculate confidence correlation
    const acceptedWithHighConfidence = feedbackRecords.filter(
      (f) => f.feedback === 'accepted' && f.confidence >= 0.8
    ).length;
    const rejectedWithHighConfidence = feedbackRecords.filter(
      (f) => f.feedback === 'rejected' && f.confidence >= 0.8
    ).length;

    return {
      summary: {
        total: totalFeedback,
        accepted: acceptedCount,
        rejected: rejectedCount,
        corrected: correctedCount,
        acceptanceRate: totalFeedback > 0 ? acceptedCount / totalFeedback : 0,
      },
      problematicCategories,
      confidenceAnalysis: {
        highConfidenceAccepted: acceptedWithHighConfidence,
        highConfidenceRejected: rejectedWithHighConfidence,
        highConfidenceAccuracy:
          acceptedWithHighConfidence + rejectedWithHighConfidence > 0
            ? acceptedWithHighConfidence / (acceptedWithHighConfidence + rejectedWithHighConfidence)
            : 0,
      },
      recentFeedback: feedbackRecords.slice(0, 10),
    };
  },
});

// Get feedback for training data export
export const exportTrainingData = query({
  args: {
    organizationId: v.id('organizations'),
    minFeedbackCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Verify admin access
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Admin access required');
    }

    // Get all feedback with product and category details
    const feedbackRecords = await ctx.db
      .query('aiCategorizationFeedback')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .collect();

    // Group by product to get training examples
    const productFeedback = new Map<string, any[]>();

    for (const feedback of feedbackRecords) {
      const existing = productFeedback.get(feedback.productId) || [];
      existing.push(feedback);
      productFeedback.set(feedback.productId, existing);
    }

    // Build training data
    const trainingData = [];
    const minCount = args.minFeedbackCount || 1;

    for (const [productId, feedbacks] of productFeedback) {
      if (feedbacks.length < minCount) continue;

      const product = await ctx.db.get(productId as Id<'products'>);
      if (!product) continue;

      // Find the most accepted category
      const categoryVotes = new Map<string, number>();

      for (const feedback of feedbacks) {
        if (feedback.feedback === 'accepted') {
          const count = categoryVotes.get(feedback.suggestedCategoryId) || 0;
          categoryVotes.set(feedback.suggestedCategoryId, count + 1);
        } else if (feedback.feedback === 'corrected' && feedback.correctedCategoryId) {
          const count = categoryVotes.get(feedback.correctedCategoryId) || 0;
          categoryVotes.set(feedback.correctedCategoryId, count + 1);
        }
      }

      // Get the category with most votes
      let bestCategory = null;
      let maxVotes = 0;

      for (const [categoryId, votes] of categoryVotes) {
        if (votes > maxVotes) {
          maxVotes = votes;
          bestCategory = categoryId;
        }
      }

      if (bestCategory) {
        const category = await ctx.db.get(bestCategory as Id<'categories'>);
        if (category) {
          trainingData.push({
            input: {
              title: product.title,
              description: product.description,
              productType: product.productType,
              vendor: product.vendor,
              tags: product.tags,
            },
            output: {
              categoryId: bestCategory,
              categoryName: category.name,
              categoryPath: category.path,
            },
            metadata: {
              feedbackCount: feedbacks.length,
              acceptanceRate: maxVotes / feedbacks.length,
            },
          });
        }
      }
    }

    return {
      trainingExamples: trainingData,
      totalProducts: productFeedback.size,
      includedProducts: trainingData.length,
    };
  },
});
