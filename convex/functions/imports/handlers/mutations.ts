import { MutationCtx } from '../../../_generated/server';
import { Id, Doc } from '../../../_generated/dataModel';

// Handler for createImportJob
export async function createImportJobHandler(
  ctx: MutationCtx,
  args: {
    organizationId: Id<'organizations'>;
    projectId: Id<'projects'>;
    importType: 'products' | 'categories' | 'variants';
    fileName: string;
    fileSize: number;
    fileStorageId: string;
    fieldMapping: {
      mappings: any;
      options: {
        hasHeaders: boolean;
        delimiter: string;
        skipEmptyRows: boolean;
        duplicateHandling: 'skip' | 'update' | 'create';
      };
    };
    validationRules: Array<{
      field: string;
      type: string;
      required: boolean;
      pattern?: string;
      minLength?: number;
      maxLength?: number;
      allowedValues?: string[];
    }>;
  }
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) throw new Error('User not found');

  // Verify user has access and permissions
  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', args.organizationId).eq('userId', user._id)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership || !['owner', 'admin', 'editor'].includes(membership.role)) {
    throw new Error('Insufficient permissions');
  }

  const now = Date.now();
  const jobId = await ctx.db.insert('importJobs', {
    organizationId: args.organizationId,
    projectId: args.projectId,
    importType: args.importType,
    fileName: args.fileName,
    fileSize: args.fileSize,
    fileStorageId: args.fileStorageId,
    fieldMapping: args.fieldMapping,
    validationRules: args.validationRules,
    status: 'uploaded',
    progress: {
      totalRows: 0,
      processedRows: 0,
      validRows: 0,
      invalidRows: 0,
      importedRows: 0,
      skippedRows: 0,
    },
    validationErrors: [],
    importResults: {
      createdRecords: [],
      updatedRecords: [],
      skippedRecords: [],
    },
    createdBy: user._id,
    createdAt: now,
    updatedAt: now,
  });

  // Create audit log
  await ctx.db.insert('auditLogs', {
    organizationId: args.organizationId,
    eventType: 'CREATE',
    entityType: 'importJobs',
    entityId: jobId,
    changes: [
      {
        field: '*',
        oldValue: null,
        newValue: {
          importType: args.importType,
          fileName: args.fileName,
          fileSize: args.fileSize,
        },
        changeType: 'added' as const,
      },
    ],
    context: {
      action: 'create_import_job',
      source: 'web' as const,
    },
    performedBy: {
      type: 'user' as const,
      userId: user._id,
      userEmail: user.email,
    },
    metadata: {
      projectId: args.projectId,
      fileName: args.fileName,
    },
    timestamp: now,
    isRollbackable: false,
  });

  // TODO: Schedule the job for processing after API regeneration
  // await ctx.scheduler.runAfter(0, internal.functions.imports.imports.processImportJob, {
  //   jobId,
  // });
  console.log('Import job created, scheduler disabled for build');

  return jobId;
}

// Handler for updateJobStatus
export async function updateJobStatusHandler(
  ctx: MutationCtx,
  {
    jobId,
    status,
  }: {
    jobId: Id<'importJobs'>;
    status: 'uploaded' | 'validating' | 'importing' | 'completed' | 'failed';
  }
) {
  await ctx.db.patch(jobId, {
    status,
    updatedAt: Date.now(),
  });
}

// Handler for completeImport
export async function completeImportHandler(
  ctx: MutationCtx,
  {
    jobId,
    results,
  }: {
    jobId: Id<'importJobs'>;
    results: any;
  }
) {
  const now = Date.now();

  await ctx.db.patch(jobId, {
    status: 'completed',
    progress: results.progress,
    validationErrors: results.validationErrors,
    importResults: results.importResults,
    completedAt: now,
    updatedAt: now,
  });
}

// Handler for generateUploadUrl
export async function generateUploadUrlHandler(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');

  return await ctx.storage.generateUploadUrl();
}

// Handler for completeFileUpload
export async function completeFileUploadHandler(
  ctx: MutationCtx,
  args: {
    organizationId: Id<'organizations'>;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storageId: Id<'_storage'>;
  }
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) throw new Error('User not found');

  // Verify user has access and permissions
  const membership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_organization_user', (q) =>
      q.eq('organizationId', args.organizationId).eq('userId', user._id)
    )
    .filter((q) => q.eq(q.field('status'), 'active'))
    .unique();

  if (!membership || !['owner', 'admin', 'editor'].includes(membership.role)) {
    throw new Error('Insufficient permissions');
  }

  // Get file URL from storage
  const fileUrl = await ctx.storage.getUrl(args.storageId);

  const fileEntryId = await ctx.db.insert('fileStorageEntries', {
    organizationId: args.organizationId,
    fileName: args.fileName,
    originalName: args.fileName,
    mimeType: args.mimeType,
    fileSize: args.fileSize,
    storageId: args.storageId,
    url: fileUrl || '',
    fileType: 'csv_import',
    purpose: 'CSV import for product/category data',
    linkedRecords: [],
    isPublic: false,
    allowedUsers: [user._id],
    isTemporary: true,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    uploadedBy: user._id,
    createdAt: Date.now(),
  });

  return { storageId: args.storageId, fileEntryId };
}