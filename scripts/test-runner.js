#!/usr/bin/env node

/**
 * Test Runner Helper Script
 * Helps run tests incrementally with memory monitoring
 */

const { spawn } = require('child_process');
const os = require('os');

const PROJECTS = ['web', 'convex', 'factories'];
const MEMORY_THRESHOLD = 0.8; // 80% of available memory

function formatBytes(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function checkMemory() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usage = usedMem / totalMem;

  console.log(`Memory: ${formatBytes(usedMem)}/${formatBytes(totalMem)} (${(usage * 100).toFixed(1)}%)`);
  
  return {
    usage,
    available: freeMem,
    total: totalMem
  };
}

async function runTestProject(project) {
  console.log(`\n🧪 Running tests for: ${project}`);
  console.log('─'.repeat(50));
  
  const memCheck = checkMemory();
  if (memCheck.usage > MEMORY_THRESHOLD) {
    console.warn(`⚠️  High memory usage detected (${(memCheck.usage * 100).toFixed(1)}%)`);
    console.log('💡 Tip: Close other applications or use test:sequential');
  }

  return new Promise((resolve, reject) => {
    const testProcess = spawn('npm', ['run', `test:${project}`], {
      stdio: 'inherit',
      shell: true
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${project} tests passed`);
        resolve();
      } else {
        console.error(`❌ ${project} tests failed with code ${code}`);
        reject(new Error(`Tests failed for ${project}`));
      }
    });

    testProcess.on('error', (err) => {
      console.error(`❌ Error running ${project} tests:`, err);
      reject(err);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting incremental test run');
  console.log(`📊 Initial memory check:`);
  checkMemory();
  
  const args = process.argv.slice(2);
  const selectedProjects = args.length > 0 ? args : PROJECTS;
  
  for (const project of selectedProjects) {
    if (!PROJECTS.includes(project)) {
      console.error(`❌ Unknown project: ${project}`);
      console.log(`Available projects: ${PROJECTS.join(', ')}`);
      process.exit(1);
    }
  }

  console.log(`\n📋 Running tests for: ${selectedProjects.join(', ')}\n`);

  let failed = false;
  for (const project of selectedProjects) {
    try {
      await runTestProject(project);
      
      // Check memory after each project
      const memCheck = checkMemory();
      if (memCheck.usage > 0.9) {
        console.warn('\n⚠️  Critical memory usage! Pausing for 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (err) {
      failed = true;
      if (args.includes('--bail')) {
        console.error('\n💥 Bailing out due to test failure');
        process.exit(1);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  if (failed) {
    console.log('❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    console.log(`📊 Final memory check:`);
    checkMemory();
  }
}

// Help text
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Test Runner Helper - Run tests incrementally with memory monitoring

Usage:
  node scripts/test-runner.js [projects...] [options]

Projects:
  web            Run web app tests
  convex         Run Convex backend tests  
  test-factories Run test factory tests

Options:
  --bail         Stop on first test failure
  --help, -h     Show this help message

Examples:
  node scripts/test-runner.js                    # Run all projects
  node scripts/test-runner.js web               # Run only web tests
  node scripts/test-runner.js web convex --bail # Run web and convex, stop on failure
`);
  process.exit(0);
}

// Run tests
runAllTests().catch(err => {
  console.error('💥 Test runner failed:', err);
  process.exit(1);
});