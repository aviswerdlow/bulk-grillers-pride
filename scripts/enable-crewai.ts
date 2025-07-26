#!/usr/bin/env npx tsx

/**
 * Script to enable CrewAI feature flag
 * 
 * This updates the A/B test configuration to route 100% of traffic to CrewAI
 */

import { api } from "../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

// Get Convex URL from environment or use the known URL
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://greedy-canary-910.convex.cloud";

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found");
  process.exit(1);
}

async function enableCrewAI() {
  console.log("🚀 Enabling CrewAI feature flag...\n");

  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // First, check current configuration
    console.log("📊 Checking current A/B test configuration...");
    const currentConfig = await client.query(api.ai.monitoring.abTestingController.getABTestConfig);
    
    console.log("\nCurrent configuration:");
    console.log(`- Enabled: ${currentConfig.enabled}`);
    console.log(`- CrewAI traffic: ${currentConfig.trafficPercentage.crewAI}%`);
    console.log(`- LangChain traffic: ${currentConfig.trafficPercentage.langchain}%`);

    // Update configuration to enable CrewAI
    console.log("\n🔧 Updating configuration to enable CrewAI...");
    
    const updatedConfig = {
      ...currentConfig,
      enabled: true,
      trafficPercentage: {
        crewAI: 100,
        langchain: 0,
      },
      componentFlags: {
        productAnalyzer: true,
        categoryMatcher: true,
        qualityValidator: true,
        memorySystem: true,
        caching: true,
        monitoring: true,
      },
      userTargeting: {
        enabled: false, // Disable targeting to apply to all organizations
        targetedOrganizations: [],
        excludedOrganizations: [],
        betaUsers: [],
      },
    };

    await client.mutation(api.ai.monitoring.abTestingController.updateABTestConfig, {
      config: updatedConfig,
    });

    console.log("\n✅ CrewAI feature flag enabled successfully!");
    console.log("\n📝 Summary of changes:");
    console.log("- A/B test: ENABLED");
    console.log("- Traffic routing: 100% CrewAI, 0% LangChain");
    console.log("- All components: ENABLED");
    console.log("- User targeting: DISABLED (applies to all users)");
    
    console.log("\n⚡ CrewAI is now active for all AI categorization operations!");
    console.log("\n🔍 Monitor performance at: /admin/ai/monitoring");
    console.log("🔄 To rollback, run: npm run disable-crewai");

  } catch (error) {
    console.error("\n❌ Error enabling CrewAI:", error);
    console.error("\nPossible issues:");
    console.error("- Ensure you're authenticated");
    console.error("- Check that the Convex backend is running");
    console.error("- Verify you have admin permissions");
    process.exit(1);
  }
}

// Run the script
enableCrewAI().catch(console.error);