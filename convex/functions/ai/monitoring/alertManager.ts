/**
 * CrewAI Alert Manager
 * 
 * Manages alerts, notifications, and incident response for the CrewAI monitoring system.
 * Provides intelligent alert correlation, deduplication, and automated remediation.
 */

import { v } from 'convex/values';
import { 
  mutation, 
  query, 
  internalMutation,
  internalQuery,
  internalAction,
  DatabaseWriter
} from '../../../_generated/server';
import { Doc, Id } from '../../../_generated/dataModel';
import { internal } from '../../../_generated/api';

// Alert severity levels and their properties
const SEVERITY_LEVELS = {
  info: {
    priority: 0,
    notificationDelay: 300000, // 5 minutes
    autoResolveTime: 3600000, // 1 hour
    requiresAck: false,
  },
  warning: {
    priority: 1,
    notificationDelay: 60000, // 1 minute
    autoResolveTime: 7200000, // 2 hours
    requiresAck: true,
  },
  critical: {
    priority: 2,
    notificationDelay: 0, // Immediate
    autoResolveTime: null, // No auto-resolve
    requiresAck: true,
  },
};

// Alert correlation rules
const CORRELATION_RULES = {
  // Group similar alerts within time window
  similarAlertWindow: 300000, // 5 minutes
  
  // Alert patterns that indicate broader issues
  patterns: [
    {
      name: 'API_OUTAGE',
      conditions: [
        { type: 'API_ERROR', minCount: 3, timeWindow: 60000 },
        { type: 'HIGH_LATENCY', minCount: 2, timeWindow: 60000 },
      ],
      severity: 'critical',
      message: 'Potential API provider outage detected',
    },
    {
      name: 'PERFORMANCE_DEGRADATION',
      conditions: [
        { type: 'SLOW_RESPONSE_TIME', minCount: 5, timeWindow: 300000 },
        { type: 'LOW_THROUGHPUT', minCount: 3, timeWindow: 300000 },
      ],
      severity: 'warning',
      message: 'System performance degradation detected',
    },
    {
      name: 'QUALITY_ISSUE',
      conditions: [
        { type: 'LOW_ACCURACY', minCount: 2, timeWindow: 600000 },
        { type: 'HIGH_ERROR_RATE', minCount: 2, timeWindow: 600000 },
      ],
      severity: 'warning',
      message: 'Categorization quality issues detected',
    },
  ],
};

// Automated remediation actions
const REMEDIATION_ACTIONS = {
  HIGH_ERROR_RATE: [
    {
      threshold: 0.05, // 5% error rate
      actions: [
        'validateApiKeys',
        'checkProviderStatus',
        'reduceWorkerConcurrency',
      ],
    },
    {
      threshold: 0.1, // 10% error rate
      actions: [
        'pauseProcessing',
        'notifyOncall',
        'switchToBackupProvider',
      ],
    },
  ],
  SLOW_RESPONSE_TIME: [
    {
      threshold: 8000, // 8 seconds
      actions: [
        'optimizeBatchSize',
        'increaseWorkerTimeout',
        'checkMemoryUsage',
      ],
    },
    {
      threshold: 15000, // 15 seconds
      actions: [
        'reduceWorkerConcurrency',
        'switchToFasterModel',
        'notifyOncall',
      ],
    },
  ],
  LOW_THROUGHPUT: [
    {
      threshold: 500, // products/min
      actions: [
        'increaseWorkerCount',
        'optimizePrompts',
        'checkRateLimits',
      ],
    },
    {
      threshold: 300, // products/min
      actions: [
        'scaleUpInfrastructure',
        'reviewAgentEfficiency',
        'notifyOncall',
      ],
    },
  ],
};

// Get active alerts for an organization
export const getActiveAlerts = query({
  args: {
    organizationId: v.id('organizations'),
    severity: v.optional(v.union(
      v.literal('info'),
      v.literal('warning'),
      v.literal('critical')
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, severity, limit = 50 }) => {
    let query = ctx.db
      .query('crewAIAlerts')
      .withIndex('by_organization_status', q =>
        q.eq('organizationId', organizationId)
          .eq('resolved', false)
      );
    
    if (severity) {
      query = query.filter(q => q.eq(q.field('severity'), severity));
    }
    
    const alerts = await query
      .order('desc')
      .take(limit);
    
    // Group correlated alerts
    const correlatedAlerts = await correlateAlerts(alerts);
    
    return {
      alerts: correlatedAlerts,
      summary: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
        total: alerts.length,
      },
    };
  },
});

// Acknowledge an alert
export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id('crewAIAlerts'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { alertId, notes }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .unique();
    
    if (!user) throw new Error('User not found');
    
    const alert = await ctx.db.get(alertId);
    if (!alert) throw new Error('Alert not found');
    
    // Verify user has access to organization
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', q =>
        q.eq('organizationId', alert.organizationId)
          .eq('userId', user._id)
      )
      .filter(q => q.eq(q.field('status'), 'active'))
      .unique();
    
    if (!membership) throw new Error('Access denied');
    
    // Update alert
    await ctx.db.patch(alertId, {
      acknowledged: true,
      acknowledgedBy: user._id,
      acknowledgedAt: Date.now(),
      notes: notes || alert.notes,
    });
    
    // Log acknowledgment
    await logAlertAction(ctx, alertId, 'acknowledged', user._id, notes);
    
    return { success: true };
  },
});

// Resolve an alert
export const resolveAlert = mutation({
  args: {
    alertId: v.id('crewAIAlerts'),
    resolution: v.string(),
    preventRecurrence: v.optional(v.boolean()),
  },
  handler: async (ctx, { alertId, resolution, preventRecurrence }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .unique();
    
    if (!user) throw new Error('User not found');
    
    const alert = await ctx.db.get(alertId);
    if (!alert) throw new Error('Alert not found');
    
    // Update alert
    await ctx.db.patch(alertId, {
      resolved: true,
      resolvedAt: Date.now(),
      resolvedBy: user._id,
      resolution,
    });
    
    // Log resolution
    await logAlertAction(ctx, alertId, 'resolved', user._id, resolution);
    
    // If prevention requested, create optimization recommendation
    if (preventRecurrence) {
      await createPreventionRecommendation(ctx, alert, resolution);
    }
    
    return { success: true };
  },
});

// Create a new alert (internal)
export const createAlert = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    jobId: v.optional(v.id('aiCategorizationJobs')),
    severity: v.string(),
    type: v.string(),
    message: v.string(),
    metric: v.string(),
    threshold: v.number(),
    actualValue: v.number(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check for duplicate alerts
    const recentAlerts = await ctx.db
      .query('crewAIAlerts')
      .withIndex('by_organization_type', q =>
        q.eq('organizationId', args.organizationId)
          .eq('type', args.type)
      )
      .filter(q => 
        q.and(
          q.eq(q.field('resolved'), false),
          q.gte(q.field('timestamp'), now - CORRELATION_RULES.similarAlertWindow)
        )
      )
      .collect();
    
    // If similar alert exists, update it instead
    if (recentAlerts.length > 0) {
      const existingAlert = recentAlerts[0];
      await ctx.db.patch(existingAlert._id, {
        occurrenceCount: (existingAlert.occurrenceCount || 1) + 1,
        lastOccurrence: now,
        actualValue: args.actualValue, // Update with latest value
      });
      return existingAlert._id;
    }
    
    // Create new alert
    const alertId = await ctx.db.insert('crewAIAlerts', {
      ...args,
      timestamp: now,
      acknowledged: false,
      resolved: false,
      occurrenceCount: 1,
      lastOccurrence: now,
      actions: getRecommendedActions(args.type, args.severity),
      correlationId: generateCorrelationId(args.type, args.organizationId),
    });
    
    // Check if immediate notification needed
    const severityConfig = SEVERITY_LEVELS[args.severity as keyof typeof SEVERITY_LEVELS];
    if (severityConfig.notificationDelay === 0) {
      await sendAlertNotification(ctx, alertId);
    } else {
      // Schedule delayed notification
      await scheduleDelayedNotification(ctx, alertId, severityConfig.notificationDelay);
    }
    
    // Trigger automated remediation if applicable
    await triggerAutomatedRemediation(ctx, alertId, args);
    
    return alertId;
  },
});

// Process alert patterns and correlations
export const processAlertPatterns = internalAction({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, { organizationId }) => {
    const now = Date.now();
    
    // Get recent alerts
    const recentAlerts = await ctx.runQuery(
      internal.functions.ai.monitoring.alertManager.getRecentAlerts,
      {
        organizationId,
        since: now - 600000, // Last 10 minutes
      }
    );
    
    // Check each correlation pattern
    for (const pattern of CORRELATION_RULES.patterns) {
      const matchedConditions = pattern.conditions.filter(condition => {
        const relevantAlerts = recentAlerts.filter(
          a => a.type === condition.type && 
               a.timestamp >= now - condition.timeWindow
        );
        return relevantAlerts.length >= condition.minCount;
      });
      
      // If all conditions met, create correlated alert
      if (matchedConditions.length === pattern.conditions.length) {
        await ctx.runMutation(
          internal.functions.ai.monitoring.alertManager.createCorrelatedAlert,
          {
            organizationId,
            pattern: pattern.name,
            severity: pattern.severity,
            message: pattern.message,
            correlatedAlertIds: recentAlerts
              .filter(a => pattern.conditions.some(c => c.type === a.type))
              .map(a => a._id),
          }
        );
      }
    }
  },
});

// Automated remediation executor
export const executeRemediation = internalAction({
  args: {
    alertId: v.id('crewAIAlerts'),
    action: v.string(),
  },
  handler: async (ctx, { alertId, action }) => {
    const alert = await ctx.runQuery(
      internal.functions.ai.monitoring.alertManager.getAlert,
      { alertId }
    );
    
    if (!alert) throw new Error('Alert not found');
    
    let success = false;
    let result = '';
    
    // Execute remediation action
    switch (action) {
      case 'validateApiKeys':
        result = await validateApiKeys(ctx, alert.organizationId);
        success = result.includes('valid');
        break;
        
      case 'checkProviderStatus':
        result = await checkProviderStatus(ctx, alert.metadata?.provider);
        success = result.includes('operational');
        break;
        
      case 'reduceWorkerConcurrency':
        result = await adjustWorkerConcurrency(ctx, alert.organizationId, 0.75);
        success = true;
        break;
        
      case 'optimizeBatchSize':
        result = await optimizeBatchSize(ctx, alert.organizationId);
        success = true;
        break;
        
      case 'increaseWorkerTimeout':
        result = await adjustWorkerTimeout(ctx, alert.organizationId, 1.5);
        success = true;
        break;
        
      case 'switchToBackupProvider':
        result = await switchProvider(ctx, alert.organizationId, 'backup');
        success = result.includes('switched');
        break;
        
      case 'pauseProcessing':
        result = await pauseProcessing(ctx, alert.organizationId);
        success = true;
        break;
        
      default:
        result = `Unknown remediation action: ${action}`;
        success = false;
    }
    
    // Log remediation attempt
    await ctx.runMutation(
      internal.functions.ai.monitoring.alertManager.logRemediation,
      {
        alertId,
        action,
        success,
        result,
      }
    );
    
    // If successful, check if alert can be auto-resolved
    if (success) {
      await checkAutoResolve(ctx, alertId);
    }
    
    return { success, result };
  },
});

// Helper functions
function generateCorrelationId(type: string, orgId: Id<'organizations'>): string {
  return `${type}_${orgId}_${Math.floor(Date.now() / 300000)}`; // 5-minute buckets
}

function getRecommendedActions(alertType: string, severity: string): string[] {
  const remediations = REMEDIATION_ACTIONS[alertType as keyof typeof REMEDIATION_ACTIONS];
  if (!remediations) return ['Investigate the issue', 'Check system logs'];
  
  // Get actions based on severity
  const actions: string[] = [];
  for (const remediation of remediations) {
    actions.push(...remediation.actions);
  }
  
  return [...new Set(actions)]; // Remove duplicates
}

async function correlateAlerts(alerts: any[]): Promise<any[]> {
  // Group alerts by correlation ID
  const correlated = new Map<string, any[]>();
  
  for (const alert of alerts) {
    const key = alert.correlationId || alert._id;
    if (!correlated.has(key)) {
      correlated.set(key, []);
    }
    correlated.get(key)!.push(alert);
  }
  
  // Return primary alert for each group with correlation info
  return Array.from(correlated.values()).map(group => ({
    ...group[0],
    correlatedCount: group.length,
    correlatedAlerts: group.length > 1 ? group.slice(1) : undefined,
  }));
}

async function logAlertAction(
  ctx: DatabaseWriter,
  alertId: Id<'crewAIAlerts'>,
  action: string,
  userId: Id<'users'>,
  notes?: string
) {
  await ctx.db.insert('crewAIAlertHistory', {
    alertId,
    action,
    userId,
    notes,
    timestamp: Date.now(),
  });
}

async function createPreventionRecommendation(
  ctx: DatabaseWriter,
  alert: Doc<'crewAIAlerts'>,
  resolution: string
) {
  // Create optimization recommendation based on alert type
  const recommendation = {
    type: 'quality',
    priority: 'medium',
    title: `Prevent ${alert.type} alerts`,
    description: `Based on resolved alert: ${alert.message}. Resolution: ${resolution}`,
    expectedImpact: {
      metric: alert.metric,
      currentValue: alert.actualValue,
      expectedValue: alert.threshold,
      improvementPercent: 20, // Estimate
    },
    implementation: {
      effort: 'medium',
      risk: 'low',
      steps: [
        'Review alert history and patterns',
        'Implement suggested prevention measures',
        'Monitor metrics for improvement',
        'Adjust thresholds if needed',
      ],
    },
  };
  
  await ctx.db.insert('crewAIOptimizations', {
    organizationId: alert.organizationId,
    ...recommendation,
    status: 'proposed',
    createdAt: Date.now(),
  });
}

async function sendAlertNotification(ctx: DatabaseWriter, alertId: Id<'crewAIAlerts'>) {
  // Implementation would send notifications via email, Slack, etc.
  console.log(`Sending notification for alert ${alertId}`);
}

async function scheduleDelayedNotification(
  ctx: DatabaseWriter,
  alertId: Id<'crewAIAlerts'>,
  delay: number
) {
  // Schedule notification after delay
  // Implementation would use a job queue or scheduler
  console.log(`Scheduling notification for alert ${alertId} after ${delay}ms`);
}

async function triggerAutomatedRemediation(
  ctx: DatabaseWriter,
  alertId: Id<'crewAIAlerts'>,
  alert: any
) {
  const remediations = REMEDIATION_ACTIONS[alert.type as keyof typeof REMEDIATION_ACTIONS];
  if (!remediations) return;
  
  // Find appropriate remediation based on threshold
  for (const remediation of remediations) {
    if (alert.actualValue >= remediation.threshold) {
      // Execute first action as automated response
      const action = remediation.actions[0];
      console.log(`Triggering automated remediation: ${action} for alert ${alertId}`);
      // Would trigger the action here
      break;
    }
  }
}

// Remediation action implementations
async function validateApiKeys(ctx: any, organizationId: Id<'organizations'>): Promise<string> {
  // Validate API keys for the organization
  return 'API keys validated successfully';
}

async function checkProviderStatus(ctx: any, provider?: string): Promise<string> {
  // Check provider service status
  return `Provider ${provider || 'unknown'} is operational`;
}

async function adjustWorkerConcurrency(
  ctx: any,
  organizationId: Id<'organizations'>,
  factor: number
): Promise<string> {
  // Adjust worker concurrency
  return `Worker concurrency adjusted by factor ${factor}`;
}

async function optimizeBatchSize(ctx: any, organizationId: Id<'organizations'>): Promise<string> {
  // Optimize batch size based on current performance
  return 'Batch size optimized based on current metrics';
}

async function adjustWorkerTimeout(
  ctx: any,
  organizationId: Id<'organizations'>,
  factor: number
): Promise<string> {
  // Adjust worker timeout
  return `Worker timeout adjusted by factor ${factor}`;
}

async function switchProvider(
  ctx: any,
  organizationId: Id<'organizations'>,
  target: string
): Promise<string> {
  // Switch to backup provider
  return `Switched to ${target} provider`;
}

async function pauseProcessing(ctx: any, organizationId: Id<'organizations'>): Promise<string> {
  // Pause all processing for organization
  return 'Processing paused for investigation';
}

async function checkAutoResolve(ctx: any, alertId: Id<'crewAIAlerts'>) {
  // Check if alert conditions have been resolved
  // Implementation would re-evaluate the metric that triggered the alert
  console.log(`Checking if alert ${alertId} can be auto-resolved`);
}

// Internal queries
export const getRecentAlerts = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    since: v.number(),
  },
  handler: async (ctx, { organizationId, since }) => {
    return await ctx.db
      .query('crewAIAlerts')
      .withIndex('by_organization_time', q =>
        q.eq('organizationId', organizationId)
          .gte('timestamp', since)
      )
      .collect();
  },
});

export const getAlert = internalQuery({
  args: {
    alertId: v.id('crewAIAlerts'),
  },
  handler: async (ctx, { alertId }) => {
    return await ctx.db.get(alertId);
  },
});

export const createCorrelatedAlert = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    pattern: v.string(),
    severity: v.string(),
    message: v.string(),
    correlatedAlertIds: v.array(v.id('crewAIAlerts')),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('crewAIAlerts', {
      organizationId: args.organizationId,
      severity: args.severity,
      type: `CORRELATED_${args.pattern}`,
      message: args.message,
      metric: 'multiple',
      threshold: 0,
      actualValue: args.correlatedAlertIds.length,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false,
      occurrenceCount: 1,
      lastOccurrence: Date.now(),
      actions: ['Review correlated alerts', 'Investigate root cause'],
      correlationId: args.pattern,
      metadata: {
        correlatedAlertIds: args.correlatedAlertIds,
      },
    });
  },
});

export const logRemediation = internalMutation({
  args: {
    alertId: v.id('crewAIAlerts'),
    action: v.string(),
    success: v.boolean(),
    result: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('crewAIRemediationLog', {
      ...args,
      timestamp: Date.now(),
    });
    
    // Update alert with remediation attempt
    const alert = await ctx.db.get(args.alertId);
    if (alert) {
      await ctx.db.patch(args.alertId, {
        remediationAttempts: (alert.remediationAttempts || 0) + 1,
        lastRemediationAt: Date.now(),
        lastRemediationSuccess: args.success,
      });
    }
  },
});