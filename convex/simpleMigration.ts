import { mutation } from './_generated/server';

export default mutation({
  handler: async (ctx) => {
    console.log('Simple migration test running...');
    
    // Get all organizations
    const organizations = await ctx.db.query('organizations').collect();
    console.log(`Found ${organizations.length} organizations`);
    
    // Just count the API keys
    let totalKeys = 0;
    for (const org of organizations) {
      const apiKeys = org.settings.apiKeys;
      if (apiKeys.openai) totalKeys++;
      if (apiKeys.anthropic) totalKeys++;
      if (apiKeys.gemini) totalKeys++;
    }
    
    return {
      message: 'Simple migration completed',
      organizationCount: organizations.length,
      totalApiKeys: totalKeys,
    };
  },
});