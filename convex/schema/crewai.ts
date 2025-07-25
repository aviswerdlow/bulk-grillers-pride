/**
 * CrewAI Schema Additions
 * 
 * This file contains schema definitions for the CrewAI shared memory system
 * and agent orchestration components.
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// ================================
// CREWAI AGENT MANAGEMENT
// ================================

export const agentRegistry = defineTable({
  // Organization scope
  organizationId: v.id('organizations'),
  
  // Agent identification
  agentId: v.string(), // Unique agent identifier (e.g., "product-analyzer-1")
  agentType: v.union(
    v.literal('ProductAnalyzer'),
    v.literal('CategoryMatcher'),
    v.literal('QualityValidator'),
    v.literal('Orchestrator')
  ),
  
  // Agent configuration
  capabilities: v.array(v.string()), // List of capabilities
  model: v.string(), // LLM model to use
  temperature: v.number(), // Model temperature setting
  maxTokens: v.optional(v.number()), // Max tokens per request
  
  // Agent status
  status: v.union(
    v.literal('active'),
    v.literal('idle'),
    v.literal('working'),
    v.literal('error'),
    v.literal('disabled')
  ),
  
  // Performance tracking
  tasksCompleted: v.number(),
  totalTokensUsed: v.number(),
  averageResponseTime: v.number(), // in milliseconds
  errorRate: v.number(), // percentage
  
  // Timestamps
  lastActiveAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  
  // Metadata
  metadata: v.optional(v.any()),
})
  .index('by_organization', ['organizationId'])
  .index('by_agent_id', ['organizationId', 'agentId'])
  .index('by_type', ['organizationId', 'agentType'])
  .index('by_status', ['organizationId', 'status'])
  .index('by_activity', ['lastActiveAt']);

// ================================
// SHARED MEMORY SYSTEM
// ================================

export const agentMemory = defineTable({
  // Organization and scope
  organizationId: v.id('organizations'),
  
  // Memory identification
  memoryKey: v.string(), // Hierarchical key (e.g., "crew.session.123.product.analysis")
  memoryType: v.union(
    v.literal('shortTerm'),    // Session-specific, expires quickly
    v.literal('longTerm'),     // Persistent knowledge
    v.literal('episodic'),     // Event-based memories
    v.literal('semantic'),     // Knowledge and facts
    v.literal('working')       // Current task context
  ),
  
  // Memory content
  content: v.any(), // Flexible storage for different memory types
  contentHash: v.string(), // Hash for deduplication
  compressed: v.boolean(), // Whether content is compressed
  sizeBytes: v.number(), // Size of content in bytes
  
  // Memory ownership and sharing
  agentId: v.optional(v.string()), // Specific to an agent
  crewId: v.optional(v.string()), // Specific to a crew
  sessionId: v.optional(v.string()), // Session-scoped
  
  // Memory importance and relevance
  importance: v.number(), // 0-1 importance score
  relevanceScore: v.number(), // 0-1 relevance to current context
  accessCount: v.number(), // Number of times accessed
  updateCount: v.number(), // Number of times updated
  
  // Access tracking
  lastAccessedAt: v.number(),
  lastAccessedBy: v.optional(v.string()), // Agent ID
  accessHistory: v.optional(v.array(v.object({
    agentId: v.string(),
    timestamp: v.number(),
    operation: v.union(v.literal('read'), v.literal('write'), v.literal('update')),
  }))),
  
  // Versioning and concurrency
  version: v.number(), // For optimistic concurrency control
  locked: v.boolean(), // Whether memory is locked for writing
  lockedBy: v.optional(v.string()), // Agent holding the lock
  lockExpiresAt: v.optional(v.number()), // Lock expiration time
  
  // TTL and lifecycle
  expiresAt: v.optional(v.number()), // When memory expires
  summarizedAt: v.optional(v.number()), // When last summarized
  createdAt: v.number(),
  updatedAt: v.number(),
  
  // Related memories
  parentMemoryId: v.optional(v.id('agentMemory')), // For hierarchical memories
  relatedMemories: v.optional(v.array(v.id('agentMemory'))), // Related memory IDs
})
  .index('by_organization', ['organizationId'])
  .index('by_key', ['organizationId', 'memoryKey'])
  .index('by_type', ['organizationId', 'memoryType'])
  .index('by_agent', ['organizationId', 'agentId'])
  .index('by_crew', ['organizationId', 'crewId'])
  .index('by_session', ['organizationId', 'sessionId'])
  .index('by_importance', ['organizationId', 'importance'])
  .index('by_access', ['organizationId', 'lastAccessedAt'])
  .index('by_expiry', ['expiresAt'])
  .index('by_lock', ['locked', 'lockExpiresAt']);

// ================================
// AGENT TASK COORDINATION
// ================================

export const agentTasks = defineTable({
  // Organization scope
  organizationId: v.id('organizations'),
  
  // Task identification
  taskId: v.string(), // Unique task identifier
  taskType: v.union(
    v.literal('analyze_product'),
    v.literal('match_category'),
    v.literal('validate_quality'),
    v.literal('orchestrate_crew')
  ),
  
  // Task assignment
  crewId: v.string(), // Crew handling this task
  assignedAgent: v.string(), // Agent ID assigned to task
  
  // Task status
  status: v.union(
    v.literal('pending'),
    v.literal('queued'),
    v.literal('in_progress'),
    v.literal('completed'),
    v.literal('failed'),
    v.literal('cancelled'),
    v.literal('retrying')
  ),
  
  // Task data
  input: v.any(), // Input data for the task
  output: v.optional(v.any()), // Task result
  error: v.optional(v.object({
    message: v.string(),
    code: v.optional(v.string()),
    stack: v.optional(v.string()),
    retryable: v.boolean(),
  })),
  
  // Task dependencies
  dependencies: v.array(v.string()), // Other task IDs this depends on
  dependents: v.array(v.string()), // Tasks that depend on this
  
  // Performance metrics
  retryCount: v.number(),
  maxRetries: v.number(),
  processingTimeMs: v.optional(v.number()),
  tokensUsed: v.optional(v.number()),
  
  // Timestamps
  createdAt: v.number(),
  queuedAt: v.optional(v.number()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  
  // Priority and scheduling
  priority: v.number(), // Higher = more important
  deadline: v.optional(v.number()), // Task deadline
  
  // Metadata
  metadata: v.optional(v.any()),
})
  .index('by_organization', ['organizationId'])
  .index('by_task_id', ['organizationId', 'taskId'])
  .index('by_crew', ['organizationId', 'crewId'])
  .index('by_agent', ['organizationId', 'assignedAgent'])
  .index('by_status', ['organizationId', 'status'])
  .index('by_priority', ['organizationId', 'priority'])
  .index('by_created', ['organizationId', 'createdAt']);

// ================================
// CREW ORCHESTRATION
// ================================

export const crewSessions = defineTable({
  // Organization scope
  organizationId: v.id('organizations'),
  
  // Crew identification
  crewId: v.string(), // Unique crew identifier
  sessionId: v.string(), // Session identifier
  
  // Crew configuration
  agents: v.array(v.object({
    agentId: v.string(),
    role: v.string(),
    status: v.string(),
  })),
  
  // Session status
  status: v.union(
    v.literal('initializing'),
    v.literal('active'),
    v.literal('completed'),
    v.literal('failed'),
    v.literal('terminated')
  ),
  
  // Performance tracking
  tasksProcessed: v.number(),
  totalProcessingTime: v.number(), // milliseconds
  totalTokensUsed: v.number(),
  memoryUsageBytes: v.number(),
  
  // Resource limits
  maxMemoryBytes: v.number(), // 512MB per crew as per requirements
  maxConcurrentTasks: v.number(),
  
  // Timestamps
  startedAt: v.number(),
  lastActiveAt: v.number(),
  completedAt: v.optional(v.number()),
  
  // Metadata
  metadata: v.optional(v.any()),
})
  .index('by_organization', ['organizationId'])
  .index('by_crew', ['organizationId', 'crewId'])
  .index('by_session', ['organizationId', 'sessionId'])
  .index('by_status', ['organizationId', 'status'])
  .index('by_activity', ['organizationId', 'lastActiveAt']);