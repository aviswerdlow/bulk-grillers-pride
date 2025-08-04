// Mock implementations for category queries
import { Id } from '../../../_generated/dataModel';

// Check if user is authenticated (for mocking auth failures)
function checkAuth(ctx: any) {
  const identity = ctx.auth.getUserIdentity();
  if (!identity || identity === null) {
    throw new Error('Not authenticated');
  }
}

// Helper to filter categories based on query args
export function mockGetProjectCategories(categories: any[], args: {
  organizationId: Id<'organizations'>;
  projectId: Id<'projects'>;
  parentId?: Id<'categories'>;
  level?: number;
}) {
  let filtered = categories.filter(c => 
    c.organizationId === args.organizationId &&
    c.projectId === args.projectId &&
    c.status === 'active'
  );

  if (args.parentId !== undefined) {
    filtered = filtered.filter(c => c.parentId === args.parentId);
  }

  if (args.level !== undefined) {
    filtered = filtered.filter(c => c.level === args.level);
  }

  return filtered.sort((a, b) => a.sortOrder - b.sortOrder);
}

// Helper to build category tree
export function mockGetCategoryTree(categories: any[], args: {
  organizationId: Id<'organizations'>;
  projectId: Id<'projects'>;
}) {
  const filtered = categories.filter(c => 
    c.organizationId === args.organizationId &&
    c.projectId === args.projectId &&
    c.status === 'active'
  );

  const categoryMap = new Map<string, any>();
  const rootCategories: any[] = [];

  // First pass: create map of all categories
  filtered.forEach((category) => {
    categoryMap.set(category._id, {
      ...category,
      children: [],
    });
  });

  // Second pass: build tree structure
  filtered.forEach((category) => {
    const categoryWithChildren = categoryMap.get(category._id);
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId);
      if (parent) {
        parent.children.push(categoryWithChildren);
      }
    } else {
      rootCategories.push(categoryWithChildren);
    }
  });

  // Sort each level by sortOrder
  const sortCategories = (categories: any[]) => {
    categories.sort((a, b) => a.sortOrder - b.sortOrder);
    categories.forEach((category) => {
      if (category.children.length > 0) {
        sortCategories(category.children);
      }
    });
  };

  sortCategories(rootCategories);
  return rootCategories;
}