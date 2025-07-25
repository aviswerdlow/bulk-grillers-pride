import { QueryCtx } from '../../../_generated/server';
import { Id } from '../../../_generated/dataModel';

// Handler for getOrganizationProjects
export async function getOrganizationProjectsHandler(
  ctx: QueryCtx,
  { organizationId }: { organizationId: Id<'organizations'> }
) {
  return await ctx.db
    .query('projects')
    .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
    .filter((q) => q.neq(q.field('status'), 'archived'))
    .collect();
}

// Handler for getProjectBySlug
export async function getProjectBySlugHandler(
  ctx: QueryCtx,
  {
    organizationId,
    slug,
  }: {
    organizationId: Id<'organizations'>;
    slug: string;
  }
) {
  return await ctx.db
    .query('projects')
    .withIndex('by_organization_slug', (q) =>
      q.eq('organizationId', organizationId).eq('slug', slug)
    )
    .unique();
}

// Handler for getProjectStats
export async function getProjectStatsHandler(
  ctx: QueryCtx,
  { projectId }: { projectId: Id<'projects'> }
) {
  const project = await ctx.db.get(projectId);
  if (!project) return null;

  // Count products
  const products = await ctx.db
    .query('products')
    .withIndex('by_organization_project', (q) =>
      q.eq('organizationId', project.organizationId).eq('projectId', projectId)
    )
    .collect();

  // Count categories
  const categories = await ctx.db
    .query('categories')
    .withIndex('by_organization_project', (q) =>
      q.eq('organizationId', project.organizationId).eq('projectId', projectId)
    )
    .collect();

  // Count active AI jobs
  const activeJobs = await ctx.db
    .query('aiCategorizationJobs')
    .withIndex('by_organization_project', (q) =>
      q.eq('organizationId', project.organizationId).eq('projectId', projectId)
    )
    .filter((q) => q.or(q.eq(q.field('status'), 'pending'), q.eq(q.field('status'), 'running')))
    .collect();

  return {
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.status === 'active').length,
    draftProducts: products.filter((p) => p.status === 'draft').length,
    totalCategories: categories.length,
    activeCategories: categories.filter((c) => c.status === 'active').length,
    activeAiJobs: activeJobs.length,
  };
}