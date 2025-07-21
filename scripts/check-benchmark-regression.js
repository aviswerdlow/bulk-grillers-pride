#!/usr/bin/env node

/**
 * Benchmark Regression Checker
 * 
 * Compares current benchmark results against baseline to detect performance regressions
 */

const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('current', {
    alias: 'c',
    description: 'Current benchmark results file',
    default: 'benchmark-results.json',
  })
  .option('baseline', {
    alias: 'b',
    description: 'Baseline benchmark results file or branch name',
    default: 'main',
  })
  .option('threshold', {
    alias: 't',
    description: 'Regression threshold percentage (0.0-1.0)',
    type: 'number',
    default: 0.1, // 10% regression threshold
  })
  .option('metrics', {
    alias: 'm',
    description: 'Metrics to check for regression',
    type: 'array',
    default: ['responseTime', 'throughput', 'errorRate', 'cost'],
  })
  .option('strict', {
    alias: 's',
    description: 'Fail on any regression (ignore threshold)',
    type: 'boolean',
    default: false,
  })
  .help()
  .argv;

/**
 * Load benchmark results from file or fetch from baseline branch
 */
async function loadBenchmarkResults(source) {
  // If source is a file path
  if (fs.existsSync(source)) {
    console.log(`📂 Loading results from file: ${source}`);
    return JSON.parse(fs.readFileSync(source, 'utf8'));
  }
  
  // If source is a branch name, fetch from CI artifacts or storage
  console.log(`🌿 Fetching baseline results from branch: ${source}`);
  
  // In a real implementation, this would fetch from:
  // 1. GitHub Actions artifacts
  // 2. S3/Cloud storage
  // 3. Database
  // For now, we'll look for a cached baseline file
  const baselinePath = path.join('.benchmarks', `baseline-${source}.json`);
  if (fs.existsSync(baselinePath)) {
    return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  }
  
  throw new Error(`Baseline results not found for branch: ${source}`);
}

/**
 * Extract metric value from nested results object
 */
function getMetricValue(results, metricPath, system = 'crewai') {
  // Handle different result formats
  const systemData = results[system] || 
                    results.report?.[system] || 
                    results.fullComparison?.[system];
  
  if (!systemData) {
    return null;
  }
  
  // Navigate nested path (e.g., 'responseTime.p95')
  const paths = metricPath.split('.');
  let value = systemData;
  
  for (const path of paths) {
    value = value?.[path];
    if (value === undefined) {
      return null;
    }
  }
  
  return value;
}

/**
 * Check for regression in a specific metric
 */
function checkMetricRegression(currentValue, baselineValue, threshold, lowerIsBetter = true) {
  if (currentValue === null || baselineValue === null) {
    return { regressed: false, message: 'Missing data for comparison' };
  }
  
  const percentChange = ((currentValue - baselineValue) / baselineValue) * 100;
  const regression = lowerIsBetter ? percentChange > threshold * 100 : percentChange < -threshold * 100;
  
  return {
    regressed: regression,
    percentChange,
    currentValue,
    baselineValue,
  };
}

/**
 * Main regression checking logic
 */
async function checkRegression() {
  console.log('🔍 Checking for performance regressions...\n');
  
  try {
    // Load current and baseline results
    const currentResults = await loadBenchmarkResults(argv.current);
    const baselineResults = await loadBenchmarkResults(argv.baseline);
    
    // Define metrics to check with their paths and properties
    const metricsConfig = {
      responseTime: {
        paths: ['responseTime.p50', 'responseTime.p95', 'responseTime.p99'],
        lowerIsBetter: true,
        unit: 'ms',
      },
      throughput: {
        paths: ['throughput.mean'],
        lowerIsBetter: false,
        unit: 'products/min',
      },
      errorRate: {
        paths: ['quality.errorRate'],
        lowerIsBetter: true,
        unit: '%',
        multiplier: 100, // Convert to percentage
      },
      cost: {
        paths: ['cost.mean'],
        lowerIsBetter: true,
        unit: '$',
      },
      accuracy: {
        paths: ['quality.accuracy'],
        lowerIsBetter: false,
        unit: '%',
        multiplier: 100, // Convert to percentage
      },
    };
    
    const regressions = [];
    const improvements = [];
    const unchanged = [];
    
    // Check each metric
    for (const metricName of argv.metrics) {
      const config = metricsConfig[metricName];
      if (!config) {
        console.warn(`⚠️  Unknown metric: ${metricName}`);
        continue;
      }
      
      console.log(`\n📊 Checking ${metricName}:`);
      
      for (const metricPath of config.paths) {
        const currentValue = getMetricValue(currentResults, metricPath);
        const baselineValue = getMetricValue(baselineResults, metricPath);
        
        if (currentValue === null || baselineValue === null) {
          console.log(`  ⏭️  ${metricPath}: No data available`);
          continue;
        }
        
        const result = checkMetricRegression(
          currentValue,
          baselineValue,
          argv.strict ? 0 : argv.threshold,
          config.lowerIsBetter
        );
        
        const displayCurrent = currentValue * (config.multiplier || 1);
        const displayBaseline = baselineValue * (config.multiplier || 1);
        
        if (result.regressed) {
          regressions.push({ metric: metricPath, ...result });
          console.log(`  ❌ ${metricPath}: REGRESSION`);
          console.log(`     Baseline: ${displayBaseline.toFixed(2)}${config.unit}`);
          console.log(`     Current:  ${displayCurrent.toFixed(2)}${config.unit}`);
          console.log(`     Change:   ${result.percentChange > 0 ? '+' : ''}${result.percentChange.toFixed(1)}%`);
        } else if (Math.abs(result.percentChange) > 5) {
          // Significant improvement
          improvements.push({ metric: metricPath, ...result });
          console.log(`  ✅ ${metricPath}: IMPROVED`);
          console.log(`     Baseline: ${displayBaseline.toFixed(2)}${config.unit}`);
          console.log(`     Current:  ${displayCurrent.toFixed(2)}${config.unit}`);
          console.log(`     Change:   ${result.percentChange > 0 ? '+' : ''}${result.percentChange.toFixed(1)}%`);
        } else {
          unchanged.push({ metric: metricPath, ...result });
          console.log(`  ➖ ${metricPath}: No significant change`);
          console.log(`     Current:  ${displayCurrent.toFixed(2)}${config.unit} (${result.percentChange > 0 ? '+' : ''}${result.percentChange.toFixed(1)}%)`);
        }
      }
    }
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`  Regressions: ${regressions.length}`);
    console.log(`  Improvements: ${improvements.length}`);
    console.log(`  Unchanged: ${unchanged.length}`);
    
    // Generate report file
    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        threshold: argv.threshold,
        strict: argv.strict,
        metrics: argv.metrics,
      },
      results: {
        regressions,
        improvements,
        unchanged,
      },
      summary: {
        hasRegressions: regressions.length > 0,
        regressionCount: regressions.length,
        improvementCount: improvements.length,
        unchangedCount: unchanged.length,
      },
    };
    
    // Save regression report
    const reportPath = 'regression-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Regression report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    if (regressions.length > 0) {
      console.error('\n❌ Performance regressions detected!');
      console.error('   Fix the regressions or adjust the threshold if acceptable.');
      process.exit(1);
    } else {
      console.log('\n✅ No performance regressions detected!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error checking regression:', error.message);
    process.exit(1);
  }
}

// Helper function to save baseline for future comparisons
async function saveBaseline() {
  const branchName = process.env.GITHUB_REF_NAME || 'main';
  const resultsPath = argv.current || 'benchmark-results.json';
  
  if (!fs.existsSync(resultsPath)) {
    console.error(`❌ Results file not found: ${resultsPath}`);
    process.exit(1);
  }
  
  // Create benchmarks directory if it doesn't exist
  const benchmarksDir = '.benchmarks';
  if (!fs.existsSync(benchmarksDir)) {
    fs.mkdirSync(benchmarksDir, { recursive: true });
  }
  
  // Save baseline
  const baselinePath = path.join(benchmarksDir, `baseline-${branchName}.json`);
  fs.copyFileSync(resultsPath, baselinePath);
  
  console.log(`✅ Baseline saved for branch '${branchName}' at: ${baselinePath}`);
}

// Check if we're saving a baseline
if (process.argv.includes('--save-baseline')) {
  saveBaseline();
} else {
  // Run regression check
  checkRegression().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}