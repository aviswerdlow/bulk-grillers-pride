export const api = {
  functions: {
    auth: {
      users: {
        current: 'mock-current',
        currentWithOrganizations: 'mock-currentWithOrganizations',
        getOrganizationUsers: 'mock-getOrganizationUsers',
        create: 'mock-create',
        update: 'mock-update',
        updateOnboardingStatus: 'mock-updateOnboardingStatus',
      },
      sessions: {
        updateProfile: 'mock-updateProfile',
        switchOrganization: 'mock-switchOrganization',
        getActiveSessions: 'mock-getActiveSessions',
      },
      permissions: {
        updateUserRole: 'mock-updateUserRole',
        removeUserFromOrganization: 'mock-removeUserFromOrganization',
      },
      invitations: {
        getOrganizationInvitations: 'mock-getOrganizationInvitations',
        createInvitation: 'mock-createInvitation',
        resendInvitation: 'mock-resendInvitation',
        revokeInvitation: 'mock-revokeInvitation',
      },
    },
    organizations: {
      organizations: {
        getOrganizationBySlug: 'mock-getOrganizationBySlug',
        create: 'mock-createOrganization',
        update: 'mock-updateOrganization',
        getMyOrganizations: 'mock-getMyOrganizations',
      },
      apiKeys: {
        getMaskedApiKeys: 'mock-getMaskedApiKeys',
        removeApiKey: 'mock-removeApiKey',
      },
    },
    projects: {
      projects: {
        getOrganizationProjects: 'mock-getOrganizationProjects',
        create: 'mock-createProject',
        update: 'mock-updateProject',
        delete: 'mock-deleteProject',
      },
    },
    dashboard: {
      getDashboardStats: 'mock-getDashboardStats',
      getRecentActivity: 'mock-getRecentActivity',
    },
    categories: {
      categories: {
        getCategoryTree: 'mock-getCategoryTree',
        create: 'mock-createCategory',
        update: 'mock-updateCategory',
        delete: 'mock-deleteCategory',
        getOrganizationCategories: 'mock-getOrganizationCategories',
      },
      categoryLevels: {
        getCategoryLevels: 'mock-getCategoryLevels',
      },
    },
    products: {
      products: {
        getOrganizationProducts: 'mock-getOrganizationProducts',
        getById: 'mock-getById',
        create: 'mock-createProduct',
        update: 'mock-updateProduct',
        delete: 'mock-deleteProduct',
        bulkUpdate: 'mock-bulkUpdate',
      },
    },
    imports: {
      imports: {
        getOrganizationImports: 'mock-getOrganizationImports',
        create: 'mock-createImport',
        processFile: 'mock-processFile',
      },
    },
    ai: {
      categorization: {
        createCategorizationJob: 'mock-createCategorizationJob',
        listCategorizationJobs: 'mock-listCategorizationJobs',
        getCategorizationJob: 'mock-getCategorizationJob',
        updateCategorizationJobStatus: 'mock-updateCategorizationJobStatus',
        processCategorizationBatch: 'mock-processCategorizationBatch',
        cancelCategorizationJob: 'mock-cancelCategorizationJob',
      },
    },
  },
};
