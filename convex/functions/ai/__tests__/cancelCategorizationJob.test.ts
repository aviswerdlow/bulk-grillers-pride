import { cancelCategorizationJob } from '../categorization';
import { Id } from '../../../_generated/dataModel';

describe('cancelCategorizationJob', () => {
  let mockCtx: any;
  let mockJob: any;
  let mockUser: any;
  let mockOrgMembership: any;

  beforeEach(() => {
    // Reset mocks
    mockJob = {
      _id: 'job123' as Id<'aiCategorizationJobs'>,
      organizationId: 'org123' as Id<'organizations'>,
      status: 'running',
      startedAt: Date.now() - 10000, // Started 10 seconds ago
    };

    mockUser = {
      _id: 'user123' as Id<'users'>,
      clerkId: 'user_test123',
    };

    mockOrgMembership = {
      _id: 'membership123' as Id<'organizationMemberships'>,
      userId: mockUser._id,
      organizationId: mockJob.organizationId,
      deletedAt: null,
    };

    mockCtx = {
      auth: {
        getUserIdentity: jest.fn().mockResolvedValue({
          subject: 'user_test123',
        }),
      },
      db: {
        get: jest.fn().mockResolvedValue(mockJob),
        patch: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockImplementation((table) => {
          if (table === 'users') {
            return {
              withIndex: jest.fn().mockReturnValue({
                unique: jest.fn().mockResolvedValue(mockUser),
              }),
            };
          } else if (table === 'organizationMemberships') {
            return {
              withIndex: jest.fn().mockReturnValue({
                filter: jest.fn().mockReturnValue({
                  unique: jest.fn().mockResolvedValue(mockOrgMembership),
                }),
              }),
            };
          }
        }),
      },
    };
  });

  it('should successfully cancel a running job', async () => {
    const jobId = 'job123' as Id<'aiCategorizationJobs'>;

    const result = await cancelCategorizationJob(mockCtx, { jobId });

    expect(result).toEqual({
      success: true,
      message: 'Categorization job stopped successfully',
      jobId,
    });

    expect(mockCtx.db.patch).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({
        status: 'cancelled',
        completedAt: expect.any(Number),
        executionTime: expect.any(Number),
        updatedAt: expect.any(Number),
        results: expect.objectContaining({
          message: 'Job cancelled by user',
          cancelledAt: expect.any(Number),
          cancelledBy: mockUser._id,
        }),
      })
    );
  });

  it('should successfully cancel a pending job', async () => {
    mockJob.status = 'pending';
    mockJob.startedAt = undefined;

    const jobId = 'job123' as Id<'aiCategorizationJobs'>;
    const result = await cancelCategorizationJob(mockCtx, { jobId });

    expect(result).toEqual({
      success: true,
      message: 'Categorization job cancelled successfully',
      jobId,
    });

    // Should set executionTime to 0 for jobs that haven't started
    expect(mockCtx.db.patch).toHaveBeenCalledWith(
      jobId,
      expect.objectContaining({
        executionTime: 0,
      })
    );
  });

  it('should throw error when job is not found', async () => {
    mockCtx.db.get.mockResolvedValue(null);

    const jobId = 'nonexistent' as Id<'aiCategorizationJobs'>;

    await expect(cancelCategorizationJob(mockCtx, { jobId })).rejects.toThrow(
      'Job not found. The categorization job may have been deleted or does not exist.'
    );
  });

  it('should throw error when user is not authenticated', async () => {
    mockCtx.auth.getUserIdentity.mockResolvedValue(null);

    const jobId = 'job123' as Id<'aiCategorizationJobs'>;

    await expect(cancelCategorizationJob(mockCtx, { jobId })).rejects.toThrow('Not authenticated');
  });

  it('should throw error when job is already completed', async () => {
    mockJob.status = 'completed';

    const jobId = 'job123' as Id<'aiCategorizationJobs'>;

    await expect(cancelCategorizationJob(mockCtx, { jobId })).rejects.toThrow(
      'Cannot cancel a completed job. The categorization process has already finished successfully.'
    );
  });

  it('should throw error when job has failed', async () => {
    mockJob.status = 'failed';

    const jobId = 'job123' as Id<'aiCategorizationJobs'>;

    await expect(cancelCategorizationJob(mockCtx, { jobId })).rejects.toThrow(
      'Cannot cancel a failed job. The categorization process has already failed and stopped.'
    );
  });

  it('should throw error when job is already cancelled', async () => {
    mockJob.status = 'cancelled';

    const jobId = 'job123' as Id<'aiCategorizationJobs'>;

    await expect(cancelCategorizationJob(mockCtx, { jobId })).rejects.toThrow(
      'This job has already been cancelled.'
    );
  });

  it('should throw error when user does not have permission', async () => {
    // User not member of organization
    mockCtx.db.query.mockImplementation((table) => {
      if (table === 'users') {
        return {
          withIndex: jest.fn().mockReturnValue({
            unique: jest.fn().mockResolvedValue(mockUser),
          }),
        };
      } else if (table === 'organizationMemberships') {
        return {
          withIndex: jest.fn().mockReturnValue({
            filter: jest.fn().mockReturnValue({
              unique: jest.fn().mockResolvedValue(null), // No membership found
            }),
          }),
        };
      }
    });

    const jobId = 'job123' as Id<'aiCategorizationJobs'>;

    await expect(cancelCategorizationJob(mockCtx, { jobId })).rejects.toThrow(
      'You do not have permission to cancel this job'
    );
  });

  it('should throw error for unknown job status', async () => {
    mockJob.status = 'processing'; // Invalid status

    const jobId = 'job123' as Id<'aiCategorizationJobs'>;

    await expect(cancelCategorizationJob(mockCtx, { jobId })).rejects.toThrow(
      'Cannot cancel job with status "processing". Only pending or running jobs can be cancelled.'
    );
  });
});
