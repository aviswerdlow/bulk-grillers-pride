#!/usr/bin/env node

/**
 * Script to fix AI categorization job processing
 * This script will:
 * 1. Check the status of AI categorization jobs
 * 2. Clean up stuck jobs
 * 3. Trigger processing of pending jobs
 * 
 * Usage: node scripts/fix-ai-processing.js
 */

const { spawn } = require('child_process');

async function runConvexFunction(functionName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Running ${functionName}...`);
    
    const proc = spawn('npx', ['convex', 'run', functionName], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });
    
    let output = '';
    let error = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    proc.stderr.on('data', (data) => {
      error += data.toString();
      process.stderr.write(data);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`${functionName} failed: ${error}`));
      }
    });
  });
}

async function main() {
  console.log('🤖 AI Categorization Job Fixer\n');
  
  try {
    // Step 1: Check current job statuses
    console.log('📊 Step 1: Checking current job statuses...');
    await runConvexFunction('functions/ai/testProcessing:debugJobStatuses');
    
    // Step 2: Clean up stuck jobs
    console.log('\n🧹 Step 2: Cleaning up stuck jobs...');
    await runConvexFunction('functions/migrations/cleanupStuckJobs:cleanupStuckCategorizationJobs');
    
    // Step 3: Trigger pending jobs
    console.log('\n🚀 Step 3: Triggering pending jobs...');
    await runConvexFunction('functions/ai/testProcessing:triggerPendingJobs');
    
    // Step 4: Check status again
    console.log('\n📊 Step 4: Final status check...');
    await runConvexFunction('functions/ai/testProcessing:debugJobStatuses');
    
    console.log('\n✅ AI job processing fix completed!');
    console.log('\n💡 Next steps:');
    console.log('1. Monitor the Convex logs to see if jobs are processing');
    console.log('2. Check the AI Jobs table in the UI to see status updates');
    console.log('3. If jobs are still stuck, check for missing API keys in organization settings');
    console.log('4. Ensure the Convex dev server is running (npm run dev:convex)');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();