import { MutationCtx } from '../../../_generated/server';
import { Id } from '../../../_generated/dataModel';

// Handler for createProject
export async function createProjectHandler(
  ctx: MutationCtx,
  {
    organizationId,
    name,
    slug,
    description,
    createdBy,
  }: {
    organizationId: Id<'organizations'>;
    name: string;
    slug: string;
    description?: string;
    createdBy: Id<'users'>;
  }
) {
  const now = Date.now();

  // Check if slug is unique within organization
  const existingProject = await ctx.db
    .query('projects')
    .withIndex('by_organization_slug', (q) =>
      q.eq('organizationId', organizationId).eq('slug', slug)
    )
    .unique();

  if (existingProject) {
    throw new Error('Project slug already exists in this organization');
  }

  // Create project with default settings
  const projectId = await ctx.db.insert('projects', {
    organizationId,
    name,
    slug,
    description,
    status: 'active',
    settings: {
      defaultCurrency: 'USD',
      defaultTaxRate: 0,
      importSettings: {
        autoValidate: true,
        duplicateHandling: 'skip',
        requiredFields: ['title', 'handle'],
      },
    },
    createdBy,
    createdAt: now,
    updatedAt: now,
    version: 1,
  });

  // Create audit log
  await ctx.db.insert('auditLogs', {
    organizationId,
    eventType: 'CREATE',
    entityType: 'projects',
    entityId: projectId,
    changes: [
      {
        field: '*',
        oldValue: null,
        newValue: 'project_created',
        changeType: 'added',
      },
    ],
    context: {
      action: 'create_project',
      source: 'web',
    },
    performedBy: {
      type: 'user',
      userId: createdBy,
      userEmail: '',
    },
    metadata: {
      projectName: name,
      projectSlug: slug,
    },
    timestamp: now,
    isRollbackable: true,
  });

  return projectId;
}

// Handler for updateProject
export async function updateProjectHandler(
  ctx: MutationCtx,
  {
    projectId,
    name,
    description,
    status,
    settings,
  }: {
    projectId: Id<'projects'>;
    name?: string;
    description?: string;
    status?: 'active' | 'archived' | 'draft';
    settings?: {
      defaultCurrency: string;
      defaultTaxRate?: number;
      importSettings: {
        autoValidate: boolean;
        duplicateHandling: 'skip' | 'update' | 'create';
        requiredFields: string[];
      };
    };
  }
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();
  if (!user) throw new Error('User not found');

  const project = await ctx.db.get(projectId);
  if (!project) throw new Error('Project not found');

  // Verify user has access to this organization
  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', project.organizationId).eq('userId', user._id)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Insufficient permissions');
  }

  const now = Date.now();
  const updates: any = {};
  const changes: any[] = [];

  // Track changes for audit
  if (name !== undefined && name !== project.name) {
    updates.name = name;
    changes.push({
      field: 'name',
      oldValue: project.name,
      newValue: name,
      changeType: 'modified',
    });
  }

  if (description !== undefined && description !== project.description) {
    updates.description = description;
    changes.push({
      field: 'description',
      oldValue: project.description,
      newValue: description,
      changeType: 'modified',
    });
  }

  if (status !== undefined && status !== project.status) {
    updates.status = status;
    changes.push({
      field: 'status',
      oldValue: project.status,
      newValue: status,
      changeType: 'modified',
    });
  }

  if (settings !== undefined) {
    updates.settings = settings;
    changes.push({
      field: 'settings',
      oldValue: project.settings,
      newValue: settings,
      changeType: 'modified',
    });
  }

  if (Object.keys(updates).length === 0) {
    return; // No changes to make
  }

  await ctx.db.patch(projectId, {
    ...updates,
    updatedAt: now,
    version: project.version + 1,
  });

  // Create audit log
  await ctx.db.insert('auditLogs', {
    organizationId: project.organizationId,
    eventType: 'UPDATE',
    entityType: 'projects',
    entityId: projectId,
    changes,
    beforeSnapshot: project,
    context: {
      action: 'update_project',
      source: 'web',
    },
    performedBy: {
      type: 'user',
      userId: user._id,
      userEmail: user.email,
    },
    metadata: {
      projectName: project.name,
    },
    timestamp: now,
    isRollbackable: true,
    rollbackData: project,
  });
}

// Handler for deleteProject
export async function deleteProjectHandler(
  ctx: MutationCtx,
  { projectId }: { projectId: Id<'projects'> }
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();
  if (!user) throw new Error('User not found');

  const project = await ctx.db.get(projectId);
  if (!project) throw new Error('Project not found');

  // Verify user has access to this organization
  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', project.organizationId).eq('userId', user._id)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Insufficient permissions to delete project');
  }

  const now = Date.now();

  await ctx.db.patch(projectId, {
    status: 'archived' as const,
    updatedAt: now,
  });

  // Create audit log
  await ctx.db.insert('auditLogs', {
    organizationId: project.organizationId,
    eventType: 'DELETE',
    entityType: 'projects',
    entityId: projectId,
    changes: [
      {
        field: 'status',
        oldValue: project.status,
        newValue: 'archived',
        changeType: 'modified',
      },
    ],
    beforeSnapshot: project,
    context: {
      action: 'delete_project',
      source: 'web',
    },
    performedBy: {
      type: 'user',
      userId: user._id,
      userEmail: user.email,
    },
    metadata: {
      projectName: project.name,
    },
    timestamp: now,
    isRollbackable: true,
    rollbackData: project,
  });
}

// Handler for archiveProject
export async function archiveProjectHandler(
  ctx: MutationCtx,
  {
    projectId,
    archivedBy,
  }: {
    projectId: Id<'projects'>;
    archivedBy: Id<'users'>;
  }
) {
  const project = await ctx.db.get(projectId);
  if (!project) throw new Error('Project not found');

  await ctx.db.patch(projectId, {
    status: 'archived' as const,
    updatedAt: Date.now(),
  });

  // Create audit log
  await ctx.db.insert('auditLogs', {
    organizationId: project.organizationId,
    eventType: 'UPDATE',
    entityType: 'projects',
    entityId: projectId,
    changes: [
      {
        field: 'status',
        oldValue: project.status,
        newValue: 'archived',
        changeType: 'modified',
      },
    ],
    context: {
      action: 'archive_project',
      source: 'web',
    },
    performedBy: {
      type: 'user',
      userId: archivedBy,
      userEmail: '',
    },
    metadata: {
      projectName: project.name,
    },
    timestamp: Date.now(),
    isRollbackable: true,
  });
}