/**
 * Multi-Provider Abstraction Layer
 * 
 * Exports for the provider system
 */

export * from './types';
export * from './registry';
export * from './manager';
export * from './openai';
export * from './anthropic';
export * from './gemini';

// Convenience exports
export { providerRegistry } from './registry';
export { multiProviderManager } from './manager';

// Helper function to initialize the system
export async function initializeProviders(config: {
  openai?: string;
  anthropic?: string;
  gemini?: string;
  dailyBudget?: number;
  monthlyBudget?: number;
  warningThreshold?: number;
}): Promise<void> {
  const { multiProviderManager } = await import('./manager');
  
  await multiProviderManager.initialize({
    openai: config.openai ? { apiKey: config.openai } : undefined,
    anthropic: config.anthropic ? { apiKey: config.anthropic } : undefined,
    gemini: config.gemini ? { apiKey: config.gemini } : undefined,
    budget: (config.dailyBudget || config.monthlyBudget) ? {
      dailyLimit: config.dailyBudget,
      monthlyLimit: config.monthlyBudget,
      warningThreshold: config.warningThreshold || 80,
      enforcementMode: 'soft'
    } : undefined
  });
}