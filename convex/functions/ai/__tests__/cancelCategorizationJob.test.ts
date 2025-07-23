import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { t } from '../../../test.setup';
import { cancelCategorizationJob } from '../categorization';
describe('cancelCategorizationJob', () => {
  let ctx: any;
  let jobId: string;
  let userId: string;
  let orgId: string;

  beforeEach(async () => {
    
    ctx = await t.run(async (ctx) => ctx);
    
    // Create mock user
    userId = await ctx.db.insert('users', {
      clerkId: 'user_test123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create mock organization
    orgId = await ctx.db.insert('organizations', {
      name: 'Test Org',
      clerkOrganizationId: 'org_123',
      slug: 'test-org',
      status: 'active',
      settings: {
        defaultProductStatus: 'active',
        requireProductApproval: false,
        enableAiCategorization: true,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create membership
    await ctx.db.insert('organizationMemberships', {
      organizationId: orgId,
      userId,
      role: 'admin',
      status: 'active',
      permissions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create AI categorization job
    jobId = await ctx.db.insert('aiCategorizationJobs', {
      organizationId: orgId,
      status: 'running',
      startedAt: Date.now() - 10000, // Started 10 seconds ago
      errors: [],
      jobType: 'batch',
      prompt: 'Test prompt',
      aiProvider: 'openai',
      aiModel: 'gpt-4',
      productIds: [],
      categoryContext: {},
      progress: {
        total: 10,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
      },
      results: [],
      notifications: { onComplete: true, onError: true },
      notificationsSent: false,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Setup auth
    ctx.auth.getUserIdentity.mockResolvedValue({
      tokenIdentifier: 'user_test123',
      subject: 'user_test123',
    });

    // Mock query responses
    ctx.db.query.mockImplementation((table: string) => {
      const queryBuilder = {
        withIndex: jest.fn(() => ({
          unique: jest.fn(async () => {
            if (table === 'users') {
              const users = await ctx.db.query('users').collect();
              return users.find((u: any) => u.clerkId === 'user_test123');
            }
            return null;
          }),
          filter: jest.fn(() => ({
            unique: jest.fn(async () => {
              if (table === 'organizationMemberships') {
                const memberships = await ctx.db.query('organizationMemberships').collect();
                return memberships.find((m: any) => 
                  m.userId === userId && 
                  m.organizationId === orgId && 
                  !m.deletedAt
                );
              }
              return null;
            }),
          })),
        })),
        collect: jest.fn(async () => {
          const storage = (ctx.db as any).storage || {};
          return storage[table] || [];
        }),
      };
      return queryBuilder;
    });
  });

  it('should successfully cancel a running job', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
    const result = await cancelCategorizationJob(ctx, { jobId });

    expect(result).toEqual({
      success: true,
      message: 'Categorization job stopped successfully',
      jobId,
    });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({
        status: 'cancelled',
        completedAt: expect.any(Number),
        executionTime: expect.any(Number),
        updatedAt: expect.any(Number),
        errors: expect.arrayContaining([
          expect.objectContaining({
            type: 'cancelled',
            message: expect.stringContaining('Job cancelled by user'),
            timestamp: expect.any(Number),
          }),
        ]),
      })
    );
  });

  it('should successfully cancel a pending job', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
    // Update job status to pending
    await ctx.db.patch(jobId, {
      status: 'pending',
      startedAt: undefined,
    });

    const result = await cancelCategorizationJob(ctx, { jobId });

    expect(result).toEqual({
      success: true,
      message: 'Categorization job cancelled successfully',
      jobId,
    });

    // Should set executionTime to 0 for jobs that haven't started
    expect(ctx.db.patch).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({
        executionTime: 0,
      })
    );
  });

  it('should throw error when job is not found', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
    const nonExistentJobId = 'nonexistent';
    ctx.db.get.mockResolvedValue(null);

    await expect(cancelCategorizationJob(ctx, { jobId: nonExistentJobId })).rejects.toThrow(
      'Job not found. The categorization job may have been deleted or does not exist.'
    );
  });

  it('should throw error when user is not authenticated', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);

    await expect(cancelCategorizationJob(ctx, { jobId })).rejects.toThrow('Not authenticated');
  });

  it('should throw error when job is already completed', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
    await ctx.db.patch(jobId, { status: 'completed' });

    await expect(cancelCategorizationJob(ctx, { jobId })).rejects.toThrow(
      'Cannot cancel a completed job. The categorization process has already finished successfully.'
    );
  });

  it('should throw error when job has failed', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
    await ctx.db.patch(jobId, { status: 'failed' });

    await expect(cancelCategorizationJob(ctx, { jobId })).rejects.toThrow(
      'Cannot cancel a failed job. The categorization process has already failed and stopped.'
    );
  });

  it('should throw error when job is already cancelled', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
    await ctx.db.patch(jobId, { status: 'cancelled' });

    await expect(cancelCategorizationJob(ctx, { jobId })).rejects.toThrow(
      'This job has already been cancelled.'
    );
  });

  it('should throw error when user does not have permission', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
    // Override query to return no membership
    ctx.db.query.mockImplementation((table: string) => {
      const queryBuilder = {
        withIndex: jest.fn(() => ({
          unique: jest.fn(async () => {
            if (table === 'users') {
              const users = await ctx.db.query('users').collect();
              return users.find((u: any) => u.clerkId === 'user_test123');
            }
            return null;
          }),
          filter: jest.fn(() => ({
            unique: jest.fn(async () => null), // No membership found
          })),
        })),
        collect: jest.fn(async () => []),
      };
      return queryBuilder;
    });

    await expect(cancelCategorizationJob(ctx, { jobId })).rejects.toThrow(
      'You do not have permission to cancel this job'
    );
  });

  it('should throw error for unknown job status', async () => {
    const ctx = await t.mutation(async (ctx) => ctx);
    await ctx.db.patch(jobId, { status: 'processing' as any }); // Invalid status

    await expect(cancelCategorizationJob(ctx, { jobId })).rejects.toThrow(
      'Cannot cancel job with status "processing". Only pending or running jobs can be cancelled.'
    );
  });
});
