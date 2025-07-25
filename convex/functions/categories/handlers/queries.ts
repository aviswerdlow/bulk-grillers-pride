import { QueryCtx } from '../../../_generated/server';
import { Id } from '../../../_generated/dataModel';
import { getUserAndVerifyAccess } from '../helpers';

// Handler for getProjectCategories
export async function getProjectCategoriesHandler(
  ctx: QueryCtx,
  {
    organizationId,
    projectId,
    parentId,
    level,
  }: {
    organizationId: Id<'organizations'>;
    projectId: Id<'projects'>;
    parentId?: Id<'categories'>;
    level?: number;
  }
) {
  await getUserAndVerifyAccess(ctx, organizationId);

  let query = ctx.db
    .query('categories')
    .withIndex('by_organization_project', (q) =>
      q.eq('organizationId', organizationId).eq('projectId', projectId)
    );

  // If parentId is explicitly undefined and level is not specified, 
  // default to root categories (parentId = null)
  if (parentId === undefined && level === undefined) {
    query = query.filter((q) => q.eq(q.field('parentId'), null));
  } else if (parentId !== undefined) {
    query = query.filter((q) => q.eq(q.field('parentId'), parentId));
  }

  if (level !== undefined) {
    query = query.filter((q) => q.eq(q.field('level'), level));
  }

  const categories = await query
    .filter((q) => q.eq(q.field('status'), 'active'))
    .order('asc')
    .collect();

  // Sort by sortOrder
  return categories.sort((a, b) => a.sortOrder - b.sortOrder);
}

// Handler for getCategoryTree
export async function getCategoryTreeHandler(
  ctx: QueryCtx,
  {
    organizationId,
    projectId,
  }: {
    organizationId: Id<'organizations'>;
    projectId: Id<'projects'>;
  }
) {
  await getUserAndVerifyAccess(ctx, organizationId);

  const categories = await ctx.db
    .query('categories')
    .withIndex('by_organization_project', (q) =>
      q.eq('organizationId', organizationId).eq('projectId', projectId)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .collect();

  // Build tree structure
  const categoryMap = new Map<string, any>();
  const rootCategories: any[] = [];

  // First pass: create map of all categories
  categories.forEach((category) => {
    categoryMap.set(category._id, {
      ...category,
      children: [] as any[],
    });
  });

  // Second pass: build tree structure
  categories.forEach((category) => {
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

// Handler for getCategory
export async function getCategoryHandler(
  ctx: QueryCtx,
  { categoryId }: { categoryId: Id<'categories'> }
) {
  const category = await ctx.db.get(categoryId);
  if (!category) throw new Error('Category not found');

  await getUserAndVerifyAccess(ctx, category.organizationId);
  return category;
}

// Handler for getBreadcrumb (if it exists in queries.ts)
export async function getBreadcrumbHandler(
  ctx: QueryCtx,
  { categoryId }: { categoryId: Id<'categories'> }
) {
  const category = await ctx.db.get(categoryId);
  if (!category) throw new Error('Category not found');

  await getUserAndVerifyAccess(ctx, category.organizationId);

  const breadcrumb: any[] = [];
  let currentCategory: typeof category | null = category;

  // Build breadcrumb by traversing up the parent chain
  while (currentCategory) {
    breadcrumb.unshift({
      _id: currentCategory._id,
      name: currentCategory.name,
      handle: currentCategory.handle,
    });

    if (currentCategory.parentId) {
      currentCategory = await ctx.db.get(currentCategory.parentId);
    } else {
      break;
    }
  }

  return breadcrumb;
}