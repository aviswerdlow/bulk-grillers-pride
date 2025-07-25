// Mock Convex dataModel types
export type Id<T extends string = string> = string & { __tableName: T };

// Add other types as needed for tests