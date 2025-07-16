export const api = {
  functions: {
    auth: {
      users: {
        current: 'mock-current',
        currentWithOrganizations: 'mock-currentWithOrganizations',
        getOrganizationUsers: 'mock-getOrganizationUsers',
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
    },
    organizations: {
      organizations: {
        getOrganizationBySlug: 'mock-getOrganizationBySlug',
      },
    },
  },
};
