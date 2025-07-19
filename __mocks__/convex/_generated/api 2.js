// Mock for Convex generated API
export const api = {
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
      },
    },
    organizations: {
      getUserOrganizations: 'organizations.getUserOrganizations',
    },
    products: {
      products: {
        list: 'products.products.list',
        create: 'products.products.create',
        update: 'products.products.update',
        delete: 'products.products.delete',
      },
    },
  },
};
