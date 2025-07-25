#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Dynamic Jest sharding system for optimal test distribution
 */

// Get test timing data from previous runs (if available)
function getTestTimings() {
  const timingFile = path.join(__dirname, '..', '.jest-cache', 'test-timings.json');
  if (fs.existsSync(timingFile)) {
    return JSON.parse(fs.readFileSync(timingFile, 'utf8'));
  }
  return {};
}

// Collect all test files for a given project
function collectTestFiles(project) {
  const testPatterns = {
    web: 'apps/web/**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    convex: 'convex/**/__tests__/**/*.(test|spec).(ts|js)',
    'test-factories': 'packages/test-factories/**/__tests__/**/*.(test|spec).(ts|js)',
  };

  const pattern = testPatterns[project];
  if (!pattern) {
    throw new Error(`Unknown project: ${project}`);
  }

  // Use find command to get all test files
  const rootDir = path.join(__dirname, '..');
  const findCmd = `find ${rootDir} -path "*/node_modules" -prune -o -path "*/.next" -prune -o -path "*/.turbo" -prune -o -type f \\( -name "*.test.*" -o -name "*.spec.*" \\) -print | grep -E "${pattern.replace(/\*/g, '.*').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\|/g, '\\|')}"`;
  
  try {
    const files = execSync(findCmd, { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map(file => path.relative(rootDir, file));
    return files;
  } catch (error) {
    console.error('Error collecting test files:', error.message);
    return [];
  }
}

// Distribute tests across shards based on timing data
function distributeTests(files, shardCount, timings = {}) {
  const shards = Array(shardCount).fill(null).map(() => ({
    files: [],
    estimatedTime: 0,
  }));

  // Sort files by estimated time (slowest first)
  const sortedFiles = files.sort((a, b) => {
    const timeA = timings[a] || 1000; // Default 1s if no timing data
    const timeB = timings[b] || 1000;
    return timeB - timeA;
  });

  // Distribute files using a greedy algorithm
  sortedFiles.forEach(file => {
    // Find shard with least estimated time
    let minShard = shards[0];
    let minIndex = 0;
    shards.forEach((shard, index) => {
      if (shard.estimatedTime < minShard.estimatedTime) {
        minShard = shard;
        minIndex = index;
      }
    });

    // Add file to the shard with least time
    const fileTime = timings[file] || 1000;
    shards[minIndex].files.push(file);
    shards[minIndex].estimatedTime += fileTime;
  });

  return shards;
}

// Generate sharding configuration
function generateShardConfig(project, shardIndex, totalShards) {
  const timings = getTestTimings();
  const files = collectTestFiles(project);
  
  if (files.length === 0) {
    console.log(`No test files found for project: ${project}`);
    return null;
  }

  const shards = distributeTests(files, totalShards, timings[project] || {});
  const selectedShard = shards[shardIndex - 1];

  if (!selectedShard || selectedShard.files.length === 0) {
    console.log(`No tests assigned to shard ${shardIndex}/${totalShards} for project ${project}`);
    return null;
  }

  console.log(`Shard ${shardIndex}/${totalShards} for ${project}:`);
  console.log(`- Files: ${selectedShard.files.length}`);
  console.log(`- Estimated time: ${Math.round(selectedShard.estimatedTime / 1000)}s`);

  return {
    project,
    shard: shardIndex,
    totalShards,
    files: selectedShard.files,
    testPathPattern: generateTestPathPattern(selectedShard.files),
  };
}

// Generate a regex pattern that matches the selected files
function generateTestPathPattern(files) {
  if (files.length === 0) return '';
  
  // Group files by directory to create more efficient patterns
  const filesByDir = {};
  files.forEach(file => {
    const dir = path.dirname(file);
    if (!filesByDir[dir]) {
      filesByDir[dir] = [];
    }
    filesByDir[dir].push(path.basename(file));
  });

  // Create patterns for each directory
  const patterns = Object.entries(filesByDir).map(([dir, fileNames]) => {
    if (fileNames.length === 1) {
      return `${dir}/${fileNames[0]}`;
    }
    // Create a pattern that matches multiple files in the same directory
    const names = fileNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return `${dir}/(${names.join('|')})`;
  });

  // If too many patterns, fall back to listing all files
  if (patterns.length > 10) {
    return files.join('|');
  }

  return patterns.join('|');
}

// Save timing data after test run
function saveTimings(project, timingData) {
  const timingFile = path.join(__dirname, '..', '.jest-cache', 'test-timings.json');
  let allTimings = {};
  
  if (fs.existsSync(timingFile)) {
    allTimings = JSON.parse(fs.readFileSync(timingFile, 'utf8'));
  }
  
  allTimings[project] = { ...allTimings[project], ...timingData };
  
  fs.writeFileSync(timingFile, JSON.stringify(allTimings, null, 2));
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: jest-sharding.js <project> <shard> <total-shards>');
    process.exit(1);
  }

  const [project, shard, totalShards] = args;
  const shardIndex = parseInt(shard, 10);
  const totalShardCount = parseInt(totalShards, 10);

  const config = generateShardConfig(project, shardIndex, totalShardCount);
  
  if (config) {
    // Output the test path pattern for Jest
    console.log('\nTest path pattern:');
    console.log(config.testPathPattern);
    
    // Write config to temp file for CI to use
    const configFile = path.join(__dirname, '..', `.shard-config-${project}-${shardIndex}.json`);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  }
}

module.exports = {
  collectTestFiles,
  distributeTests,
  generateShardConfig,
  saveTimings,
};