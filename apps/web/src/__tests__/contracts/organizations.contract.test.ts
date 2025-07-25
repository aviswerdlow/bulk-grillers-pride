import { api } from '@convex/_generated/api';
import { z } from 'zod';

import {
  ContractTestConfig,
  validateContract,
//   commonSchemas,
  expectResponseShape,
} from './contract-test-utils';
import { 
  organizationFactory,
//   userFactory,
  createMockId,
} from '@bulk-grillers-pride/test-factories';

// Organization schemas
const organizationSchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
  name: z.string(),
  slug: z.string(),
  domain: z.string().optional(),
  status: z.enum(['active', 'suspended', 'trial']),
  subscription: z.object({
    plan: z.string(),
    status: z.string(),
    trialEnds: z.number().optional(),
    seats: z.number(),
    features: z.array(z.string()),
  }),
  settings: z.object({
    aiProvider: z.enum(['openai', 'anthropic', 'gemini']),
    aiModel: z.string(),
    apiKeys: z.object({
      openai: z.string().optional(),
      anthropic: z.string().optional(),
      gemini: z.string().optional(),
    }),
    categorization: z.object({
      batchSize: z.number(),
      prompt: z.string(),
      autoApprove: z.boolean(),
      confidenceThreshold: z.number(),
    }),
    storage: z.object({
      maxFileSize: z.number(),
      totalStorageLimit: z.number(),
      allowedFileTypes: z.array(z.string()),
    }),
    schemaVersion: z.string().optional(),
  }),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number(),
});

const membershipSchema = z.object({
  _id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: z.enum(['owner', 'admin', 'editor', 'viewer']),
  permissions: z.array(z.string()),
  invitedBy: z.string().optional(),
  invitedAt: z.number().optional(),
  joinedAt: z.number().optional(),
  status: z.enum(['active', 'pending', 'revoked']),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const apiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(), // Masked
  lastUsed: z.number().optional(),
  createdAt: z.number(),
  expiresAt: z.number().optional(),
});

// Define contract tests
const organizationContracts: ContractTestConfig[] = [
  // Get Current Organization
  {
    functionRef: (api as any).functions.organizations.organizations.getCurrent,
    name: 'organizations.getCurrent',
    description: 'Get the current user\'s organization',
    inputSchema: z.object({
      organizationId: z.string(),
    }),
    outputSchema: organizationSchema.nullable(),
    validInputs: [
      { organizationId: createMockId('organizations') },
    ],
    invalidInputs: [
      {}, // Missing organizationId
      { organizationId: '' }, // Empty string
    ],
    auth: {
      required: true,
      roles: ['viewer', 'editor', 'admin', 'owner'],
    },
  },
  
  // Update Organization
  {
    functionRef: (api as any).functions.organizations.organizations.update,
    name: 'organizations.update',
    description: 'Update organization settings',
    inputSchema: z.object({
      organizationId: z.string(),
      name: z.string().min(1).max(100).optional(),
      slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).optional(),
      domain: z.string().optional(),
      settings: z.object({
        aiProvider: z.enum(['openai', 'anthropic', 'gemini']).optional(),
        aiModel: z.string().optional(),
        categorization: z.object({
          batchSize: z.number().min(1).max(100).optional(),
          prompt: z.string().optional(),
          autoApprove: z.boolean().optional(),
          confidenceThreshold: z.number().min(0).max(1).optional(),
        }).optional(),
        storage: z.object({
          maxFileSize: z.number().min(1).optional(),
          totalStorageLimit: z.number().min(1).optional(),
          allowedFileTypes: z.array(z.string()).optional(),
        }).optional(),
      }).optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      updated: z.number(),
    }),
    validInputs: [
      {
        organizationId: createMockId('organizations'),
        name: 'Updated Organization Name',
      },
      {
        organizationId: createMockId('organizations'),
        settings: {
          aiProvider: 'openai',
          aiModel: 'gpt-4',
        },
      },
      {
        organizationId: createMockId('organizations'),
        settings: {
          categorization: {
            batchSize: 50,
            autoApprove: true,
            confidenceThreshold: 0.85,
          },
        },
      },
    ],
    invalidInputs: [
      { organizationId: createMockId('organizations'), name: '' }, // Empty name
      { organizationId: createMockId('organizations'), slug: 'Invalid Slug!' }, // Invalid slug
      { 
        organizationId: createMockId('organizations'), 
        settings: { categorization: { confidenceThreshold: 1.5 } }, // Out of range
      },
    ],
    auth: {
      required: true,
      roles: ['admin', 'owner'],
    },
  },
  
  // List Organization Members
  {
    functionRef: (api as any).functions.organizations.organizations.listMembers,
    name: 'organizations.listMembers',
    description: 'List all members of an organization',
    inputSchema: z.object({
      organizationId: z.string(),
      includeInvited: z.boolean().optional(),
      role: z.enum(['owner', 'admin', 'editor', 'viewer']).optional(),
    }),
    outputSchema: z.array(z.object({
      membership: membershipSchema,
      user: z.object({
        _id: z.string(),
        email: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        avatar: z.string().optional(),
        lastLogin: z.number().optional(),
      }),
    })),
    validInputs: [
      { organizationId: createMockId('organizations') },
      { 
        organizationId: createMockId('organizations'),
        includeInvited: true,
      },
      {
        organizationId: createMockId('organizations'),
        role: 'admin',
      },
    ],
    invalidInputs: [
      {}, // Missing organizationId
      { organizationId: createMockId('organizations'), role: 'superadmin' }, // Invalid role
    ],
    auth: {
      required: true,
      roles: ['viewer', 'editor', 'admin', 'owner'],
    },
  },
  
  // Invite Member
  {
    functionRef: (api as any).functions.organizations.organizations.inviteMember,
    name: 'organizations.inviteMember',
    description: 'Invite a new member to the organization',
    inputSchema: z.object({
      organizationId: z.string(),
      email: z.string().email(),
      role: z.enum(['viewer', 'editor', 'admin']),
      permissions: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      membershipId: z.string(),
      message: z.string(),
    }),
    validInputs: [
      {
        organizationId: createMockId('organizations'),
        email: 'newuser@example.com',
        role: 'viewer',
      },
      {
        organizationId: createMockId('organizations'),
        email: 'admin@company.com',
        role: 'admin',
        permissions: ['manage_products', 'manage_categories'],
      },
    ],
    invalidInputs: [
      { 
        organizationId: createMockId('organizations'),
        email: 'invalid-email', // Invalid email
        role: 'viewer',
      },
      {
        organizationId: createMockId('organizations'),
        email: 'user@example.com',
        role: 'owner', // Can't invite as owner
      },
    ],
    auth: {
      required: true,
      roles: ['admin', 'owner'],
    },
  },
  
  // Update Member Role
  {
    functionRef: (api as any).functions.organizations.organizations.updateMemberRole,
    name: 'organizations.updateMemberRole',
    description: 'Update a member\'s role and permissions',
    inputSchema: z.object({
      membershipId: z.string(),
      role: z.enum(['viewer', 'editor', 'admin']).optional(),
      permissions: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      updated: z.number(),
    }),
    validInputs: [
      {
        membershipId: createMockId('organizationMemberships'),
        role: 'admin',
      },
      {
        membershipId: createMockId('organizationMemberships'),
        permissions: ['read', 'write', 'delete'],
      },
    ],
    invalidInputs: [
      {}, // Missing membershipId
      {
        membershipId: createMockId('organizationMemberships'),
        role: 'owner', // Can't change to owner
      },
    ],
    auth: {
      required: true,
      roles: ['admin', 'owner'],
    },
  },
  
  // Remove Member
  {
    functionRef: (api as any).functions.organizations.organizations.removeMember,
    name: 'organizations.removeMember',
    description: 'Remove a member from the organization',
    inputSchema: z.object({
      membershipId: z.string(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
    validInputs: [
      { membershipId: createMockId('organizationMemberships') },
    ],
    invalidInputs: [
      {}, // Missing membershipId
      { membershipId: '' }, // Empty string
    ],
    auth: {
      required: true,
      roles: ['admin', 'owner'],
    },
  },
  
  // API Key Management
  {
    functionRef: (api as any).functions.organizations.apiKeys.getMaskedApiKeys,
    name: 'organizations.apiKeys.getMaskedApiKeys',
    description: 'Get masked API keys for the organization',
    inputSchema: z.object({
      organizationId: z.string(),
    }),
    outputSchema: z.array(apiKeySchema),
    validInputs: [
      { organizationId: createMockId('organizations') },
    ],
    invalidInputs: [
      {}, // Missing organizationId
    ],
    auth: {
      required: true,
      roles: ['admin', 'owner'],
    },
  },
  
  {
    functionRef: (api as any).functions.organizations.apiKeys.updateApiKeys,
    name: 'organizations.apiKeys.updateApiKeys',
    description: 'Update organization API keys',
    inputSchema: z.object({
      organizationId: z.string(),
      provider: z.enum(['openai', 'anthropic', 'gemini']),
      apiKey: z.string().min(1),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
    validInputs: [
      {
        organizationId: createMockId('organizations'),
        provider: 'openai',
        apiKey: 'sk-1234567890abcdef',
      },
      {
        organizationId: createMockId('organizations'),
        provider: 'anthropic',
        apiKey: 'sk-ant-1234567890',
      },
    ],
    invalidInputs: [
      {
        organizationId: createMockId('organizations'),
        provider: 'invalid', // Invalid provider
        apiKey: 'key',
      },
      {
        organizationId: createMockId('organizations'),
        provider: 'openai',
        apiKey: '', // Empty key
      },
    ],
    auth: {
      required: true,
      roles: ['admin', 'owner'],
    },
  },
];

describe('Organization API Contracts', () => {
  describe('Schema Validation', () => {
    organizationContracts.forEach(contract => {
      describe(contract.name, () => {
        it('should validate contract configuration', () => {
          const result = validateContract(contract);
          
          if (result.errors.length > 0) {
            console.error(`Errors in ${contract.name}:`, result.errors);
          }
          
          if (result.warnings.length > 0) {
            console.warn(`Warnings in ${contract.name}:`, result.warnings);
          }
          
          expect(result.passed).toBe(true);
        });
        
        it('should have proper authentication requirements', () => {
          expect(contract.auth).toBeDefined();
          expect(contract.auth?.required).toBe(true);
          expect(contract.auth?.roles).toBeDefined();
          expect(contract.auth?.roles!.length).toBeGreaterThan(0);
        });
      });
    });
  });
  
  describe('Response Shape Tests', () => {
    it('should validate organization response shape', () => {
      const mockOrg = organizationFactory.create();
      expectResponseShape(mockOrg, organizationSchema);
    });
    
    it('should validate membership response shape', () => {
      const mockMembership = {
        _id: createMockId('organizationMemberships'),
        organizationId: createMockId('organizations'),
        userId: createMockId('users'),
        role: 'admin' as const,
        permissions: ['read', 'write'],
        status: 'active' as const,
        joinedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expectResponseShape(mockMembership, membershipSchema);
    });
  });
  
  describe('Role Hierarchy Tests', () => {
    it('should not allow inviting as owner', () => {
      const inviteContract = organizationContracts.find(c => c.name === 'organizations.inviteMember');
      expect(inviteContract).toBeDefined();
      
      const invalidInput = {
        organizationId: createMockId('organizations'),
        email: 'user@example.com',
        role: 'owner' as unknown,
      };
      
      const result = inviteContract!.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
    
    it('should not allow changing role to owner', () => {
      const updateContract = organizationContracts.find(c => c.name === 'organizations.updateMemberRole');
      expect(updateContract).toBeDefined();
      
      const invalidInput = {
        membershipId: createMockId('organizationMemberships'),
        role: 'owner' as unknown,
      };
      
      const result = updateContract!.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
  
  describe('Settings Validation', () => {
    it('should validate AI settings', () => {
      const updateContract = organizationContracts.find(c => c.name === 'organizations.update');
      expect(updateContract).toBeDefined();
      
      const validProviders = ['openai', 'anthropic', 'gemini'];
      validProviders.forEach(provider => {
        const input = {
          organizationId: createMockId('organizations'),
          settings: {
            aiProvider: provider as unknown,
          },
        };
        
        const result = updateContract!.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
    
    it('should validate confidence threshold range', () => {
      const updateContract = organizationContracts.find(c => c.name === 'organizations.update');
      expect(updateContract).toBeDefined();
      
      const validThresholds = [0, 0.5, 0.85, 1];
      validThresholds.forEach(threshold => {
        const input = {
          organizationId: createMockId('organizations'),
          settings: {
            categorization: {
              confidenceThreshold: threshold,
            },
          },
        };
        
        const result = updateContract!.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
      
      const invalidThresholds = [-0.1, 1.1, 2];
      invalidThresholds.forEach(threshold => {
        const input = {
          organizationId: createMockId('organizations'),
          settings: {
            categorization: {
              confidenceThreshold: threshold,
            },
          },
        };
        
        const result = updateContract!.inputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });
});