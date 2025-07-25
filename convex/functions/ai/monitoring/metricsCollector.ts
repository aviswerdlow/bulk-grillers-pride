/**
 * CrewAI Metrics Collector
 * 
 * Integrates with CrewAI processing to collect real-time performance metrics,
 * business metrics, and infrastructure metrics for monitoring and optimization.
 */

import { ActionCtx, DatabaseWriter } from '../../../_generated/server';
import { internal } from '../../../_generated/api';
import { Id } from '../../../_generated/dataModel';
import { CrewMetrics } from '../crews/types';

export class MetricsCollector {
  private ctx: ActionCtx;
  private jobId: Id<'aiCategorizationJobs'>;
  private metricsBuffer: any[];
  private lastFlush: number;
  private flushInterval: number = 5000; // 5 seconds
  
  constructor(ctx: ActionCtx, jobId: Id<'aiCategorizationJobs'>) {
    this.ctx = ctx;
    this.jobId = jobId;
    this.metricsBuffer = [];
    this.lastFlush = Date.now();
  }
  
  /**
   * Collect performance metrics from CrewAI processing
   */
  async collectPerformanceMetrics(metrics: CrewMetrics) {
    const timestamp = Date.now();
    
    // Response time metrics
    this.addMetric({
      metricType: 'performance',
      metricName: 'response_time',
      value: metrics.averageTaskDuration,
      unit: 'ms',
      tags: { jobId: this.jobId },
    });
    
    // Throughput metrics
    this.addMetric({
      metricType: 'performance',
      metricName: 'throughput',
      value: metrics.throughput,
      unit: 'products/min',
      tags: { jobId: this.jobId },
    });
    
    // Task completion metrics
    this.addMetric({
      metricType: 'performance',
      metricName: 'task_completion_rate',
      value: metrics.totalTasks > 0 ? (metrics.completedTasks / metrics.totalTasks) * 100 : 0,
      unit: '%',
      tags: { jobId: this.jobId },
    });
    
    // Error rate
    this.addMetric({
      metricType: 'performance',
      metricName: 'error_rate',
      value: metrics.totalTasks > 0 ? (metrics.failedTasks / metrics.totalTasks) * 100 : 0,
      unit: '%',
      tags: { jobId: this.jobId },
    });
    
    // Memory usage
    this.addMetric({
      metricType: 'infrastructure',
      metricName: 'memory_usage',
      value: metrics.memoryPeakUsage,
      unit: 'bytes',
      tags: { jobId: this.jobId },
    });
    
    // Check if we should flush metrics
    if (this.shouldFlush()) {
      await this.flushMetrics();
    }
  }
  
  /**
   * Collect agent-specific metrics
   */
  async collectAgentMetrics(agentRole: string, duration: number, success: boolean) {
    this.addMetric({
      metricType: 'performance',
      metricName: `agent_duration_${agentRole}`,
      value: duration,
      unit: 'ms',
      tags: { 
        jobId: this.jobId,
        agentRole,
        success: success.toString(),
      },
    });
    
    if (this.shouldFlush()) {
      await this.flushMetrics();
    }
  }
  
  /**
   * Collect categorization accuracy metrics
   */
  async collectAccuracyMetrics(
    productId: Id<'products'>,
    confidence: number,
    wasAccepted: boolean
  ) {
    this.addMetric({
      metricType: 'business',
      metricName: 'categorization_confidence',
      value: confidence,
      unit: 'score',
      tags: { 
        jobId: this.jobId,
        productId,
        accepted: wasAccepted.toString(),
      },
    });
    
    // Track accuracy (accepted categorizations)
    this.addMetric({
      metricType: 'business',
      metricName: 'categorization_accuracy',
      value: wasAccepted ? 1 : 0,
      unit: 'boolean',
      tags: { jobId: this.jobId },
    });
  }
  
  /**
   * Collect cost metrics
   */
  async collectCostMetrics(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    cost: number
  ) {
    this.addMetric({
      metricType: 'cost',
      metricName: 'token_usage_input',
      value: inputTokens,
      unit: 'tokens',
      tags: { 
        jobId: this.jobId,
        provider,
        model,
      },
    });
    
    this.addMetric({
      metricType: 'cost',
      metricName: 'token_usage_output',
      value: outputTokens,
      unit: 'tokens',
      tags: { 
        jobId: this.jobId,
        provider,
        model,
      },
    });
    
    this.addMetric({
      metricType: 'cost',
      metricName: 'processing_cost',
      value: cost,
      unit: 'usd',
      tags: { 
        jobId: this.jobId,
        provider,
        model,
      },
    });
  }
  
  /**
   * Collect cache performance metrics
   */
  async collectCacheMetrics(hits: number, misses: number) {
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;
    
    this.addMetric({
      metricType: 'performance',
      metricName: 'cache_hit_rate',
      value: hitRate,
      unit: '%',
      tags: { jobId: this.jobId },
    });
    
    this.addMetric({
      metricType: 'performance',
      metricName: 'cache_hits',
      value: hits,
      unit: 'count',
      tags: { jobId: this.jobId },
    });
    
    this.addMetric({
      metricType: 'performance',
      metricName: 'cache_misses',
      value: misses,
      unit: 'count',
      tags: { jobId: this.jobId },
    });
  }
  
  /**
   * Collect infrastructure health metrics
   */
  async collectHealthMetrics(
    workerCount: number,
    activeWorkers: number,
    queueDepth: number
  ) {
    this.addMetric({
      metricType: 'infrastructure',
      metricName: 'worker_utilization',
      value: workerCount > 0 ? (activeWorkers / workerCount) * 100 : 0,
      unit: '%',
      tags: { jobId: this.jobId },
    });
    
    this.addMetric({
      metricType: 'infrastructure',
      metricName: 'queue_depth',
      value: queueDepth,
      unit: 'tasks',
      tags: { jobId: this.jobId },
    });
    
    this.addMetric({
      metricType: 'infrastructure',
      metricName: 'health_check',
      value: 1, // 1 = healthy, 0 = unhealthy
      unit: 'boolean',
      tags: { jobId: this.jobId },
    });
  }
  
  /**
   * Track batch processing metrics
   */
  async collectBatchMetrics(
    batchNumber: number,
    batchSize: number,
    processingTime: number,
    successCount: number,
    errorCount: number
  ) {
    this.addMetric({
      metricType: 'performance',
      metricName: 'batch_processing_time',
      value: processingTime,
      unit: 'ms',
      tags: { 
        jobId: this.jobId,
        batchNumber: batchNumber.toString(),
      },
    });
    
    this.addMetric({
      metricType: 'performance',
      metricName: 'batch_success_rate',
      value: batchSize > 0 ? (successCount / batchSize) * 100 : 0,
      unit: '%',
      tags: { 
        jobId: this.jobId,
        batchNumber: batchNumber.toString(),
      },
    });
    
    this.addMetric({
      metricType: 'business',
      metricName: 'products_processed',
      value: batchSize,
      unit: 'count',
      tags: { jobId: this.jobId },
    });
  }
  
  /**
   * Track API latency and availability
   */
  async collectAPIMetrics(
    provider: string,
    apiCallDuration: number,
    statusCode: number,
    retryCount: number
  ) {
    this.addMetric({
      metricType: 'infrastructure',
      metricName: 'api_latency',
      value: apiCallDuration,
      unit: 'ms',
      tags: { 
        jobId: this.jobId,
        provider,
        statusCode: statusCode.toString(),
      },
    });
    
    this.addMetric({
      metricType: 'infrastructure',
      metricName: 'api_availability',
      value: statusCode < 500 ? 1 : 0,
      unit: 'boolean',
      tags: { 
        jobId: this.jobId,
        provider,
      },
    });
    
    if (retryCount > 0) {
      this.addMetric({
        metricType: 'infrastructure',
        metricName: 'api_retry_count',
        value: retryCount,
        unit: 'count',
        tags: { 
          jobId: this.jobId,
          provider,
        },
      });
    }
  }
  
  /**
   * Calculate and collect percentile metrics
   */
  async collectPercentileMetrics(metricName: string, values: number[]) {
    if (values.length === 0) return;
    
    const sorted = values.sort((a, b) => a - b);
    const p50 = this.calculatePercentile(sorted, 50);
    const p95 = this.calculatePercentile(sorted, 95);
    const p99 = this.calculatePercentile(sorted, 99);
    
    this.addMetric({
      metricType: 'performance',
      metricName: `${metricName}_p50`,
      value: p50,
      unit: 'ms',
      tags: { jobId: this.jobId },
    });
    
    this.addMetric({
      metricType: 'performance',
      metricName: `${metricName}_p95`,
      value: p95,
      unit: 'ms',
      tags: { jobId: this.jobId },
    });
    
    this.addMetric({
      metricType: 'performance',
      metricName: `${metricName}_p99`,
      value: p99,
      unit: 'ms',
      tags: { jobId: this.jobId },
    });
  }
  
  /**
   * Force flush all buffered metrics
   */
  async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;
    
    try {
      await this.ctx.runMutation(
        internal.functions.ai.monitoring.crewAIMonitoring.collectCrewAIMetrics,
        {
          jobId: this.jobId,
          metrics: this.metricsBuffer,
        }
      );
      
      // Clear buffer after successful flush
      this.metricsBuffer = [];
      this.lastFlush = Date.now();
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Keep metrics in buffer for retry
    }
  }
  
  /**
   * Add metric to buffer
   */
  private addMetric(metric: any) {
    this.metricsBuffer.push({
      ...metric,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Check if metrics should be flushed
   */
  private shouldFlush(): boolean {
    const timeSinceLastFlush = Date.now() - this.lastFlush;
    return (
      this.metricsBuffer.length >= 100 || // Buffer size limit
      timeSinceLastFlush >= this.flushInterval // Time limit
    );
  }
  
  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sorted: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }
}

/**
 * Integration helper to wrap CrewAI processing with metrics collection
 */
export async function withMetricsCollection<T>(
  ctx: ActionCtx,
  jobId: Id<'aiCategorizationJobs'>,
  operation: (collector: MetricsCollector) => Promise<T>
): Promise<T> {
  const collector = new MetricsCollector(ctx, jobId);
  
  try {
    // Execute operation with metrics collection
    const result = await operation(collector);
    
    // Ensure all metrics are flushed
    await collector.flushMetrics();
    
    return result;
  } catch (error) {
    // Flush any remaining metrics before throwing
    await collector.flushMetrics();
    throw error;
  }
}

/**
 * Calculate real-time metrics from CrewAI processing state
 */
export function calculateRealTimeMetrics(
  startTime: number,
  completedTasks: number,
  totalTasks: number,
  failedTasks: number,
  tokensUsed: number,
  estimatedCost: number,
  memoryUsage: number
): CrewMetrics {
  const now = Date.now();
  const elapsedMinutes = (now - startTime) / 60000;
  
  return {
    totalTasks,
    completedTasks,
    failedTasks,
    averageTaskDuration: completedTasks > 0 ? (now - startTime) / completedTasks : 0,
    tokensUsed,
    estimatedCost,
    throughput: elapsedMinutes > 0 ? completedTasks / elapsedMinutes : 0,
    memoryPeakUsage: memoryUsage,
  };
}