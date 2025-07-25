// Mock for Convex generated API
module.exports = {
  api: {
  functions: {
    auth: {
      users: {
        ensureUser: 'auth.users.ensureUser',
        getUser: 'auth.users.getUser',
        updateProfile: 'auth.users.updateProfile',
        searchUsers: 'auth.users.searchUsers',
        getOrganizationUsers: 'auth.users.getOrganizationUsers',
      },
      sessions: {
        createSession: 'auth.sessions.createSession',
        endSession: 'auth.sessions.endSession',
        getActiveSessions: 'auth.sessions.getActiveSessions',
      },
      invitations: {
        inviteUser: 'auth.invitations.inviteUser',
        acceptInvitation: 'auth.invitations.acceptInvitation',
        declineInvitation: 'auth.invitations.declineInvitation',
        revokeInvitation: 'auth.invitations.revokeInvitation',
        getPendingInvitations: 'auth.invitations.getPendingInvitations',
      },
      permissions: {
        checkPermission: 'auth.permissions.checkPermission',
        getUserPermissions: 'auth.permissions.getUserPermissions',
        updateUserRole: 'auth.permissions.updateUserRole',
      },
    },
    categories: {
      categories: {
        getAllCategories: 'categories.categories.getAllCategories',
        getCategoryTree: 'categories.categories.getCategoryTree',
      },
      categoryLevels: {
        getCategoryLevels: 'categories.categoryLevels.getCategoryLevels',
      },
    },
    organizations: {
      create: 'organizations.create',
      update: 'organizations.update',
      delete: 'organizations.delete',
      addMember: 'organizations.addMember',
      getUserOrganizations: 'organizations.getUserOrganizations',
      organizations: {
        getOrganizationBySlug: 'organizations.organizations.getOrganizationBySlug',
        getDashboardStats: 'organizations.organizations.getDashboardStats',
        getOrganizationMembers: 'organizations.organizations.getOrganizationMembers',
        createOrganization: 'organizations.organizations.createOrganization',
        updateOrganization: 'organizations.organizations.updateOrganization',
        removeTeamMember: 'organizations.organizations.removeTeamMember',
      },
      apiKeys: {
        getMaskedApiKeys: 'organizations.apiKeys.getMaskedApiKeys',
        updateApiKeys: 'organizations.apiKeys.updateApiKeys',
        removeApiKey: 'organizations.apiKeys.removeApiKey',
      },
    },
    ai: {
      categorization: {
        createCategorizationJob: 'ai.categorization.createCategorizationJob',
        cancelCategorizationJob: 'ai.categorization.cancelCategorizationJob',
        getCategorizationJob: 'ai.categorization.getCategorizationJob',
        applyCategorization: 'ai.categorization.applyCategorization',
        processCategorizationJob: 'ai.categorization.processCategorizationJob',
        getJobDetails: 'ai.categorization.getJobDetails',
        exportJobResults: 'ai.categorization.exportJobResults',
        subscribeToJobUpdates: 'ai.categorization.subscribeToJobUpdates',
        validateApiKeyConfiguration: 'ai.categorization.validateApiKeyConfiguration',
        checkModelAvailability: 'ai.categorization.checkModelAvailability',
      },
    },
    products: {
      products: {
        list: 'products.products.list',
        create: 'products.products.create',
        update: 'products.products.update',
        delete: 'products.products.delete',
        getProjectProducts: 'products.products.getProjectProducts',
        createProduct: 'products.products.createProduct',
        updateProduct: 'products.products.updateProduct',
        searchProducts: 'products.products.searchProducts',
      },
    },
    projects: {
      projects: {
        getOrganizationProjects: 'projects.projects.getOrganizationProjects',
        createProject: 'projects.projects.createProject',
        updateProject: 'projects.projects.updateProject',
        deleteProject: 'projects.projects.deleteProject',
        getProject: 'projects.projects.getProject',
      },
    },
    dashboard: {
      getDashboardStats: 'dashboard.getDashboardStats',
    },
    accessibility: {
      preferences: {
        getAccessibilityPreferences: 'accessibility.preferences.getAccessibilityPreferences',
        updateAccessibilityPreferences: 'accessibility.preferences.updateAccessibilityPreferences',
      },
    },
  },
  },
};
