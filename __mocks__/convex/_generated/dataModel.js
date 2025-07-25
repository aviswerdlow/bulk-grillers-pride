// Mock for Convex generated dataModel types
const Id = (tableName) => `${tableName}_mockId`;

// Type helpers
const Doc = (tableName) => ({});

// Mock table names
const TableNames = {
  users: 'users',
  organizations: 'organizations',
  organizationMemberships: 'organizationMemberships',
  projects: 'projects',
  products: 'products',
  productVariants: 'productVariants',
  categories: 'categories',
  categoryLevelDefinitions: 'categoryLevelDefinitions',
  categoryProductAssignments: 'categoryProductAssignments',
  importJobs: 'importJobs',
  aiCategorizationJobs: 'aiCategorizationJobs',
  auditLogs: 'auditLogs',
  userSessions: 'userSessions',
};

module.exports = {
  Id,
  Doc,
  TableNames,
};