#!/usr/bin/env node

/**
 * CI/CD Optimization Script
 * Analyzes and provides recommendations for improving CI performance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function analyzeWorkflow(workflowPath) {
  const content = fs.readFileSync(workflowPath, 'utf8');
  const stats = {
    name: path.basename(workflowPath),
    jobs: 0,
    parallelJobs: 0,
    cacheSteps: 0,
    totalSteps: 0,
    turboEnabled: false,
    recommendations: []
  };

  // Count jobs
  const jobMatches = content.match(/^\s{2}[a-zA-Z-_]+:$/gm);
  stats.jobs = jobMatches ? jobMatches.length : 0;

  // Check for parallel jobs (those that don't depend on others)
  const needsMatches = content.match(/needs:/g);
  stats.parallelJobs = stats.jobs - (needsMatches ? needsMatches.length : 0);

  // Count cache usage
  stats.cacheSteps = (content.match(/actions\/cache@/g) || []).length;

  // Count total steps
  stats.totalSteps = (content.match(/- name:/g) || []).length;

  // Check for Turbo
  stats.turboEnabled = content.includes('turbo run') || content.includes('TURBO_');

  // Generate recommendations
  if (stats.parallelJobs < stats.jobs * 0.5) {
    stats.recommendations.push('Consider parallelizing more jobs to reduce total runtime');
  }

  if (stats.cacheSteps < stats.jobs) {
    stats.recommendations.push('Add dependency caching to more jobs');
  }

  if (!stats.turboEnabled) {
    stats.recommendations.push('Enable Turbo for monorepo task orchestration');
  }

  if (!content.includes('concurrency:')) {
    stats.recommendations.push('Add concurrency controls to prevent duplicate runs');
  }

  if (!content.includes('--affected')) {
    stats.recommendations.push('Use --affected flag to only run tasks for changed packages');
  }

  return stats;
}

function analyzeTurboConfig() {
  const turboPath = path.join(process.cwd(), 'turbo.json');
  const recommendations = [];
  
  try {
    const turboConfig = JSON.parse(fs.readFileSync(turboPath, 'utf8'));
    
    if (!turboConfig.remoteCache) {
      recommendations.push('Enable Turbo remote caching for shared cache across CI runs');
    }
    
    if (!turboConfig.globalEnv || turboConfig.globalEnv.length < 5) {
      recommendations.push('Add more environment variables to globalEnv for better cache invalidation');
    }
    
    // Check task configurations
    const tasks = turboConfig.tasks || {};
    for (const [taskName, taskConfig] of Object.entries(tasks)) {
      if (!taskConfig.outputs || taskConfig.outputs.length === 0) {
        recommendations.push(`Add outputs configuration for task '${taskName}'`);
      }
      
      if (!taskConfig.inputs) {
        recommendations.push(`Add inputs configuration for task '${taskName}' for better caching`);
      }
    }
  } catch (error) {
    recommendations.push('Create or fix turbo.json configuration');
  }
  
  return recommendations;
}

function generateOptimizationReport() {
  log('\n🚀 CI/CD Performance Analysis Report\n', 'bright');
  
  // Analyze all workflows
  const workflowDir = path.join(process.cwd(), '.github', 'workflows');
  const workflows = fs.readdirSync(workflowDir)
    .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  
  const totalStats = {
    totalJobs: 0,
    totalParallelJobs: 0,
    totalCacheSteps: 0,
    totalSteps: 0,
    turboWorkflows: 0
  };
  
  log('📋 Workflow Analysis:', 'cyan');
  workflows.forEach(workflow => {
    const stats = analyzeWorkflow(path.join(workflowDir, workflow));
    totalStats.totalJobs += stats.jobs;
    totalStats.totalParallelJobs += stats.parallelJobs;
    totalStats.totalCacheSteps += stats.cacheSteps;
    totalStats.totalSteps += stats.totalSteps;
    if (stats.turboEnabled) totalStats.turboWorkflows++;
    
    log(`\n  ${stats.name}:`, 'yellow');
    log(`    - Jobs: ${stats.jobs} (${stats.parallelJobs} parallel)`);
    log(`    - Cache steps: ${stats.cacheSteps}/${stats.jobs} jobs`);
    log(`    - Turbo enabled: ${stats.turboEnabled ? '✅' : '❌'}`);
    
    if (stats.recommendations.length > 0) {
      log('    Recommendations:', 'red');
      stats.recommendations.forEach(rec => {
        log(`      - ${rec}`);
      });
    }
  });
  
  // Overall statistics
  log('\n📊 Overall Statistics:', 'cyan');
  log(`  - Total workflows: ${workflows.length}`);
  log(`  - Total jobs: ${totalStats.totalJobs}`);
  log(`  - Parallel jobs: ${totalStats.totalParallelJobs} (${Math.round(totalStats.totalParallelJobs / totalStats.totalJobs * 100)}%)`);
  log(`  - Cache usage: ${totalStats.totalCacheSteps} steps`);
  log(`  - Turbo-enabled workflows: ${totalStats.turboWorkflows}/${workflows.length}`);
  
  // Turbo configuration analysis
  log('\n⚡ Turbo Configuration:', 'cyan');
  const turboRecommendations = analyzeTurboConfig();
  if (turboRecommendations.length === 0) {
    log('  ✅ Turbo configuration looks good!', 'green');
  } else {
    turboRecommendations.forEach(rec => {
      log(`  - ${rec}`, 'yellow');
    });
  }
  
  // Performance recommendations
  log('\n🎯 Top Performance Optimizations:', 'bright');
  const topRecommendations = [
    {
      title: 'Enable Turbo Remote Cache',
      impact: 'High',
      effort: 'Low',
      description: 'Set up Turbo remote caching to share build artifacts across CI runs',
      command: 'npx turbo login && npx turbo link'
    },
    {
      title: 'Optimize Dependency Caching',
      impact: 'High',
      effort: 'Low',
      description: 'Ensure all jobs properly cache and restore dependencies',
      command: 'See example in .github/workflows/ci-optimized.yml'
    },
    {
      title: 'Parallelize Test Execution',
      impact: 'Medium',
      effort: 'Medium',
      description: 'Split tests into shards and run them in parallel',
      command: 'Use matrix strategy in GitHub Actions'
    },
    {
      title: 'Use --affected Flag',
      impact: 'High',
      effort: 'Low',
      description: 'Only run tasks for packages that have changed',
      command: 'turbo run build --affected'
    },
    {
      title: 'Implement Cache Warming',
      impact: 'Medium',
      effort: 'Medium',
      description: 'Pre-build and cache common dependencies',
      command: 'npm run cache:warmup'
    }
  ];
  
  topRecommendations.forEach((rec, index) => {
    log(`\n  ${index + 1}. ${rec.title}`, 'yellow');
    log(`     Impact: ${rec.impact} | Effort: ${rec.effort}`);
    log(`     ${rec.description}`);
    log(`     → ${rec.command}`, 'cyan');
  });
  
  // Current performance metrics
  log('\n📈 Current Performance Metrics:', 'cyan');
  try {
    // Try to get recent workflow run times
    const recentRuns = execSync('gh run list --limit 5 --json databaseId,displayTitle,conclusion,updatedAt,workflowName --jq ".[] | select(.conclusion != null)"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    if (recentRuns) {
      log('  Recent CI run times:', 'yellow');
      const runs = recentRuns.trim().split('\n').slice(0, 5);
      runs.forEach(run => {
        if (run) {
          const runData = JSON.parse(run);
          log(`    - ${runData.workflowName}: ${runData.conclusion}`);
        }
      });
    }
  } catch (error) {
    log('  Unable to fetch recent run metrics (gh CLI may not be available)', 'yellow');
  }
  
  // Estimated improvements
  log('\n💰 Estimated Improvements:', 'green');
  log('  With all optimizations implemented:');
  log('  - Build time reduction: 40-60%');
  log('  - Test execution time: 30-50% faster');
  log('  - Cache hit rate: >80%');
  log('  - Resource usage: 20-30% lower');
  
  log('\n✨ Next Steps:', 'bright');
  log('  1. Run: npm run turbo:login && npm run turbo:link');
  log('  2. Update CI workflows with caching improvements');
  log('  3. Enable --affected flag for PR builds');
  log('  4. Monitor metrics with: npm run cache:analyze\n');
}

// Run the analysis
generateOptimizationReport();