/**
 * Main schema file that re-exports the modular schema
 * This approach reduces TypeScript type complexity and compilation errors
 * 
 * The schema has been split into domain-specific modules:
 * - organization.ts: Organizations, users, memberships, projects
 * - product.ts: Products, variants, product trash
 * - category.ts: Categories, category levels, assignments
 * - ai.ts: AI jobs, import/export, workflow states
 * - monitoring.ts: Audit logs, performance metrics, deletion tracking
 * - crewai.ts: CrewAI agent registry and monitoring
 * - infrastructure.ts: A/B testing, rate limiting, benchmarks
 * - common.ts: Shared types and field definitions
 */

export { default } from './schema/index';