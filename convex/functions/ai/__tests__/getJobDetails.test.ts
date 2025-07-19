import { getJobDetails } from '../categorization';
import { convexTest, createMockCtx, mockAuth } from '../../../__tests__/test-helpers';
import { Id } from '../../../_generated/dataModel';

describe('getJobDetails', () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    _id: 'user1' as Id<'users'>,
    clerkId: 'clerk_123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockOrg = {
    _id: 'org1' as Id<'organizations'>,
    name: 'Test Organization',
    slug: 'test-org',
  };

  const mockProject = {
    _id: 'project1' as Id<'projects'>,
    organizationId: 'org1' as Id<'organizations'>,
    name: 'Test Project',
    description: 'Test project description',
  };

  const mockJob = {
    _id: 'job1' as Id<'aiCategorizationJobs'>,
    organizationId: 'org1' as Id<'organizations'>,
    projectId: 'project1' as Id<'projects'>,
    type: 'bulk' as const,
    status: 'completed' as const,
    products: ['prod1', 'prod2'] as Id<'products'>[],
    aiProvider: 'openai' as const,
    model: 'o3-mini',
    prompt: 'Test prompt',
    progress: {
      total: 2,
      processed: 2,
      successful: 2,
      failed: 0,
      skipped: 0,
    },
    results: [
      {
        productId: 'prod1' as Id<'products'>,
        status: 'completed' as const,
        suggestions: [
          {
            categoryId: 'cat1' as Id<'categories'>,
            confidence: 0.9,
            rationale: 'High confidence match',
          },
        ],
        processedAt: Date.now(),
      },
      {
        productId: 'prod2' as Id<'products'>,
        status: 'completed' as const,
        suggestions: [
          {
            categoryId: 'cat2' as Id<'categories'>,
            confidence: 0.85,
            rationale: 'Good match based on keywords',
          },
        ],
        processedAt: Date.now(),
      },
    ],
    errors: [],
    notificationEmail: null,
    notifyOnCompletion: false,
    createdBy: 'user1' as Id<'users'>,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    startedAt: Date.now() - 5000,
    completedAt: Date.now(),
    executionTime: 5000,
  };

  const mockProducts = [
    {
      _id: 'prod1' as Id<'products'>,
      organizationId: 'org1' as Id<'organizations'>,
      projectId: 'project1' as Id<'projects'>,
      title: 'Product 1',
      description: 'Description 1',
      sku: 'SKU1',
      type: 'physical' as const,
      handle: 'product-1',
      status: 'active' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      _id: 'prod2' as Id<'products'>,
      organizationId: 'org1' as Id<'organizations'>,
      projectId: 'project1' as Id<'projects'>,
      title: 'Product 2',
      description: 'Description 2',
      sku: 'SKU2',
      type: 'physical' as const,
      handle: 'product-2',
      status: 'active' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const mockCategories = [
    {
      _id: 'cat1' as Id<'categories'>,
      organizationId: 'org1' as Id<'organizations'>,
      projectId: 'project1' as Id<'projects'>,
      name: 'Category 1',
      slug: 'category-1',
      level: 'parent' as const,
      parentId: null,
      status: 'active' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      _id: 'cat2' as Id<'categories'>,
      organizationId: 'org1' as Id<'organizations'>,
      projectId: 'project1' as Id<'projects'>,
      name: 'Category 2',
      slug: 'category-2',
      level: 'parent' as const,
      parentId: null,
      status: 'active' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const mockMembership = {
    _id: 'membership1' as Id<'organizationMemberships'>,
    organizationId: 'org1' as Id<'organizations'>,
    userId: 'user1' as Id<'users'>,
    role: 'owner' as const,
    status: 'active' as const,
    joinedAt: Date.now(),
    invitedBy: null,
  };

  it('should return job details with enriched data', async () => {
    // Mock the database responses
    const mockDb = {
      get: jest.fn()
        .mockImplementation((id: string) => {
          if (id === 'job1') return mockJob;
          if (id === 'org1') return mockOrg;
          if (id === 'project1') return mockProject;
          if (id === 'user1') return mockUser;
          if (id === 'prod1') return mockProducts[0];
          if (id === 'prod2') return mockProducts[1];
          if (id === 'cat1') return mockCategories[0];
          if (id === 'cat2') return mockCategories[1];
          return null;
        }),
      query: jest.fn(() => ({
        withIndex: jest.fn(() => ({
          eq: jest.fn(() => ({
            unique: jest.fn(() => mockUser),
          })),
          filter: jest.fn(() => ({
            unique: jest.fn(() => mockMembership),
          })),
          collect: jest.fn(() => []),
        })),
      })),
    };

    const auth = {
      getUserIdentity: jest.fn(() => ({ subject: mockUser.clerkId })),
    };

    const ctx = { db: mockDb, auth };
    const result = await getJobDetails(ctx as any, { jobId: 'job1' as Id<'aiCategorizationJobs'> });

    expect(result.job).toMatchObject({
      _id: 'job1',
      status: 'completed',
      organization: {
        _id: 'org1',
        name: 'Test Organization',
        slug: 'test-org',
      },
      project: {
        _id: 'project1',
        name: 'Test Project',
        description: 'Test project description',
      },
      createdBy: {
        _id: 'user1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      },
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toMatchObject({
      productId: 'prod1',
      product: {
        _id: 'prod1',
        title: 'Product 1',
      },
      suggestions: [
        {
          categoryId: 'cat1',
          confidence: 0.9,
          category: {
            _id: 'cat1',
            name: 'Category 1',
          },
        },
      ],
    });

    expect(result.stats).toMatchObject({
      totalProducts: 2,
      processedProducts: 2,
      successfulProducts: 2,
      failedProducts: 0,
      skippedProducts: 0,
      categoriesUsed: 2,
    });

    expect(result.stats.averageConfidence).toBeCloseTo(0.875, 2);
    expect(result.categories).toHaveLength(2);
  });

  it('should throw error when not authenticated', async () => {
    const db = mockDb({});
    const auth = mockAuth(null);
    const ctx = mockQuery(db, auth);

    await expect(
      getJobDetails(ctx, { jobId: 'job1' as Id<'aiCategorizationJobs'> })
    ).rejects.toThrow('Not authenticated');
  });

  it('should throw error when job not found', async () => {
    const db = mockDb({
      users: [mockUser],
    });
    const auth = mockAuth(mockUser.clerkId);
    const ctx = mockQuery(db, auth);

    await expect(
      getJobDetails(ctx, { jobId: 'nonexistent' as Id<'aiCategorizationJobs'> })
    ).rejects.toThrow('Job not found');
  });

  it('should throw error when user has no access to organization', async () => {
    const db = mockDb({
      aiCategorizationJobs: [mockJob],
      users: [mockUser],
      organizationMemberships: [], // No membership
    });
    const auth = mockAuth(mockUser.clerkId);
    const ctx = mockQuery(db, auth);

    await expect(
      getJobDetails(ctx, { jobId: 'job1' as Id<'aiCategorizationJobs'> })
    ).rejects.toThrow('You do not have permission to view this job');
  });

  it('should handle products with existing category assignments', async () => {
    const existingAssignment = {
      _id: 'assignment1' as Id<'categoryProductAssignments'>,
      organizationId: 'org1' as Id<'organizations'>,
      projectId: 'project1' as Id<'projects'>,
      categoryId: 'cat1' as Id<'categories'>,
      productId: 'prod1' as Id<'products'>,
      assignedBy: 'manual' as const,
      assignedByUser: 'user1' as Id<'users'>,
      confidence: 1.0,
      rationale: 'Manually assigned',
      status: 'active' as const,
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 10000,
    };

    const db = mockDb({
      aiCategorizationJobs: [mockJob],
      users: [mockUser],
      organizations: [mockOrg],
      projects: [mockProject],
      products: mockProducts,
      categories: mockCategories,
      organizationMemberships: [mockMembership],
      categoryProductAssignments: [existingAssignment],
    });

    const auth = mockAuth(mockUser.clerkId);
    const ctx = mockQuery(db, auth);

    const result = await getJobDetails(ctx, { jobId: 'job1' as Id<'aiCategorizationJobs'> });

    expect(result.results[0].currentCategories).toHaveLength(1);
    expect(result.results[0].currentCategories[0]).toMatchObject({
      categoryId: 'cat1',
      category: {
        _id: 'cat1',
        name: 'Category 1',
      },
      assignedBy: 'manual',
      confidence: 1.0,
    });
  });

  it('should handle missing products gracefully', async () => {
    const jobWithMissingProduct = {
      ...mockJob,
      results: [
        {
          productId: 'nonexistent' as Id<'products'>,
          status: 'completed' as const,
          suggestions: [
            {
              categoryId: 'cat1' as Id<'categories'>,
              confidence: 0.9,
              rationale: 'High confidence match',
            },
          ],
          processedAt: Date.now(),
        },
      ],
    };

    const db = mockDb({
      aiCategorizationJobs: [jobWithMissingProduct],
      users: [mockUser],
      organizations: [mockOrg],
      projects: [mockProject],
      products: [], // No products
      categories: mockCategories,
      organizationMemberships: [mockMembership],
      categoryProductAssignments: [],
    });

    const auth = mockAuth(mockUser.clerkId);
    const ctx = mockQuery(db, auth);

    const result = await getJobDetails(ctx, { jobId: 'job1' as Id<'aiCategorizationJobs'> });

    expect(result.results[0].product).toBeNull();
  });
});