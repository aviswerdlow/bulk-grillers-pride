import { faker } from '@faker-js/faker';

export interface FactoryOptions<T> {
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

export abstract class BaseFactory<T> {
  protected faker: typeof faker;
  
  constructor(seed?: number) {
    this.faker = faker;
    if (seed !== undefined) {
      this.faker.seed(seed);
    }
  }
  
  /**
   * Generate a single instance
   */
  abstract create(options?: FactoryOptions<T>): T;
  
  /**
   * Generate multiple instances
   */
  createMany(count: number, options?: FactoryOptions<T>): T[] {
    return Array.from({ length: count }, () => this.create(options));
  }
  
  /**
   * Generate instances with specific overrides for each
   */
  createManyWithOverrides(overrides: Array<Partial<T>>): T[] {
    return overrides.map(override => this.create({ overrides: override }));
  }
  
  /**
   * Apply overrides to generated data
   */
  protected applyOverrides(data: T, overrides?: Partial<T>): T {
    return overrides ? { ...data, ...overrides } : data;
  }
  
  /**
   * Get current timestamp
   */
  protected now(): number {
    return Date.now();
  }
  
  /**
   * Get past timestamp
   */
  protected past(days: number = 30): number {
    return this.faker.date.past({ years: days / 365 }).getTime();
  }
  
  /**
   * Get future timestamp
   */
  protected future(days: number = 30): number {
    return this.faker.date.future({ years: days / 365 }).getTime();
  }
  
  /**
   * Generate a random enum value
   */
  protected randomEnum<E>(enumValues: E[]): E {
    return this.faker.helpers.arrayElement(enumValues);
  }
}