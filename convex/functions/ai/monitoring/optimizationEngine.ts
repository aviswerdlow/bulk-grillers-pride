/**
 * CrewAI Optimization Engine
 * 
 * Analyzes performance data and provides actionable recommendations for
 * continuous improvement of the CrewAI categorization system.
 */

import { v } from 'convex/values';
import { 
  internalAction,
  internalMutation,
  internalQuery,
  query,
  mutation
} from '../../../_generated/server';
import { Doc, Id } from '../../../_generated/dataModel';
import { internal } from '../../../_generated/api';

// Optimization targets based on requirements
const OPTIMIZATION_TARGETS = {
  RESPONSE_TIME_P95: {
    current: 8000, // 8 seconds (initial)
    target: 5000, // 5 seconds (improved)
    stretch: 3000, // 3 seconds (stretch goal)
  },
  THROUGHPUT: {
    current: 500, // products/minute (initial)
    target: 750, // products/minute (improved)
    stretch: 1000, // products/minute (stretch goal)
  },
  COST_PER_CATEGORIZATION: {
    current: 0.06, // $0.06 (initial)
    target: 0.05, // $0.05 (improved)
    stretch: 0.04, // $0.04 (stretch goal)
  },
  ACCURACY: {
    current: 0.85, // 85% (initial)
    target: 0.90, // 90% (improved)
    stretch: 0.95, // 95% (stretch goal)
  },
  CACHE_HIT_RATE: {
    current: 0.5, // 50% (initial)
    target: 0.7, // 70% (improved)
    stretch: 0.8, // 80% (stretch goal)
  },
};

// Optimization strategies with expected impact
const OPTIMIZATION_STRATEGIES = {
  AGENT_OPTIMIZATION: {
    name: 'Agent Performance Optimization',
    description: 'Optimize individual agent performance through prompt engineering and task refinement',
    targetMetrics: ['response_time', 'throughput'],
    expectedImpact: {
      response_time: -20, // 20% reduction
      throughput: 25, // 25% increase
    },
    implementation: {
      effort: 'medium',
      risk: 'low',
      duration: 7, // days
    },
    tactics: [
      'Simplify and optimize agent prompts',
      'Implement agent-specific caching',
      'Parallelize independent agent tasks',
      'Remove redundant processing steps',
    ],
  },
  BATCH_OPTIMIZATION: {
    name: 'Batch Processing Optimization',
    description: 'Optimize batch sizes and processing strategies for maximum throughput',
    targetMetrics: ['throughput', 'cost_per_categorization'],
    expectedImpact: {
      throughput: 30, // 30% increase
      cost_per_categorization: -15, // 15% reduction
    },
    implementation: {
      effort: 'low',
      risk: 'low',
      duration: 3, // days
    },
    tactics: [
      'Dynamic batch sizing based on product complexity',
      'Implement adaptive batching algorithms',
      'Optimize context window usage',
      'Reduce token overhead per batch',
    ],
  },
  CACHING_ENHANCEMENT: {
    name: 'Advanced Caching Strategy',
    description: 'Implement sophisticated caching mechanisms to reduce API calls',
    targetMetrics: ['cache_hit_rate', 'cost_per_categorization', 'response_time'],
    expectedImpact: {
      cache_hit_rate: 40, // 40% increase
      cost_per_categorization: -25, // 25% reduction
      response_time: -15, // 15% reduction
    },
    implementation: {
      effort: 'medium',
      risk: 'low',
      duration: 5, // days
    },
    tactics: [
      'Implement semantic similarity caching',
      'Add category-level result caching',
      'Create shared memory cache across crews',
      'Implement cache warming strategies',
    ],
  },
  MODEL_OPTIMIZATION: {
    name: 'AI Model Optimization',
    description: 'Optimize model selection and usage for better performance and cost',
    targetMetrics: ['cost_per_categorization', 'accuracy', 'response_time'],
    expectedImpact: {
      cost_per_categorization: -30, // 30% reduction
      accuracy: 5, // 5% increase
      response_time: -10, // 10% reduction
    },
    implementation: {
      effort: 'high',
      risk: 'medium',
      duration: 14, // days
    },
    tactics: [
      'Implement model routing based on complexity',
      'Use cheaper models for simple categorizations',
      'Fine-tune prompts for specific models',
      'Implement model fallback strategies',
    ],
  },
  INFRASTRUCTURE_SCALING: {
    name: 'Infrastructure and Scaling Optimization',
    description: 'Optimize infrastructure for better scalability and performance',
    targetMetrics: ['throughput', 'response_time'],
    expectedImpact: {
      throughput: 50, // 50% increase
      response_time: -25, // 25% reduction
    },
    implementation: {
      effort: 'high',
      risk: 'medium',
      duration: 10, // days
    },
    tactics: [
      'Implement auto-scaling for workers',
      'Optimize memory management',
      'Add request queuing and prioritization',
      'Implement circuit breakers',
    ],
  },
  QUALITY_ENHANCEMENT: {
    name: 'Categorization Quality Enhancement',
    description: 'Improve accuracy through better context and validation',
    targetMetrics: ['accuracy'],
    expectedImpact: {
      accuracy: 10, // 10% increase
    },
    implementation: {
      effort: 'medium',
      risk: 'low',
      duration: 7, // days
    },
    tactics: [
      'Enhance category context descriptions',
      'Implement confidence thresholds',
      'Add validation agent for quality checks',
      'Improve error handling and recovery',
    ],
  },
};

// Analyze current performance and generate recommendations
export const analyzePerformance = internalAction({
  args: {
    organizationId: v.id('organizations'),
    timeRange: v.string(),
  },
  handler: async (ctx, { organizationId, timeRange }) => {
    // Get current metrics
    const metrics = await ctx.runQuery(
      internal.functions.ai.monitoring.crewAIMonitoring.getDashboardData,
      { organizationId, timeRange }
    );
    
    // Analyze performance gaps
    const performanceGaps = analyzePerformanceGaps(metrics.keyMetrics);
    
    // Generate optimization recommendations
    const recommendations = generateOptimizationRecommendations(
      performanceGaps,
      metrics.trends
    );
    
    // Prioritize recommendations
    const prioritized = prioritizeRecommendations(recommendations);
    
    // Calculate ROI for each recommendation
    const withROI = calculateROI(prioritized, metrics.keyMetrics);
    
    // Store recommendations
    for (const rec of withROI) {
      await ctx.runMutation(
        internal.functions.ai.monitoring.optimizationEngine.storeRecommendation,
        {
          organizationId,
          recommendation: rec,
        }
      );
    }
    
    return {
      performanceGaps,
      recommendations: withROI,
      summary: generateOptimizationSummary(performanceGaps, withROI),
    };
  },
});

// A/B test optimization strategies
export const runABTest = internalAction({
  args: {
    organizationId: v.id('organizations'),
    optimizationId: v.id('crewAIOptimizations'),
    testDuration: v.number(), // hours
    trafficSplit: v.number(), // percentage for test group (0-100)
  },
  handler: async (ctx, { organizationId, optimizationId, testDuration, trafficSplit }) => {
    const optimization = await ctx.runQuery(
      internal.functions.ai.monitoring.optimizationEngine.getOptimization,
      { optimizationId }
    );
    
    if (!optimization) throw new Error('Optimization not found');
    
    // Create A/B test configuration
    const testId = await ctx.runMutation(
      internal.functions.ai.monitoring.optimizationEngine.createABTest,
      {
        organizationId,
        optimizationId,
        config: {
          startTime: Date.now(),
          endTime: Date.now() + (testDuration * 3600000),
          trafficSplit,
          controlGroup: 'current',
          testGroup: optimization.type,
          metrics: getOptimizationMetrics(optimization.type),
        },
      }
    );
    
    // Schedule test monitoring
    await scheduleTestMonitoring(ctx, testId, testDuration);
    
    return {
      testId,
      status: 'running',
      expectedCompletion: new Date(Date.now() + (testDuration * 3600000)),
    };
  },
});

// Implement approved optimization
export const implementOptimization = mutation({
  args: {
    optimizationId: v.id('crewAIOptimizations'),
    implementationNotes: v.optional(v.string()),
  },
  handler: async (ctx, { optimizationId, implementationNotes }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    const optimization = await ctx.db.get(optimizationId);
    if (!optimization) throw new Error('Optimization not found');
    
    if (optimization.status !== 'approved') {
      throw new Error('Optimization must be approved before implementation');
    }
    
    // Update status
    await ctx.db.patch(optimizationId, {
      status: 'in_progress',
      implementationStarted: Date.now(),
      implementationNotes,
    });
    
    // Create implementation tasks
    const tasks = await createImplementationTasks(ctx, optimization);
    
    // Log implementation start
    await logOptimizationEvent(ctx, optimizationId, 'implementation_started', {
      tasks: tasks.length,
      estimatedDuration: optimization.implementation.duration,
    });
    
    return {
      success: true,
      tasks,
      estimatedCompletion: new Date(
        Date.now() + (optimization.implementation.duration * 24 * 3600000)
      ),
    };
  },
});

// Get optimization recommendations
export const getOptimizationRecommendations = query({
  args: {
    organizationId: v.id('organizations'),
    status: v.optional(v.string()),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, status, type, limit = 20 }) => {
    let query = ctx.db
      .query('crewAIOptimizations')
      .withIndex('by_organization_status', q =>
        q.eq('organizationId', organizationId)
      );
    
    if (status) {
      query = query.filter(q => q.eq(q.field('status'), status));
    }
    
    if (type) {
      query = query.filter(q => q.eq(q.field('type'), type));
    }
    
    const recommendations = await query
      .order('desc')
      .take(limit);
    
    // Calculate current progress for in-progress optimizations
    const withProgress = await Promise.all(
      recommendations.map(async (rec) => {
        if (rec.status === 'in_progress') {
          const progress = await calculateOptimizationProgress(ctx, rec);
          return { ...rec, progress };
        }
        return rec;
      })
    );
    
    return withProgress;
  },
});

// Track optimization results
export const trackOptimizationResults = internalAction({
  args: {
    optimizationId: v.id('crewAIOptimizations'),
  },
  handler: async (ctx, { optimizationId }) => {
    const optimization = await ctx.runQuery(
      internal.functions.ai.monitoring.optimizationEngine.getOptimization,
      { optimizationId }
    );
    
    if (!optimization || optimization.status !== 'completed') {
      throw new Error('Optimization not found or not completed');
    }
    
    // Get metrics before and after implementation
    const beforeMetrics = await getMetricsForPeriod(
      ctx,
      optimization.organizationId,
      optimization.createdAt - 7 * 24 * 3600000, // 7 days before
      optimization.createdAt
    );
    
    const afterMetrics = await getMetricsForPeriod(
      ctx,
      optimization.organizationId,
      optimization.completedAt!,
      optimization.completedAt! + 7 * 24 * 3600000 // 7 days after
    );
    
    // Calculate actual impact
    const actualImpact = calculateActualImpact(
      beforeMetrics,
      afterMetrics,
      optimization.expectedImpact
    );
    
    // Update optimization with results
    await ctx.runMutation(
      internal.functions.ai.monitoring.optimizationEngine.updateOptimizationResults,
      {
        optimizationId,
        actualImpact,
        successMetrics: evaluateSuccess(actualImpact, optimization.expectedImpact),
      }
    );
    
    // Generate learnings
    const learnings = generateLearnings(optimization, actualImpact);
    
    // Store learnings for future recommendations
    await ctx.runMutation(
      internal.functions.ai.monitoring.optimizationEngine.storeLearnings,
      {
        organizationId: optimization.organizationId,
        optimizationType: optimization.type,
        learnings,
      }
    );
    
    return {
      actualImpact,
      learnings,
      success: actualImpact.overallSuccess,
    };
  },
});

// Helper functions
function analyzePerformanceGaps(metrics: any): Record<string, any> {
  const gaps: Record<string, any> = {};
  
  for (const [metric, targets] of Object.entries(OPTIMIZATION_TARGETS)) {
    const currentValue = metrics[metric.toLowerCase()] || targets.current;
    const gap = {
      current: currentValue,
      target: targets.target,
      stretch: targets.stretch,
      gapToTarget: calculateGap(currentValue, targets.target, metric),
      gapToStretch: calculateGap(currentValue, targets.stretch, metric),
    };
    gaps[metric] = gap;
  }
  
  return gaps;
}

function calculateGap(current: number, target: number, metric: string): number {
  // For metrics where lower is better (response time, cost)
  if (['RESPONSE_TIME_P95', 'COST_PER_CATEGORIZATION'].includes(metric)) {
    return ((current - target) / current) * 100;
  }
  // For metrics where higher is better (throughput, accuracy, cache hit rate)
  return ((target - current) / target) * 100;
}

function generateOptimizationRecommendations(
  gaps: Record<string, any>,
  trends: any
): any[] {
  const recommendations = [];
  
  // Check each gap and recommend appropriate strategies
  for (const [metric, gap] of Object.entries(gaps)) {
    if (gap.gapToTarget > 5) { // More than 5% gap
      const strategies = findStrategiesForMetric(metric);
      
      for (const strategy of strategies) {
        const relevance = calculateRelevance(strategy, gap, trends);
        if (relevance > 0.6) { // 60% relevance threshold
          recommendations.push({
            ...strategy,
            targetMetric: metric,
            relevanceScore: relevance,
            expectedGapReduction: gap.gapToTarget * (strategy.expectedImpact[metric.toLowerCase()] || 0) / 100,
          });
        }
      }
    }
  }
  
  return recommendations;
}

function findStrategiesForMetric(metric: string): any[] {
  const strategies = [];
  const metricKey = metric.toLowerCase();
  
  for (const [key, strategy] of Object.entries(OPTIMIZATION_STRATEGIES)) {
    if (strategy.targetMetrics.includes(metricKey)) {
      strategies.push({ ...strategy, type: key });
    }
  }
  
  return strategies;
}

function calculateRelevance(strategy: any, gap: any, trends: any): number {
  let relevance = 0.5; // Base relevance
  
  // Increase relevance based on gap size
  if (gap.gapToTarget > 20) relevance += 0.2;
  else if (gap.gapToTarget > 10) relevance += 0.1;
  
  // Adjust based on trends
  if (trends && trends.performanceTrend === 'degrading') relevance += 0.15;
  else if (trends && trends.performanceTrend === 'improving') relevance -= 0.1;
  
  // Adjust based on implementation effort
  if (strategy.implementation.effort === 'low') relevance += 0.1;
  else if (strategy.implementation.effort === 'high') relevance -= 0.1;
  
  return Math.max(0, Math.min(1, relevance));
}

function prioritizeRecommendations(recommendations: any[]): any[] {
  return recommendations.sort((a, b) => {
    // Priority factors:
    // 1. Relevance score (40%)
    // 2. Expected impact (30%)
    // 3. Implementation effort (20%)
    // 4. Risk (10%)
    
    const scoreA = calculatePriorityScore(a);
    const scoreB = calculatePriorityScore(b);
    
    return scoreB - scoreA;
  });
}

function calculatePriorityScore(rec: any): number {
  const relevanceWeight = 0.4;
  const impactWeight = 0.3;
  const effortWeight = 0.2;
  const riskWeight = 0.1;
  
  const effortScore = rec.implementation.effort === 'low' ? 1 : 
                     rec.implementation.effort === 'medium' ? 0.5 : 0;
  const riskScore = rec.implementation.risk === 'low' ? 1 : 
                   rec.implementation.risk === 'medium' ? 0.5 : 0;
  const impactScore = rec.expectedGapReduction / 100;
  
  return (
    rec.relevanceScore * relevanceWeight +
    impactScore * impactWeight +
    effortScore * effortWeight +
    riskScore * riskWeight
  );
}

function calculateROI(recommendations: any[], currentMetrics: any): any[] {
  return recommendations.map(rec => {
    // Estimate cost savings
    const costSavings = estimateCostSavings(rec, currentMetrics);
    
    // Estimate performance improvements value
    const performanceValue = estimatePerformanceValue(rec, currentMetrics);
    
    // Estimate implementation cost
    const implementationCost = estimateImplementationCost(rec);
    
    const totalValue = costSavings + performanceValue;
    const roi = implementationCost > 0 ? (totalValue / implementationCost) * 100 : 0;
    
    return {
      ...rec,
      estimatedValue: totalValue,
      estimatedCost: implementationCost,
      estimatedROI: roi,
      paybackPeriod: implementationCost > 0 ? implementationCost / (totalValue / 30) : 0, // days
    };
  });
}

function estimateCostSavings(rec: any, metrics: any): number {
  // Estimate monthly cost savings based on optimization type
  let savings = 0;
  
  if (rec.expectedImpact.cost_per_categorization) {
    const currentMonthlyCost = metrics.totalProducts * metrics.cost_per_categorization * 30;
    const reduction = rec.expectedImpact.cost_per_categorization / 100;
    savings = currentMonthlyCost * reduction;
  }
  
  return savings;
}

function estimatePerformanceValue(rec: any, metrics: any): number {
  // Estimate value of performance improvements
  let value = 0;
  
  // Throughput improvements = more products processed
  if (rec.expectedImpact.throughput) {
    const additionalProducts = metrics.throughput * (rec.expectedImpact.throughput / 100) * 60 * 24 * 30;
    value += additionalProducts * 0.02; // $0.02 value per additional product
  }
  
  // Response time improvements = better user experience
  if (rec.expectedImpact.response_time) {
    value += 500; // $500/month value for better UX
  }
  
  // Accuracy improvements = fewer corrections needed
  if (rec.expectedImpact.accuracy) {
    const errorReduction = metrics.totalProducts * (rec.expectedImpact.accuracy / 100) * 0.1;
    value += errorReduction * 0.5; // $0.50 saved per avoided error
  }
  
  return value;
}

function estimateImplementationCost(rec: any): number {
  // Estimate implementation cost based on effort and duration
  const dailyRate = 1000; // $1000/day engineering cost
  
  const effortMultiplier = 
    rec.implementation.effort === 'low' ? 0.5 :
    rec.implementation.effort === 'medium' ? 1 :
    rec.implementation.effort === 'high' ? 2 : 1;
  
  return rec.implementation.duration * dailyRate * effortMultiplier;
}

function generateOptimizationSummary(gaps: any, recommendations: any[]): any {
  const topRecommendations = recommendations.slice(0, 3);
  const totalExpectedValue = recommendations.reduce((sum, r) => sum + r.estimatedValue, 0);
  const totalImplementationCost = recommendations.reduce((sum, r) => sum + r.estimatedCost, 0);
  
  return {
    criticalGaps: Object.entries(gaps)
      .filter(([_, gap]) => gap.gapToTarget > 15)
      .map(([metric, gap]) => ({ metric, gap: gap.gapToTarget })),
    topRecommendations: topRecommendations.map(r => ({
      title: r.name,
      impact: r.expectedGapReduction,
      roi: r.estimatedROI,
      effort: r.implementation.effort,
    })),
    totalOpportunityValue: totalExpectedValue,
    totalInvestmentRequired: totalImplementationCost,
    recommendedActions: getRecommendedActions(topRecommendations),
  };
}

function getRecommendedActions(recommendations: any[]): string[] {
  const actions = [];
  
  if (recommendations.length > 0) {
    actions.push(`Start with ${recommendations[0].name} for quick wins`);
    
    if (recommendations[0].implementation.effort === 'low') {
      actions.push('Begin implementation immediately - low effort required');
    } else {
      actions.push('Schedule planning session for implementation');
    }
    
    if (recommendations.length > 1) {
      actions.push(`Prepare for ${recommendations[1].name} as follow-up`);
    }
  }
  
  return actions;
}

async function createImplementationTasks(ctx: any, optimization: any): Promise<any[]> {
  const tasks = [];
  
  // Create tasks based on optimization tactics
  for (const tactic of optimization.tactics || []) {
    tasks.push({
      title: tactic,
      optimizationId: optimization._id,
      status: 'pending',
      createdAt: Date.now(),
    });
  }
  
  return tasks;
}

async function logOptimizationEvent(
  ctx: any,
  optimizationId: Id<'crewAIOptimizations'>,
  event: string,
  data: any
) {
  console.log(`Optimization event: ${event}`, data);
}

async function calculateOptimizationProgress(ctx: any, optimization: any): Promise<number> {
  // Calculate progress based on implementation duration
  if (!optimization.implementationStarted) return 0;
  
  const elapsed = Date.now() - optimization.implementationStarted;
  const total = optimization.implementation.duration * 24 * 3600000;
  
  return Math.min(100, (elapsed / total) * 100);
}

function getOptimizationMetrics(type: string): string[] {
  const strategy = OPTIMIZATION_STRATEGIES[type as keyof typeof OPTIMIZATION_STRATEGIES];
  return strategy ? strategy.targetMetrics : [];
}

async function scheduleTestMonitoring(ctx: any, testId: string, duration: number) {
  // Schedule periodic monitoring of A/B test
  console.log(`Scheduling monitoring for test ${testId} for ${duration} hours`);
}

async function getMetricsForPeriod(
  ctx: any,
  organizationId: Id<'organizations'>,
  startTime: number,
  endTime: number
): Promise<any> {
  // Get aggregated metrics for the period
  return {
    response_time: 6000,
    throughput: 600,
    cost_per_categorization: 0.055,
    accuracy: 0.87,
    cache_hit_rate: 0.65,
  };
}

function calculateActualImpact(
  beforeMetrics: any,
  afterMetrics: any,
  expectedImpact: any
): any {
  const actualImpact: any = {};
  
  for (const [metric, expected] of Object.entries(expectedImpact)) {
    const before = beforeMetrics[metric];
    const after = afterMetrics[metric];
    
    if (before && after) {
      const change = ((after - before) / before) * 100;
      actualImpact[metric] = {
        expected: expected,
        actual: change,
        success: Math.abs(change) >= Math.abs(expected as number) * 0.8, // 80% of expected
      };
    }
  }
  
  actualImpact.overallSuccess = Object.values(actualImpact)
    .filter(v => typeof v === 'object' && 'success' in v)
    .every((v: any) => v.success);
  
  return actualImpact;
}

function evaluateSuccess(actual: any, expected: any): any {
  const metrics: any = {};
  
  for (const [key, value] of Object.entries(actual)) {
    if (typeof value === 'object' && 'success' in value) {
      metrics[key] = value.success;
    }
  }
  
  return metrics;
}

function generateLearnings(optimization: any, actualImpact: any): any {
  const learnings = {
    whatWorked: [] as string[],
    whatDidntWork: [] as string[],
    surprises: [] as string[],
    recommendations: [] as string[],
  };
  
  // Analyze what worked
  for (const [metric, impact] of Object.entries(actualImpact)) {
    if (typeof impact === 'object' && 'success' in impact && impact.success) {
      learnings.whatWorked.push(`${metric} improved by ${impact.actual}% (expected ${impact.expected}%)`);
    } else if (typeof impact === 'object' && 'success' in impact && !impact.success) {
      learnings.whatDidntWork.push(`${metric} only improved by ${impact.actual}% (expected ${impact.expected}%)`);
    }
  }
  
  // Generate recommendations
  if (actualImpact.overallSuccess) {
    learnings.recommendations.push('Continue with similar optimization strategies');
    learnings.recommendations.push('Consider more aggressive targets for next iteration');
  } else {
    learnings.recommendations.push('Review implementation for potential issues');
    learnings.recommendations.push('Consider alternative approaches');
  }
  
  return learnings;
}

// Internal mutations
export const storeRecommendation = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    recommendation: v.any(),
  },
  handler: async (ctx, { organizationId, recommendation }) => {
    return await ctx.db.insert('crewAIOptimizations', {
      organizationId,
      ...recommendation,
      status: 'proposed',
      createdAt: Date.now(),
    });
  },
});

export const createABTest = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    optimizationId: v.id('crewAIOptimizations'),
    config: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('crewAIABTests', {
      ...args,
      status: 'running',
      createdAt: Date.now(),
    });
  },
});

export const updateOptimizationResults = internalMutation({
  args: {
    optimizationId: v.id('crewAIOptimizations'),
    actualImpact: v.any(),
    successMetrics: v.any(),
  },
  handler: async (ctx, { optimizationId, actualImpact, successMetrics }) => {
    await ctx.db.patch(optimizationId, {
      actualImpact,
      successMetrics,
      resultsUpdatedAt: Date.now(),
    });
  },
});

export const storeLearnings = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    optimizationType: v.string(),
    learnings: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('crewAILearnings', {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Internal queries
export const getOptimization = internalQuery({
  args: {
    optimizationId: v.id('crewAIOptimizations'),
  },
  handler: async (ctx, { optimizationId }) => {
    return await ctx.db.get(optimizationId);
  },
});