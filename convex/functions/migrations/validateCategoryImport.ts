import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';

// Data validation schema for category import
const categorySchema = v.object({
  category_id: v.string(),
  name: v.string(),
  level: v.number(),
});

// Validate and dry-run category import
export const validateCategoryImport = mutation({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    categoriesData: v.any(), // JSON array of legacy categories
    dryRun: v.optional(v.boolean()), // If true, only validate without importing
  },
  handler: async (ctx, { organizationId, projectId, categoriesData, dryRun = true }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    // Verify user has admin permissions
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_user', (q) =>
        q.eq('organizationId', organizationId).eq('userId', user._id)
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .unique();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Insufficient permissions');
    }

    // Parse and validate data structure
    let categories;
    try {
      categories = JSON.parse(categoriesData);
      if (!Array.isArray(categories)) {
        throw new Error('Data must be a JSON array');
      }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid JSON format',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Validation results
    const validationResults = {
      totalRecords: categories.length,
      validRecords: 0,
      invalidRecords: 0,
      warnings: [] as Array<{ index: number; field: string; message: string }>,
      errors: [] as Array<{ index: number; field: string; message: string; value?: any }>,
      duplicateHandles: [] as Array<{ name: string; handle: string; count: number }>,
      missingParents: [] as Array<{ name: string; level: number; index: number }>,
      levelAnalysis: {} as Record<number, { count: number; names: string[] }>,
      existingCategories: [] as Array<{ name: string; handle: string; level: number }>,
      estimatedOperations: {
        categoriesToCreate: 0,
        levelDefinitionsToCreate: 0,
      },
    };

    // Check existing category level definitions
    const existingLevels = await ctx.db
      .query('categoryLevelDefinitions')
      .withIndex('by_project_order', (q) => q.eq('projectId', projectId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();

    validationResults.estimatedOperations.levelDefinitionsToCreate =
      existingLevels.length === 0 ? 5 : 0;

    // Validate each category
    const handleMap = new Map<string, number>();
    const categoryByLevel = new Map<number, Array<{ name: string; index: number }>>();

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      let isValid = true;

      // Check required fields
      if (!category.category_id) {
        validationResults.errors.push({
          index: i,
          field: 'category_id',
          message: 'Missing required field',
        });
        isValid = false;
      }

      if (!category.name || typeof category.name !== 'string') {
        validationResults.errors.push({
          index: i,
          field: 'name',
          message: 'Missing or invalid name',
          value: category.name,
        });
        isValid = false;
      }

      if (typeof category.level !== 'number' || category.level < 1 || category.level > 5) {
        validationResults.errors.push({
          index: i,
          field: 'level',
          message: 'Level must be a number between 1 and 5',
          value: category.level,
        });
        isValid = false;
      }

      // Generate handle for duplicate checking
      if (category.name) {
        const handle = category.name
          .toLowerCase()
          .replace(/[^a-z0-9\s&-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/&/g, 'and')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        const handleCount = handleMap.get(handle) || 0;
        handleMap.set(handle, handleCount + 1);

        // Check for existing categories with same handle
        if (!dryRun) {
          const existing = await ctx.db
            .query('categories')
            .withIndex('by_handle', (q) =>
              q.eq('organizationId', organizationId).eq('projectId', projectId).eq('handle', handle)
            )
            .first();

          if (existing) {
            validationResults.existingCategories.push({
              name: category.name,
              handle,
              level: category.level,
            });
            validationResults.warnings.push({
              index: i,
              field: 'handle',
              message: `Category with handle "${handle}" already exists`,
            });
          }
        }
      }

      // Track categories by level for parent validation
      if (category.level && category.name) {
        const levelCategories = categoryByLevel.get(category.level) || [];
        levelCategories.push({ name: category.name, index: i });
        categoryByLevel.set(category.level, levelCategories);

        // Update level analysis
        const levelInfo = validationResults.levelAnalysis[category.level] || {
          count: 0,
          names: [],
        };
        levelInfo.count++;
        if (levelInfo.names.length < 5) {
          levelInfo.names.push(category.name);
        }
        validationResults.levelAnalysis[category.level] = levelInfo;
      }

      // Check for special characters that might cause issues
      if (category.name && /[<>\"'`]/.test(category.name)) {
        validationResults.warnings.push({
          index: i,
          field: 'name',
          message: 'Contains special characters that will be sanitized',
        });
      }

      if (isValid) {
        validationResults.validRecords++;
      } else {
        validationResults.invalidRecords++;
      }
    }

    // Check for duplicate handles
    handleMap.forEach((count, handle) => {
      if (count > 1) {
        const duplicates = categories.filter((cat) => {
          if (!cat.name) return false;
          const catHandle = cat.name
            .toLowerCase()
            .replace(/[^a-z0-9\s&-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/&/g, 'and')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          return catHandle === handle;
        });

        validationResults.duplicateHandles.push({
          name: duplicates[0]?.name || handle,
          handle,
          count,
        });
      }
    });

    // Check for orphaned categories (level > 1 without parents)
    for (let level = 2; level <= 5; level++) {
      const currentLevelCategories = categoryByLevel.get(level) || [];
      const parentLevelCategories = categoryByLevel.get(level - 1) || [];

      if (currentLevelCategories.length > 0 && parentLevelCategories.length === 0) {
        currentLevelCategories.forEach((cat) => {
          validationResults.missingParents.push({
            name: cat.name,
            level,
            index: cat.index,
          });
        });
      }
    }

    validationResults.estimatedOperations.categoriesToCreate = validationResults.validRecords;

    // Generate import preview
    const importPreview = {
      summary: {
        totalCategories: validationResults.totalRecords,
        validCategories: validationResults.validRecords,
        invalidCategories: validationResults.invalidRecords,
        duplicateHandles: validationResults.duplicateHandles.length,
        existingConflicts: validationResults.existingCategories.length,
        warningCount: validationResults.warnings.length,
        errorCount: validationResults.errors.length,
      },
      levelDistribution: validationResults.levelAnalysis,
      estimatedTime: Math.ceil((validationResults.validRecords * 50) / 1000), // ~50ms per category
      canProceed: validationResults.invalidRecords === 0 && validationResults.errors.length === 0,
    };

    // If not a dry run and validation passes, proceed with import
    if (!dryRun && importPreview.canProceed) {
      // Import would happen here, but we'll use the existing importLegacyCategories function
      return {
        success: false,
        error: 'Use importLegacyCategories mutation for actual import',
        validationResults,
        importPreview,
      };
    }

    return {
      success: true,
      isDryRun: dryRun,
      validationResults,
      importPreview,
      message: importPreview.canProceed
        ? `Validation passed. ${validationResults.validRecords} categories ready for import.`
        : `Validation failed. ${validationResults.errors.length} errors found.`,
    };
  },
});

// Get a preview of what would be imported
export const previewCategoryImport = query({
  args: {
    organizationId: v.id('organizations'),
    projectId: v.id('projects'),
    sampleSize: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, projectId, sampleSize = 10 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get existing categories for comparison
    const existingCategories = await ctx.db
      .query('categories')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', organizationId).eq('projectId', projectId)
      )
      .take(sampleSize);

    // Get category level definitions
    const levelDefinitions = await ctx.db
      .query('categoryLevelDefinitions')
      .withIndex('by_project_order', (q) => q.eq('projectId', projectId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();

    return {
      existingCategories: existingCategories.map((cat) => ({
        name: cat.name,
        handle: cat.handle,
        level: cat.level,
        path: cat.path,
        hasProducts: false, // Would need to check assignments
      })),
      categoryLevels: levelDefinitions.map((def) => ({
        level: def.level,
        friendlyName: def.friendlyName,
        description: def.description,
        isRequired: def.isRequired,
      })),
      importGuidelines: {
        requiredFields: ['category_id', 'name', 'level'],
        levelRange: { min: 1, max: 5 },
        nameFormat: 'Alphanumeric with spaces, hyphens, and ampersands',
        handleGeneration: 'Lowercase, hyphenated version of name',
        duplicateHandling: 'Appends number suffix for duplicates',
      },
    };
  },
});
