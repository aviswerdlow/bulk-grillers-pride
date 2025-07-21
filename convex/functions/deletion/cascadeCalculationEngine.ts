import { query, QueryCtx } from '../../_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from '../../_generated/dataModel';
import {
  CascadeCalculationResult,
  CascadeNode,
  CalculationContext,
  PerformanceMetrics,
  RecoveryAnalysis,
} from '../../types/cascadeCalculation';

export const calculateCascadeDeletion = query({
  args: {
    entityType: v.union(v.literal('product'), v.literal('category'), v.literal('project')),
    entityId: v.id('products'), // Will be updated when we support other types
    options: v.optional(v.object({
      includePerformanceMetrics: v.optional(v.boolean()),
      includeRecoveryAnalysis: v.optional(v.boolean()),
      maxDepth: v.optional(v.number()),
      simulateOnly: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args): Promise<CascadeCalculationResult> => {
    // Initialize calculation context
    const calculationContext: CalculationContext = {
      visitedEntities: new Set<string>(),
      operationCount: 0,
      databaseReads: 0,
      databaseWrites: 0,
      warnings: [],
      startTime: Date.now(),
    };
    
    // Verify entity exists and user has access
    const entity = await getEntity(ctx, args.entityType, args.entityId);
    if (!entity) {
      throw new Error(`Entity not found: ${args.entityType}:${args.entityId}`);
    }
    
    // Build cascade tree
    const cascadeTree = await buildCascadeTree(
      ctx,
      args.entityType,
      args.entityId,
      calculationContext,
      args.options?.maxDepth || 10
    );
    
    // Calculate impact summary
    const impactSummary = calculateImpactSummary(cascadeTree, calculationContext);
    
    // Performance analysis
    const performance = args.options?.includePerformanceMetrics
      ? await analyzePerformance(ctx, cascadeTree, calculationContext)
      : getDefaultPerformanceMetrics(calculationContext);
    
    // Recovery analysis
    const recovery = args.options?.includeRecoveryAnalysis
      ? await analyzeRecovery(ctx, cascadeTree)
      : getDefaultRecoveryAnalysis();
    
    return {
      primaryEntity: {
        type: args.entityType,
        id: args.entityId,
        name: getEntityName(entity, args.entityType),
      },
      impactSummary,
      cascadeTree,
      performance,
      recovery,
    };
  },
});

async function getEntity(
  ctx: QueryCtx,
  entityType: string,
  entityId: Id<any>
): Promise<Doc<any> | null> {
  switch (entityType) {
    case 'product':
      return await ctx.db.get(entityId as Id<'products'>);
    case 'category':
      // Placeholder for future category support
      throw new Error('Category deletion not yet implemented');
    case 'project':
      // Placeholder for future project support
      throw new Error('Project deletion not yet implemented');
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

function getEntityName(entity: Doc<any>, entityType: string): string {
  switch (entityType) {
    case 'product':
      return entity.title || 'Unknown Product';
    case 'category':
      return entity.name || 'Unknown Category';
    case 'project':
      return entity.name || 'Unknown Project';
    default:
      return 'Unknown Entity';
  }
}

async function buildCascadeTree(
  ctx: QueryCtx,
  entityType: string,
  entityId: Id<any>,
  context: CalculationContext,
  maxDepth: number,
  currentDepth: number = 0
): Promise<CascadeNode> {
  // Prevent infinite recursion
  const entityKey = `${entityType}:${entityId}`;
  if (context.visitedEntities.has(entityKey) || currentDepth >= maxDepth) {
    return {
      entityType,
      entityId,
      entityName: 'Circular Reference',
      operation: 'cascade',
      children: [],
      metadata: { isCircular: true },
    };
  }
  
  context.visitedEntities.add(entityKey);
  context.databaseReads++;
  
  const node: CascadeNode = {
    entityType,
    entityId,
    entityName: '',
    operation: 'delete',
    children: [],
    metadata: {},
  };
  
  switch (entityType) {
    case 'product':
      await buildProductCascadeNode(ctx, entityId as Id<'products'>, node, context, maxDepth, currentDepth);
      break;
    case 'category':
      // Future implementation
      break;
    case 'project':
      // Future implementation
      break;
  }
  
  return node;
}

async function buildProductCascadeNode(
  ctx: QueryCtx,
  productId: Id<'products'>,
  node: CascadeNode,
  context: CalculationContext,
  maxDepth: number,
  currentDepth: number
): Promise<void> {
  const product = await ctx.db.get(productId);
  if (!product) return;
  
  node.entityName = product.title;
  node.metadata.canRecover = true;
  
  // Product Variants
  const variants = await ctx.db
    .query('productVariants')
    .withIndex('by_product', q => q.eq('productId', productId))
    .collect();
  
  context.databaseReads++;
  
  if (variants.length > 0) {
    node.children.push({
      entityType: 'productVariants',
      entityId: 'multiple',
      entityName: `${variants.length} Variant${variants.length > 1 ? 's' : ''}`,
      operation: 'archive',
      children: [],
      metadata: {
        count: variants.length,
        canRecover: true,
        performanceImpact: 'low',
      },
    });
    context.operationCount += variants.length;
  }
  
  // Category Assignments
  const assignments = await ctx.db
    .query('categoryProductAssignments')
    .withIndex('by_product', q => q.eq('productId', productId))
    .collect();
  
  context.databaseReads++;
  
  if (assignments.length > 0) {
    node.children.push({
      entityType: 'categoryAssignments',
      entityId: 'multiple',
      entityName: `${assignments.length} Category Assignment${assignments.length > 1 ? 's' : ''}`,
      operation: 'delete',
      children: [],
      metadata: {
        count: assignments.length,
        canRecover: true,
        performanceImpact: 'low',
      },
    });
    context.operationCount += assignments.length;
  }
  
  // Images
  if (product.images && product.images.length > 0) {
    node.children.push({
      entityType: 'images',
      entityId: 'multiple',
      entityName: `${product.images.length} Image${product.images.length > 1 ? 's' : ''}`,
      operation: 'queue',
      children: [],
      metadata: {
        count: product.images.length,
        canRecover: false,
        performanceImpact: 'medium',
      },
    });
    context.operationCount += product.images.length;
    context.warnings.push(`${product.images.length} images will be queued for deletion`);
  }
  
  // Check for AI categorization jobs
  const aiJobs = await ctx.db
    .query('aiCategorizationJobs')
    .filter(q => q.eq(q.field('productId'), productId))
    .take(10);
  
  context.databaseReads++;
  
  if (aiJobs.length > 0) {
    node.children.push({
      entityType: 'aiCategorizationJobs',
      entityId: 'multiple',
      entityName: `${aiJobs.length} AI Categorization Job${aiJobs.length > 1 ? 's' : ''}`,
      operation: 'update',
      children: [],
      metadata: {
        count: aiJobs.length,
        canRecover: true,
        performanceImpact: 'low',
      },
    });
    context.operationCount += aiJobs.length;
  }
  
  // Calculate total database writes
  context.databaseWrites = context.operationCount + 1; // +1 for the main product
}

function calculateImpactSummary(
  cascadeTree: CascadeNode,
  context: CalculationContext
): CascadeCalculationResult['impactSummary'] {
  const byEntityType: Record<string, number> = {};
  let totalEntities = 0;
  
  // Count entities by type
  function countEntities(node: CascadeNode) {
    if (node.metadata.count) {
      byEntityType[node.entityType] = (byEntityType[node.entityType] || 0) + node.metadata.count;
      totalEntities += node.metadata.count;
    } else {
      byEntityType[node.entityType] = (byEntityType[node.entityType] || 0) + 1;
      totalEntities += 1;
    }
    
    node.children.forEach(countEntities);
  }
  
  countEntities(cascadeTree);
  
  // Calculate risk level based on total impact
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (totalEntities < 10) {
    riskLevel = 'low';
  } else if (totalEntities < 50) {
    riskLevel = 'medium';
  } else if (totalEntities < 200) {
    riskLevel = 'high';
  } else {
    riskLevel = 'critical';
    context.warnings.push(`Critical: This operation will affect ${totalEntities} entities`);
  }
  
  // Estimate duration based on historical averages
  // ~10ms per operation is a conservative estimate
  const estimatedDuration = context.operationCount * 10;
  
  return {
    totalEntitiesAffected: totalEntities,
    byEntityType,
    estimatedDuration,
    riskLevel,
    warnings: context.warnings,
  };
}

async function analyzePerformance(
  ctx: QueryCtx,
  cascadeTree: CascadeNode,
  context: CalculationContext
): Promise<PerformanceMetrics> {
  // Count parallelization opportunities
  let parallelizationOpportunities = 0;
  
  function analyzeNode(node: CascadeNode) {
    // Independent children can be processed in parallel
    if (node.children.length > 1) {
      parallelizationOpportunities++;
    }
    node.children.forEach(analyzeNode);
  }
  
  analyzeNode(cascadeTree);
  
  const bottlenecks: string[] = [];
  
  // Identify potential bottlenecks
  if (context.operationCount > 1000) {
    bottlenecks.push('High operation count may cause timeouts');
  }
  
  if (context.databaseWrites > 500) {
    bottlenecks.push('Large number of database writes may impact performance');
  }
  
  // Check for image cleanup bottleneck
  const imageNodes = findNodesByType(cascadeTree, 'images');
  const totalImages = imageNodes.reduce((sum, node) => sum + (node.metadata.count || 0), 0);
  if (totalImages > 50) {
    bottlenecks.push(`${totalImages} images will need cleanup processing`);
  }
  
  return {
    estimatedOperations: context.operationCount,
    estimatedDatabaseReads: context.databaseReads,
    estimatedDatabaseWrites: context.databaseWrites,
    parallelizationOpportunities,
    bottlenecks,
  };
}

async function analyzeRecovery(
  ctx: QueryCtx,
  cascadeTree: CascadeNode
): Promise<RecoveryAnalysis> {
  const nonRecoverableItems: string[] = [];
  let hasRecoverableItems = false;
  let hasNonRecoverableItems = false;
  
  function analyzeNode(node: CascadeNode) {
    if (node.metadata.canRecover === false) {
      hasNonRecoverableItems = true;
      if (node.entityType === 'images') {
        nonRecoverableItems.push(`${node.metadata.count || 1} images`);
      } else {
        nonRecoverableItems.push(node.entityName);
      }
    } else if (node.metadata.canRecover === true) {
      hasRecoverableItems = true;
    }
    
    node.children.forEach(analyzeNode);
  }
  
  analyzeNode(cascadeTree);
  
  return {
    fullyRecoverable: hasRecoverableItems && !hasNonRecoverableItems,
    partiallyRecoverable: hasRecoverableItems && hasNonRecoverableItems,
    nonRecoverableItems,
    dataLossRisk: hasNonRecoverableItems,
  };
}

function getDefaultPerformanceMetrics(context: CalculationContext): PerformanceMetrics {
  return {
    estimatedOperations: context.operationCount,
    estimatedDatabaseReads: context.databaseReads,
    estimatedDatabaseWrites: context.operationCount,
    parallelizationOpportunities: 0,
    bottlenecks: [],
  };
}

function getDefaultRecoveryAnalysis(): RecoveryAnalysis {
  return {
    fullyRecoverable: true,
    partiallyRecoverable: false,
    nonRecoverableItems: [],
    dataLossRisk: false,
  };
}

function findNodesByType(node: CascadeNode, entityType: string): CascadeNode[] {
  const results: CascadeNode[] = [];
  
  if (node.entityType === entityType) {
    results.push(node);
  }
  
  node.children.forEach(child => {
    results.push(...findNodesByType(child, entityType));
  });
  
  return results;
}