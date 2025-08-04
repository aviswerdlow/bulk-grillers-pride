// Complete mock API structure for Convex functions
export const mockApi = {
  functions: {
    // Accessibility functions
    accessibility: {
      preferences: {
        getAccessibilityPreferences: 'mock-get-accessibility-preferences',
        updateAccessibilityPreferences: 'mock-update-accessibility-preferences',
      }
    },
    
    // Activity log functions
    activityLogs: {
      activityLogs: {
        logActivity: 'mock-log-activity',
        getRecentActivity: 'mock-get-recent-activity',
        getActivityByEntity: 'mock-get-activity-by-entity',
      }
    },
    
    // Categories functions
    categories: {
      categories: {
        getCategories: 'mock-get-categories',
        getCategory: 'mock-get-category',
        createCategory: 'mock-create-category',
        updateCategory: 'mock-update-category',
        deleteCategory: 'mock-delete-category',
        getCategoryTree: 'mock-get-category-tree',
        moveCategory: 'mock-move-category',
      },
      mutations: {
        createCategory: 'mock-mutation-create-category',
        updateCategory: 'mock-mutation-update-category',
        deleteCategory: 'mock-mutation-delete-category',
        bulkCreateCategories: 'mock-bulk-create-categories',
        bulkUpdateCategories: 'mock-bulk-update-categories',
        bulkDeleteCategories: 'mock-bulk-delete-categories',
      },
      queries: {
        getCategories: 'mock-query-get-categories',
        getCategory: 'mock-query-get-category',
        getCategoryTree: 'mock-query-get-category-tree',
        searchCategories: 'mock-search-categories',
        getCategoriesByIds: 'mock-get-categories-by-ids',
      }
    },
    
    // Dashboard functions
    dashboard: {
      dashboard: {
        getDashboardStats: 'mock-get-dashboard-stats',
        getRecentActivity: 'mock-get-recent-activity',
        getOrganizationMetrics: 'mock-get-organization-metrics',
      }
    },
    
    // Materials functions
    materials: {
      materials: {
        getMaterials: 'mock-get-materials',
        getMaterial: 'mock-get-material',
        createMaterial: 'mock-create-material',
        updateMaterial: 'mock-update-material',
        deleteMaterial: 'mock-delete-material',
      },
      mutations: {
        createMaterial: 'mock-mutation-create-material',
        updateMaterial: 'mock-mutation-update-material',
        deleteMaterial: 'mock-mutation-delete-material',
        bulkCreateMaterials: 'mock-bulk-create-materials',
        bulkUpdateMaterials: 'mock-bulk-update-materials',
        bulkDeleteMaterials: 'mock-bulk-delete-materials',
      },
      queries: {
        getMaterials: 'mock-query-get-materials',
        getMaterial: 'mock-query-get-material',
        searchMaterials: 'mock-search-materials',
        getMaterialsByIds: 'mock-get-materials-by-ids',
      }
    },
    
    // Organizations functions
    organizations: {
      organizations: {
        getOrganization: 'mock-get-organization',
        getOrganizations: 'mock-get-organizations',
        createOrganization: 'mock-create-organization',
        updateOrganization: 'mock-update-organization',
        deleteOrganization: 'mock-delete-organization',
        getOrganizationMembers: 'mock-get-organization-members',
        inviteMember: 'mock-invite-member',
        removeMember: 'mock-remove-member',
        updateMemberRole: 'mock-update-member-role',
      },
      mutations: {
        createOrganization: 'mock-mutation-create-organization',
        updateOrganization: 'mock-mutation-update-organization',
        updateOrganizationSettings: 'mock-update-organization-settings',
        inviteMember: 'mock-mutation-invite-member',
        removeMember: 'mock-mutation-remove-member',
        updateMemberRole: 'mock-mutation-update-member-role',
      },
      queries: {
        getOrganization: 'mock-query-get-organization',
        getOrganizations: 'mock-query-get-organizations',
        getOrganizationMembers: 'mock-query-get-organization-members',
        getOrganizationStats: 'mock-get-organization-stats',
      }
    },
    
    // Products functions
    products: {
      products: {
        getProducts: 'mock-get-products',
        getProduct: 'mock-get-product',
        createProduct: 'mock-create-product',
        updateProduct: 'mock-update-product',
        deleteProduct: 'mock-delete-product',
        importProducts: 'mock-import-products',
        exportProducts: 'mock-export-products',
      },
      mutations: {
        createProduct: 'mock-mutation-create-product',
        updateProduct: 'mock-mutation-update-product',
        deleteProduct: 'mock-mutation-delete-product',
        bulkCreateProducts: 'mock-bulk-create-products',
        bulkUpdateProducts: 'mock-bulk-update-products',
        bulkDeleteProducts: 'mock-bulk-delete-products',
        updateProductStatus: 'mock-update-product-status',
        addProductToCategory: 'mock-add-product-to-category',
        removeProductFromCategory: 'mock-remove-product-from-category',
      },
      queries: {
        getProducts: 'mock-query-get-products',
        getProduct: 'mock-query-get-product',
        searchProducts: 'mock-search-products',
        getProductsByCategory: 'mock-get-products-by-category',
        getProductsByIds: 'mock-get-products-by-ids',
        getProductStats: 'mock-get-product-stats',
      }
    },
    
    // Projects functions
    projects: {
      projects: {
        getProjects: 'mock-get-projects',
        getProject: 'mock-get-project',
        createProject: 'mock-create-project',
        updateProject: 'mock-update-project',
        deleteProject: 'mock-delete-project',
        archiveProject: 'mock-archive-project',
        unarchiveProject: 'mock-unarchive-project',
      },
      mutations: {
        createProject: 'mock-mutation-create-project',
        updateProject: 'mock-mutation-update-project',
        deleteProject: 'mock-mutation-delete-project',
        updateProjectSettings: 'mock-update-project-settings',
        archiveProject: 'mock-mutation-archive-project',
        unarchiveProject: 'mock-mutation-unarchive-project',
      },
      queries: {
        getProjects: 'mock-query-get-projects',
        getProject: 'mock-query-get-project',
        getProjectStats: 'mock-get-project-stats',
        getProjectMembers: 'mock-get-project-members',
      }
    },
    
    // Users functions
    users: {
      users: {
        getCurrentUser: 'mock-get-current-user',
        getUser: 'mock-get-user',
        updateUser: 'mock-update-user',
        getUserPreferences: 'mock-get-user-preferences',
        updateUserPreferences: 'mock-update-user-preferences',
      },
      mutations: {
        createUser: 'mock-mutation-create-user',
        updateUser: 'mock-mutation-update-user',
        updateUserProfile: 'mock-update-user-profile',
        updateUserPreferences: 'mock-mutation-update-user-preferences',
        deleteUser: 'mock-mutation-delete-user',
      },
      queries: {
        getCurrentUser: 'mock-query-get-current-user',
        getUser: 'mock-query-get-user',
        getUsers: 'mock-query-get-users',
        getUsersByOrganization: 'mock-get-users-by-organization',
        searchUsers: 'mock-search-users',
      }
    },
    
    // Auth functions
    auth: {
      auth: {
        authenticateUser: 'mock-authenticate-user',
        createSession: 'mock-create-session',
        validateSession: 'mock-validate-session',
        revokeSession: 'mock-revoke-session',
      }
    },
    
    // File storage functions
    files: {
      files: {
        generateUploadUrl: 'mock-generate-upload-url',
        getFileUrl: 'mock-get-file-url',
        deleteFile: 'mock-delete-file',
      }
    },
    
    // Search functions
    search: {
      search: {
        searchAll: 'mock-search-all',
        searchProducts: 'mock-search-products',
        searchCategories: 'mock-search-categories',
        searchMaterials: 'mock-search-materials',
      }
    },
    
    // Analytics functions
    analytics: {
      analytics: {
        trackEvent: 'mock-track-event',
        getAnalytics: 'mock-get-analytics',
        getEventsByUser: 'mock-get-events-by-user',
      }
    },
    
    // Notifications functions
    notifications: {
      notifications: {
        getNotifications: 'mock-get-notifications',
        markAsRead: 'mock-mark-as-read',
        markAllAsRead: 'mock-mark-all-as-read',
        deleteNotification: 'mock-delete-notification',
      }
    }
  }
};

// Helper to get a mock function ID by path
export function getMockFunctionId(path: string): string {
  const parts = path.split('.');
  let current: any = mockApi.functions;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return `mock-${path.replace(/\./g, '-')}`;
    }
  }
  
  return typeof current === 'string' ? current : `mock-${path.replace(/\./g, '-')}`;
}

// Export for easy access in tests
export const api = mockApi;