/**
 * Performance Monitoring Module
 * 
 * This module provides comprehensive performance tracking and monitoring
 * capabilities for the bulk-grillers-pride application.
 * 
 * Features:
 * - Real-time performance metrics collection
 * - Alert threshold monitoring
 * - Performance dashboard queries
 * - Metrics aggregation and trends
 * 
 * Usage:
 * 1. Wrap operations with withPerformanceTracking() to collect metrics
 * 2. Use dashboard queries to visualize performance
 * 3. Monitor alerts for performance issues
 * 4. Analyze trends and resource usage
 */

// Core performance tracking
export {
  withPerformanceTracking,
  logMetric,
  getOperationMetrics,
  getAggregatedMetrics,
  cleanupOldMetrics,
} from './performance';

// Alert management
export {
  ALERT_THRESHOLDS,
  checkAlertThresholds,
  getAlertHistory,
  getAlertSummary,
  type Alert,
  type AlertLevel,
  type AlertType,
} from './alerts';

// Dashboard queries
export {
  getPerformanceDashboard,
  getOperationDetails,
  getOperationComparison,
} from './dashboard';

// Aggregation and analysis
export {
  generateHourlyAggregations,
  getDailyPerformanceSummary,
  getPerformanceTrends,
  getResourceIntensiveOperations,
  type AggregatedMetric,
} from './aggregation';

/**
 * Example usage in a Convex function:
 * 
 * ```typescript
 * import { withPerformanceTracking } from '../monitoring';
 * 
 * export const listProducts = query({
 *   args: { ... },
 *   handler: async (ctx, args) => {
 *     const organizationId = await getOrganizationId(ctx);
 *     
 *     return withPerformanceTracking(
 *       ctx,
 *       'products.query.list',
 *       organizationId,
 *       async () => {
 *         // Your actual query logic here
 *         const products = await ctx.db.query('products')...
 *         return products;
 *       },
 *       {
 *         projectId: args.projectId,
 *         metadata: { filters: args.filters }
 *       }
 *     );
 *   },
 * });
 * ```
 */