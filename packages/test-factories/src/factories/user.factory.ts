import { BaseFactory, FactoryOptions } from '../utils/factory';
import { createMockId, createIdGenerator } from '../utils/ids';
import type { Doc, Id } from '../types';

type User = Doc<'users'>;
type UserInput = Omit<User, '_id' | '_creationTime'>;

export class UserFactory extends BaseFactory<User> {
  private idGenerator = createIdGenerator('users');
  
  create(options?: FactoryOptions<User>): User {
    const now = this.now();
    const pastDate = this.past(90); // Last 90 days
    
    const user: User = {
      _id: options?.overrides?._id || this.idGenerator.next(),
      _creationTime: options?.overrides?._creationTime || pastDate,
      clerkId: this.faker.string.alphanumeric(24),
      email: this.faker.internet.email().toLowerCase(),
      firstName: this.faker.person.firstName(),
      lastName: this.faker.person.lastName(),
      avatar: this.faker.helpers.maybe(() => this.faker.image.avatarGitHub(), { probability: 0.7 }),
      status: this.randomEnum(['active', 'invited', 'suspended'] as const),
      lastLogin: this.faker.helpers.maybe(() => this.faker.date.recent({ days: 7 }).getTime(), { probability: 0.8 }),
      createdAt: pastDate,
      updatedAt: this.faker.date.between({ from: pastDate, to: now }).getTime(),
    };
    
    return this.applyOverrides(user, options?.overrides);
  }
  
  /**
   * Create an active user
   */
  createActive(options?: FactoryOptions<User>): User {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'active',
        lastLogin: this.faker.date.recent({ days: 1 }).getTime(),
      }
    });
  }
  
  /**
   * Create an invited user
   */
  createInvited(options?: FactoryOptions<User>): User {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'invited',
        lastLogin: undefined,
      }
    });
  }
  
  /**
   * Create a suspended user
   */
  createSuspended(options?: FactoryOptions<User>): User {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'suspended',
      }
    });
  }
  
  /**
   * Create a user with a specific email domain
   */
  createWithEmailDomain(domain: string, options?: FactoryOptions<User>): User {
    const firstName = this.faker.person.firstName();
    const lastName = this.faker.person.lastName();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`.replace(/[^a-z0-9@.-]/g, '');
    
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        email,
        firstName,
        lastName,
      }
    });
  }
  
  /**
   * Create a test user with predictable data
   */
  createTest(index: number = 1): User {
    return this.create({
      overrides: {
        _id: createMockId('users'),
        email: `test${index}@example.com`,
        firstName: `Test`,
        lastName: `User${index}`,
        clerkId: `test_clerk_id_${index}`,
        status: 'active',
      }
    });
  }
}