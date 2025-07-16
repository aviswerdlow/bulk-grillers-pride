import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';

// Create a new project
export const createProject = mutation({
  args: {
    organizationId: v.id('organizations'),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id('users'),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if slug is unique within organization
    const existingProject = await ctx.db
      .query('projects')
      .withIndex('by_organization_slug', (q) =>
        q.eq('organizationId', args.organizationId).eq('slug', args.slug)
      )
      .unique();

    if (existingProject) {
      throw new Error('Project slug already exists in this organization');
    }

    // Create project with default settings
    const projectId = await ctx.db.insert('projects', {
      organizationId: args.organizationId,
      name: args.name,
      slug: args.slug,
      description: args.description,
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
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      organizationId: args.organizationId,
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
        userId: args.createdBy,
        userEmail: '',
      },
      metadata: {
        projectName: args.name,
        projectSlug: args.slug,
      },
      timestamp: now,
      isRollbackable: true,
    });

    return projectId;
  },
});

// Get projects for an organization
export const getOrganizationProjects = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('projects')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) => q.neq(q.field('status'), 'archived'))
      .collect();
  },
});

// Get project by organization and slug
export const getProjectBySlug = query({
  args: {
    organizationId: v.id('organizations'),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('projects')
      .withIndex('by_organization_slug', (q) =>
        q.eq('organizationId', args.organizationId).eq('slug', args.slug)
      )
      .unique();
  },
});

// Update project
export const updateProject = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal('active'), v.literal('archived'), v.literal('draft'))),
    settings: v.optional(
      v.object({
        defaultCurrency: v.string(),
        defaultTaxRate: v.optional(v.number()),
        importSettings: v.object({
          autoValidate: v.boolean(),
          duplicateHandling: v.union(v.literal('skip'), v.literal('update'), v.literal('create')),
          requiredFields: v.array(v.string()),
        }),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();
    if (!user) throw new Error('User not found');

    const project = await ctx.db.get(args.projectId);
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
    if (args.name !== undefined && args.name !== project.name) {
      updates.name = args.name;
      changes.push({
        field: 'name',
        oldValue: project.name,
        newValue: args.name,
        changeType: 'modified',
      });
    }

    if (args.description !== undefined && args.description !== project.description) {
      updates.description = args.description;
      changes.push({
        field: 'description',
        oldValue: project.description,
        newValue: args.description,
        changeType: 'modified',
      });
    }

    if (args.status !== undefined && args.status !== project.status) {
      updates.status = args.status;
      changes.push({
        field: 'status',
        oldValue: project.status,
        newValue: args.status,
        changeType: 'modified',
      });
    }

    if (args.settings !== undefined) {
      updates.settings = args.settings;
      changes.push({
        field: 'settings',
        oldValue: project.settings,
        newValue: args.settings,
        changeType: 'modified',
      });
    }

    if (Object.keys(updates).length === 0) {
      return; // No changes to make
    }

    await ctx.db.patch(args.projectId, {
      ...updates,
      updatedAt: now,
      version: project.version + 1,
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      organizationId: project.organizationId,
      eventType: 'UPDATE',
      entityType: 'projects',
      entityId: args.projectId,
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
  },
});

// Delete project (soft delete by archiving)
export const deleteProject = mutation({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();
    if (!user) throw new Error('User not found');

    const project = await ctx.db.get(args.projectId);
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

    await ctx.db.patch(args.projectId, {
      status: 'archived',
      updatedAt: now,
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      organizationId: project.organizationId,
      eventType: 'DELETE',
      entityType: 'projects',
      entityId: args.projectId,
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
  },
});

// Archive project (soft delete)
export const archiveProject = mutation({
  args: {
    projectId: v.id('projects'),
    archivedBy: v.id('users'),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    await ctx.db.patch(args.projectId, {
      status: 'archived',
      updatedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert('auditLogs', {
      organizationId: project.organizationId,
      eventType: 'UPDATE',
      entityType: 'projects',
      entityId: args.projectId,
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
        userId: args.archivedBy,
        userEmail: '',
      },
      metadata: {
        projectName: project.name,
      },
      timestamp: Date.now(),
      isRollbackable: true,
    });
  },
});

// Get project statistics
export const getProjectStats = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    // Count products
    const products = await ctx.db
      .query('products')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', project.organizationId).eq('projectId', args.projectId)
      )
      .collect();

    // Count categories
    const categories = await ctx.db
      .query('categories')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', project.organizationId).eq('projectId', args.projectId)
      )
      .collect();

    // Count active AI jobs
    const activeJobs = await ctx.db
      .query('aiCategorizationJobs')
      .withIndex('by_organization_project', (q) =>
        q.eq('organizationId', project.organizationId).eq('projectId', args.projectId)
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
  },
});
