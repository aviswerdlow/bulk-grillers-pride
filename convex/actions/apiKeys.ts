"use node";

import { v } from 'convex/values';
import { action } from '../_generated/server';
import { api } from '../_generated/api';
import crypto from 'crypto';

/**
 * Action to update API keys with encryption
 * This is the public endpoint that handles encryption
 */
export const updateApiKeysAction = action({
  args: {
    organizationId: v.id('organizations'),
    provider: v.union(v.literal('openai'), v.literal('anthropic'), v.literal('gemini')),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Get encryption key from environment
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    
    if (encryptionKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)');
    }
    
    // Encrypt the API key inline
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(args.apiKey, 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, authTag, encrypted]);
    const encryptedKey = combined.toString('base64');
    
    // Call the mutation with the encrypted key
    return await ctx.runMutation(api.functions.organizations.apiKeys.updateApiKeys, {
      organizationId: args.organizationId,
      provider: args.provider,
      apiKey: encryptedKey,
    });
  },
});