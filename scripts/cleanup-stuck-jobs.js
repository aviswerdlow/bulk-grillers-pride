#!/usr/bin/env node

/**
 * Script to clean up stuck AI categorization jobs
 * Run this script to cancel all jobs that have been stuck in 'running' state
 * 
 * Usage: node scripts/cleanup-stuck-jobs.js
 */

const { spawn } = require('child_process');

console.log('🧹 Cleaning up stuck AI categorization jobs...\n');

// Run the cleanup migration
const convexRun = spawn('npx', [
  'convex',
  'run',
  'functions/migrations/cleanupStuckJobs:cleanupStuckCategorizationJobs',
], {
  stdio: 'inherit',
  shell: true,
});

convexRun.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Cleanup completed successfully!');
    console.log('The stuck jobs have been cancelled.');
    console.log('\n💡 Next steps:');
    console.log('1. Restart the Convex dev server (Ctrl+C and run npm run dev:convex)');
    console.log('2. The cancelCategorizationJob function should now be available');
    console.log('3. Fix the processCategorizationJob action (T59) to prevent future stuck jobs');
  } else {
    console.error('\n❌ Cleanup failed with exit code:', code);
    console.error('Please check the error messages above and try again.');
  }
});