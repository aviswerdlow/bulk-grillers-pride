import { BaseFactory, FactoryOptions } from '../utils/factory';
import { createMockId, createIdGenerator } from '../utils/ids';
import type { Doc, Id } from '../types';

type Product = Doc<'products'>;

export class ProductFactory extends BaseFactory<Product> {
  private idGenerator = createIdGenerator('products');
  
  create(options?: FactoryOptions<Product>): Product {
    const now = this.now();
    const pastDate = this.past(90);
    const title = this.generateProductTitle();
    const handle = this.generateHandle(title);
    
    const product: Product = {
      _id: options?.overrides?._id || this.idGenerator.next(),
      _creationTime: options?.overrides?._creationTime || pastDate,
      organizationId: options?.overrides?.organizationId || createMockId('organizations'),
      projectId: options?.overrides?.projectId || createMockId('projects'),
      
      // Core Product Information
      title,
      description: this.faker.helpers.maybe(() => this.faker.commerce.productDescription(), { probability: 0.8 }),
      vendor: this.faker.helpers.maybe(() => this.faker.company.name(), { probability: 0.7 }),
      productType: this.faker.helpers.maybe(() => this.generateProductType(), { probability: 0.8 }),
      handle,
      status: this.randomEnum(['active', 'draft', 'archived'] as const),
      
      // SEO & Marketing
      seoTitle: this.faker.helpers.maybe(() => `${title} | Buy Online`, { probability: 0.3 }),
      seoDescription: this.faker.helpers.maybe(() => 
        this.faker.lorem.sentence({ min: 10, max: 20 }), { probability: 0.3 }),
      tags: this.generateTags(),
      
      // Categorization
      categories: [],
      aiCategorization: this.faker.helpers.maybe(() => ({
        suggestions: this.generateAiSuggestions(),
        lastProcessed: this.faker.date.recent({ days: 7 }).getTime(),
        batchId: this.faker.string.uuid(),
      }), { probability: 0.4 }),
      
      // Images
      images: this.generateImages(),
      
      // Metadata
      metadata: this.generateMetadata(),
      
      // Versioning & Audit
      version: this.faker.number.int({ min: 1, max: 5 }),
      createdBy: options?.overrides?.createdBy || createMockId('users'),
      createdAt: pastDate,
      updatedAt: this.faker.date.between({ from: pastDate, to: now }).getTime(),
      lastModifiedBy: options?.overrides?.lastModifiedBy || options?.overrides?.createdBy || createMockId('users'),
    };
    
    return this.applyOverrides(product, options?.overrides);
  }
  
  /**
   * Create a product with specific type (meat products)
   */
  createMeatProduct(options?: FactoryOptions<Product>): Product {
    const meatTypes = ['beef', 'pork', 'chicken', 'lamb', 'turkey'];
    const cuts = ['ribeye', 'sirloin', 'tenderloin', 'ground', 'chops', 'breast', 'thigh', 'wings'];
    const type = this.faker.helpers.arrayElement(meatTypes);
    const cut = this.faker.helpers.arrayElement(cuts);
    const title = `${this.faker.helpers.arrayElement(['Premium', 'Fresh', 'Organic'])} ${type} ${cut}`;
    
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        productType: `meat/${type}`,
        vendor: this.faker.helpers.arrayElement(['Angus Farms', 'Green Valley Meats', 'Heritage Farms']),
        tags: [type, cut, 'fresh', 'protein'],
      }
    });
  }
  
  /**
   * Create a seafood product
   */
  createSeafoodProduct(options?: FactoryOptions<Product>): Product {
    const seafoodTypes = ['salmon', 'tuna', 'shrimp', 'lobster', 'cod', 'halibut'];
    const preparations = ['fillet', 'steak', 'whole', 'tail', 'cleaned'];
    const type = this.faker.helpers.arrayElement(seafoodTypes);
    const prep = this.faker.helpers.arrayElement(preparations);
    const title = `${this.faker.helpers.arrayElement(['Wild-Caught', 'Fresh', 'Frozen'])} ${type} ${prep}`;
    
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        title: title.charAt(0).toUpperCase() + title.slice(1),
        productType: `seafood/${type}`,
        vendor: this.faker.helpers.arrayElement(['Ocean Fresh', 'Pacific Catch', 'Atlantic Seafood']),
        tags: [type, 'seafood', 'sustainable', prep],
      }
    });
  }
  
  /**
   * Create a draft product
   */
  createDraft(options?: FactoryOptions<Product>): Product {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'draft',
        images: [], // Draft products often don't have images yet
      }
    });
  }
  
  /**
   * Create an archived product
   */
  createArchived(options?: FactoryOptions<Product>): Product {
    return this.create({
      ...options,
      overrides: {
        ...options?.overrides,
        status: 'archived',
      }
    });
  }
  
  /**
   * Create a test product with predictable data
   */
  createTest(index: number = 1): Product {
    return this.create({
      overrides: {
        _id: createMockId('products'),
        title: `Test Product ${index}`,
        handle: `test-product-${index}`,
        status: 'active',
        vendor: 'Test Vendor',
        productType: 'test/product',
        tags: ['test', `product-${index}`],
      }
    });
  }
  
  private generateProductTitle(): string {
    const adjectives = ['Premium', 'Organic', 'Fresh', 'Deluxe', 'Artisan', 'Gourmet'];
    const products = this.faker.commerce.product();
    return `${this.faker.helpers.arrayElement(adjectives)} ${products}`;
  }
  
  private generateHandle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }
  
  private generateProductType(): string {
    const categories = ['meat', 'seafood', 'produce', 'dairy', 'bakery', 'beverages'];
    const subCategories = ['fresh', 'frozen', 'organic', 'prepared'];
    return `${this.faker.helpers.arrayElement(categories)}/${this.faker.helpers.arrayElement(subCategories)}`;
  }
  
  private generateTags(): string[] {
    const possibleTags = [
      'organic', 'fresh', 'frozen', 'premium', 'local', 'sustainable',
      'gluten-free', 'non-gmo', 'grass-fed', 'wild-caught', 'free-range'
    ];
    const count = this.faker.number.int({ min: 1, max: 5 });
    return this.faker.helpers.arrayElements(possibleTags, count);
  }
  
  private generateAiSuggestions() {
    const count = this.faker.number.int({ min: 1, max: 3 });
    return Array.from({ length: count }, () => ({
      categoryId: createMockId('categories'),
      confidence: this.faker.number.float({ min: 0.5, max: 0.99, multipleOf: 0.01 }),
      rationale: this.faker.lorem.sentence(),
      status: this.randomEnum(['pending', 'accepted', 'rejected'] as const),
    }));
  }
  
  private generateImages() {
    const count = this.faker.number.int({ min: 0, max: 3 });
    return Array.from({ length: count }, (_, i) => ({
      id: this.faker.string.uuid(),
      url: this.faker.image.url(),
      alt: this.faker.helpers.maybe(() => this.faker.lorem.words(3)),
      position: i,
      storageId: this.faker.string.alphanumeric(24),
    }));
  }
  
  private generateMetadata() {
    return {
      customField1: this.faker.helpers.maybe(() => this.faker.lorem.word()),
      customField2: this.faker.helpers.maybe(() => this.faker.number.int({ min: 1, max: 100 })),
      source: this.faker.helpers.arrayElement(['manual', 'import', 'api']),
    };
  }
}