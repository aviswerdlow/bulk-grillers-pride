/**
 * Type definitions for Convex test helpers
 */

export type TableName = string;
export type Document = Record<string, any> & { _id: string; _creationTime: number };
export type Storage = Map<TableName, Map<string, Document>>;
export type IdGenerator = Map<TableName, number>;

export interface ConvexTestContext {
  storage: Storage;
  idGenerator: IdGenerator;
  auth: MockAuth;
  scheduler: MockScheduler;
  db: MockDatabase;
  runQuery: jest.MockedFunction<(name: string, args: any) => Promise<any>>;
  runMutation: jest.MockedFunction<(name: string, args: any) => Promise<any>>;
  runAction: jest.MockedFunction<(name: string, args: any) => Promise<any>>;
}

export interface MockQueryBuilder<T = any> {
  withIndex(indexName: string, filterFn?: (q: any) => any): MockQueryBuilder<T>;
  filter(filterFn: (doc: T) => boolean): MockQueryBuilder<T>;
  order(order: 'asc' | 'desc'): MockQueryBuilder<T>;
  eq(field: string, value: any): MockQueryBuilder<T>;
  gt(field: string, value: any): MockQueryBuilder<T>;
  gte(field: string, value: any): MockQueryBuilder<T>;
  lt(field: string, value: any): MockQueryBuilder<T>;
  lte(field: string, value: any): MockQueryBuilder<T>;
  collect(): Promise<T[]>;
  first(): Promise<T | null>;
  unique(): Promise<T | null>;
  take(n: number): MockQueryBuilder<T>;
  paginate(opts?: PaginationOptions): Promise<PaginationResult<T>>;
}

export interface PaginationOptions {
  numItems?: number;
  cursor?: string | null;
}

export interface PaginationResult<T> {
  page: T[];
  continueCursor: string | null;
  isDone: boolean;
}

export interface MockDatabase {
  query: jest.MockedFunction<(table: string) => MockQueryBuilder>;
  insert: jest.MockedFunction<(table: string, doc: any) => Promise<string>>;
  get: jest.MockedFunction<(id: string) => Promise<any>>;
  patch: jest.MockedFunction<(id: string, updates: any) => Promise<void>>;
  replace: jest.MockedFunction<(id: string, doc: any) => Promise<void>>;
  delete: jest.MockedFunction<(id: string) => Promise<void>>;
  normalize: jest.MockedFunction<(id: string) => string>;
  system: MockSystemDB;
}

export interface MockSystemDB {
  query: jest.MockedFunction<(table: string) => MockQueryBuilder>;
  get: jest.MockedFunction<(id: string) => Promise<any>>;
}

export interface MockAuth {
  getUserIdentity: jest.MockedFunction<() => Promise<any>>;
}

export interface MockScheduler {
  runAfter: jest.MockedFunction<(delayMs: number, name: string, args: any) => Promise<void>>;
  runAt: jest.MockedFunction<(timestamp: number, name: string, args: any) => Promise<void>>;
  cancel: jest.MockedFunction<(jobId: string) => Promise<void>>;
}

export interface AuthUser {
  tokenIdentifier: string;
  email?: string;
  subject?: string;
  emailVerified?: boolean;
  issuer?: string;
}

export interface SeedData {
  [table: string]: any[];
}