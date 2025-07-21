#!/usr/bin/env node

/**
 * Benchmark Runner CLI
 * 
 * Executes performance benchmarks comparing LangChain and CrewAI
 */

const { ConvexClient } = require('convex/browser');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('type', {
    alias: 't',
    description: 'Type of benchmark to run',
    choices: ['quick', 'standard', 'full'],
    default: 'quick',
  })
  .option('baseline', {
    alias: 'b',
    description: 'Baseline system',
    choices: ['langchain', 'crewai'],
    default: 'langchain',
  })
  .option('test', {
    alias: 's',
    description: 'Test system',
    choices: ['langchain', 'crewai'],
    default: 'crewai',
  })
  .option('provider', {
    alias: 'p',
    description: 'AI provider to test',
    choices: ['openai', 'anthropic', 'gemini'],
    default: 'openai',
  })
  .option('products', {
    description: 'Number of products to test',
    type: 'number',
    default: 100,
  })
  .option('iterations', {
    alias: 'i',
    description: 'Number of test iterations',
    type: 'number',
    default: 5,
  })
  .help()
  .argv;

async function runBenchmark() {
  // Initialize Convex client
  const client = new ConvexClient(process.env.CONVEX_URL);
  
  console.log('🚀 Starting performance benchmark...');
  console.log(`Type: ${argv.type}`);
  console.log(`Baseline: ${argv.baseline}`);
  console.log(`Test: ${argv.test}`);
  console.log(`Provider: ${argv.provider}`);
  
  try {
    let result;
    
    switch (argv.type) {
      case 'quick':
        console.log(`\n📊 Running quick A/B comparison (${argv.products} products, ${argv.iterations} iterations)...`);
        
        result = await client.action('benchmarks:orchestrator:runABComparison', {
          name: `Quick benchmark: ${argv.baseline} vs ${argv.test}`,
          baselineSystem: argv.baseline,
          testSystem: argv.test,
          provider: argv.provider,
          productCount: argv.products,
          iterations: argv.iterations,
        });
        
        if (result.success) {
          displayQuickResults(result.abResults);
        }
        break;
        
      case 'standard':
        console.log('\n📊 Running standard benchmark suite...');
        
        result = await client.action('benchmarks:orchestrator:runBenchmarkSuite', {
          name: 'Standard benchmark suite',
          includeSystemS: [argv.baseline, argv.test],
          includeProviders: ['openai', 'anthropic'], // Test main providers
        });
        
        if (result.success) {
          displayStandardResults(result);
        }
        break;
        
      case 'full':
        console.log('\n📊 Running full benchmark suite (this may take a while)...');
        
        result = await client.action('benchmarks:orchestrator:runBenchmarkSuite', {
          name: 'Full benchmark suite',
          // All systems and providers
        });
        
        if (result.success) {
          displayFullResults(result);
        }
        break;
    }
    
    if (!result.success) {
      console.error('❌ Benchmark failed:', result.error);
      process.exit(1);
    }
    
    // Save results to file
    const fs = require('fs');
    fs.writeFileSync(
      'benchmark-results.json',
      JSON.stringify(result, null, 2)
    );
    
    console.log('\n✅ Benchmark completed successfully!');
    console.log('📄 Results saved to benchmark-results.json');
    
  } catch (error) {
    console.error('❌ Error running benchmark:', error.message);
    process.exit(1);
  }
}

function displayQuickResults(results) {
  console.log('\n=== A/B Test Results ===');
  console.log(`Winner: ${results.winner.toUpperCase()}`);
  
  console.log('\n📈 Performance Metrics:');
  console.log(`Response Time (P95):`);
  console.log(`  Baseline: ${results.metrics.responseTime.baseline}ms`);
  console.log(`  Test: ${results.metrics.responseTime.test}ms`);
  console.log(`  Improvement: ${formatPercentage(results.metrics.responseTime.improvement)}`);
  
  console.log(`\nThroughput:`);
  console.log(`  Baseline: ${Math.round(results.metrics.throughput.baseline)} products/min`);
  console.log(`  Test: ${Math.round(results.metrics.throughput.test)} products/min`);
  console.log(`  Improvement: ${formatPercentage(results.metrics.throughput.improvement)}`);
  
  console.log(`\nCost per Product:`);
  console.log(`  Baseline: $${results.metrics.cost.baseline.toFixed(4)}`);
  console.log(`  Test: $${results.metrics.cost.test.toFixed(4)}`);
  console.log(`  Savings: ${formatPercentage(results.metrics.cost.savings)}`);
  
  console.log(`\nAccuracy:`);
  console.log(`  Baseline: ${(results.metrics.accuracy.baseline * 100).toFixed(2)}%`);
  console.log(`  Test: ${(results.metrics.accuracy.test * 100).toFixed(2)}%`);
  console.log(`  Improvement: ${formatPercentage(results.metrics.accuracy.improvement)}`);
  
  console.log(`\n💡 Recommendation: ${results.recommendation}`);
}

function displayStandardResults(result) {
  console.log('\n=== Standard Benchmark Results ===');
  console.log(`Total Runs: ${result.summary.totalRuns}`);
  console.log(`Successful: ${result.summary.successfulRuns}`);
  console.log(`Failed: ${result.summary.failedRuns}`);
  console.log(`Success Rate: ${result.summary.successRate.toFixed(2)}%`);
  
  if (result.report && result.report.comparison) {
    console.log('\n📊 System Comparison:');
    const comp = result.report.comparison;
    
    console.log('\nPerformance Improvements:');
    console.log(`  Response Time (P95): ${formatPercentage(comp.responseTimeImprovement.p95)}`);
    console.log(`  Throughput: ${formatPercentage(comp.throughputImprovement)}`);
    console.log(`  Cost: ${formatPercentage(comp.costReduction)}`);
    console.log(`  Accuracy: ${formatPercentage(comp.accuracyImprovement)}`);
    
    console.log('\nSuccess Criteria:');
    console.log(`  Response Time < 5s: ${comp.meetsSuccessCriteria.responseTime ? '✅' : '❌'}`);
    console.log(`  Throughput > 750/min: ${comp.meetsSuccessCriteria.throughput ? '✅' : '❌'}`);
    console.log(`  Error Rate < 1%: ${comp.meetsSuccessCriteria.errorRate ? '✅' : '❌'}`);
  }
}

function displayFullResults(result) {
  console.log('\n=== Full Benchmark Results ===');
  displayStandardResults(result);
  
  console.log('\n📊 Detailed Configuration Results:');
  result.summary.configurations.forEach(config => {
    console.log(`  ${config.name}: ${config.success ? '✅' : '❌'}`);
  });
}

function formatPercentage(value) {
  if (value === undefined || value === null) return 'N/A';
  const formatted = value.toFixed(1);
  if (value > 0) {
    return `+${formatted}% ✅`;
  } else if (value < 0) {
    return `${formatted}% ❌`;
  } else {
    return `${formatted}%`;
  }
}

// Run the benchmark
runBenchmark().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});