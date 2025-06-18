import { v } from "convex/values";
import { mutation } from "../../_generated/server";
// Remove API import to avoid circular dependency

// Import existing categories from your legacy system
export const importLegacyCategories = mutation({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.id("projects"),
    categoriesData: v.any(), // JSON array of legacy categories
  },
  handler: async (ctx, { organizationId, projectId, categoriesData }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    // Verify user has admin permissions
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", organizationId).eq("userId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    // Get or create category level definitions for this project
    const existingLevels = await ctx.db
      .query("categoryLevelDefinitions")
      .withIndex("by_project_order", (q) => q.eq("projectId", projectId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // If no level definitions exist, create default food category levels
    if (existingLevels.length === 0) {
      // TODO: Fix circular dependency
      // await ctx.runMutation(createDefaultFoodCategoryLevels, {
      //   organizationId,
      //   projectId,
      // });
      console.log("Would create default category levels here");
    }

    const categories = JSON.parse(categoriesData);
    const categoryMap = new Map(); // Map legacy IDs to new IDs
    const createdCategories: string[] = [];

    // Get the updated level definitions
    const levelDefinitions = await ctx.db
      .query("categoryLevelDefinitions")
      .withIndex("by_project_order", (q) => q.eq("projectId", projectId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const levelDefMap = new Map();
    levelDefinitions.forEach(def => {
      levelDefMap.set(def.level, def);
    });

    // Sort categories by level to ensure parents are created before children
    categories.sort((a: any, b: any) => a.level - b.level);

    // Build hierarchy by level
    const categoryLevels: { [key: number]: any[] } = {};
    categories.forEach((cat: any) => {
      if (!categoryLevels[cat.level]) {
        categoryLevels[cat.level] = [];
      }
      categoryLevels[cat.level].push(cat);
    });

    // Process each level
    for (let level = 1; level <= Math.max(...Object.keys(categoryLevels).map(Number)); level++) {
      const levelCategories = categoryLevels[level] || [];
      
      for (const legacyCategory of levelCategories) {
        try {
          // Generate handle from name
          const handle = legacyCategory.name
            .toLowerCase()
            .replace(/[^a-z0-9\s&-]/g, '') // Keep ampersands and hyphens
            .replace(/\s+/g, '-')
            .replace(/&/g, 'and')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

          // Find parent category for levels > 1
          let parentId = undefined;
          let path = `/${handle}`;
          
          if (level > 1) {
            // For this sample data, we need to infer parent relationships
            // Since the data doesn't have explicit parent IDs, we'll group by common patterns
            const parentCategory = findParentCategory(legacyCategory, categoryLevels, categoryMap);
            if (parentCategory) {
              parentId = categoryMap.get(parentCategory.category_id);
              const parentPath = categoryMap.get(`${parentCategory.category_id}_path`) || '';
              path = `${parentPath}/${handle}`;
            }
          }

          // Check for duplicate handles
          let uniqueHandle = handle;
          let counter = 1;
          while (true) {
            const existing = await ctx.db
              .query("categories")
              .withIndex("by_handle", (q) => 
                q.eq("organizationId", organizationId)
                 .eq("projectId", projectId)
                 .eq("handle", uniqueHandle)
              )
              .unique();
            
            if (!existing) break;
            uniqueHandle = `${handle}-${counter}`;
            counter++;
          }

          const now = Date.now();
          // Get the friendly name for this level
          const levelDef = levelDefMap.get(level - 1); // Convert to 0-based for lookup
          const levelFriendlyName = levelDef?.friendlyName || `Level ${level}`;

          const categoryId = await ctx.db.insert("categories", {
            organizationId,
            projectId,
            name: legacyCategory.name,
            handle: uniqueHandle,
            parentId,
            level: level - 1, // Convert to 0-based indexing
            path,
            sortOrder: 0, // Will be updated later
            status: "active",
            isVisible: true,
            metadata: {
              legacyId: legacyCategory.category_id,
              importedAt: now,
              originalLevel: legacyCategory.level,
              levelFriendlyName,
              levelDefinitionId: levelDef?._id,
            },
            version: 1,
            createdBy: user._id,
            createdAt: now,
            updatedAt: now,
            lastModifiedBy: user._id,
          });

          // Store mapping for parent lookups
          categoryMap.set(legacyCategory.category_id, categoryId);
          categoryMap.set(`${legacyCategory.category_id}_path`, path);
          createdCategories.push(categoryId);

        } catch (error) {
          console.error(`Error importing category ${legacyCategory.name}:`, error);
          // Continue with other categories
        }
      }
    }

    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId,
      eventType: "CREATE",
      entityType: "categories",
      entityId: "bulk_import",
      changes: [{
        field: "bulk_import",
        oldValue: null,
        newValue: {
          importedCount: createdCategories.length,
          totalCategories: categories.length,
        },
        changeType: "added" as const,
      }],
      context: {
        action: "import_legacy_categories",
        source: "web" as const,
      },
      performedBy: {
        type: "user" as const,
        userId: user._id,
        userEmail: user.email,
      },
      metadata: { 
        projectId,
        legacyImport: true,
        levelDefinitionsUsed: levelDefinitions.map(def => ({
          level: def.level,
          friendlyName: def.friendlyName,
        })),
      },
      timestamp: Date.now(),
      isRollbackable: false,
    });

    return {
      success: true,
      importedCount: createdCategories.length,
      totalCount: categories.length,
      categoryIds: createdCategories,
    };
  },
});

// Helper function to infer parent relationships based on category patterns
function findParentCategory(category: any, categoryLevels: any, categoryMap: Map<string, any>) {
  const currentLevel = category.level;
  const currentName = category.name.toLowerCase();
  
  // Look for potential parents in the previous level
  const previousLevel = categoryLevels[currentLevel - 1] || [];
  
  // Business logic for your food categories - this is specific to your domain
  for (const potentialParent of previousLevel) {
    const parentName = potentialParent.name.toLowerCase();
    
    // Direct name matching patterns for food categories
    if (currentLevel === 2) {
      // Level 2 categories often inherit from "Uncooked Foods", "Prepared Foods", or "Bakery & Grocery"
      if (parentName.includes('uncooked') && (
        currentName.includes('beef') || 
        currentName.includes('poultry') || 
        currentName.includes('fish') || 
        currentName.includes('lamb') || 
        currentName.includes('veal')
      )) {
        return potentialParent;
      }
      if (parentName.includes('prepared') && (
        currentName.includes('prepared') ||
        currentName.includes('ready-to-eat')
      )) {
        return potentialParent;
      }
      if (parentName.includes('bakery') && (
        currentName.includes('bakery') ||
        currentName.includes('grocery')
      )) {
        return potentialParent;
      }
    }
    
    if (currentLevel === 3) {
      // Level 3 categories are more specific
      if (parentName === 'beef' && (
        currentName.includes('ground beef') ||
        currentName.includes('steaks') ||
        currentName.includes('ribs') ||
        currentName.includes('roasts')
      )) {
        return potentialParent;
      }
      if (parentName === 'poultry' && (
        currentName.includes('ground poultry') ||
        currentName.includes('parts') ||
        currentName.includes('whole birds') ||
        currentName.includes('signature')
      )) {
        return potentialParent;
      }
    }
    
    if (currentLevel === 4) {
      // Level 4 are very specific cuts/items
      if (parentName.includes('bone-in') && currentName.includes('steak')) {
        return potentialParent;
      }
      if (parentName.includes('boneless') && (
        currentName.includes('steak') || 
        currentName.includes('chicken')
      )) {
        return potentialParent;
      }
      if (parentName.includes('ground') && currentName.includes('ground')) {
        return potentialParent;
      }
    }
  }
  
  // Fallback: try to find any parent with similar name patterns
  for (const potentialParent of previousLevel) {
    const parentWords = potentialParent.name.toLowerCase().split(' ');
    const currentWords = currentName.split(' ');
    
    // Check for common words
    const commonWords = parentWords.filter((word: string) => 
      currentWords.includes(word) && word.length > 3
    );
    
    if (commonWords.length > 0) {
      return potentialParent;
    }
  }
  
  return null;
}