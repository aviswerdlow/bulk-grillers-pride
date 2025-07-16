/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { ApiFromModules, FilterApi, FunctionReference } from 'convex/server';
import type * as functions_ai_categorization from '../functions/ai/categorization.js';
import type * as functions_ai_feedback from '../functions/ai/feedback.js';
import type * as functions_ai_langchain from '../functions/ai/langchain.js';
import type * as functions_auth_index from '../functions/auth/index.js';
import type * as functions_auth_invitations from '../functions/auth/invitations.js';
import type * as functions_auth_permissions from '../functions/auth/permissions.js';
import type * as functions_auth_sessions from '../functions/auth/sessions.js';
import type * as functions_auth_users from '../functions/auth/users.js';
import type * as functions_categories_categories from '../functions/categories/categories.js';
import type * as functions_categories_categoryLevels from '../functions/categories/categoryLevels.js';
import type * as functions_categories_helpers from '../functions/categories/helpers.js';
import type * as functions_categories_hierarchy from '../functions/categories/hierarchy.js';
import type * as functions_categories_imports from '../functions/categories/imports.js';
import type * as functions_categories_index from '../functions/categories/index.js';
import type * as functions_categories_mutations from '../functions/categories/mutations.js';
import type * as functions_categories_products from '../functions/categories/products.js';
import type * as functions_categories_queries from '../functions/categories/queries.js';
import type * as functions_dashboard from '../functions/dashboard.js';
import type * as functions_imports_imports from '../functions/imports/imports.js';
import type * as functions_imports_index from '../functions/imports/index.js';
import type * as functions_imports_productImport from '../functions/imports/productImport.js';
import type * as functions_migrations_importCategories from '../functions/migrations/importCategories.js';
import type * as functions_migrations_index from '../functions/migrations/index.js';
import type * as functions_migrations_migrationTracking from '../functions/migrations/migrationTracking.js';
import type * as functions_migrations_rollbackCategoryImport from '../functions/migrations/rollbackCategoryImport.js';
import type * as functions_migrations_schemaVersion from '../functions/migrations/schemaVersion.js';
import type * as functions_migrations_validateCategoryImport from '../functions/migrations/validateCategoryImport.js';
import type * as functions_organizations_organizations from '../functions/organizations/organizations.js';
import type * as functions_products_products from '../functions/products/products.js';
import type * as functions_projects_projects from '../functions/projects/projects.js';
import type * as lib_auth from '../lib/auth.js';
import type * as lib_slugValidation from '../lib/slugValidation.js';

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  'functions/ai/categorization': typeof functions_ai_categorization;
  'functions/ai/feedback': typeof functions_ai_feedback;
  'functions/ai/langchain': typeof functions_ai_langchain;
  'functions/auth/index': typeof functions_auth_index;
  'functions/auth/invitations': typeof functions_auth_invitations;
  'functions/auth/permissions': typeof functions_auth_permissions;
  'functions/auth/sessions': typeof functions_auth_sessions;
  'functions/auth/users': typeof functions_auth_users;
  'functions/categories/categories': typeof functions_categories_categories;
  'functions/categories/categoryLevels': typeof functions_categories_categoryLevels;
  'functions/categories/helpers': typeof functions_categories_helpers;
  'functions/categories/hierarchy': typeof functions_categories_hierarchy;
  'functions/categories/imports': typeof functions_categories_imports;
  'functions/categories/index': typeof functions_categories_index;
  'functions/categories/mutations': typeof functions_categories_mutations;
  'functions/categories/products': typeof functions_categories_products;
  'functions/categories/queries': typeof functions_categories_queries;
  'functions/dashboard': typeof functions_dashboard;
  'functions/imports/imports': typeof functions_imports_imports;
  'functions/imports/index': typeof functions_imports_index;
  'functions/imports/productImport': typeof functions_imports_productImport;
  'functions/migrations/importCategories': typeof functions_migrations_importCategories;
  'functions/migrations/index': typeof functions_migrations_index;
  'functions/migrations/migrationTracking': typeof functions_migrations_migrationTracking;
  'functions/migrations/rollbackCategoryImport': typeof functions_migrations_rollbackCategoryImport;
  'functions/migrations/schemaVersion': typeof functions_migrations_schemaVersion;
  'functions/migrations/validateCategoryImport': typeof functions_migrations_validateCategoryImport;
  'functions/organizations/organizations': typeof functions_organizations_organizations;
  'functions/products/products': typeof functions_products_products;
  'functions/projects/projects': typeof functions_projects_projects;
  'lib/auth': typeof lib_auth;
  'lib/slugValidation': typeof lib_slugValidation;
}>;
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, 'public'>>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, 'internal'>>;
