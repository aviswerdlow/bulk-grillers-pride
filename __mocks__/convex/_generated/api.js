// Create mock functions with descriptive names for better debugging
const createMockFunction = (name) => {
  const mockFn = jest.fn();
  mockFn._functionName = name;
  mockFn._isMock = true;
  return mockFn;
};

// Export the api object with functions
exports.api = {
  functions: {
    auth: {
      users: {
        ensureUser: createMockFunction('auth.users.ensureUser'),
        getUser: createMockFunction('auth.users.getUser'),
        updateProfile: createMockFunction('auth.users.updateProfile'),
        searchUsers: createMockFunction('auth.users.searchUsers'),
        getOrganizationUsers: createMockFunction('auth.users.getOrganizationUsers'),
      },
      sessions: {
        createSession: createMockFunction('auth.sessions.createSession'),
        endSession: createMockFunction('auth.sessions.endSession'),
        getActiveSessions: createMockFunction('auth.sessions.getActiveSessions'),
      },
      invitations: {
        inviteUser: createMockFunction('auth.invitations.inviteUser'),
        acceptInvitation: createMockFunction('auth.invitations.acceptInvitation'),
        declineInvitation: createMockFunction('auth.invitations.declineInvitation'),
        revokeInvitation: createMockFunction('auth.invitations.revokeInvitation'),
        getPendingInvitations: createMockFunction('auth.invitations.getPendingInvitations'),
      },
      permissions: {
        checkPermission: createMockFunction('auth.permissions.checkPermission'),
        getUserPermissions: createMockFunction('auth.permissions.getUserPermissions'),
        updateUserRole: createMockFunction('auth.permissions.updateUserRole'),
      },
    },
    categories: {
      categories: {
        getAllCategories: createMockFunction('categories.categories.getAllCategories'),
        getCategoryTree: createMockFunction('categories.categories.getCategoryTree'),
      },
      categoryLevels: {
        getCategoryLevels: createMockFunction('categories.categoryLevels.getCategoryLevels'),
      },
    },
    organizations: {
      create: createMockFunction('organizations.create'),
      update: createMockFunction('organizations.update'),
      delete: createMockFunction('organizations.delete'),
      addMember: createMockFunction('organizations.addMember'),
      getUserOrganizations: createMockFunction('organizations.getUserOrganizations'),
      organizations: {
        getOrganizationBySlug: createMockFunction('organizations.organizations.getOrganizationBySlug'),
        getDashboardStats: createMockFunction('organizations.organizations.getDashboardStats'),
        getOrganizationMembers: createMockFunction('organizations.organizations.getOrganizationMembers'),
        createOrganization: createMockFunction('organizations.organizations.createOrganization'),
        updateOrganization: createMockFunction('organizations.organizations.updateOrganization'),
        removeTeamMember: createMockFunction('organizations.organizations.removeTeamMember'),
      },
      apiKeys: {
        getMaskedApiKeys: createMockFunction('organizations.apiKeys.getMaskedApiKeys'),
        updateApiKeys: createMockFunction('organizations.apiKeys.updateApiKeys'),
        removeApiKey: createMockFunction('organizations.apiKeys.removeApiKey'),
      },
    },
    ai: {
      categorization: {
        createCategorizationJob: createMockFunction('ai.categorization.createCategorizationJob'),
        cancelCategorizationJob: createMockFunction('ai.categorization.cancelCategorizationJob'),
        getCategorizationJob: createMockFunction('ai.categorization.getCategorizationJob'),
        applyCategorization: createMockFunction('ai.categorization.applyCategorization'),
        processCategorizationJob: createMockFunction('ai.categorization.processCategorizationJob'),
        getJobDetails: createMockFunction('ai.categorization.getJobDetails'),
        exportJobResults: createMockFunction('ai.categorization.exportJobResults'),
        subscribeToJobUpdates: createMockFunction('ai.categorization.subscribeToJobUpdates'),
        validateApiKeyConfiguration: createMockFunction('ai.categorization.validateApiKeyConfiguration'),
        checkModelAvailability: createMockFunction('ai.categorization.checkModelAvailability'),
      },
    },
    products: {
      products: {
        list: createMockFunction('products.products.list'),
        create: createMockFunction('products.products.create'),
        update: createMockFunction('products.products.update'),
        delete: createMockFunction('products.products.delete'),
        getProjectProducts: createMockFunction('products.products.getProjectProducts'),
        createProduct: createMockFunction('products.products.createProduct'),
        updateProduct: createMockFunction('products.products.updateProduct'),
        searchProducts: createMockFunction('products.products.searchProducts'),
      },
    },
    projects: {
      projects: {
        getOrganizationProjects: createMockFunction('projects.projects.getOrganizationProjects'),
        createProject: createMockFunction('projects.projects.createProject'),
        updateProject: createMockFunction('projects.projects.updateProject'),
        deleteProject: createMockFunction('projects.projects.deleteProject'),
        getProject: createMockFunction('projects.projects.getProject'),
      },
    },
    dashboard: {
      getDashboardStats: createMockFunction('dashboard.getDashboardStats'),
      dashboard: {
        getDashboardStats: createMockFunction('dashboard.dashboard.getDashboardStats'),
        getRecentActivity: createMockFunction('dashboard.dashboard.getRecentActivity'),
      },
    },
    activityLogs: {
      activityLogs: {
        getRecentActivity: createMockFunction('activityLogs.activityLogs.getRecentActivity'),
      },
    },
    accessibility: {
      preferences: {
        getAccessibilityPreferences: createMockFunction('accessibility.preferences.getAccessibilityPreferences'),
        updateAccessibilityPreferences: createMockFunction('accessibility.preferences.updateAccessibilityPreferences'),
      },
    },
  },
};

// Also export as default for compatibility
exports.default = exports.api;