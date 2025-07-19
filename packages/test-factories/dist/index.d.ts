import { faker } from '@faker-js/faker';

type Id<T extends string> = string & {
    __tableName: T;
};
type Doc<T extends string> = {
    _id: Id<T>;
    _creationTime: number;
} & Record<string, any>;

interface FactoryOptions<T> {
    /**
     * Override specific fields in the generated data
     */
    overrides?: Partial<T>;
    /**
     * Use a specific seed for deterministic data generation
     */
    seed?: number;
    /**
     * Generate data in a specific locale
     */
    locale?: string;
}
declare abstract class BaseFactory<T> {
    protected faker: typeof faker;
    constructor(seed?: number);
    /**
     * Generate a single instance
     */
    abstract create(options?: FactoryOptions<T>): T;
    /**
     * Generate multiple instances
     */
    createMany(count: number, options?: FactoryOptions<T>): T[];
    /**
     * Generate instances with specific overrides for each
     */
    createManyWithOverrides(overrides: Array<Partial<T>>): T[];
    /**
     * Apply overrides to generated data
     */
    protected applyOverrides(data: T, overrides?: Partial<T>): T;
    /**
     * Get current timestamp
     */
    protected now(): number;
    /**
     * Get past timestamp
     */
    protected past(days?: number): number;
    /**
     * Get future timestamp
     */
    protected future(days?: number): number;
    /**
     * Generate a random enum value
     */
    protected randomEnum<E>(enumValues: E[]): E;
}

type User = Doc<'users'>;
declare class UserFactory extends BaseFactory<User> {
    private idGenerator;
    create(options?: FactoryOptions<User>): User;
    /**
     * Create an active user
     */
    createActive(options?: FactoryOptions<User>): User;
    /**
     * Create an invited user
     */
    createInvited(options?: FactoryOptions<User>): User;
    /**
     * Create a suspended user
     */
    createSuspended(options?: FactoryOptions<User>): User;
    /**
     * Create a user with a specific email domain
     */
    createWithEmailDomain(domain: string, options?: FactoryOptions<User>): User;
    /**
     * Create a test user with predictable data
     */
    createTest(index?: number): User;
}

type Organization = Doc<'organizations'>;
declare class OrganizationFactory extends BaseFactory<Organization> {
    private idGenerator;
    create(options?: FactoryOptions<Organization>): Organization;
    /**
     * Create a trial organization
     */
    createTrial(options?: FactoryOptions<Organization>): Organization;
    /**
     * Create an enterprise organization
     */
    createEnterprise(options?: FactoryOptions<Organization>): Organization;
    /**
     * Create an active organization
     */
    createActive(options?: FactoryOptions<Organization>): Organization;
    /**
     * Create a suspended organization
     */
    createSuspended(options?: FactoryOptions<Organization>): Organization;
    /**
     * Create a test organization with predictable data
     */
    createTest(index?: number): Organization;
    private generateSlug;
    private generateFeatures;
    private generateAiModel;
}

type Product = Doc<'products'>;
declare class ProductFactory extends BaseFactory<Product> {
    private idGenerator;
    create(options?: FactoryOptions<Product>): Product;
    /**
     * Create a product with specific type (meat products)
     */
    createMeatProduct(options?: FactoryOptions<Product>): Product;
    /**
     * Create a seafood product
     */
    createSeafoodProduct(options?: FactoryOptions<Product>): Product;
    /**
     * Create a draft product
     */
    createDraft(options?: FactoryOptions<Product>): Product;
    /**
     * Create an archived product
     */
    createArchived(options?: FactoryOptions<Product>): Product;
    /**
     * Create a test product with predictable data
     */
    createTest(index?: number): Product;
    private generateProductTitle;
    private generateHandle;
    private generateProductType;
    private generateTags;
    private generateAiSuggestions;
    private generateImages;
    private generateMetadata;
}

type Category = Doc<'categories'>;
declare class CategoryFactory extends BaseFactory<Category> {
    private idGenerator;
    create(options?: FactoryOptions<Category>): Category;
    /**
     * Create a root category (level 0)
     */
    createRoot(options?: FactoryOptions<Category>): Category;
    /**
     * Create a subcategory with parent
     */
    createSubcategory(parentId: Id<'categories'>, parentPath: string, options?: FactoryOptions<Category>): Category;
    /**
     * Create a meat category hierarchy
     */
    createMeatHierarchy(organizationId: Id<'organizations'>, projectId: Id<'projects'>): Category[];
    /**
     * Create a test category with predictable data
     */
    createTest(index?: number): Category;
    private generateCategoryName;
    private generateSubcategoryName;
    private generateHandle;
    private generatePath;
    private generateIcon;
    private generateMetadata;
}

type AiCategorizationJob = Doc<'aiCategorizationJobs'>;
declare class AiCategorizationJobFactory extends BaseFactory<AiCategorizationJob> {
    private idGenerator;
    create(options?: FactoryOptions<AiCategorizationJob>): AiCategorizationJob;
    /**
     * Create a pending job
     */
    createPending(options?: FactoryOptions<AiCategorizationJob>): AiCategorizationJob;
    /**
     * Create a running job
     */
    createRunning(options?: FactoryOptions<AiCategorizationJob>): AiCategorizationJob;
    /**
     * Create a completed job
     */
    createCompleted(options?: FactoryOptions<AiCategorizationJob>): AiCategorizationJob;
    /**
     * Create a failed job
     */
    createFailed(options?: FactoryOptions<AiCategorizationJob>): AiCategorizationJob;
    /**
     * Create a test job with predictable data
     */
    createTest(index?: number): AiCategorizationJob;
    private generateProgress;
    private generateModel;
    private generateProductIds;
    private generateResults;
    private generateErrors;
    private generateCost;
}

/**
 * Generate a mock Convex ID for testing
 * Convex IDs are base64url encoded strings with a specific format
 */
declare function createMockId<T extends string>(table: T): Id<T>;
/**
 * Create a deterministic mock ID for consistent testing
 */
declare function createMockIdFromString<T extends string>(table: T, seed: string): Id<T>;
/**
 * Generate multiple mock IDs
 */
declare function createMockIds<T extends string>(table: T, count: number): Id<T>[];
/**
 * Create a mock ID generator with incrementing counter
 */
declare function createIdGenerator<T extends string>(table: T): {
    next(): Id<T>;
    reset(): void;
};

declare const userFactory: UserFactory;
declare const organizationFactory: OrganizationFactory;
declare const productFactory: ProductFactory;
declare const categoryFactory: CategoryFactory;
declare const aiCategorizationJobFactory: AiCategorizationJobFactory;
interface TestScenario {
    organization: ReturnType<OrganizationFactory['create']>;
    users: ReturnType<UserFactory['create']>[];
    categories: ReturnType<CategoryFactory['create']>[];
    products: ReturnType<ProductFactory['create']>[];
    aiJob?: ReturnType<AiCategorizationJobFactory['create']>;
}
declare function createTestScenario(options?: {
    userCount?: number;
    categoryCount?: number;
    productCount?: number;
    includeAiJob?: boolean;
    seed?: number;
}): TestScenario;
declare function resetAllFactories(): void;
declare function createTestUser(overrides?: Partial<ReturnType<UserFactory['create']>>): {
    _id: Id<"users">;
    _creationTime: number;
} & Record<string, any>;
declare function createTestOrganization(overrides?: Partial<ReturnType<OrganizationFactory['create']>>): {
    _id: Id<"organizations">;
    _creationTime: number;
} & Record<string, any>;
declare function createTestProduct(overrides?: Partial<ReturnType<ProductFactory['create']>>): {
    _id: Id<"products">;
    _creationTime: number;
} & Record<string, any>;
declare function createTestCategory(overrides?: Partial<ReturnType<CategoryFactory['create']>>): {
    _id: Id<"categories">;
    _creationTime: number;
} & Record<string, any>;
declare function createTestAiJob(overrides?: Partial<ReturnType<AiCategorizationJobFactory['create']>>): {
    _id: Id<"aiCategorizationJobs">;
    _creationTime: number;
} & Record<string, any>;

export { AiCategorizationJobFactory, BaseFactory, CategoryFactory, type Doc, type FactoryOptions, type Id, OrganizationFactory, ProductFactory, type TestScenario, UserFactory, aiCategorizationJobFactory, categoryFactory, createIdGenerator, createMockId, createMockIdFromString, createMockIds, createTestAiJob, createTestCategory, createTestOrganization, createTestProduct, createTestScenario, createTestUser, organizationFactory, productFactory, resetAllFactories, userFactory };
