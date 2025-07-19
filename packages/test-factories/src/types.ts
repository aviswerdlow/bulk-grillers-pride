// Common types for test factories
// Since we can't import from Convex, we define them here

export type Id<T extends string> = string & { __tableName: T };
export type Doc<T extends string> = { _id: Id<T>; _creationTime: number } & Record<string, any>;