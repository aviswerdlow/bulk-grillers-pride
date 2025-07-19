// Create mock functions with descriptive names for better debugging
const createMockFunction = (name) => {
  const mockFn = jest.fn();
  mockFn._functionName = name;
  mockFn._isMock = true;
  return mockFn;
};

export const api = {
  functions: {
    auth: {
      users: {
        current: createMockFunction('auth.users.current'),
        currentWithOrganizations: createMockFunction('auth.users.currentWithOrganizations'),
        getOrganizationUsers: createMockFunction('auth.users.getOrganizationUsers'),
        create: createMockFunction('auth.users.create'),
        update: createMockFunction('auth.users.update'),
        updateOnboardingStatus: createMockFunction('auth.users.updateOnboardingStatus'),
      },
      sessions: {
        updateProfile: createMockFunction('auth.sessions.updateProfile'),
        switchOrganization: createMockFunction('auth.sessions.switchOrganization'),
        getActiveSessions: createMockFunction('auth.sessions.getActiveSessions'),
      },
      permissions: {
        updateUserRole: createMockFunction('auth.permissions.updateUserRole'),
        removeUserFromOrganization: createMockFunction('auth.permissions.removeUserFromOrganization'),
      },
      invitations: {
        getOrganizationInvitations: createMockFunction('auth.invitations.getOrganizationInvitations'),
        createInvitation: createMockFunction('auth.invitations.createInvitation'),
        resendInvitation: createMockFunction('auth.invitations.resendInvitation'),
        revokeInvitation: createMockFunction('auth.invitations.revokeInvitation'),
      },
    },
    organizations: {
      organizations: {
        getOrganizationBySlug: createMockFunction('organizations.organizations.getOrganizationBySlug'),
        create: createMockFunction('organizations.organizations.create'),
        update: createMockFunction('organizations.organizations.update'),
        getMyOrganizations: createMockFunction('organizations.organizations.getMyOrganizations'),
      },
      apiKeys: {
        getMaskedApiKeys: createMockFunction('organizations.apiKeys.getMaskedApiKeys'),
        removeApiKey: createMockFunction('organizations.apiKeys.removeApiKey'),
      },
    },
    projects: {
      projects: {
        getOrganizationProjects: createMockFunction('projects.projects.getOrganizationProjects'),
        create: createMockFunction('projects.projects.create'),
        update: createMockFunction('projects.projects.update'),
        delete: createMockFunction('projects.projects.delete'),
      },
    },
    dashboard: {
      getDashboardStats: createMockFunction('dashboard.getDashboardStats'),
      getRecentActivity: createMockFunction('dashboard.getRecentActivity'),
    },
    categories: {
      categories: {
        getCategoryTree: createMockFunction('categories.categories.getCategoryTree'),
        create: createMockFunction('categories.categories.create'),
        update: createMockFunction('categories.categories.update'),
        delete: createMockFunction('categories.categories.delete'),
        getOrganizationCategories: createMockFunction('categories.categories.getOrganizationCategories'),
      },
      categoryLevels: {
        getCategoryLevels: createMockFunction('categories.categoryLevels.getCategoryLevels'),
      },
    },
    products: {
      products: {
        getOrganizationProducts: createMockFunction('products.products.getOrganizationProducts'),
        getById: createMockFunction('products.products.getById'),
        create: createMockFunction('products.products.create'),
        update: createMockFunction('products.products.update'),
        delete: createMockFunction('products.products.delete'),
        bulkUpdate: createMockFunction('products.products.bulkUpdate'),
      },
    },
    imports: {
      imports: {
        getOrganizationImports: createMockFunction('imports.imports.getOrganizationImports'),
        create: createMockFunction('imports.imports.create'),
        processFile: createMockFunction('imports.imports.processFile'),
      },
    },
    ai: {
      categorization: {
        createCategorizationJob: createMockFunction('ai.categorization.createCategorizationJob'),
        listCategorizationJobs: createMockFunction('ai.categorization.listCategorizationJobs'),
        getCategorizationJob: createMockFunction('ai.categorization.getCategorizationJob'),
        updateCategorizationJobStatus: createMockFunction('ai.categorization.updateCategorizationJobStatus'),
        processCategorizationBatch: createMockFunction('ai.categorization.processCategorizationBatch'),
        cancelCategorizationJob: createMockFunction('ai.categorization.cancelCategorizationJob'),
      },
    },
  },
};
