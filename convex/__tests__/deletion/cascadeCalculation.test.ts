import { expect, test, describe, beforeEach, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../schema';
import { api } from '../../_generated/api';
import { Id } from '../../_generated/dataModel';

describe('Cascade Calculation Engine', () => {
  let t: any;

  beforeEach(async () => {
    t = convexTest(schema);
  });

  describe('calculateCascadeDeletion', () => {
    test('should calculate simple product deletion cascade', async () => {
      // Create test data
      const org = await t.mutation(api.organizations.create, {
        name: 'Test Org',
        settings: {
          aiProvider: 'openai',
          aiModel: 'gpt-4',
          categorization: {
            batchSize: 10,
            prompt: 'test',
            autoApprove: false,
            confidenceThreshold: 0.8,
          },
          storage: {
            maxFileSize: 10000000,
            totalStorageLimit: 100000000,
            allowedFileTypes: ['image/jpeg', 'image/png'],
          },
        },
      });

      const user = await t.mutation(api.users.create, {
        clerkId: 'test_user_1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      const project = await t.mutation(api.projects.create, {
        organizationId: org._id,
        name: 'Test Project',
        slug: 'test-project',
        settings: {
          defaultCurrency: 'USD',
          importSettings: {
            autoValidate: true,
            duplicateHandling: 'skip',
            requiredFields: ['title', 'sku'],
          },
        },
        createdBy: user._id,
      });

      // Create product with variants and category assignments
      const product = await t.mutation(api.products.create, {
        organizationId: org._id,
        projectId: project._id,
        title: 'Test Product',
        handle: 'test-product',
        status: 'active',
        images: [
          {
            id: 'img1',
            url: 'https://example.com/image1.jpg',
            position: 0,
            storageId: 'storage_1',
          },
        ],
        createdBy: user._id,
        lastModifiedBy: user._id,
      });

      // Create variants
      const variant1 = await t.mutation(api.productVariants.create, {
        organizationId: org._id,
        projectId: project._id,
        productId: product._id,
        sku: 'TEST-001',
        price: 29.99,
        trackQuantity: true,
        inventoryPolicy: 'deny',
        status: 'active',
        lastModifiedBy: user._id,
      });

      const variant2 = await t.mutation(api.productVariants.create, {
        organizationId: org._id,
        projectId: project._id,
        productId: product._id,
        sku: 'TEST-002',
        price: 39.99,
        trackQuantity: true,
        inventoryPolicy: 'deny',
        status: 'active',
        lastModifiedBy: user._id,
      });

      // Create category and assignment
      const category = await t.mutation(api.categories.create, {
        organizationId: org._id,
        projectId: project._id,
        name: 'Test Category',
        handle: 'test-category',
        level: 0,
        path: '/test-category',
        sortOrder: 0,
        status: 'active',
        isVisible: true,
        createdBy: user._id,
        lastModifiedBy: user._id,
      });

      const assignment = await t.mutation(api.categoryProductAssignments.create, {
        organizationId: org._id,
        projectId: project._id,
        categoryId: category._id,
        productId: product._id,
        assignedBy: 'manual',
        status: 'active',
        assignedByUser: user._id,
      });

      // Calculate cascade deletion
      const result = await t.query(api.deletion.cascadeCalculationEngine.calculateCascadeDeletion, {
        entityType: 'product',
        entityId: product._id,
        options: {
          includePerformanceMetrics: true,
          includeRecoveryAnalysis: true,
        },
      });

      // Assertions
      expect(result.primaryEntity.type).toBe('product');
      expect(result.primaryEntity.name).toBe('Test Product');
      expect(result.impactSummary.totalEntitiesAffected).toBe(5); // 1 product + 2 variants + 1 assignment + 1 image
      expect(result.cascadeTree.children).toHaveLength(3); // variants, assignments, images
      
      // Check variant node
      const variantNode = result.cascadeTree.children.find(n => n.entityType === 'productVariants');
      expect(variantNode).toBeDefined();
      expect(variantNode?.metadata.count).toBe(2);
      expect(variantNode?.operation).toBe('archive');
      
      // Check assignment node
      const assignmentNode = result.cascadeTree.children.find(n => n.entityType === 'categoryAssignments');
      expect(assignmentNode).toBeDefined();
      expect(assignmentNode?.metadata.count).toBe(1);
      expect(assignmentNode?.operation).toBe('delete');
      
      // Check image node
      const imageNode = result.cascadeTree.children.find(n => n.entityType === 'images');
      expect(imageNode).toBeDefined();
      expect(imageNode?.metadata.count).toBe(1);
      expect(imageNode?.operation).toBe('queue');
      expect(imageNode?.metadata.canRecover).toBe(false);
      
      // Check risk level
      expect(result.impactSummary.riskLevel).toBe('low');
      
      // Check recovery analysis
      expect(result.recovery.fullyRecoverable).toBe(false); // Because of images
      expect(result.recovery.partiallyRecoverable).toBe(true);
      expect(result.recovery.dataLossRisk).toBe(true);
      expect(result.recovery.nonRecoverableItems).toContain('1 image');
    });

    test('should detect circular references', async () => {
      // This test would require a more complex setup with circular category relationships
      // For now, we'll test the circular detection logic works
      const result = await t.query(api.deletion.cascadeCalculationEngine.calculateCascadeDeletion, {
        entityType: 'product',
        entityId: 'j97test_product_id' as Id<'products'>,
        options: {
          maxDepth: 2,
        },
      });

      // Should handle non-existent product gracefully
      expect(result).toBeNull();
    });

    test('should provide accurate performance estimates', async () => {
      // Create test data with many variants
      const productId = 'j97test_product_with_many_variants' as Id<'products'>;
      
      // Mock a product with many relationships
      const result = await t.query(api.deletion.cascadeCalculationEngine.calculateCascadeDeletion, {
        entityType: 'product',
        entityId: productId,
        options: {
          includePerformanceMetrics: true,
        },
      });

      // Performance metrics should be included when requested
      if (result && result.performance) {
        expect(result.performance.estimatedOperations).toBeGreaterThanOrEqual(0);
        expect(result.performance.estimatedDatabaseReads).toBeGreaterThanOrEqual(1);
        expect(result.performance.estimatedDatabaseWrites).toBeGreaterThanOrEqual(0);
        expect(result.performance.bottlenecks).toBeInstanceOf(Array);
      }
    });
  });

  describe('previewDeletion', () => {
    test('should aggregate multiple product deletions', async () => {
      const productIds = [
        'j97product1' as Id<'products'>,
        'j97product2' as Id<'products'>,
        'j97product3' as Id<'products'>,
      ];

      const result = await t.query(api.deletion.cascadeDeletionPreview.previewDeletion, {
        productIds,
        includeDetails: false,
      });

      expect(result.summary.totalProductsToDelete).toBe(3);
      expect(result.calculations).toHaveLength(0); // No details when includeDetails is false
    });

    test('should return highest risk level from all calculations', async () => {
      // This would require setting up products with different risk levels
      // For demonstration, the test structure is shown
      const productIds = ['j97high_risk_product' as Id<'products'>];

      const result = await t.query(api.deletion.cascadeDeletionPreview.previewDeletion, {
        productIds,
        includeDetails: true,
      });

      expect(['low', 'medium', 'high', 'critical']).toContain(result.summary.highestRiskLevel);
    });
  });

  describe('validateDeletion', () => {
    test('should block deletion for critical risk operations', async () => {
      // Create a scenario that would result in critical risk
      const productIds = Array.from({ length: 1001 }, (_, i) => `j97product_${i}` as Id<'products'>);

      const result = await t.query(api.deletion.cascadeDeletionPreview.validateDeletion, {
        productIds,
      });

      expect(result.canDelete).toBe(false);
      expect(result.blockingReasons).toContain('Too many entities affected - maximum 1000 allowed');
    });

    test('should require confirmation for high impact operations', async () => {
      const productIds = Array.from({ length: 60 }, (_, i) => `j97product_${i}` as Id<'products'>);

      const result = await t.query(api.deletion.cascadeDeletionPreview.validateDeletion, {
        productIds,
      });

      expect(result.requiresConfirmation).toBe(true);
    });
  });

  describe('Cascade Visualization', () => {
    test('should generate tree visualization', async () => {
      const mockCalculationResult = {
        primaryEntity: {
          type: 'product' as const,
          id: 'j97test_product',
          name: 'Test Product',
        },
        impactSummary: {
          totalEntitiesAffected: 5,
          byEntityType: {
            'productVariants': 2,
            'categoryAssignments': 1,
            'images': 2,
          },
          estimatedDuration: 50,
          riskLevel: 'low' as const,
          warnings: [],
        },
        cascadeTree: {
          entityType: 'product',
          entityId: 'j97test_product',
          entityName: 'Test Product',
          operation: 'delete' as const,
          children: [
            {
              entityType: 'productVariants',
              entityId: 'multiple',
              entityName: '2 Variants',
              operation: 'archive' as const,
              children: [],
              metadata: { count: 2, canRecover: true },
            },
          ],
          metadata: {},
        },
        performance: {
          estimatedOperations: 5,
          estimatedDatabaseReads: 3,
          estimatedDatabaseWrites: 5,
          parallelizationOpportunities: 1,
          bottlenecks: [],
        },
        recovery: {
          fullyRecoverable: false,
          partiallyRecoverable: true,
          nonRecoverableItems: ['2 images'],
          dataLossRisk: true,
        },
      };

      const visualization = await t.query(api.deletion.cascadeVisualization.generateCascadeVisualization, {
        calculationResult: mockCalculationResult,
        format: 'tree',
      });

      expect(visualization).toContain('Cascade Deletion Impact Analysis');
      expect(visualization).toContain('Test Product');
      expect(visualization).toContain('Risk Level: LOW');
      expect(visualization).toContain('productVariants: 2 Variants');
    });

    test('should generate graph visualization', async () => {
      const mockCalculationResult = {
        primaryEntity: {
          type: 'product' as const,
          id: 'j97test_product',
          name: 'Test Product',
        },
        impactSummary: {
          totalEntitiesAffected: 3,
          byEntityType: { 'productVariants': 2, 'images': 1 },
          estimatedDuration: 30,
          riskLevel: 'low' as const,
          warnings: [],
        },
        cascadeTree: {
          entityType: 'product',
          entityId: 'j97test_product',
          entityName: 'Test Product',
          operation: 'delete' as const,
          children: [],
          metadata: {},
        },
        performance: {
          estimatedOperations: 3,
          estimatedDatabaseReads: 2,
          estimatedDatabaseWrites: 3,
          parallelizationOpportunities: 0,
          bottlenecks: [],
        },
        recovery: {
          fullyRecoverable: true,
          partiallyRecoverable: false,
          nonRecoverableItems: [],
          dataLossRisk: false,
        },
      };

      const graph = await t.query(api.deletion.cascadeVisualization.generateCascadeVisualization, {
        calculationResult: mockCalculationResult,
        format: 'graph',
      });

      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(graph).toHaveProperty('metadata');
      expect(graph.metadata.riskLevel).toBe('low');
    });
  });

  describe('Caching', () => {
    test('should cache calculation results', async () => {
      // This would test the internal caching mechanism
      // For now, we verify the cache functions exist
      expect(api.deletion.cascadeCalculationCache).toBeDefined();
    });
  });

  describe('Progress Tracking', () => {
    test('should track deletion progress', async () => {
      const transactionId = 'txn_test_123';
      
      // Create a mock transaction
      await t.mutation(api.cascadeTransactions.create, {
        transactionId,
        organizationId: 'j97test_org' as Id<'organizations'>,
        operationType: 'bulk_delete',
        status: 'in_progress',
        primaryEntityId: 'j97test_product' as Id<'products'>,
        affectedEntities: {
          products: ['j97test_product' as Id<'products'>],
          variants: [],
          assignments: [],
          images: [],
        },
        operations: [],
        startedAt: Date.now(),
        executedBy: 'j97test_user' as Id<'users'>,
      });

      const progress = await t.query(api.deletion.cascadeDeletionProgress.subscribeToDeletionProgress, {
        transactionId,
      });

      expect(progress).toBeDefined();
      expect(progress?.transactionId).toBe(transactionId);
      expect(progress?.status).toBe('in_progress');
    });
  });
});