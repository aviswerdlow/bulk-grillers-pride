#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Simple script to enable CrewAI feature flag
 * This directly calls the Convex mutation to enable CrewAI
 */

const { ConvexHttpClient } = require('convex/browser');

const CONVEX_URL = 'https://greedy-canary-910.convex.cloud';

async function enableCrewAI() {
  console.log('🚀 Enabling CrewAI feature flag...\n');

  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // Prepare the configuration update
    const updatedConfig = {
      testName: 'crewai_migration',
      enabled: true,
      trafficPercentage: {
        crewAI: 100,
        langchain: 0,
      },
      rolloutSchedule: [],
      componentFlags: {
        productAnalyzer: true,
        categoryMatcher: true,
        qualityValidator: true,
        memorySystem: true,
        caching: true,
        monitoring: true,
      },
      userTargeting: {
        enabled: false,
        targetedOrganizations: [],
        excludedOrganizations: [],
        betaUsers: [],
      },
      performanceThresholds: {
        maxResponseTime: 10000,
        minAccuracy: 70,
        maxErrorRate: 5,
        maxCostIncrease: 50,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Call the mutation directly using the function reference
    const functionReference = 'functions/ai/monitoring/abTestingController:updateABTestConfig';

    console.log('🔧 Updating A/B test configuration...');

    // Use the mutation method with the string reference
    await client.mutation(functionReference, {
      config: updatedConfig,
    });

    console.log('\n✅ CrewAI feature flag enabled successfully!');
    console.log('\n📝 Summary:');
    console.log('- A/B test: ENABLED');
    console.log('- Traffic routing: 100% CrewAI, 0% LangChain');
    console.log('- All components: ENABLED');
    console.log('- User targeting: DISABLED (applies to all users)');

    console.log('\n⚡ CrewAI is now active for all AI categorization operations!');
  } catch (error) {
    console.error('\n❌ Error enabling CrewAI:', error.message);

    if (error.message.includes('Not authenticated')) {
      console.error('\n⚠️  This operation requires authentication.');
      console.error("Please ensure you're logged in to the application first.");
      console.error('\nAlternative: Use the admin UI to enable CrewAI:');
      console.error('1. Navigate to the admin dashboard');
      console.error('2. Go to AI Settings > A/B Testing');
      console.error('3. Enable CrewAI and set traffic to 100%');
    } else {
      console.error('\nPossible issues:');
      console.error('- Ensure the Convex backend is running');
      console.error('- Check that the function exists in the deployment');
      console.error('- Verify network connectivity');
    }

    process.exit(1);
  }
}

// Run the script
enableCrewAI().catch(console.error);
