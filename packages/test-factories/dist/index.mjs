// src/utils/factory.ts
import { faker } from "@faker-js/faker";
var BaseFactory = class {
  faker;
  constructor(seed) {
    this.faker = faker;
    if (seed !== void 0) {
      this.faker.seed(seed);
    }
  }
  /**
   * Generate multiple instances
   */
  createMany(count, options) {
    return Array.from({ length: count }, () => this.create(options));
  }
  /**
   * Generate instances with specific overrides for each
   */
  createManyWithOverrides(overrides) {
    return overrides.map((override) => this.create({ overrides: override }));
  }
  /**
   * Apply overrides to generated data
   */
  applyOverrides(data, overrides) {
    return overrides ? { ...data, ...overrides } : data;
  }
  /**
   * Get current timestamp
   */
  now() {
    return Date.now();
  }
  /**
   * Get past timestamp
   */
  past(days = 30) {
    return this.faker.date.past({ years: days / 365 }).getTime();
  }
  /**
   * Get future timestamp
   */
  future(days = 30) {
    return this.faker.date.future({ years: days / 365 }).getTime();
  }
  /**
   * Generate a random enum value
   */
  randomEnum(enumValues) {
    return this.faker.helpers.arrayElement(enumValues);
  }
};

// src/utils/ids.ts
function createMockId(table) {
  const buffer = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  const base64 = buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return base64;
}
function createMockIdFromString(table, seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const hashStr = Math.abs(hash).toString(36);
  const paddedStr = hashStr.padEnd(22, "0");
  return paddedStr.slice(0, 22);
}
function createMockIds(table, count) {
  return Array.from({ length: count }, () => createMockId(table));
}
function createIdGenerator(table) {
  let counter = 1;
  return {
    next() {
      return createMockIdFromString(table, `${table}_${counter++}`);
    },
    reset() {
      counter = 1;
    }
  };
}

// src/factories/user.factory.ts
var UserFactory = class extends BaseFactory {
  idGenerator = createIdGenerator("users");
  create(options) {
    const now = this.now();
    const pastDate = this.past(90);
    const user = {
      _id: options?.overrides?._id || this.idGenerator.next(),
      _creationTime: options?.overrides?._creationTime || pastDate,
      clerkId: this.faker.string.alphanumeric(24),
      email: this.faker.internet.email().toLowerCase(),
      firstName: this.faker.person.firstName(),
      lastName: this.faker.person.lastName(),
      avatar: this.faker.helpers.maybe(() => this.faker.image.avatarGitHub(), { probability: 0.7 }),
      status: this.randomEnum(["active", "invited", "suspended"]),
      lastLogin: this.faker.helpers.maybe(() => this.faker.date.recent({ days: 7 }).getTime(), { probability: 0.8 }),
      createdAt: pastDate,
      updatedAt: this.faker.date.between({ from: pastDate, to: now }).getTime()
    };
    return this.applyOverrides(user, options?.overrides);
  }
  /**
   * Create an active user
   */
  createActive(options) {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "active",
        lastLogin: this.faker.date.recent({ days: 1 }).getTime()
      }
    });
  }
  /**
   * Create an invited user
   */
  createInvited(options) {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "invited",
        lastLogin: void 0
      }
    });
  }
  /**
   * Create a suspended user
   */
  createSuspended(options) {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "suspended"
      }
    });
  }
  /**
   * Create a user with a specific email domain
   */
  createWithEmailDomain(domain, options) {
    const firstName = this.faker.person.firstName();
    const lastName = this.faker.person.lastName();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`.replace(/[^a-z0-9@.-]/g, "");
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        email,
        firstName,
        lastName
      }
    });
  }
  /**
   * Create a test user with predictable data
   */
  createTest(index = 1) {
    return this.create({
      overrides: {
        _id: createMockId("users"),
        email: `test${index}@example.com`,
        firstName: `Test`,
        lastName: `User${index}`,
        clerkId: `test_clerk_id_${index}`,
        status: "active"
      }
    });
  }
};

// src/factories/organization.factory.ts
var OrganizationFactory = class extends BaseFactory {
  idGenerator = createIdGenerator("organizations");
  create(options) {
    const now = this.now();
    const pastDate = this.past(180);
    const companyName = this.faker.company.name();
    const slug = this.generateSlug(companyName);
    const organization = {
      _id: options?.overrides?._id || this.idGenerator.next(),
      _creationTime: options?.overrides?._creationTime || pastDate,
      name: companyName,
      slug,
      domain: this.faker.helpers.maybe(() => this.faker.internet.domainName(), { probability: 0.3 }),
      status: this.randomEnum(["active", "suspended", "trial"]),
      subscription: {
        plan: this.randomEnum(["free", "starter", "pro", "enterprise"]),
        status: this.randomEnum(["active", "trialing", "past_due", "canceled"]),
        trialEnds: this.faker.helpers.maybe(() => this.future(14).valueOf(), { probability: 0.3 }),
        seats: this.faker.number.int({ min: 1, max: 50 }),
        features: this.generateFeatures()
      },
      settings: {
        aiProvider: this.randomEnum(["openai", "anthropic", "gemini"]),
        aiModel: this.generateAiModel(),
        apiKeys: {
          openai: this.faker.helpers.maybe(() => `sk-${this.faker.string.alphanumeric(48)}`, { probability: 0.5 }),
          anthropic: this.faker.helpers.maybe(() => `sk-ant-${this.faker.string.alphanumeric(48)}`, { probability: 0.3 }),
          gemini: this.faker.helpers.maybe(() => `AIza${this.faker.string.alphanumeric(35)}`, { probability: 0.2 })
        },
        categorization: {
          batchSize: this.faker.number.int({ min: 10, max: 100 }),
          prompt: "Categorize this product based on its title, description, and type.",
          autoApprove: this.faker.datatype.boolean(),
          confidenceThreshold: this.faker.number.float({ min: 0.5, max: 0.95, multipleOf: 0.05 })
        },
        storage: {
          maxFileSize: 10 * 1024 * 1024,
          // 10MB
          totalStorageLimit: 1024 * 1024 * 1024,
          // 1GB
          allowedFileTypes: [".csv", ".xlsx", ".json", ".jpg", ".png", ".webp"]
        },
        schemaVersion: "1.0.0"
      },
      createdAt: pastDate,
      updatedAt: this.faker.date.between({ from: pastDate, to: now }).getTime(),
      version: this.faker.number.int({ min: 1, max: 10 })
    };
    return this.applyOverrides(organization, options?.overrides);
  }
  /**
   * Create a trial organization
   */
  createTrial(options) {
    const trialEnds = this.future(14);
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "trial",
        subscription: {
          plan: "pro",
          status: "trialing",
          trialEnds: trialEnds.valueOf(),
          seats: 5,
          features: ["ai-categorization", "bulk-import", "api-access", "team-collaboration"]
        }
      }
    });
  }
  /**
   * Create an enterprise organization
   */
  createEnterprise(options) {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "active",
        subscription: {
          plan: "enterprise",
          status: "active",
          trialEnds: void 0,
          seats: this.faker.number.int({ min: 50, max: 500 }),
          features: [
            "ai-categorization",
            "bulk-import",
            "api-access",
            "team-collaboration",
            "custom-branding",
            "sso",
            "audit-logs",
            "dedicated-support",
            "unlimited-projects"
          ]
        }
      }
    });
  }
  /**
   * Create an active organization
   */
  createActive(options) {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "active"
      }
    });
  }
  /**
   * Create a suspended organization
   */
  createSuspended(options) {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "suspended",
        subscription: {
          plan: "pro",
          status: "past_due",
          trialEnds: void 0,
          seats: 10,
          features: ["ai-categorization", "bulk-import"]
        }
      }
    });
  }
  /**
   * Create a test organization with predictable data
   */
  createTest(index = 1) {
    return this.create({
      overrides: {
        _id: createMockId("organizations"),
        name: `Test Organization ${index}`,
        slug: `test-org-${index}`,
        status: "active",
        subscription: {
          plan: "pro",
          status: "active",
          trialEnds: void 0,
          seats: 10,
          features: ["ai-categorization", "bulk-import", "api-access"]
        }
      }
    });
  }
  generateSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 50);
  }
  generateFeatures() {
    const allFeatures = [
      "ai-categorization",
      "bulk-import",
      "api-access",
      "team-collaboration",
      "custom-branding",
      "sso",
      "audit-logs",
      "dedicated-support",
      "unlimited-projects"
    ];
    const count = this.faker.number.int({ min: 2, max: 5 });
    return this.faker.helpers.arrayElements(allFeatures, count);
  }
  generateAiModel() {
    const models = {
      openai: ["gpt-4", "gpt-3.5-turbo", "o3-mini"],
      anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-opus-4"],
      gemini: ["gemini-1.5-pro", "gemini-1.5-flash"]
    };
    const provider = this.faker.helpers.objectKey(models);
    return this.faker.helpers.arrayElement(models[provider]);
  }
};

// src/factories/product.factory.ts
var ProductFactory = class extends BaseFactory {
  idGenerator = createIdGenerator("products");
  create(options) {
    const now = this.now();
    const pastDate = this.past(90);
    const title = this.generateProductTitle();
    const handle = this.generateHandle(title);
    const product = {
      _id: options?.overrides?._id || this.idGenerator.next(),
      _creationTime: options?.overrides?._creationTime || pastDate,
      organizationId: options?.overrides?.organizationId || createMockId("organizations"),
      projectId: options?.overrides?.projectId || createMockId("projects"),
      // Core Product Information
      title,
      description: this.faker.helpers.maybe(() => this.faker.commerce.productDescription(), { probability: 0.8 }),
      vendor: this.faker.helpers.maybe(() => this.faker.company.name(), { probability: 0.7 }),
      productType: this.faker.helpers.maybe(() => this.generateProductType(), { probability: 0.8 }),
      handle,
      status: this.randomEnum(["active", "draft", "archived"]),
      // SEO & Marketing
      seoTitle: this.faker.helpers.maybe(() => `${title} | Buy Online`, { probability: 0.3 }),
      seoDescription: this.faker.helpers.maybe(() => this.faker.lorem.sentence({ min: 10, max: 20 }), { probability: 0.3 }),
      tags: this.generateTags(),
      // Categorization
      categories: [],
      aiCategorization: this.faker.helpers.maybe(() => ({
        suggestions: this.generateAiSuggestions(),
        lastProcessed: this.faker.date.recent({ days: 7 }).getTime(),
        batchId: this.faker.string.uuid()
      }), { probability: 0.4 }),
      // Images
      images: this.generateImages(),
      // Metadata
      metadata: this.generateMetadata(),
      // Versioning & Audit
      version: this.faker.number.int({ min: 1, max: 5 }),
      createdBy: options?.overrides?.createdBy || createMockId("users"),
      createdAt: pastDate,
      updatedAt: this.faker.date.between({ from: pastDate, to: now }).getTime(),
      lastModifiedBy: options?.overrides?.lastModifiedBy || options?.overrides?.createdBy || createMockId("users")
    };
    return this.applyOverrides(product, options?.overrides);
  }
  /**
   * Create a product with specific type (meat products)
   */
  createMeatProduct(options) {
    const meatTypes = ["beef", "pork", "chicken", "lamb", "turkey"];
    const cuts = ["ribeye", "sirloin", "tenderloin", "ground", "chops", "breast", "thigh", "wings"];
    const type = this.faker.helpers.arrayElement(meatTypes);
    const cut = this.faker.helpers.arrayElement(cuts);
    const title = `${this.faker.helpers.arrayElement(["Premium", "Fresh", "Organic"])} ${type} ${cut}`;
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        productType: `meat/${type}`,
        vendor: this.faker.helpers.arrayElement(["Angus Farms", "Green Valley Meats", "Heritage Farms"]),
        tags: [type, cut, "fresh", "protein"]
      }
    });
  }
  /**
   * Create a seafood product
   */
  createSeafoodProduct(options) {
    const seafoodTypes = ["salmon", "tuna", "shrimp", "lobster", "cod", "halibut"];
    const preparations = ["fillet", "steak", "whole", "tail", "cleaned"];
    const type = this.faker.helpers.arrayElement(seafoodTypes);
    const prep = this.faker.helpers.arrayElement(preparations);
    const title = `${this.faker.helpers.arrayElement(["Wild-Caught", "Fresh", "Frozen"])} ${type} ${prep}`;
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        productType: `seafood/${type}`,
        vendor: this.faker.helpers.arrayElement(["Ocean Fresh", "Pacific Catch", "Atlantic Seafood"]),
        tags: [type, "seafood", "sustainable", prep]
      }
    });
  }
  /**
   * Create a draft product
   */
  createDraft(options) {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "draft",
        images: []
        // Draft products often don't have images yet
      }
    });
  }
  /**
   * Create an archived product
   */
  createArchived(options) {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "archived"
      }
    });
  }
  /**
   * Create a test product with predictable data
   */
  createTest(index = 1) {
    return this.create({
      overrides: {
        _id: createMockId("products"),
        title: `Test Product ${index}`,
        handle: `test-product-${index}`,
        status: "active",
        vendor: "Test Vendor",
        productType: "test/product",
        tags: ["test", `product-${index}`]
      }
    });
  }
  generateProductTitle() {
    const adjectives = ["Premium", "Organic", "Fresh", "Deluxe", "Artisan", "Gourmet"];
    const products = this.faker.commerce.product();
    return `${this.faker.helpers.arrayElement(adjectives)} ${products}`;
  }
  generateHandle(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 100);
  }
  generateProductType() {
    const categories = ["meat", "seafood", "produce", "dairy", "bakery", "beverages"];
    const subCategories = ["fresh", "frozen", "organic", "prepared"];
    return `${this.faker.helpers.arrayElement(categories)}/${this.faker.helpers.arrayElement(subCategories)}`;
  }
  generateTags() {
    const possibleTags = [
      "organic",
      "fresh",
      "frozen",
      "premium",
      "local",
      "sustainable",
      "gluten-free",
      "non-gmo",
      "grass-fed",
      "wild-caught",
      "free-range"
    ];
    const count = this.faker.number.int({ min: 1, max: 5 });
    return this.faker.helpers.arrayElements(possibleTags, count);
  }
  generateAiSuggestions() {
    const count = this.faker.number.int({ min: 1, max: 3 });
    return Array.from({ length: count }, () => ({
      categoryId: createMockId("categories"),
      confidence: this.faker.number.float({ min: 0.5, max: 0.99, multipleOf: 0.01 }),
      rationale: this.faker.lorem.sentence(),
      status: this.randomEnum(["pending", "accepted", "rejected"])
    }));
  }
  generateImages() {
    const count = this.faker.number.int({ min: 0, max: 3 });
    return Array.from({ length: count }, (_, i) => ({
      id: this.faker.string.uuid(),
      url: this.faker.image.url(),
      alt: this.faker.helpers.maybe(() => this.faker.lorem.words(3)),
      position: i,
      storageId: this.faker.string.alphanumeric(24)
    }));
  }
  generateMetadata() {
    return {
      customField1: this.faker.helpers.maybe(() => this.faker.lorem.word()),
      customField2: this.faker.helpers.maybe(() => this.faker.number.int({ min: 1, max: 100 })),
      source: this.faker.helpers.arrayElement(["manual", "import", "api"])
    };
  }
};

// src/factories/category.factory.ts
var CategoryFactory = class extends BaseFactory {
  idGenerator = createIdGenerator("categories");
  create(options) {
    const now = this.now();
    const pastDate = this.past(180);
    const name = options?.overrides?.name || this.generateCategoryName();
    const handle = this.generateHandle(name);
    const level = options?.overrides?.level ?? this.faker.number.int({ min: 0, max: 4 });
    const category = {
      _id: options?.overrides?._id || this.idGenerator.next(),
      _creationTime: options?.overrides?._creationTime || pastDate,
      organizationId: options?.overrides?.organizationId || createMockId("organizations"),
      projectId: options?.overrides?.projectId || createMockId("projects"),
      // Category Information
      name,
      description: this.faker.helpers.maybe(() => this.faker.lorem.sentence(), { probability: 0.6 }),
      handle,
      externalId: this.faker.helpers.maybe(() => this.faker.string.alphanumeric(12), { probability: 0.3 }),
      // Hierarchy Management
      parentId: level > 0 ? options?.overrides?.parentId || createMockId("categories") : void 0,
      level,
      path: this.generatePath(name, level),
      sortOrder: this.faker.number.int({ min: 0, max: 100 }),
      // Display Properties
      color: this.faker.helpers.maybe(() => this.faker.color.rgb(), { probability: 0.4 }),
      icon: this.faker.helpers.maybe(() => this.generateIcon(), { probability: 0.5 }),
      image: this.faker.helpers.maybe(() => ({
        url: this.faker.image.url(),
        alt: name,
        storageId: this.faker.string.alphanumeric(24)
      }), { probability: 0.3 }),
      // SEO
      seoTitle: this.faker.helpers.maybe(() => `${name} Products | Shop Now`, { probability: 0.3 }),
      seoDescription: this.faker.helpers.maybe(() => this.faker.lorem.sentence({ min: 10, max: 20 }), { probability: 0.3 }),
      // Status & Visibility
      status: this.randomEnum(["active", "hidden", "archived"]),
      isVisible: this.faker.datatype.boolean({ probability: 0.9 }),
      // Metadata
      metadata: this.generateMetadata(),
      // AI Suggestions
      aiSuggestions: this.faker.helpers.maybe(() => ({
        suggestedBy: this.faker.helpers.arrayElement(["openai-gpt4", "anthropic-claude", "gemini-pro"]),
        rationale: this.faker.lorem.sentence(),
        confidence: this.faker.number.float({ min: 0.6, max: 0.99, multipleOf: 0.01 }),
        approvedBy: this.faker.helpers.maybe(() => createMockId("users"), { probability: 0.5 }),
        approvedAt: this.faker.helpers.maybe(() => this.faker.date.recent({ days: 7 }).getTime(), { probability: 0.5 })
      }), { probability: 0.2 }),
      // Versioning
      version: this.faker.number.int({ min: 1, max: 3 }),
      createdBy: options?.overrides?.createdBy || createMockId("users"),
      createdAt: pastDate,
      updatedAt: this.faker.date.between({ from: pastDate, to: now }).getTime(),
      lastModifiedBy: options?.overrides?.lastModifiedBy || options?.overrides?.createdBy || createMockId("users")
    };
    return this.applyOverrides(category, options?.overrides);
  }
  /**
   * Create a root category (level 0)
   */
  createRoot(options) {
    const rootNames = ["Fresh Foods", "Frozen Foods", "Beverages", "Pantry", "Snacks"];
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        name: options?.overrides?.name || this.faker.helpers.arrayElement(rootNames),
        level: 0,
        parentId: void 0,
        sortOrder: this.faker.number.int({ min: 0, max: 10 })
      }
    });
  }
  /**
   * Create a subcategory with parent
   */
  createSubcategory(parentId, parentPath, options) {
    const level = options?.overrides?.level ?? 1;
    const name = options?.overrides?.name || this.generateSubcategoryName(level);
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        parentId,
        level,
        path: `${parentPath}/${this.generateHandle(name)}`
      }
    });
  }
  /**
   * Create a meat category hierarchy
   */
  createMeatHierarchy(organizationId, projectId) {
    const meatRoot = this.create({
      overrides: {
        organizationId,
        projectId,
        name: "Meat & Seafood",
        level: 0,
        parentId: void 0,
        path: "/meat-seafood",
        status: "active"
      }
    });
    const beef = this.createSubcategory(meatRoot._id, meatRoot.path, {
      overrides: {
        organizationId,
        projectId,
        name: "Beef",
        level: 1
      }
    });
    const steaks = this.createSubcategory(beef._id, beef.path, {
      overrides: {
        organizationId,
        projectId,
        name: "Steaks",
        level: 2
      }
    });
    const groundBeef = this.createSubcategory(beef._id, beef.path, {
      overrides: {
        organizationId,
        projectId,
        name: "Ground Beef",
        level: 2
      }
    });
    return [meatRoot, beef, steaks, groundBeef];
  }
  /**
   * Create a test category with predictable data
   */
  createTest(index = 1) {
    return this.create({
      overrides: {
        _id: createMockId("categories"),
        name: `Test Category ${index}`,
        handle: `test-category-${index}`,
        level: 0,
        path: `/test-category-${index}`,
        status: "active",
        isVisible: true
      }
    });
  }
  generateCategoryName() {
    const categories = [
      "Fresh Produce",
      "Dairy & Eggs",
      "Meat & Seafood",
      "Bakery",
      "Frozen Foods",
      "Beverages",
      "Snacks",
      "Pantry Staples",
      "Health & Wellness",
      "International Foods"
    ];
    return this.faker.helpers.arrayElement(categories);
  }
  generateSubcategoryName(level) {
    const subcategories = {
      1: ["Beef", "Pork", "Chicken", "Seafood", "Vegetables", "Fruits", "Breads", "Pastries"],
      2: ["Steaks", "Ground", "Roasts", "Fillets", "Organic", "Local", "Premium"],
      3: ["Ribeye", "Sirloin", "Tenderloin", "Chuck", "Round"],
      4: ["USDA Prime", "USDA Choice", "Grass-Fed", "Angus"]
    };
    const levelCategories = subcategories[level] || subcategories[1];
    return this.faker.helpers.arrayElement(levelCategories);
  }
  generateHandle(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 100);
  }
  generatePath(name, level) {
    const parts = [this.generateHandle(name)];
    for (let i = 0; i < level; i++) {
      parts.unshift(this.faker.helpers.arrayElement(["fresh", "frozen", "pantry", "beverages"]));
    }
    return "/" + parts.join("/");
  }
  generateIcon() {
    const icons = [
      "shopping-basket",
      "package",
      "beef",
      "fish",
      "carrot",
      "bread",
      "milk",
      "apple",
      "pizza",
      "coffee"
    ];
    return this.faker.helpers.arrayElement(icons);
  }
  generateMetadata() {
    return {
      displayOrder: this.faker.number.int({ min: 1, max: 100 }),
      featured: this.faker.datatype.boolean({ probability: 0.2 }),
      seasonality: this.faker.helpers.maybe(
        () => this.faker.helpers.arrayElement(["spring", "summer", "fall", "winter", "all-season"])
      )
    };
  }
};

// src/factories/ai-categorization-job.factory.ts
var AiCategorizationJobFactory = class extends BaseFactory {
  idGenerator = createIdGenerator("aiCategorizationJobs");
  create(options) {
    const now = this.now();
    const pastDate = this.past(30);
    const status = options?.overrides?.status || this.randomEnum(["pending", "running", "completed", "failed", "cancelled"]);
    const job = {
      _id: options?.overrides?._id || this.idGenerator.next(),
      _creationTime: options?.overrides?._creationTime || pastDate,
      organizationId: options?.overrides?.organizationId || createMockId("organizations"),
      projectId: options?.overrides?.projectId || createMockId("projects"),
      // Job Details
      status,
      progress: this.generateProgress(status),
      // Configuration
      provider: this.randomEnum(["openai", "anthropic", "gemini"]),
      model: this.generateModel(),
      temperature: this.faker.number.float({ min: 0, max: 1, multipleOf: 0.1 }),
      // Product Selection
      productIds: this.generateProductIds(),
      filters: this.faker.helpers.maybe(() => ({
        status: this.faker.helpers.arrayElement(["active", "draft"]),
        hasCategories: this.faker.datatype.boolean(),
        productType: this.faker.helpers.maybe(() => "meat/beef")
      }), { probability: 0.3 }),
      // Results
      results: this.generateResults(status),
      errors: this.generateErrors(status),
      // Metadata
      metadata: {
        source: this.faker.helpers.arrayElement(["manual", "api", "scheduled"]),
        batchId: this.faker.string.uuid(),
        retryCount: this.faker.number.int({ min: 0, max: 3 })
      },
      // Cost Tracking
      cost: this.generateCost(status),
      // Timing
      startedAt: status !== "pending" ? this.faker.date.between({ from: pastDate, to: now }).getTime() : void 0,
      completedAt: ["completed", "failed", "cancelled"].includes(status) ? this.faker.date.between({ from: pastDate, to: now }).getTime() : void 0,
      // User Info
      createdBy: options?.overrides?.createdBy || createMockId("users"),
      createdAt: pastDate,
      updatedAt: this.faker.date.between({ from: pastDate, to: now }).getTime()
    };
    return this.applyOverrides(job, options?.overrides);
  }
  /**
   * Create a pending job
   */
  createPending(options) {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "pending",
        progress: {
          current: 0,
          total: options?.overrides?.productIds?.length || this.faker.number.int({ min: 10, max: 100 }),
          percentage: 0
        },
        startedAt: void 0,
        completedAt: void 0,
        results: [],
        errors: []
      }
    });
  }
  /**
   * Create a running job
   */
  createRunning(options) {
    const total = options?.overrides?.productIds?.length || this.faker.number.int({ min: 10, max: 100 });
    const current = this.faker.number.int({ min: 1, max: total - 1 });
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "running",
        progress: {
          current,
          total,
          percentage: Math.round(current / total * 100)
        },
        startedAt: this.faker.date.recent({ days: 1 }).getTime(),
        completedAt: void 0
      }
    });
  }
  /**
   * Create a completed job
   */
  createCompleted(options) {
    const productIds = options?.overrides?.productIds || this.generateProductIds();
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "completed",
        productIds,
        progress: {
          current: productIds.length,
          total: productIds.length,
          percentage: 100
        },
        results: productIds.map((productId) => ({
          productId,
          suggestedCategoryIds: [createMockId("categories")],
          confidence: this.faker.number.float({ min: 0.7, max: 0.99, multipleOf: 0.01 }),
          rationale: this.faker.lorem.sentence(),
          appliedAt: this.faker.date.recent({ days: 1 }).getTime()
        })),
        errors: []
      }
    });
  }
  /**
   * Create a failed job
   */
  createFailed(options) {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: "failed",
        errors: [{
          message: this.faker.helpers.arrayElement([
            "API rate limit exceeded",
            "Invalid API key",
            "Model not available",
            "Network timeout"
          ]),
          productId: this.faker.helpers.maybe(() => createMockId("products")),
          timestamp: this.faker.date.recent({ days: 1 }).getTime(),
          type: this.faker.helpers.arrayElement(["api_error", "rate_limit", "validation_error", "network_error"])
        }]
      }
    });
  }
  /**
   * Create a test job with predictable data
   */
  createTest(index = 1) {
    const productIds = Array.from(
      { length: 5 },
      (_, i) => createMockId("products")
    );
    return this.create({
      overrides: {
        _id: createMockId("aiCategorizationJobs"),
        status: "completed",
        provider: "openai",
        model: "gpt-4",
        productIds,
        progress: {
          current: productIds.length,
          total: productIds.length,
          percentage: 100
        }
      }
    });
  }
  generateProgress(status) {
    if (status === "pending") {
      const total2 = this.faker.number.int({ min: 10, max: 100 });
      return { current: 0, total: total2, percentage: 0 };
    }
    if (status === "running") {
      const total2 = this.faker.number.int({ min: 10, max: 100 });
      const current = this.faker.number.int({ min: 1, max: total2 - 1 });
      return { current, total: total2, percentage: Math.round(current / total2 * 100) };
    }
    const total = this.faker.number.int({ min: 10, max: 100 });
    return { current: total, total, percentage: 100 };
  }
  generateModel() {
    const models = {
      openai: ["gpt-4", "gpt-3.5-turbo", "o3-mini"],
      anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-opus-4"],
      gemini: ["gemini-1.5-pro", "gemini-1.5-flash"]
    };
    const provider = this.faker.helpers.objectKey(models);
    return this.faker.helpers.arrayElement(models[provider]);
  }
  generateProductIds() {
    const count = this.faker.number.int({ min: 5, max: 50 });
    return Array.from({ length: count }, () => createMockId("products"));
  }
  generateResults(status) {
    if (["pending", "running", "failed", "cancelled"].includes(status)) {
      return [];
    }
    const count = this.faker.number.int({ min: 5, max: 20 });
    return Array.from({ length: count }, () => ({
      productId: createMockId("products"),
      suggestedCategoryIds: Array.from({
        length: this.faker.number.int({ min: 1, max: 3 })
      }, () => createMockId("categories")),
      confidence: this.faker.number.float({ min: 0.5, max: 0.99, multipleOf: 0.01 }),
      rationale: this.faker.lorem.sentence(),
      appliedAt: this.faker.helpers.maybe(
        () => this.faker.date.recent({ days: 7 }).getTime(),
        { probability: 0.7 }
      )
    }));
  }
  generateErrors(status) {
    if (status === "failed") {
      return [{
        message: this.faker.helpers.arrayElement([
          "API rate limit exceeded",
          "Invalid API key",
          "Model not available"
        ]),
        timestamp: this.faker.date.recent({ days: 1 }).getTime(),
        type: "api_error"
      }];
    }
    if (status === "completed" && this.faker.datatype.boolean({ probability: 0.2 })) {
      return [{
        message: "Failed to categorize product: insufficient data",
        productId: createMockId("products"),
        timestamp: this.faker.date.recent({ days: 1 }).getTime(),
        type: "validation_error"
      }];
    }
    return [];
  }
  generateCost(status) {
    if (["pending", "cancelled"].includes(status)) {
      return { inputTokens: 0, outputTokens: 0, totalCost: 0 };
    }
    const inputTokens = this.faker.number.int({ min: 1e3, max: 5e4 });
    const outputTokens = this.faker.number.int({ min: 500, max: 1e4 });
    const totalCost = inputTokens * 3e-5 + outputTokens * 6e-5;
    return { inputTokens, outputTokens, totalCost };
  }
};

// src/index.ts
var userFactory = new UserFactory();
var organizationFactory = new OrganizationFactory();
var productFactory = new ProductFactory();
var categoryFactory = new CategoryFactory();
var aiCategorizationJobFactory = new AiCategorizationJobFactory();
function createTestScenario(options) {
  const {
    userCount = 3,
    categoryCount = 5,
    productCount = 10,
    includeAiJob = false,
    seed
  } = options || {};
  const orgFactory = new OrganizationFactory(seed);
  const userFact = new UserFactory(seed);
  const catFactory = new CategoryFactory(seed);
  const prodFactory = new ProductFactory(seed);
  const aiJobFact = new AiCategorizationJobFactory(seed);
  const organization = orgFactory.createActive();
  const users = userFact.createMany(userCount, {
    overrides: { status: "active" }
  });
  const categories = [];
  const rootCount = Math.ceil(categoryCount / 3);
  for (let i = 0; i < rootCount; i++) {
    categories.push(catFactory.createRoot({
      overrides: {
        organizationId: organization._id,
        projectId: createMockId("projects")
      }
    }));
  }
  const remainingCount = categoryCount - rootCount;
  for (let i = 0; i < remainingCount; i++) {
    const parent = categories[i % rootCount];
    if (parent) {
      categories.push(catFactory.createSubcategory(parent._id, parent.path, {
        overrides: {
          organizationId: organization._id,
          projectId: parent.projectId
        }
      }));
    }
  }
  const products = prodFactory.createMany(productCount, {
    overrides: {
      organizationId: organization._id,
      projectId: categories[0]?.projectId || createMockId("projects"),
      createdBy: users[0]?._id,
      categories: categories.slice(0, 2).map((c) => c._id)
      // Assign to first 2 categories
    }
  });
  let aiJob;
  if (includeAiJob) {
    aiJob = aiJobFact.createCompleted({
      overrides: {
        organizationId: organization._id,
        projectId: products[0]?.projectId,
        productIds: products.slice(0, 5).map((p) => p._id),
        createdBy: users[0]?._id
      }
    });
  }
  return {
    organization,
    users,
    categories,
    products,
    aiJob
  };
}
function resetAllFactories() {
  Object.assign(userFactory, new UserFactory());
  Object.assign(organizationFactory, new OrganizationFactory());
  Object.assign(productFactory, new ProductFactory());
  Object.assign(categoryFactory, new CategoryFactory());
  Object.assign(aiCategorizationJobFactory, new AiCategorizationJobFactory());
}
function createTestUser(overrides) {
  return userFactory.create({ overrides });
}
function createTestOrganization(overrides) {
  return organizationFactory.create({ overrides });
}
function createTestProduct(overrides) {
  return productFactory.create({ overrides });
}
function createTestCategory(overrides) {
  return categoryFactory.create({ overrides });
}
function createTestAiJob(overrides) {
  return aiCategorizationJobFactory.create({ overrides });
}
export {
  AiCategorizationJobFactory,
  BaseFactory,
  CategoryFactory,
  OrganizationFactory,
  ProductFactory,
  UserFactory,
  aiCategorizationJobFactory,
  categoryFactory,
  createIdGenerator,
  createMockId,
  createMockIdFromString,
  createMockIds,
  createTestAiJob,
  createTestCategory,
  createTestOrganization,
  createTestProduct,
  createTestScenario,
  createTestUser,
  organizationFactory,
  productFactory,
  resetAllFactories,
  userFactory
};
