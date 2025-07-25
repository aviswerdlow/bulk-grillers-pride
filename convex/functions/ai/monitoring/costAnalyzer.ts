import { internal } from "@convex/_generated/api";
/**
 * CrewAI Cost Analyzer
 * 
 * Tracks and analyzes costs for AI categorization operations,
 * providing insights and optimization recommendations.
 */

import { v } from 'convex/values';
import { query, internalMutation, internalQuery } from '../../../_generated/server';
import { Id } from '../../../_generated/dataModel';

// Cost models for different AI providers
const COST_MODELS = {
  openai: {
    'gpt-4-turbo-preview': {
      inputCost: 0.01, // per 1K tokens
      outputCost: 0.03, // per 1K tokens
    },
    'gpt-4o': {
      inputCost: 0.005,
      outputCost: 0.015,
    },
    'gpt-4o-mini': {
      inputCost: 0.00015,
      outputCost: 0.0006,
    },
    'gpt-4': {
      inputCost: 0.03,
      outputCost: 0.06,
    },
    'gpt-3.5-turbo': {
      inputCost: 0.0005,
      outputCost: 0.0015,
    },
  },
  anthropic: {
    'claude-opus-4': {
      inputCost: 0.015,
      outputCost: 0.075,
    },
    'claude-sonnet-4': {
      inputCost: 0.003,
      outputCost: 0.015,
    },
    'claude-3-opus-20240229': {
      inputCost: 0.015,
      outputCost: 0.075,
    },
    'claude-3-sonnet-20240229': {
      inputCost: 0.003,
      outputCost: 0.015,
    },
    'claude-3-haiku-20240307': {
      inputCost: 0.00025,
      outputCost: 0.00125,
    },
  },
  gemini: {
    'gemini-1.5-flash': {
      inputCost: 0.00035,
      outputCost: 0.0014,
    },
    'gemini-1.5-pro': {
      inputCost: 0.0035,
      outputCost: 0.014,
    },
    'gemini-1.0-pro': {
      inputCost: 0.0005,
      outputCost: 0.0015,
    },
  },
};

// Get cost analysis for organization
export const getCostAnalysis = query({
  args: {
    organizationId: v.id('organizations'),
    timeRange: v.union(
      v.literal('24h'),
      v.literal('7d'),
      v.literal('30d'),
      v.literal('90d')
    ),
    groupBy: v.optional(v.union(
      v.literal('provider'),
      v.literal('model'),
      v.literal('job'),
      v.literal('day')
    )),
  },
  handler: async (ctx, { organizationId, timeRange, groupBy = 'provider' }) => {
    const now = Date.now();
    const startTime = getTimeRangeStart(now, timeRange);
    
    // Get cost tracking data
    const costs = await ctx.db
      .query('crewAICostTracking')
      .withIndex('by_organization_time', q =>
        q.eq('organizationId', organizationId)
          .gte('timestamp', startTime)
      )
      .collect();
    
    // Calculate totals
    const totals = {
      totalCost: costs.reduce((sum, c) => sum + c.totalCost, 0),
      totalProducts: costs.reduce((sum, c) => sum + c.productCount, 0),
      totalInputTokens: costs.reduce((sum, c) => sum + c.inputTokens, 0),
      totalOutputTokens: costs.reduce((sum, c) => sum + c.outputTokens, 0),
      avgCostPerProduct: 0,
    };
    
    totals.avgCostPerProduct = totals.totalProducts > 0 
      ? totals.totalCost / totals.totalProducts 
      : 0;
    
    // Group costs
    const grouped = groupCosts(costs, groupBy);
    
    // Calculate trends
    const trends = calculateCostTrends(costs, timeRange);
    
    // Get cost optimization opportunities
    const opportunities = identifyCostOpportunities(costs, totals);
    
    // Get provider comparison
    const providerComparison = compareProviders(costs);
    
    return {
      totals,
      grouped,
      trends,
      opportunities,
      providerComparison,
      period: {
        start: startTime,
        end: now,
        days: Math.ceil((now - startTime) / (24 * 3600000)),
      },
    };
  },
});

// Get detailed cost breakdown for a job
export const getJobCostBreakdown = query({
  args: {
    jobId: v.id('aiCategorizationJobs'),
  },
  handler: async (ctx, { jobId }) => {
    const costs = await ctx.db
      .query('crewAICostTracking')
      .withIndex('by_job', q => q.eq('jobId', jobId))
      .collect();
    
    if (costs.length === 0) {
      return null;
    }
    
    // Get job details
    const job = await ctx.db.get(jobId);
    if (!job) return null;
    
    // Calculate breakdown
    const breakdown = {
      job: {
        id: jobId,
        status: job.status,
        productCount: job.productIds.length,
        provider: job.aiProvider,
        model: job.aiModel,
      },
      costs: {
        total: costs.reduce((sum, c) => sum + c.totalCost, 0),
        inputTokens: costs.reduce((sum, c) => sum + c.inputTokens, 0),
        outputTokens: costs.reduce((sum, c) => sum + c.outputTokens, 0),
        perProduct: 0,
      },
      breakdown: costs.map(c => ({
        timestamp: c.timestamp,
        cost: c.totalCost,
        products: c.productCount,
        inputTokens: c.inputTokens,
        outputTokens: c.outputTokens,
      })),
      efficiency: {
        tokensPerProduct: 0,
        costPerThousandTokens: 0,
        cacheHitSavings: 0,
      },
    };
    
    // Calculate efficiency metrics
    breakdown.costs.perProduct = breakdown.costs.total / job.productIds.length;
    breakdown.efficiency.tokensPerProduct = 
      (breakdown.costs.inputTokens + breakdown.costs.outputTokens) / job.productIds.length;
    breakdown.efficiency.costPerThousandTokens = 
      breakdown.costs.total / ((breakdown.costs.inputTokens + breakdown.costs.outputTokens) / 1000);
    
    return breakdown;
  },
});

// Track cost for a job
export const trackJobCost = internalMutation({
  args: {
    jobId: v.id('aiCategorizationJobs'),
    provider: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    productCount: v.number(),
    cacheHits: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { provider, model, inputTokens, outputTokens } = args;
    
    // Calculate cost based on model
    const modelCosts = COST_MODELS[provider as keyof typeof COST_MODELS]?.[model];
    if (!modelCosts) {
      console.error(`No cost model found for ${provider}/${model}`);
      return;
    }
    
    const inputCost = (inputTokens / 1000) * modelCosts.inputCost;
    const outputCost = (outputTokens / 1000) * modelCosts.outputCost;
    const totalCost = inputCost + outputCost;
    
    // Get job organization
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    
    // Store cost tracking
    await ctx.db.insert('crewAICostTracking', {
      jobId: args.jobId,
      organizationId: job.organizationId,
      timestamp: Date.now(),
      provider,
      model,
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost,
      productCount: args.productCount,
      costPerCategorization: totalCost / args.productCount,
      cacheHits: args.cacheHits || 0,
    });
    
    // Update job with cost info
    await ctx.db.patch(args.jobId, {
      totalCost: (job.totalCost || 0) + totalCost,
      totalTokens: (job.totalTokens || 0) + inputTokens + outputTokens,
    });
    
    // Check if cost exceeds thresholds
    await checkCostThresholds(ctx, job.organizationId, totalCost / args.productCount);
  },
});

// Get cost projections
export const getCostProjections = query({
  args: {
    organizationId: v.id('organizations'),
    projectionDays: v.number(),
  },
  handler: async (ctx, { organizationId, projectionDays }) => {
    // Get historical data for projection
    const thirtyDaysAgo = Date.now() - (30 * 24 * 3600000);
    const historicalCosts = await ctx.db
      .query('crewAICostTracking')
      .withIndex('by_organization_time', q =>
        q.eq('organizationId', organizationId)
          .gte('timestamp', thirtyDaysAgo)
      )
      .collect();
    
    if (historicalCosts.length === 0) {
      return {
        projected: 0,
        confidence: 'low',
        breakdown: {},
      };
    }
    
    // Calculate daily averages
    const dailyCosts = calculateDailyCosts(historicalCosts);
    const avgDailyCost = dailyCosts.reduce((sum, d) => sum + d.cost, 0) / dailyCosts.length;
    const avgDailyProducts = dailyCosts.reduce((sum, d) => sum + d.products, 0) / dailyCosts.length;
    
    // Calculate trend
    const trend = calculateTrend(dailyCosts);
    
    // Project costs
    const projectedCost = projectCost(avgDailyCost, projectionDays, trend);
    
    // Break down by provider
    const providerBreakdown = projectByProvider(historicalCosts, projectionDays);
    
    return {
      projected: projectedCost,
      confidence: getConfidenceLevel(historicalCosts.length, trend.volatility),
      trend: {
        direction: trend.direction,
        rate: trend.rate,
        volatility: trend.volatility,
      },
      breakdown: {
        daily: avgDailyCost,
        weekly: avgDailyCost * 7,
        monthly: avgDailyCost * 30,
        perProduct: avgDailyCost / avgDailyProducts,
        byProvider: providerBreakdown,
      },
      recommendations: generateCostRecommendations(historicalCosts, projectedCost),
    };
  },
});

// Helper functions
function getTimeRangeStart(now: number, timeRange: string): number {
  const ranges: Record<string, number> = {
    '24h': 24 * 3600000,
    '7d': 7 * 24 * 3600000,
    '30d': 30 * 24 * 3600000,
    '90d': 90 * 24 * 3600000,
  };
  return now - (ranges[timeRange] || ranges['7d']);
}

function groupCosts(costs: any[], groupBy: string): any[] {
  const groups = new Map<string, any>();
  
  for (const cost of costs) {
    let key: string;
    switch (groupBy) {
      case 'provider':
        key = cost.provider;
        break;
      case 'model':
        key = `${cost.provider}/${cost.model}`;
        break;
      case 'job':
        key = cost.jobId;
        break;
      case 'day':
        key = new Date(cost.timestamp).toISOString().split('T')[0];
        break;
      default:
        key = cost.provider;
    }
    
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        totalCost: 0,
        totalProducts: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        count: 0,
      });
    }
    
    const group = groups.get(key)!;
    group.totalCost += cost.totalCost;
    group.totalProducts += cost.productCount;
    group.totalInputTokens += cost.inputTokens;
    group.totalOutputTokens += cost.outputTokens;
    group.count++;
  }
  
  return Array.from(groups.values()).map(g => ({
    ...g,
    avgCostPerProduct: g.totalProducts > 0 ? g.totalCost / g.totalProducts : 0,
    avgTokensPerProduct: g.totalProducts > 0 
      ? (g.totalInputTokens + g.totalOutputTokens) / g.totalProducts 
      : 0,
  }));
}

function calculateCostTrends(costs: any[], timeRange: string): any {
  const dailyCosts = calculateDailyCosts(costs);
  
  if (dailyCosts.length < 2) {
    return {
      direction: 'stable',
      changePercent: 0,
      projection: null,
    };
  }
  
  // Calculate trend
  const firstHalf = dailyCosts.slice(0, Math.floor(dailyCosts.length / 2));
  const secondHalf = dailyCosts.slice(Math.floor(dailyCosts.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, d) => sum + d.cost, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.cost, 0) / secondHalf.length;
  
  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  return {
    direction: changePercent > 5 ? 'increasing' : changePercent < -5 ? 'decreasing' : 'stable',
    changePercent,
    dailyAverage: secondAvg,
    weeklyProjection: secondAvg * 7,
    monthlyProjection: secondAvg * 30,
  };
}

function identifyCostOpportunities(costs: any[], totals: any): any[] {
  const opportunities = [];
  
  // Check if using expensive models
  const modelCosts = costs.reduce((acc, c) => {
    const key = `${c.provider}/${c.model}`;
    acc[key] = (acc[key] || 0) + c.totalCost;
    return acc;
  }, {} as Record<string, number>);
  
  const expensiveModels = Object.entries(modelCosts)
    .filter(([model, cost]) => {
      const avgCost = cost / costs.filter(c => `${c.provider}/${c.model}` === model).length;
      return avgCost > totals.avgCostPerProduct * 1.5;
    });
  
  if (expensiveModels.length > 0) {
    opportunities.push({
      type: 'model_optimization',
      title: 'Use more cost-effective models',
      description: `Consider switching from expensive models for simpler categorizations`,
      estimatedSavings: expensiveModels.reduce((sum, [_, cost]) => sum + cost * 0.3, 0),
      effort: 'low',
    });
  }
  
  // Check cache hit rate
  const avgCacheHits = costs.reduce((sum, c) => sum + (c.cacheHits || 0), 0) / costs.length;
  const avgProducts = totals.totalProducts / costs.length;
  const cacheHitRate = avgProducts > 0 ? avgCacheHits / avgProducts : 0;
  
  if (cacheHitRate < 0.3) {
    opportunities.push({
      type: 'cache_improvement',
      title: 'Improve caching strategy',
      description: 'Low cache hit rate indicates opportunity for better caching',
      estimatedSavings: totals.totalCost * 0.2,
      effort: 'medium',
    });
  }
  
  // Check batch efficiency
  const avgBatchSize = totals.totalProducts / costs.length;
  if (avgBatchSize < 5) {
    opportunities.push({
      type: 'batch_optimization',
      title: 'Increase batch sizes',
      description: 'Small batches are less efficient for token usage',
      estimatedSavings: totals.totalCost * 0.15,
      effort: 'low',
    });
  }
  
  return opportunities;
}

function compareProviders(costs: any[]): any {
  const providers = new Map<string, any>();
  
  for (const cost of costs) {
    if (!providers.has(cost.provider)) {
      providers.set(cost.provider, {
        provider: cost.provider,
        totalCost: 0,
        totalProducts: 0,
        models: new Set(),
        avgCostPerProduct: 0,
      });
    }
    
    const provider = providers.get(cost.provider)!;
    provider.totalCost += cost.totalCost;
    provider.totalProducts += cost.productCount;
    provider.models.add(cost.model);
  }
  
  // Calculate averages and convert to array
  const comparison = Array.from(providers.values()).map(p => ({
    ...p,
    avgCostPerProduct: p.totalProducts > 0 ? p.totalCost / p.totalProducts : 0,
    models: Array.from(p.models),
  }));
  
  // Sort by cost efficiency
  comparison.sort((a, b) => a.avgCostPerProduct - b.avgCostPerProduct);
  
  return comparison;
}

function calculateDailyCosts(costs: any[]): any[] {
  const daily = new Map<string, any>();
  
  for (const cost of costs) {
    const date = new Date(cost.timestamp).toISOString().split('T')[0];
    
    if (!daily.has(date)) {
      daily.set(date, {
        date,
        cost: 0,
        products: 0,
        jobs: new Set(),
      });
    }
    
    const day = daily.get(date)!;
    day.cost += cost.totalCost;
    day.products += cost.productCount;
    day.jobs.add(cost.jobId);
  }
  
  return Array.from(daily.values())
    .map(d => ({
      ...d,
      jobs: d.jobs.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateTrend(dailyCosts: any[]): any {
  if (dailyCosts.length < 3) {
    return { direction: 'stable', rate: 0, volatility: 0 };
  }
  
  // Simple linear regression
  const n = dailyCosts.length;
  const x = dailyCosts.map((_, i) => i);
  const y = dailyCosts.map(d => d.cost);
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgY = sumY / n;
  
  // Calculate volatility (standard deviation)
  const variance = y.reduce((sum, yi) => sum + Math.pow(yi - avgY, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const volatility = avgY > 0 ? stdDev / avgY : 0;
  
  return {
    direction: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable',
    rate: slope,
    volatility,
  };
}

function projectCost(avgDailyCost: number, days: number, trend: any): number {
  // Simple projection with trend adjustment
  let projected = avgDailyCost * days;
  
  if (trend.direction === 'increasing') {
    projected *= 1 + (trend.rate * days * 0.01);
  } else if (trend.direction === 'decreasing') {
    projected *= 1 - (trend.rate * days * 0.01);
  }
  
  // Add volatility buffer
  projected *= 1 + (trend.volatility * 0.1);
  
  return Math.max(0, projected);
}

function getConfidenceLevel(dataPoints: number, volatility: number): string {
  if (dataPoints < 7 || volatility > 0.5) return 'low';
  if (dataPoints < 30 || volatility > 0.3) return 'medium';
  return 'high';
}

function projectByProvider(costs: any[], days: number): any {
  const providers = groupCosts(costs, 'provider');
  const totalDays = (Date.now() - Math.min(...costs.map(c => c.timestamp))) / (24 * 3600000);
  
  return providers.reduce((acc, p) => {
    acc[p.key] = (p.totalCost / totalDays) * days;
    return acc;
  }, {} as Record<string, number>);
}

function generateCostRecommendations(costs: any[], projectedCost: number): string[] {
  const recommendations = [];
  
  // Check if costs are increasing
  const trend = calculateTrend(calculateDailyCosts(costs));
  if (trend.direction === 'increasing' && trend.rate > 0.05) {
    recommendations.push('Costs are increasing - review model usage and batch sizes');
  }
  
  // Check provider diversity
  const providers = new Set(costs.map(c => c.provider));
  if (providers.size === 1) {
    recommendations.push('Consider using multiple providers for cost optimization and redundancy');
  }
  
  // Check model efficiency
  const avgTokensPerProduct = costs.reduce((sum, c) => 
    sum + (c.inputTokens + c.outputTokens) / c.productCount, 0
  ) / costs.length;
  
  if (avgTokensPerProduct > 2000) {
    recommendations.push('High token usage per product - optimize prompts and context');
  }
  
  return recommendations;
}

async function checkCostThresholds(
  ctx: any,
  organizationId: Id<'organizations'>,
  costPerCategorization: number
) {
  // Check if cost exceeds threshold and create alert if needed
  if (costPerCategorization > 0.05) { // $0.05 threshold
    await ctx.runMutation(
      internal.functions.ai.monitoring.alertManager.createAlert,
      {
        organizationId,
        severity: costPerCategorization > 0.08 ? 'critical' : 'warning',
        type: 'HIGH_COST',
        message: `Cost per categorization ($${costPerCategorization.toFixed(4)}) exceeds threshold`,
        metric: 'cost_per_categorization',
        threshold: 0.05,
        actualValue: costPerCategorization,
      }
    );
  }
}

// Calculate cache hit savings
export const calculateCacheSavings = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, { organizationId, startTime, endTime }) => {
    const costs = await ctx.db
      .query('crewAICostTracking')
      .withIndex('by_organization_time', q =>
        q.eq('organizationId', organizationId)
          .gte('timestamp', startTime)
          .lte('timestamp', endTime)
      )
      .collect();
    
    // Calculate average cost per product
    const totalCost = costs.reduce((sum, c) => sum + c.totalCost, 0);
    const totalProducts = costs.reduce((sum, c) => sum + c.productCount, 0);
    const totalCacheHits = costs.reduce((sum, c) => sum + (c.cacheHits || 0), 0);
    
    const avgCostPerProduct = totalProducts > 0 ? totalCost / totalProducts : 0;
    const estimatedSavings = totalCacheHits * avgCostPerProduct;
    
    return {
      totalCacheHits,
      estimatedSavings,
      savingsPercent: totalCost > 0 ? (estimatedSavings / (totalCost + estimatedSavings)) * 100 : 0,
    };
  },
});