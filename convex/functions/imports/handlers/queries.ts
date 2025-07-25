import { QueryCtx } from '../../../_generated/server';
import { Id, Doc } from '../../../_generated/dataModel';
import { authenticateAndAuthorize } from '../../../lib/auth';

// Handler for getImportJobs
export async function getImportJobsHandler(
  ctx: QueryCtx,
  {
    organizationId,
    projectId,
    importType,
    status,
    limit = 50,
  }: {
    organizationId: Id<'organizations'>;
    projectId?: Id<'projects'>;
    importType?: 'products' | 'categories' | 'variants';
    status?: 'uploaded' | 'validating' | 'importing' | 'completed' | 'failed';
    limit?: number;
  }
) {
  // Authenticate and authorize in one call - reduces 3 DB queries to 2
  const { user, membership } = await authenticateAndAuthorize(ctx, organizationId);

  let query = ctx.db
    .query('importJobs')
    .withIndex('by_organization_project', (q) => q.eq('organizationId', organizationId));

  if (projectId) {
    query = query.filter((q) => q.eq(q.field('projectId'), projectId));
  }

  if (importType) {
    query = query.filter((q) => q.eq(q.field('importType'), importType));
  }

  if (status) {
    query = query.filter((q) => q.eq(q.field('status'), status));
  }

  const jobs = await query.order('desc').take(limit).collect();

  return jobs;
}

// Handler for getImportJob
export async function getImportJobHandler(
  ctx: QueryCtx,
  { jobId }: { jobId: Id<'importJobs'> }
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');

  const job = await ctx.db.get(jobId);
  if (!job) throw new Error('Job not found');

  // Verify user has access to this organization
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) throw new Error('User not found');

  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', job.organizationId).eq('userId', user._id)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership) throw new Error('Access denied');

  return job;
}

// Handler for getFileEntry
export async function getFileEntryHandler(
  ctx: QueryCtx,
  { storageId }: { storageId: Id<'_storage'> }
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');

  const fileEntry = await ctx.db
    .query('fileStorageEntries')
    .filter((q) => q.eq(q.field('storageId'), storageId))
    .unique();

  return fileEntry;
}