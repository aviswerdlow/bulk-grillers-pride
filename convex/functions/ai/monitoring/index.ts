/**
 * CrewAI Monitoring System
 * 
 * Comprehensive monitoring, alerting, and optimization for CrewAI categorization.
 * Provides real-time metrics, cost analysis, and continuous improvement workflows.
 */

// Export monitoring components
export * from './crewAIMonitoring';
export * from './metricsCollector';
export * from './alertManager';
export * from './optimizationEngine';
export * from './costAnalyzer';

// Re-export key functions for easy access
export {
  // Metrics Collection
  collectCrewAIMetrics,
  aggregateMetrics,
  getDashboardData,
  
  // Alerts
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
  processAlertPatterns,
  
  // Optimization
  analyzePerformance,
  getOptimizationRecommendations,
  implementOptimization,
  runABTest,
  trackOptimizationResults,
  
  // Cost Analysis
  getCostAnalysis,
  getJobCostBreakdown,
  getCostProjections,
  trackJobCost,
  
  // Utilities
  MetricsCollector,
  withMetricsCollection,
} from './index';

/**
 * Monitoring System Overview
 * 
 * The CrewAI monitoring system consists of several integrated components:
 * 
 * 1. **Metrics Collection** (metricsCollector.ts)
 *    - Real-time performance metrics
 *    - Business metrics (accuracy, throughput)
 *    - Infrastructure metrics (memory, workers)
 *    - Cost tracking
 * 
 * 2. **Monitoring Dashboard** (crewAIMonitoring.ts)
 *    - Aggregated metrics and trends
 *    - Key performance indicators
 *    - Historical analysis
 *    - Monthly reports
 * 
 * 3. **Alert Management** (alertManager.ts)
 *    - Threshold-based alerts
 *    - Alert correlation and deduplication
 *    - Automated remediation
 *    - Notification system
 * 
 * 4. **Optimization Engine** (optimizationEngine.ts)
 *    - Performance gap analysis
 *    - Optimization recommendations
 *    - A/B testing framework
 *    - ROI calculations
 * 
 * 5. **Cost Analysis** (costAnalyzer.ts)
 *    - Provider cost tracking
 *    - Cost projections
 *    - Optimization opportunities
 *    - Cache savings analysis
 */

/**
 * Integration Guide
 * 
 * To integrate monitoring with CrewAI processing:
 * 
 * 1. Wrap processing with metrics collection:
 *    ```typescript
 *    await withMetricsCollection(ctx, jobId, async (collector) => {
 *      // Your CrewAI processing logic
 *      await collector.collectPerformanceMetrics(metrics);
 *    });
 *    ```
 * 
 * 2. Track costs after processing:
 *    ```typescript
 *    await trackJobCost(ctx, {
 *      jobId,
 *      provider,
 *      model,
 *      inputTokens,
 *      outputTokens,
 *      productCount,
 *    });
 *    ```
 * 
 * 3. Check for alerts periodically:
 *    ```typescript
 *    const alerts = await getActiveAlerts(ctx, {
 *      organizationId,
 *      severity: 'critical',
 *    });
 *    ```
 * 
 * 4. Run optimization analysis monthly:
 *    ```typescript
 *    const recommendations = await analyzePerformance(ctx, {
 *      organizationId,
 *      timeRange: '30d',
 *    });
 *    ```
 */

/**
 * Monitoring Best Practices
 * 
 * 1. **Metric Collection**
 *    - Collect metrics at meaningful intervals (batch completion, agent execution)
 *    - Use consistent naming conventions for metrics
 *    - Include relevant tags for filtering and grouping
 * 
 * 2. **Alert Configuration**
 *    - Set realistic thresholds based on baseline performance
 *    - Use alert correlation to reduce noise
 *    - Implement automated remediation for common issues
 * 
 * 3. **Cost Optimization**
 *    - Monitor cost per categorization trends
 *    - Implement caching strategies
 *    - Use appropriate models for complexity
 * 
 * 4. **Performance Optimization**
 *    - Focus on bottleneck agents first
 *    - Optimize batch sizes for throughput
 *    - Monitor memory usage and scaling
 * 
 * 5. **Continuous Improvement**
 *    - Review optimization recommendations monthly
 *    - Run A/B tests for significant changes
 *    - Track actual vs expected improvements
 */

/**
 * Key Metrics to Monitor
 * 
 * **Performance Metrics**
 * - Response Time (P50, P95, P99)
 * - Throughput (products/minute)
 * - Error Rate
 * - Cache Hit Rate
 * 
 * **Business Metrics**
 * - Categorization Accuracy
 * - Products Processed
 * - Success Rate
 * - User Satisfaction
 * 
 * **Cost Metrics**
 * - Cost per Categorization
 * - Token Usage
 * - Provider Distribution
 * - Cache Savings
 * 
 * **Infrastructure Metrics**
 * - Memory Usage
 * - Worker Utilization
 * - Queue Depth
 * - API Availability
 */

/**
 * Optimization Targets (Post-Migration)
 * 
 * Based on the requirements document:
 * 
 * - Response time P95: < 5 seconds (improved from 8s)
 * - Throughput: > 750 products/minute (improved from 500)
 * - Cost per categorization: < $0.05 (reduced by 20%)
 * - Accuracy: > 90% (improved from 85%)
 * - System uptime: > 99.9%
 * 
 * The monitoring system tracks progress toward these targets
 * and provides recommendations for achieving them.
 */