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
import type * as __tests___convex_test_standard from '../__tests__/convex-test-standard.js';
import type * as __tests___helpers_deletion from '../__tests__/helpers/deletion.js';
import type * as __tests___test_helpers from '../__tests__/test-helpers.js';
import type * as crons from '../crons.js';
import type * as functions_accessibility_preferences from '../functions/accessibility/preferences.js';
import type * as functions_ai_categorization from '../functions/ai/categorization.js';
import type * as functions_ai_feedback from '../functions/ai/feedback.js';
import type * as functions_ai_index from '../functions/ai/index.js';
import type * as functions_ai_langchain from '../functions/ai/langchain.js';
import type * as functions_ai_testProcessing from '../functions/ai/testProcessing.js';
import type * as functions_archival_config from '../functions/archival/config.js';
import type * as functions_auth_index from '../functions/auth/index.js';
import type * as functions_auth_invitations from '../functions/auth/invitations.js';
import type * as functions_auth_permissions from '../functions/auth/permissions.js';
import type * as functions_auth_sessions from '../functions/auth/sessions.js';
import type * as functions_auth_users from '../functions/auth/users.js';
import type * as functions_cache_config from '../functions/cache/config.js';
import type * as functions_cache_examples from '../functions/cache/examples.js';
import type * as functions_cache_index from '../functions/cache/index.js';
import type * as functions_cache_invalidation from '../functions/cache/invalidation.js';
import type * as functions_cache_patterns from '../functions/cache/patterns.js';
import type * as functions_cache_service from '../functions/cache/service.js';
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
import type * as functions_migrations_addProductSKUs from '../functions/migrations/addProductSKUs.js';
import type * as functions_migrations_cleanupStuckJobs from '../functions/migrations/cleanupStuckJobs.js';
import type * as functions_migrations_importCategories from '../functions/migrations/importCategories.js';
import type * as functions_migrations_index from '../functions/migrations/index.js';
import type * as functions_migrations_migrationTracking from '../functions/migrations/migrationTracking.js';
import type * as functions_migrations_rollbackCategoryImport from '../functions/migrations/rollbackCategoryImport.js';
import type * as functions_migrations_schemaVersion from '../functions/migrations/schemaVersion.js';
import type * as functions_migrations_validateCategoryImport from '../functions/migrations/validateCategoryImport.js';
import type * as functions_monitoring_aggregation from '../functions/monitoring/aggregation.js';
import type * as functions_monitoring_alerts from '../functions/monitoring/alerts.js';
import type * as functions_monitoring_dashboard from '../functions/monitoring/dashboard.js';
import type * as functions_monitoring_index from '../functions/monitoring/index.js';
import type * as functions_monitoring_performance from '../functions/monitoring/performance.js';
import type * as functions_organizations_apiKeys from '../functions/organizations/apiKeys.js';
import type * as functions_organizations_organizations from '../functions/organizations/organizations.js';
import type * as functions_products_deletion_monitored from '../functions/products/deletion-monitored.js';
import type * as functions_products_deletion from '../functions/products/deletion.js';
import type * as functions_products_products from '../functions/products/products.js';
import type * as functions_projects_projects from '../functions/projects/projects.js';
import type * as lib_auth from '../lib/auth.js';
import type * as lib_organizationUtils from '../lib/organizationUtils.js';
import type * as lib_slugValidation from '../lib/slugValidation.js';
import type * as types_accessibility from '../types/accessibility.js';
import type * as types_deletion from '../types/deletion.js';

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  '__tests__/convex-test-standard': typeof __tests___convex_test_standard;
  '__tests__/helpers/deletion': typeof __tests___helpers_deletion;
  '__tests__/test-helpers': typeof __tests___test_helpers;
  crons: typeof crons;
  'functions/accessibility/preferences': typeof functions_accessibility_preferences;
  'functions/ai/categorization': typeof functions_ai_categorization;
  'functions/ai/feedback': typeof functions_ai_feedback;
  'functions/ai/index': typeof functions_ai_index;
  'functions/ai/langchain': typeof functions_ai_langchain;
  'functions/ai/testProcessing': typeof functions_ai_testProcessing;
  'functions/archival/config': typeof functions_archival_config;
  'functions/auth/index': typeof functions_auth_index;
  'functions/auth/invitations': typeof functions_auth_invitations;
  'functions/auth/permissions': typeof functions_auth_permissions;
  'functions/auth/sessions': typeof functions_auth_sessions;
  'functions/auth/users': typeof functions_auth_users;
  'functions/cache/config': typeof functions_cache_config;
  'functions/cache/examples': typeof functions_cache_examples;
  'functions/cache/index': typeof functions_cache_index;
  'functions/cache/invalidation': typeof functions_cache_invalidation;
  'functions/cache/patterns': typeof functions_cache_patterns;
  'functions/cache/service': typeof functions_cache_service;
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
  'functions/migrations/addProductSKUs': typeof functions_migrations_addProductSKUs;
  'functions/migrations/cleanupStuckJobs': typeof functions_migrations_cleanupStuckJobs;
  'functions/migrations/importCategories': typeof functions_migrations_importCategories;
  'functions/migrations/index': typeof functions_migrations_index;
  'functions/migrations/migrationTracking': typeof functions_migrations_migrationTracking;
  'functions/migrations/rollbackCategoryImport': typeof functions_migrations_rollbackCategoryImport;
  'functions/migrations/schemaVersion': typeof functions_migrations_schemaVersion;
  'functions/migrations/validateCategoryImport': typeof functions_migrations_validateCategoryImport;
  'functions/monitoring/aggregation': typeof functions_monitoring_aggregation;
  'functions/monitoring/alerts': typeof functions_monitoring_alerts;
  'functions/monitoring/dashboard': typeof functions_monitoring_dashboard;
  'functions/monitoring/index': typeof functions_monitoring_index;
  'functions/monitoring/performance': typeof functions_monitoring_performance;
  'functions/organizations/apiKeys': typeof functions_organizations_apiKeys;
  'functions/organizations/organizations': typeof functions_organizations_organizations;
  'functions/products/deletion-monitored': typeof functions_products_deletion_monitored;
  'functions/products/deletion': typeof functions_products_deletion;
  'functions/products/products': typeof functions_products_products;
  'functions/projects/projects': typeof functions_projects_projects;
  'lib/auth': typeof lib_auth;
  'lib/organizationUtils': typeof lib_organizationUtils;
  'lib/slugValidation': typeof lib_slugValidation;
  'types/accessibility': typeof types_accessibility;
  'types/deletion': typeof types_deletion;
}>;
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, 'public'>>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, 'internal'>>;
