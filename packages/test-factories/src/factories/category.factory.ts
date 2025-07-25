import { BaseFactory, FactoryOptions } from '../utils/factory';
import { createMockId, createIdGenerator } from '../utils/ids';
import type { Doc, Id } from '../types';

type Category = Doc<'categories'>;

export class CategoryFactory extends BaseFactory<Category> {
  private idGenerator = createIdGenerator('categories');
  
  create(options?: FactoryOptions<Category>): Category {
    const now = this.now();
    const pastDate = this.past(180);
    const name = options?.overrides?.name || this.generateCategoryName();
    const handle = this.generateHandle(name);
    const level = options?.overrides?.level ?? this.faker.number.int({ min: 0, max: 4 });
    
    const category: Category = {
      _id: options?.overrides?._id || this.idGenerator.next(),
      _creationTime: options?.overrides?._creationTime || pastDate,
      organizationId: options?.overrides?.organizationId || createMockId('organizations'),
      projectId: options?.overrides?.projectId || createMockId('projects'),
      
      // Category Information
      name,
      description: this.faker.helpers.maybe(() => this.faker.lorem.sentence(), { probability: 0.6 }),
      handle,
      externalId: this.faker.helpers.maybe(() => this.faker.string.alphanumeric(12), { probability: 0.3 }),
      
      // Hierarchy Management
      parentId: level > 0 ? (options?.overrides?.parentId || createMockId('categories')) : undefined,
      level,
      path: this.generatePath(name, level),
      sortOrder: this.faker.number.int({ min: 0, max: 100 }),
      
      // Display Properties
      color: this.faker.helpers.maybe(() => this.faker.color.rgb(), { probability: 0.4 }),
      icon: this.faker.helpers.maybe(() => this.generateIcon(), { probability: 0.5 }),
      image: this.faker.helpers.maybe(() => ({
        url: this.faker.image.url(),
        alt: name,
        storageId: this.faker.string.alphanumeric(24),
      }), { probability: 0.3 }),
      
      // SEO
      seoTitle: this.faker.helpers.maybe(() => `${name} Products | Shop Now`, { probability: 0.3 }),
      seoDescription: this.faker.helpers.maybe(() => 
        this.faker.lorem.sentence({ min: 10, max: 20 }), { probability: 0.3 }),
      
      // Status & Visibility
      status: this.randomEnum(['active', 'hidden', 'archived'] as const),
      isVisible: this.faker.datatype.boolean({ probability: 0.9 }),
      
      // Metadata
      metadata: this.generateMetadata(),
      
      // AI Suggestions
      aiSuggestions: this.faker.helpers.maybe(() => ({
        suggestedBy: this.faker.helpers.arrayElement(['openai-gpt4', 'anthropic-claude', 'gemini-pro']),
        rationale: this.faker.lorem.sentence(),
        confidence: this.faker.number.float({ min: 0.6, max: 0.99, multipleOf: 0.01 }),
        approvedBy: this.faker.helpers.maybe(() => createMockId('users'), { probability: 0.5 }),
        approvedAt: this.faker.helpers.maybe(() => this.faker.date.recent({ days: 7 }).getTime(), { probability: 0.5 }),
      }), { probability: 0.2 }),
      
      // Versioning
      version: this.faker.number.int({ min: 1, max: 3 }),
      createdBy: options?.overrides?.createdBy || createMockId('users'),
      createdAt: pastDate,
      updatedAt: this.faker.date.between({ from: pastDate, to: now }).getTime(),
      lastModifiedBy: options?.overrides?.lastModifiedBy || options?.overrides?.createdBy || createMockId('users'),
    };
    
    return this.applyOverrides(category, options?.overrides);
  }
  
  /**
   * Create a root category (level 0)
   */
  createRoot(options?: FactoryOptions<Category>): Category {
    const rootNames = ['Fresh Foods', 'Frozen Foods', 'Beverages', 'Pantry', 'Snacks'];
    
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        name: options?.overrides?.name || this.faker.helpers.arrayElement(rootNames),
        level: 0,
        parentId: undefined,
        sortOrder: this.faker.number.int({ min: 0, max: 10 }),
      }
    });
  }
  
  /**
   * Create a subcategory with parent
   */
  createSubcategory(parentId: Id<'categories'>, parentPath: string, options?: FactoryOptions<Category>): Category {
    const level = (options?.overrides?.level ?? 1);
    const name = options?.overrides?.name || this.generateSubcategoryName(level);
    
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        parentId,
        level,
        path: `${parentPath}/${this.generateHandle(name)}`,
      }
    });
  }
  
  /**
   * Create a meat category hierarchy
   */
  createMeatHierarchy(organizationId: Id<'organizations'>, projectId: Id<'projects'>): Category[] {
    const meatRoot = this.create({
      overrides: {
        organizationId,
        projectId,
        name: 'Meat & Seafood',
        level: 0,
        parentId: undefined,
        path: '/meat-seafood',
        status: 'active',
      }
    });
    
    const beef = this.createSubcategory(meatRoot._id, meatRoot.path, {
      overrides: {
        organizationId,
        projectId,
        name: 'Beef',
        level: 1,
      }
    });
    
    const steaks = this.createSubcategory(beef._id, beef.path, {
      overrides: {
        organizationId,
        projectId,
        name: 'Steaks',
        level: 2,
      }
    });
    
    const groundBeef = this.createSubcategory(beef._id, beef.path, {
      overrides: {
        organizationId,
        projectId,
        name: 'Ground Beef',
        level: 2,
      }
    });
    
    return [meatRoot, beef, steaks, groundBeef];
  }
  
  /**
   * Create a test category with predictable data
   */
  createTest(index: number = 1): Category {
    return this.create({
      overrides: {
        _id: createMockId('categories'),
        name: `Test Category ${index}`,
        handle: `test-category-${index}`,
        level: 0,
        path: `/test-category-${index}`,
        status: 'active',
        isVisible: true,
      }
    });
  }
  
  private generateCategoryName(): string {
    const categories = [
      'Fresh Produce', 'Dairy & Eggs', 'Meat & Seafood', 'Bakery',
      'Frozen Foods', 'Beverages', 'Snacks', 'Pantry Staples',
      'Health & Wellness', 'International Foods'
    ];
    return this.faker.helpers.arrayElement(categories);
  }
  
  private generateSubcategoryName(level: number): string {
    const subcategories = {
      1: ['Beef', 'Pork', 'Chicken', 'Seafood', 'Vegetables', 'Fruits', 'Breads', 'Pastries'],
      2: ['Steaks', 'Ground', 'Roasts', 'Fillets', 'Organic', 'Local', 'Premium'],
      3: ['Ribeye', 'Sirloin', 'Tenderloin', 'Chuck', 'Round'],
      4: ['USDA Prime', 'USDA Choice', 'Grass-Fed', 'Angus'],
    };
    
    const levelCategories = subcategories[level as keyof typeof subcategories] || subcategories[1];
    return this.faker.helpers.arrayElement(levelCategories);
  }
  
  private generateHandle(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }
  
  private generatePath(name: string, level: number): string {
    const parts = [this.generateHandle(name)];
    
    // Generate parent path segments for higher levels
    for (let i = 0; i < level; i++) {
      parts.unshift(this.faker.helpers.arrayElement(['fresh', 'frozen', 'pantry', 'beverages']));
    }
    
    return '/' + parts.join('/');
  }
  
  private generateIcon(): string {
    const icons = [
      'shopping-basket', 'package', 'beef', 'fish', 'carrot', 
      'bread', 'milk', 'apple', 'pizza', 'coffee'
    ];
    return this.faker.helpers.arrayElement(icons);
  }
  
  private generateMetadata() {
    return {
      displayOrder: this.faker.number.int({ min: 1, max: 100 }),
      featured: this.faker.datatype.boolean({ probability: 0.2 }),
      seasonality: this.faker.helpers.maybe(() => 
        this.faker.helpers.arrayElement(['spring', 'summer', 'fall', 'winter', 'all-season'])
      ),
    };
  }
}