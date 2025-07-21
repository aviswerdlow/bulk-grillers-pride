// Cascade deletion calculation types and interfaces

export interface CascadeCalculationResult {
  // Primary entity being deleted
  primaryEntity: {
    type: 'product' | 'category' | 'project';
    id: string;
    name: string;
  };
  
  // Impact summary with risk assessment
  impactSummary: {
    totalEntitiesAffected: number;
    byEntityType: Record<string, number>;
    estimatedDuration: number; // milliseconds
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    warnings: string[];
  };
  
  // Detailed cascade tree showing all affected entities
  cascadeTree: CascadeNode;
  
  // Performance estimates for the operation
  performance: {
    estimatedOperations: number;
    estimatedDatabaseReads: number;
    estimatedDatabaseWrites: number;
    parallelizationOpportunities: number;
    bottlenecks: string[];
  };
  
  // Recovery information
  recovery: {
    fullyRecoverable: boolean;
    partiallyRecoverable: boolean;
    nonRecoverableItems: string[];
    dataLossRisk: boolean;
  };
}

export interface CascadeNode {
  entityType: string;
  entityId: string;
  entityName: string;
  operation: 'delete' | 'archive' | 'update' | 'cascade' | 'queue';
  children: CascadeNode[];
  metadata: {
    count?: number;
    isRequired?: boolean;
    canRecover?: boolean;
    performanceImpact?: 'low' | 'medium' | 'high';
    isCircular?: boolean;
  };
}

export interface CalculationContext {
  visitedEntities: Set<string>;
  operationCount: number;
  databaseReads: number;
  databaseWrites: number;
  warnings: string[];
  startTime: number;
}

export interface PerformanceMetrics {
  estimatedOperations: number;
  estimatedDatabaseReads: number;
  estimatedDatabaseWrites: number;
  parallelizationOpportunities: number;
  bottlenecks: string[];
}

export interface RecoveryAnalysis {
  fullyRecoverable: boolean;
  partiallyRecoverable: boolean;
  nonRecoverableItems: string[];
  dataLossRisk: boolean;
}

export interface DeletionPreviewSummary {
  totalProductsToDelete: number;
  totalEntitiesAffected: number;
  highestRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  warnings: string[];
}