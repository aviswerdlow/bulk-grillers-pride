import { query } from '../../_generated/server';
import { v } from 'convex/values';
import { Id } from '../../_generated/dataModel';
import { calculateCascadeDeletion } from './cascadeCalculationEngine';
import { 
  CascadeCalculationResult, 
  DeletionPreviewSummary 
} from '../../types/cascadeCalculation';

export const previewDeletion = query({
  args: {
    productIds: v.array(v.id('products')),
    includeDetails: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    calculations: CascadeCalculationResult[];
    summary: DeletionPreviewSummary;
  }> => {
    // Calculate cascade impact for each product
    const calculations = await Promise.all(
      args.productIds.map(id => 
        calculateCascadeDeletion(ctx, {
          entityType: 'product',
          entityId: id,
          options: {
            includePerformanceMetrics: true,
            includeRecoveryAnalysis: true,
          },
        })
      )
    );
    
    // Aggregate results
    const totalImpact = calculations.reduce((sum, calc) => 
      sum + calc.impactSummary.totalEntitiesAffected, 0
    );
    
    // Find highest risk level
    const riskLevels = ['low', 'medium', 'high', 'critical'] as const;
    const highestRisk = calculations.reduce((highest, calc) => {
      const currentIndex = riskLevels.indexOf(calc.impactSummary.riskLevel);
      const highestIndex = riskLevels.indexOf(highest);
      return currentIndex > highestIndex ? calc.impactSummary.riskLevel : highest;
    }, 'low' as 'low' | 'medium' | 'high' | 'critical');
    
    // Collect all warnings
    const allWarnings = calculations.flatMap(calc => calc.impactSummary.warnings);
    const uniqueWarnings = Array.from(new Set(allWarnings));
    
    // Calculate total estimated duration
    const estimatedDuration = Math.max(...calculations.map(c => c.impactSummary.estimatedDuration));
    
    const summary: DeletionPreviewSummary = {
      totalProductsToDelete: args.productIds.length,
      totalEntitiesAffected: totalImpact,
      highestRiskLevel: highestRisk,
      estimatedDuration,
      warnings: uniqueWarnings,
    };
    
    // Return only summary if details not requested
    if (!args.includeDetails) {
      return {
        calculations: [],
        summary,
      };
    }
    
    return {
      calculations,
      summary,
    };
  },
});

export const getDeletionPreview = query({
  args: {
    productId: v.id('products'),
  },
  handler: async (ctx, args): Promise<CascadeCalculationResult> => {
    return await calculateCascadeDeletion(ctx, {
      entityType: 'product',
      entityId: args.productId,
      options: {
        includePerformanceMetrics: true,
        includeRecoveryAnalysis: true,
      },
    });
  },
});

export const validateDeletion = query({
  args: {
    productIds: v.array(v.id('products')),
  },
  handler: async (ctx, args): Promise<{
    canDelete: boolean;
    blockingReasons: string[];
    warnings: string[];
    requiresConfirmation: boolean;
  }> => {
    const preview = await previewDeletion(ctx, {
      productIds: args.productIds,
      includeDetails: false,
    });
    
    const blockingReasons: string[] = [];
    const warnings = [...preview.summary.warnings];
    
    // Check for blocking conditions
    if (preview.summary.highestRiskLevel === 'critical') {
      blockingReasons.push('Operation has critical risk level - manual review required');
    }
    
    if (preview.summary.estimatedDuration > 30000) { // 30 seconds
      blockingReasons.push('Operation would take too long - consider smaller batches');
    }
    
    if (preview.summary.totalEntitiesAffected > 1000) {
      blockingReasons.push('Too many entities affected - maximum 1000 allowed');
    }
    
    // Add warnings for high risk operations
    if (preview.summary.highestRiskLevel === 'high') {
      warnings.push('This is a high-risk operation that will affect many entities');
    }
    
    const requiresConfirmation = 
      preview.summary.highestRiskLevel !== 'low' || 
      preview.summary.totalEntitiesAffected > 50;
    
    return {
      canDelete: blockingReasons.length === 0,
      blockingReasons,
      warnings,
      requiresConfirmation,
    };
  },
});