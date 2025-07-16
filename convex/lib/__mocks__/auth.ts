import { jest } from '@jest/globals';

export const authenticateAndAuthorize = jest.fn();
export const requireRole = jest.fn();
export const authenticateUser = jest.fn();
export const hasPermission = jest.fn();

export const ROLE_HIERARCHY = {
  owner: ['owner', 'admin', 'editor', 'viewer'],
  admin: ['admin', 'editor', 'viewer'],
  editor: ['editor', 'viewer'],
  viewer: ['viewer'],
} as const;

export const roleHasAccess = jest.fn();
