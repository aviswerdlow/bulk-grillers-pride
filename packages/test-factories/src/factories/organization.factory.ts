import { BaseFactory, FactoryOptions } from '../utils/factory';
import { createMockId, createIdGenerator } from '../utils/ids';
import type { Doc, Id } from '../types';

type Organization = Doc<'organizations'>;

export class OrganizationFactory extends BaseFactory<Organization> {
  private idGenerator = createIdGenerator('organizations');
  
  create(options?: FactoryOptions<Organization>): Organization {
    const now = this.now();
    const pastDate = this.past(180); // Last 180 days
    const companyName = this.faker.company.name();
    const slug = this.generateSlug(companyName);
    
    const organization: Organization = {
      _id: options?.overrides?._id || this.idGenerator.next(),
      _creationTime: options?.overrides?._creationTime || pastDate,
      name: companyName,
      slug,
      domain: this.faker.helpers.maybe(() => this.faker.internet.domainName(), { probability: 0.3 }),
      status: this.randomEnum(['active', 'suspended', 'trial'] as const),
      subscription: {
        plan: this.randomEnum(['free', 'starter', 'pro', 'enterprise']),
        status: this.randomEnum(['active', 'trialing', 'past_due', 'canceled']),
        trialEnds: this.faker.helpers.maybe(() => this.future(14).valueOf(), { probability: 0.3 }),
        seats: this.faker.number.int({ min: 1, max: 50 }),
        features: this.generateFeatures(),
      },
      settings: {
        aiProvider: this.randomEnum(['openai', 'anthropic', 'gemini'] as const),
        aiModel: this.generateAiModel(),
        apiKeys: {
          openai: this.faker.helpers.maybe(() => `sk-${this.faker.string.alphanumeric(48)}`, { probability: 0.5 }),
          anthropic: this.faker.helpers.maybe(() => `sk-ant-${this.faker.string.alphanumeric(48)}`, { probability: 0.3 }),
          gemini: this.faker.helpers.maybe(() => `AIza${this.faker.string.alphanumeric(35)}`, { probability: 0.2 }),
        },
        categorization: {
          batchSize: this.faker.number.int({ min: 10, max: 100 }),
          prompt: 'Categorize this product based on its title, description, and type.',
          autoApprove: this.faker.datatype.boolean(),
          confidenceThreshold: this.faker.number.float({ min: 0.5, max: 0.95, multipleOf: 0.05 }),
        },
        storage: {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          totalStorageLimit: 1024 * 1024 * 1024, // 1GB
          allowedFileTypes: ['.csv', '.xlsx', '.json', '.jpg', '.png', '.webp'],
        },
        schemaVersion: '1.0.0',
      },
      createdAt: pastDate,
      updatedAt: this.faker.date.between({ from: pastDate, to: now }).getTime(),
      version: this.faker.number.int({ min: 1, max: 10 }),
    };
    
    return this.applyOverrides(organization, options?.overrides);
  }
  
  /**
   * Create a trial organization
   */
  createTrial(options?: FactoryOptions<Organization>): Organization {
    const trialEnds = this.future(14);
    
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'trial',
        subscription: {
          plan: 'pro',
          status: 'trialing',
          trialEnds: trialEnds.valueOf(),
          seats: 5,
          features: ['ai-categorization', 'bulk-import', 'api-access', 'team-collaboration'],
        },
      }
    });
  }
  
  /**
   * Create an enterprise organization
   */
  createEnterprise(options?: FactoryOptions<Organization>): Organization {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'active',
        subscription: {
          plan: 'enterprise',
          status: 'active',
          trialEnds: undefined,
          seats: this.faker.number.int({ min: 50, max: 500 }),
          features: [
            'ai-categorization',
            'bulk-import',
            'api-access',
            'team-collaboration',
            'custom-branding',
            'sso',
            'audit-logs',
            'dedicated-support',
            'unlimited-projects',
          ],
        },
      }
    });
  }
  
  /**
   * Create an active organization
   */
  createActive(options?: FactoryOptions<Organization>): Organization {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'active',
      }
    });
  }
  
  /**
   * Create a suspended organization
   */
  createSuspended(options?: FactoryOptions<Organization>): Organization {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'suspended',
        subscription: {
          plan: 'pro',
          status: 'past_due',
          trialEnds: undefined,
          seats: 10,
          features: ['ai-categorization', 'bulk-import'],
        },
      }
    });
  }
  
  /**
   * Create a test organization with predictable data
   */
  createTest(index: number = 1): Organization {
    return this.create({
      overrides: {
        _id: createMockId('organizations'),
        name: `Test Organization ${index}`,
        slug: `test-org-${index}`,
        status: 'active',
        subscription: {
          plan: 'pro',
          status: 'active',
          trialEnds: undefined,
          seats: 10,
          features: ['ai-categorization', 'bulk-import', 'api-access'],
        },
      }
    });
  }
  
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }
  
  private generateFeatures(): string[] {
    const allFeatures = [
      'ai-categorization',
      'bulk-import',
      'api-access',
      'team-collaboration',
      'custom-branding',
      'sso',
      'audit-logs',
      'dedicated-support',
      'unlimited-projects',
    ];
    
    const count = this.faker.number.int({ min: 2, max: 5 });
    return this.faker.helpers.arrayElements(allFeatures, count);
  }
  
  private generateAiModel(): string {
    const models = {
      openai: ['gpt-4', 'gpt-3.5-turbo', 'o3-mini'],
      anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-opus-4'],
      gemini: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    };
    
    const provider = this.faker.helpers.objectKey(models);
    return this.faker.helpers.arrayElement(models[provider as keyof typeof models]);
  }
}