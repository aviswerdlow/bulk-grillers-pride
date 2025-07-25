import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';
import {
  storeHandler,
  currentHandler,
  ensureUserHandler,
  currentWithOrganizationsHandler,
  getUserByIdHandler,
  getOrganizationUsersHandler,
  searchUsersHandler,
} from './users.handlers';

// Create or update user when they access the application
// This is called on-demand rather than via webhook
export const store = mutation({
  args: {},
  handler: storeHandler,
});

// Get current authenticated user
export const current = query({
  args: {},
  handler: currentHandler,
});

// Initialize user on first sign-in
// This ensures the user record is created if it doesn't exist
export const ensureUser = mutation({
  args: {},
  handler: ensureUserHandler,
});

// Get current user with organization memberships
export const currentWithOrganizations = query({
  args: {},
  handler: currentWithOrganizationsHandler,
});

// Get user by ID
export const getUserById = query({
  args: { userId: v.id('users') },
  handler: getUserByIdHandler,
});

// Get users in an organization
export const getOrganizationUsers = query({
  args: {
    organizationId: v.id('organizations'),
    includeInvited: v.optional(v.boolean()),
  },
  handler: getOrganizationUsersHandler,
});

// Search users by email or name
export const searchUsers = query({
  args: {
    query: v.string(),
    organizationId: v.optional(v.id('organizations')),
  },
  handler: searchUsersHandler,
});