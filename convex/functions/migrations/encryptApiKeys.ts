import { mutation } from '../../_generated/server';
import { encryptApiKey, isEncrypted } from '../../lib/encryption';

/**
 * Migration to encrypt existing unencrypted API keys
 * This should be run once to migrate all existing API keys to encrypted format
 */
export const encryptExistingApiKeys = mutation({
  handler: async (ctx) => {
    console.log('Starting API key encryption migration...');
    
    let totalOrganizations = 0;
    let encryptedCount = 0;
    let alreadyEncryptedCount = 0;
    let errorCount = 0;
    
    // Get all organizations
    const organizations = await ctx.db.query('organizations').collect();
    totalOrganizations = organizations.length;
    
    console.log(`Found ${totalOrganizations} organizations to process`);
    
    for (const org of organizations) {
      try {
        const apiKeys = org.settings.apiKeys;
        let needsUpdate = false;
        const updatedApiKeys = { ...apiKeys };
        
        // Check each provider's API key
        for (const provider of ['openai', 'anthropic', 'gemini'] as const) {
          const key = apiKeys[provider];
          
          if (key) {
            // Check if already encrypted
            if (isEncrypted(key)) {
              alreadyEncryptedCount++;
              console.log(`Organization ${org._id}: ${provider} key already encrypted`);
            } else {
              // Encrypt the key
              try {
                const encryptedKey = encryptApiKey(key);
                updatedApiKeys[provider] = encryptedKey;
                needsUpdate = true;
                encryptedCount++;
                console.log(`Organization ${org._id}: ${provider} key encrypted successfully`);
              } catch (error) {
                errorCount++;
                console.error(`Failed to encrypt ${provider} key for organization ${org._id}:`, error);
              }
            }
          }
        }
        
        // Update the organization if any keys were encrypted
        if (needsUpdate) {
          await ctx.db.patch(org._id, {
            settings: {
              ...org.settings,
              apiKeys: updatedApiKeys,
            },
            updatedAt: Date.now(),
          });
          
          console.log(`Updated organization ${org._id} with encrypted keys`);
        }
      } catch (error) {
        console.error(`Error processing organization ${org._id}:`, error);
        errorCount++;
      }
    }
    
    const summary = {
      totalOrganizations,
      keysEncrypted: encryptedCount,
      alreadyEncrypted: alreadyEncryptedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Migration completed:', summary);
    
    return summary;
  },
});

/**
 * Verify that all API keys are encrypted
 * This can be run to check the status of API key encryption
 */
export const verifyApiKeyEncryption = mutation({
  handler: async (ctx) => {
    console.log('Verifying API key encryption status...');
    
    let totalKeys = 0;
    let encryptedKeys = 0;
    let unencryptedKeys = 0;
    const unencryptedList: Array<{
      orgId: string;
      provider: string;
    }> = [];
    
    // Get all organizations
    const organizations = await ctx.db.query('organizations').collect();
    
    for (const org of organizations) {
      const apiKeys = org.settings.apiKeys;
      
      for (const provider of ['openai', 'anthropic', 'gemini'] as const) {
        const key = apiKeys[provider];
        
        if (key) {
          totalKeys++;
          
          if (isEncrypted(key)) {
            encryptedKeys++;
          } else {
            unencryptedKeys++;
            unencryptedList.push({
              orgId: org._id,
              provider,
            });
          }
        }
      }
    }
    
    const result = {
      totalKeys,
      encryptedKeys,
      unencryptedKeys,
      unencryptedList,
      allEncrypted: unencryptedKeys === 0,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Verification completed:', result);
    
    return result;
  },
});