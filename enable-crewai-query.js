// Custom query to enable CrewAI
// Run this in the Convex Dashboard under Functions > Custom test query

import { mutation } from "./_generated/server";

export default mutation(async ({ db }) => {
  // Check if configuration already exists
  const existing = await db
    .query("abTestConfigurations")
    .filter((q) => q.eq(q.field("testName"), "crewai_migration"))
    .first();
  
  if (existing) {
    // Update existing configuration
    await db.patch(existing._id, {
      enabled: true,
      trafficPercentage: {
        crewAI: 100,
        langchain: 0
      },
      updatedAt: Date.now()
    });
    return { message: "Updated existing CrewAI configuration", id: existing._id };
  } else {
    // Create new configuration
    const id = await db.insert("abTestConfigurations", {
      testName: "crewai_migration",
      enabled: true,
      trafficPercentage: {
        crewAI: 100,
        langchain: 0
      },
      rolloutSchedule: [],
      componentFlags: {
        productAnalyzer: true,
        categoryMatcher: true,
        qualityValidator: true,
        memorySystem: true,
        caching: true,
        monitoring: true
      },
      userTargeting: {
        enabled: false,
        targetedOrganizations: [],
        excludedOrganizations: [],
        betaUsers: []
      },
      performanceThresholds: {
        maxResponseTime: 10000,
        minAccuracy: 70,
        maxErrorRate: 5,
        maxCostIncrease: 50
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return { message: "Created new CrewAI configuration", id };
  }
});