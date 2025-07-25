import { query } from '../../_generated/server';
import { v } from 'convex/values';
import { CascadeCalculationResult, CascadeNode } from '../../types/cascadeCalculation';

export const generateCascadeVisualization = query({
  args: {
    calculationResult: v.any(), // CascadeCalculationResult
    format: v.optional(v.union(v.literal('tree'), v.literal('graph'), v.literal('summary'))),
  },
  handler: async (ctx, args): Promise<string | object> => {
    const format = args.format || 'tree';
    const result = args.calculationResult as CascadeCalculationResult;
    
    switch (format) {
      case 'tree':
        return generateTreeVisualization(result);
      case 'graph':
        return generateGraphVisualization(result);
      case 'summary':
        return generateSummaryVisualization(result);
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  },
});

function generateTreeVisualization(result: CascadeCalculationResult): string {
  const lines: string[] = [];
  
  lines.push(`Cascade Deletion Impact Analysis`);
  lines.push(`================================`);
  lines.push(`Primary Entity: ${result.primaryEntity.type} - ${result.primaryEntity.name}`);
  lines.push(`Total Affected: ${result.impactSummary.totalEntitiesAffected}`);
  lines.push(`Risk Level: ${result.impactSummary.riskLevel.toUpperCase()}`);
  lines.push(`Estimated Duration: ${formatDuration(result.impactSummary.estimatedDuration)}`);
  
  if (result.impactSummary.warnings.length > 0) {
    lines.push(``);
    lines.push(`⚠️  Warnings:`);
    result.impactSummary.warnings.forEach(warning => {
      lines.push(`   - ${warning}`);
    });
  }
  
  lines.push(``);
  lines.push(`Cascade Tree:`);
  lines.push(`─────────────`);
  
  renderTreeNode(result.cascadeTree, lines, '', true);
  
  if (result.performance.bottlenecks.length > 0) {
    lines.push(``);
    lines.push(`Performance Concerns:`);
    result.performance.bottlenecks.forEach(bottleneck => {
      lines.push(`   ⚡ ${bottleneck}`);
    });
  }
  
  if (result.recovery.dataLossRisk) {
    lines.push(``);
    lines.push(`⚠️  Data Loss Risk:`);
    result.recovery.nonRecoverableItems.forEach(item => {
      lines.push(`   - ${item}`);
    });
  }
  
  return lines.join('\n');
}

function renderTreeNode(
  node: CascadeNode,
  lines: string[],
  prefix: string,
  isLast: boolean
): void {
  const connector = isLast ? '└── ' : '├── ';
  const extension = isLast ? '    ' : '│   ';
  
  // Format node display
  let nodeDisplay = `${node.entityType}: ${node.entityName}`;
  
  // Add operation indicator
  const operationIcon = getOperationIcon(node.operation);
  nodeDisplay += ` ${operationIcon}`;
  
  // Add metadata indicators
  if (node.metadata.count && node.metadata.count > 1) {
    nodeDisplay += ` (${node.metadata.count} items)`;
  }
  
  if (node.metadata.performanceImpact === 'high') {
    nodeDisplay += ' ⚡';
  }
  
  if (!node.metadata.canRecover) {
    nodeDisplay += ' ⚠️';
  }
  
  lines.push(`${prefix}${connector}${nodeDisplay}`);
  
  // Add additional metadata on separate lines if needed
  if (node.metadata.isCircular) {
    lines.push(`${prefix}${extension}  ↩️  Circular reference detected`);
  }
  
  // Render children
  node.children.forEach((child, index) => {
    renderTreeNode(
      child,
      lines,
      prefix + extension,
      index === node.children.length - 1
    );
  });
}

function getOperationIcon(operation: string): string {
  switch (operation) {
    case 'delete': return '🗑️';
    case 'archive': return '📦';
    case 'update': return '✏️';
    case 'cascade': return '⬇️';
    case 'queue': return '⏳';
    default: return '•';
  }
}

function generateGraphVisualization(result: CascadeCalculationResult): object {
  const nodes: any[] = [];
  const edges: any[] = [];
  let nodeId = 0;
  
  function processNode(node: CascadeNode, parentId: number | null = null): number {
    const currentId = nodeId++;
    
    nodes.push({
      id: currentId,
      label: node.entityName,
      type: node.entityType,
      operation: node.operation,
      metadata: node.metadata,
      level: parentId === null ? 0 : nodes.find(n => n.id === parentId)!.level + 1,
    });
    
    if (parentId !== null) {
      edges.push({
        from: parentId,
        to: currentId,
        label: node.operation,
      });
    }
    
    node.children.forEach(child => {
      processNode(child, currentId);
    });
    
    return currentId;
  }
  
  processNode(result.cascadeTree);
  
  return {
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      maxDepth: Math.max(...nodes.map(n => n.level)),
      riskLevel: result.impactSummary.riskLevel,
    },
  };
}

function generateSummaryVisualization(result: CascadeCalculationResult): object {
  const summary = {
    overview: {
      entity: `${result.primaryEntity.type}: ${result.primaryEntity.name}`,
      totalImpact: result.impactSummary.totalEntitiesAffected,
      riskLevel: result.impactSummary.riskLevel,
      estimatedTime: formatDuration(result.impactSummary.estimatedDuration),
      isRecoverable: result.recovery.fullyRecoverable,
    },
    breakdown: result.impactSummary.byEntityType,
    warnings: result.impactSummary.warnings,
    performance: {
      operations: result.performance.estimatedOperations,
      reads: result.performance.estimatedDatabaseReads,
      writes: result.performance.estimatedDatabaseWrites,
      canParallelize: result.performance.parallelizationOpportunities > 0,
      bottlenecks: result.performance.bottlenecks,
    },
    recovery: {
      status: result.recovery.fullyRecoverable 
        ? 'Fully Recoverable' 
        : result.recovery.partiallyRecoverable 
          ? 'Partially Recoverable' 
          : 'Not Recoverable',
      dataLossRisk: result.recovery.dataLossRisk,
      nonRecoverableItems: result.recovery.nonRecoverableItems,
    },
  };
  
  return summary;
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  } else {
    return `${(milliseconds / 60000).toFixed(1)}m`;
  }
}

export const getCascadeTreeDepth = query({
  args: {
    calculationResult: v.any(), // CascadeCalculationResult
  },
  handler: async (ctx, args): Promise<number> => {
    const result = args.calculationResult as CascadeCalculationResult;
    
    function getMaxDepth(node: CascadeNode, currentDepth: number = 0): number {
      if (node.children.length === 0) {
        return currentDepth;
      }
      
      return Math.max(
        ...node.children.map(child => getMaxDepth(child, currentDepth + 1))
      );
    }
    
    return getMaxDepth(result.cascadeTree);
  },
});

export const getCascadeStatistics = query({
  args: {
    calculationResult: v.any(), // CascadeCalculationResult
  },
  handler: async (ctx, args): Promise<{
    totalNodes: number;
    nodesByType: Record<string, number>;
    operationsByType: Record<string, number>;
    maxDepth: number;
    hasCircularReferences: boolean;
    recoverablePercentage: number;
  }> => {
    const result = args.calculationResult as CascadeCalculationResult;
    const nodesByType: Record<string, number> = {};
    const operationsByType: Record<string, number> = {};
    let totalNodes = 0;
    let recoverableNodes = 0;
    let hasCircularReferences = false;
    
    function analyzeNode(node: CascadeNode) {
      totalNodes++;
      
      // Count by type
      nodesByType[node.entityType] = (nodesByType[node.entityType] || 0) + 1;
      operationsByType[node.operation] = (operationsByType[node.operation] || 0) + 1;
      
      // Check recoverability
      if (node.metadata.canRecover !== false) {
        recoverableNodes++;
      }
      
      // Check for circular references
      if (node.metadata.isCircular) {
        hasCircularReferences = true;
      }
      
      node.children.forEach(analyzeNode);
    }
    
    analyzeNode(result.cascadeTree);
    
    const maxDepth = await getCascadeTreeDepth(ctx, args);
    
    return {
      totalNodes,
      nodesByType,
      operationsByType,
      maxDepth,
      hasCircularReferences,
      recoverablePercentage: totalNodes > 0 ? (recoverableNodes / totalNodes) * 100 : 100,
    };
  },
});