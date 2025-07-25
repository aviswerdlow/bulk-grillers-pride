import { describe, it, expect, beforeEach } from '@jest/globals';
import { t } from '../../../test.setup';
import { api } from '../../../_generated/api';
import { Id } from '../../../_generated/dataModel';
import { createOrganization, getOrganizationBySlug } from '../organizations';

describe('Organizations Functions', () => {
  
  beforeEach(() => {
    // t is already imported from test.setup
  });

  describe('create', () => {
    it('should create organization with valid user', async () => {
      // Arrange
      const userId = 'user123' as Id<'users'>;
      const mockUser = {
        _id: userId,
        _creationTime: Date.now(),
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        role: 'admin' as const,
      };

      t.db.insert('users', mockUser);

      const args = {
        name: 'Test Organization',
        slug: 'test-org',
      };

      // Act
      const result = await t.runMutation('organizations.create', {
        ...args,
        userId,
      });

      // Assert
      expect(result).toMatchObject({
        _id: expect.any(String),
        name: 'Test Organization',
        slug: 'test-org',
        owner: userId,
        ownerId: userId,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
        isPersonal: false,
        subscriptionStatus: 'active',
        subscriptionPlan: 'free',
        enforceUniqueSku: false,
      });

      // Verify membership was created
      const memberships = await t.db
        .query('organizationMembers')
        .filter(m => m.eq(m.field('organizationId'), result._id))
        .collect();
      
      expect(memberships).toHaveLength(1);
      expect(memberships[0]).toMatchObject({
        userId,
        organizationId: result._id,
        role: 'owner',
      });
    });

    it('should reject creation with invalid slug', async () => {
      const userId = 'user123' as Id<'users'>;
      t.db.insert('users', {
        _id: userId,
        _creationTime: Date.now(),
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        role: 'admin' as const,
      });

      await expect(
        t.runMutation('organizations.create', {
          name: 'Test Organization',
          slug: 'invalid slug!', // Invalid slug with space and special char
          userId,
        })
      ).rejects.toThrow('Organization slug can only contain');
    });

    it('should reject duplicate slug', async () => {
      const userId = 'user123' as Id<'users'>;
      const existingOrgId = 'org123' as Id<'organizations'>;
      
      t.db.insert('users', {
        _id: userId,
        _creationTime: Date.now(),
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        role: 'admin' as const,
      });

      t.db.insert('organizations', {
        _id: existingOrgId,
        _creationTime: Date.now(),
        name: 'Existing Org',
        slug: 'test-org',
        owner: userId,
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPersonal: false,
        subscriptionStatus: 'active',
        subscriptionPlan: 'free',
        enforceUniqueSku: false,
      });

      await expect(
        t.runMutation('organizations.create', {
          name: 'Another Organization',
          slug: 'test-org', // Duplicate slug
          userId,
        })
      ).rejects.toThrow('Organization with slug "test-org" already exists');
    });

    it('should reject creation for non-existent user', async () => {
      await expect(
        t.runMutation('organizations.create', {
          name: 'Test Organization',
          slug: 'test-org',
          userId: 'nonexistent' as Id<'users'>,
        })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    let userId: Id<'users'>;
    let orgId: Id<'organizations'>;

    beforeEach(() => {
      userId = 'user123' as Id<'users'>;
      orgId = 'org123' as Id<'organizations'>;

      t.db.insert('users', {
        _id: userId,
        _creationTime: Date.now(),
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        role: 'admin' as const,
      });

      t.db.insert('organizations', {
        _id: orgId,
        _creationTime: Date.now(),
        name: 'Original Org',
        slug: 'original-org',
        owner: userId,
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPersonal: false,
        subscriptionStatus: 'active',
        subscriptionPlan: 'free',
        enforceUniqueSku: false,
      });

      t.db.insert('organizationMembers', {
        _id: 'member123' as Id<'organizationMembers'>,
        _creationTime: Date.now(),
        userId,
        organizationId: orgId,
        role: 'owner',
        joinedAt: Date.now(),
      });
    });

    it('should update organization name', async () => {
      const result = await t.runMutation('organizations.update', {
        id: orgId,
        name: 'Updated Organization',
        userId,
      });

      expect(result).toMatchObject({
        _id: orgId,
        name: 'Updated Organization',
        updatedAt: expect.any(Number),
      });
    });

    it('should update multiple fields', async () => {
      const result = await t.runMutation('organizations.update', {
        id: orgId,
        name: 'Updated Organization',
        description: 'New description',
        website: 'https://example.com',
        enforceUniqueSku: true,
        userId,
      });

      expect(result).toMatchObject({
        name: 'Updated Organization',
        description: 'New description',
        website: 'https://example.com',
        enforceUniqueSku: true,
      });
    });

    it('should reject update from non-owner', async () => {
      const otherUserId = 'user456' as Id<'users'>;
      t.db.insert('users', {
        _id: otherUserId,
        _creationTime: Date.now(),
        email: 'other@example.com',
        emailVerified: true,
        displayName: 'Other User',
        role: 'user' as const,
      });

      t.db.insert('organizationMembers', {
        _id: 'member456' as Id<'organizationMembers'>,
        _creationTime: Date.now(),
        userId: otherUserId,
        organizationId: orgId,
        role: 'member',
        joinedAt: Date.now(),
      });

      await expect(
        t.runMutation('organizations.update', {
          id: orgId,
          name: 'Unauthorized Update',
          userId: otherUserId,
        })
      ).rejects.toThrow('permission');
    });
  });

  describe('addMember', () => {
    let ownerId: Id<'users'>;
    let newUserId: Id<'users'>;
    let orgId: Id<'organizations'>;

    beforeEach(() => {
      ownerId = 'owner123' as Id<'users'>;
      newUserId = 'newuser123' as Id<'users'>;
      orgId = 'org123' as Id<'organizations'>;

      // Create owner
      t.db.insert('users', {
        _id: ownerId,
        _creationTime: Date.now(),
        email: 'owner@example.com',
        emailVerified: true,
        displayName: 'Owner User',
        role: 'admin' as const,
      });

      // Create new user
      t.db.insert('users', {
        _id: newUserId,
        _creationTime: Date.now(),
        email: 'newuser@example.com',
        emailVerified: true,
        displayName: 'New User',
        role: 'user' as const,
      });

      // Create organization
      t.db.insert('organizations', {
        _id: orgId,
        _creationTime: Date.now(),
        name: 'Test Organization',
        slug: 'test-org',
        owner: ownerId,
        ownerId: ownerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPersonal: false,
        subscriptionStatus: 'active',
        subscriptionPlan: 'free',
        enforceUniqueSku: false,
      });

      // Add owner as member
      t.db.insert('organizationMembers', {
        _id: 'member123' as Id<'organizationMembers'>,
        _creationTime: Date.now(),
        userId: ownerId,
        organizationId: orgId,
        role: 'owner',
        joinedAt: Date.now(),
      });
    });

    it('should add new member with specified role', async () => {
      const result = await t.runMutation('organizations.addMember', {
        organizationId: orgId,
        email: 'newuser@example.com',
        role: 'admin',
        userId: ownerId,
      });

      expect(result).toMatchObject({
        userId: newUserId,
        organizationId: orgId,
        role: 'admin',
      });

      // Verify membership was created
      const membership = await t.db
        .query('organizationMembers')
        .filter(m => 
          m.and(
            m.eq(m.field('userId'), newUserId),
            m.eq(m.field('organizationId'), orgId)
          )
        )
        .unique();

      expect(membership).toMatchObject({
        userId: newUserId,
        organizationId: orgId,
        role: 'admin',
      });
    });

    it('should reject adding existing member', async () => {
      // First add the member
      await t.runMutation('organizations.addMember', {
        organizationId: orgId,
        email: 'newuser@example.com',
        role: 'member',
        userId: ownerId,
      });

      // Try to add again
      await expect(
        t.runMutation('organizations.addMember', {
          organizationId: orgId,
          email: 'newuser@example.com',
          role: 'admin',
          userId: ownerId,
        })
      ).rejects.toThrow('already a member');
    });

    it('should reject non-owner adding members', async () => {
      const regularUserId = 'regular123' as Id<'users'>;
      t.db.insert('users', {
        _id: regularUserId,
        _creationTime: Date.now(),
        email: 'regular@example.com',
        emailVerified: true,
        displayName: 'Regular User',
        role: 'user' as const,
      });

      t.db.insert('organizationMembers', {
        _id: 'member456' as Id<'organizationMembers'>,
        _creationTime: Date.now(),
        userId: regularUserId,
        organizationId: orgId,
        role: 'member',
        joinedAt: Date.now(),
      });

      await expect(
        t.runMutation('organizations.addMember', {
          organizationId: orgId,
          email: 'newuser@example.com',
          role: 'member',
          userId: regularUserId,
        })
      ).rejects.toThrow('permission');
    });

    it('should reject adding non-existent user', async () => {
      await expect(
        t.runMutation('organizations.addMember', {
          organizationId: orgId,
          email: 'nonexistent@example.com',
          role: 'member',
          userId: ownerId,
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('getUserOrganizations', () => {
    it('should return all organizations for a user', async () => {
      const userId = 'user123' as Id<'users'>;
      
      // Create user
      t.db.insert('users', {
        _id: userId,
        _creationTime: Date.now(),
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        role: 'admin' as const,
      });

      // Create multiple organizations
      const org1Id = 'org1' as Id<'organizations'>;
      const org2Id = 'org2' as Id<'organizations'>;
      
      t.db.insert('organizations', {
        _id: org1Id,
        _creationTime: Date.now(),
        name: 'Org 1',
        slug: 'org-1',
        owner: userId,
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPersonal: false,
        subscriptionStatus: 'active',
        subscriptionPlan: 'free',
        enforceUniqueSku: false,
      });

      t.db.insert('organizations', {
        _id: org2Id,
        _creationTime: Date.now(),
        name: 'Org 2',
        slug: 'org-2',
        owner: 'other' as Id<'users'>,
        ownerId: 'other' as Id<'users'>,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPersonal: false,
        subscriptionStatus: 'active',
        subscriptionPlan: 'pro',
        enforceUniqueSku: true,
      });

      // Add memberships
      t.db.insert('organizationMembers', {
        _id: 'member1' as Id<'organizationMembers'>,
        _creationTime: Date.now(),
        userId,
        organizationId: org1Id,
        role: 'owner',
        joinedAt: Date.now(),
      });

      t.db.insert('organizationMembers', {
        _id: 'member2' as Id<'organizationMembers'>,
        _creationTime: Date.now(),
        userId,
        organizationId: org2Id,
        role: 'admin',
        joinedAt: Date.now(),
      });

      // Act
      const result = await t.runQuery('organizations.getUserOrganizations', {
        userId,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(
        expect.objectContaining({
          _id: org1Id,
          name: 'Org 1',
          slug: 'org-1',
          role: 'owner',
        })
      );
      expect(result).toContainEqual(
        expect.objectContaining({
          _id: org2Id,
          name: 'Org 2',
          slug: 'org-2',
          role: 'admin',
        })
      );
    });

    it('should return empty array for user with no organizations', async () => {
      const userId = 'user123' as Id<'users'>;
      
      t.db.insert('users', {
        _id: userId,
        _creationTime: Date.now(),
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        role: 'user' as const,
      });

      const result = await t.runQuery('organizations.getUserOrganizations', {
        userId,
      });

      expect(result).toEqual([]);
    });
  });
});