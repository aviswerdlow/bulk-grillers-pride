#!/usr/bin/env npx tsx

/**
 * Script to disable CrewAI and rollback to LangChain
 * 
 * This updates the A/B test configuration to route 100% of traffic back to LangChain
 */

import { api } from "../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

// Get Convex URL from environment
const CONVEX_URL = process.env.VITE_PUBLIC_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found in environment variables");
  console.error("Please ensure VITE_PUBLIC_CONVEX_URL or NEXT_PUBLIC_CONVEX_URL is set");
  process.exit(1);
}

async function disableCrewAI() {
  console.log("🔄 Disabling CrewAI and rolling back to LangChain...\n");

  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // Check current configuration
    console.log("📊 Checking current A/B test configuration...");
    const currentConfig = await client.query(api.ai.monitoring.abTestingController.getABTestConfig);
    
    console.log("\nCurrent configuration:");
    console.log(`- Enabled: ${currentConfig.enabled}`);
    console.log(`- CrewAI traffic: ${currentConfig.trafficPercentage.crewAI}%`);
    console.log(`- LangChain traffic: ${currentConfig.trafficPercentage.langchain}%`);

    // Update configuration to disable CrewAI
    console.log("\n🔧 Updating configuration to disable CrewAI...");
    
    const updatedConfig = {
      ...currentConfig,
      enabled: false, // Disable A/B test entirely
      trafficPercentage: {
        crewAI: 0,
        langchain: 100,
      },
      rollbackReason: "Manual rollback via script",
      lastRollbackAt: Date.now(),
    };

    await client.mutation(api.ai.monitoring.abTestingController.updateABTestConfig, {
      config: updatedConfig,
    });

    console.log("\n✅ CrewAI disabled successfully!");
    console.log("\n📝 Summary of changes:");
    console.log("- A/B test: DISABLED");
    console.log("- Traffic routing: 0% CrewAI, 100% LangChain");
    console.log("- Rollback reason: Manual rollback via script");
    
    console.log("\n🔄 LangChain is now active for all AI categorization operations");
    console.log("\n💡 To re-enable CrewAI, run: npm run enable-crewai");

  } catch (error) {
    console.error("\n❌ Error disabling CrewAI:", error);
    console.error("\nPossible issues:");
    console.error("- Ensure you're authenticated");
    console.error("- Check that the Convex backend is running");
    console.error("- Verify you have admin permissions");
    process.exit(1);
  }
}

// Run the script
disableCrewAI().catch(console.error);