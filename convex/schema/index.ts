import { defineSchema } from 'convex/server';
import { organizationTables } from './organization';
import { productTables } from './product';
import { categoryTables } from './category';
import { aiTables } from './ai';
import { monitoringTables } from './monitoring';
import { 
  agentRegistry, 
  agentMemory, 
  agentTasks, 
  crewSessions,
  crewAITables 
} from './crewai';
import { infrastructureTables } from './infrastructure';

/**
 * Main schema definition that combines all domain-specific tables
 * This modular approach reduces TypeScript type complexity
 */

export default defineSchema({
  // Organization and user management
  ...organizationTables,
  
  // Product and variant management
  ...productTables,
  
  // Category hierarchy
  ...categoryTables,
  
  // AI workflow and jobs
  ...aiTables,
  
  // Monitoring and audit
  ...monitoringTables,
  
  // CrewAI integration
  agentRegistry,
  agentMemory,
  agentTasks,
  crewSessions,
  ...crewAITables,
  
  // Infrastructure and performance
  ...infrastructureTables,
});