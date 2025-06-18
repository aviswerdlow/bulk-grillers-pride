/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as functions_ai_categorization from "../functions/ai/categorization.js";
import type * as functions_auth_users from "../functions/auth/users.js";
import type * as functions_categories_categories from "../functions/categories/categories.js";
import type * as functions_categories_categoryLevels from "../functions/categories/categoryLevels.js";
import type * as functions_imports_imports from "../functions/imports/imports.js";
import type * as functions_migrations_importCategories from "../functions/migrations/importCategories.js";
import type * as functions_organizations_organizations from "../functions/organizations/organizations.js";
import type * as functions_products_products from "../functions/products/products.js";
import type * as functions_projects_projects from "../functions/projects/projects.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "functions/ai/categorization": typeof functions_ai_categorization;
  "functions/auth/users": typeof functions_auth_users;
  "functions/categories/categories": typeof functions_categories_categories;
  "functions/categories/categoryLevels": typeof functions_categories_categoryLevels;
  "functions/imports/imports": typeof functions_imports_imports;
  "functions/migrations/importCategories": typeof functions_migrations_importCategories;
  "functions/organizations/organizations": typeof functions_organizations_organizations;
  "functions/products/products": typeof functions_products_products;
  "functions/projects/projects": typeof functions_projects_projects;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
