"use node";

import { v } from 'convex/values';
import { action, internalAction } from '../_generated/server';
import { api, internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import crypto from 'crypto';

// Decrypt an API key
const decryptApiKey = (encryptedKey: string): string => {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  const key = Buffer.from(encryptionKey, 'hex');
  const combined = Buffer.from(encryptedKey, 'base64');
  
  const iv = combined.subarray(0, 16);
  const authTag = combined.subarray(16, 32);
  const encrypted = combined.subarray(32);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
};

/**
 * Process an AI categorization job with decrypted API keys
 */
export const processCategorizationJobWithDecryption = internalAction({
  args: { jobId: v.id('aiCategorizationJobs') },
  handler: async (ctx, { jobId }) => {
    const startTime = Date.now();
    
    try {
      // Get the job
      const job = await ctx.runQuery(
        internal.ai.categorization.getCategorizationJobInternal,
        { jobId }
      );
      if (!job) {
        throw new Error('Job not found');
      }
      
      if (job.status !== 'pending') {
        console.log(`Job ${jobId} is not pending (status: ${job.status}), skipping`);
        return;
      }
      
      // Update job status to running
      await ctx.runMutation(internal.ai.categorization.updateJobStatusInternal, {
        jobId,
        status: 'running',
        startedAt: Date.now(),
      });
      
      // Get organization with encrypted keys
      const organization = await ctx.runQuery(
        internal.ai.categorization.getOrganizationWithKeys,
        { organizationId: job.organizationId }
      );
      
      if (!organization) {
        throw new Error('Organization not found');
      }
      
      // Get the encrypted API key for the selected provider
      const encryptedKey = organization.settings.apiKeys[job.aiProvider as keyof typeof organization.settings.apiKeys];
      
      if (!encryptedKey) {
        throw new Error(`No API key configured for ${job.aiProvider}`);
      }
      
      // Decrypt the API key
      let decryptedKey: string;
      try {
        decryptedKey = decryptApiKey(encryptedKey);
      } catch (error) {
        // Check if it's an unencrypted legacy key
        if (encryptedKey.startsWith('sk-') || encryptedKey.includes('sk-ant-')) {
          console.warn('Found legacy unencrypted API key, using as-is');
          decryptedKey = encryptedKey;
        } else {
          throw new Error('Failed to decrypt API key');
        }
      }
      
      // Now call the original internal action with the decrypted key
      // We'll need to pass the decrypted key through a modified version
      await ctx.runAction(internal.ai.categorization.processCategorizationJobWithKey, {
        jobId,
        apiKey: decryptedKey,
      });
      
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      
      // Update job with error
      await ctx.runMutation(internal.ai.categorization.updateCategorizationJob, {
        jobId,
        updates: {
          status: 'failed',
          errors: [{
            type: 'PROCESSING_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            productId: undefined,
            timestamp: Date.now(),
          }],
          completedAt: Date.now(),
          executionTime: Date.now() - startTime,
        },
      });
      
      throw error;
    }
  },
});