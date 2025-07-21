#!/usr/bin/env node

/**
 * Turbo Cache Analysis Script
 * 
 * Analyzes Turbo cache performance and provides optimization recommendations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TURBO_CACHE_DIR = '.turbo/cache';
const CACHE_SIZE_THRESHOLD_MB = 500;

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function getCacheSize() {
  try {
    const output = execSync(`du -sk ${TURBO_CACHE_DIR} 2>/dev/null || echo "0"`, { encoding: 'utf8' });
    const sizeKB = parseInt(output.split('\t')[0]);
    return sizeKB * 1024; // Convert to bytes
  } catch {
    return 0;
  }
}

function getCacheFileCount() {
  try {
    const output = execSync(`find ${TURBO_CACHE_DIR} -type f 2>/dev/null | wc -l`, { encoding: 'utf8' });
    return parseInt(output.trim());
  } catch {
    return 0;
  }
}

function getRecentCacheHits() {
  try {
    // Look for cache hit indicators in recent Turbo runs
    const logPath = '.turbo/runs';
    if (!fs.existsSync(logPath)) return { hits: 0, misses: 0 };
    
    // This is a simplified check - in practice, you'd parse Turbo's output
    return { hits: 0, misses: 0 };
  } catch {
    return { hits: 0, misses: 0 };
  }
}

function analyzeTaskConfiguration() {
  const turboConfig = JSON.parse(fs.readFileSync('turbo.json', 'utf8'));
  const issues = [];
  const recommendations = [];
  
  // Check for missing outputs
  Object.entries(turboConfig.tasks || {}).forEach(([task, config]) => {
    if (config.cache !== false && (!config.outputs || config.outputs.length === 0)) {
      issues.push(`Task '${task}' has caching enabled but no outputs defined`);
    }
    
    // Check for overly broad inputs
    if (config.inputs && config.inputs.includes('**/*')) {
      recommendations.push(`Task '${task}' has very broad inputs which may cause cache misses`);
    }
  });
  
  // Check environment mode
  if (!turboConfig.envMode || turboConfig.envMode === 'loose') {
    recommendations.push('Consider using strict environment mode for better cache hits');
  }
  
  return { issues, recommendations };
}

function generateReport() {
  console.log('🔍 Turbo Cache Analysis Report');
  console.log('================================\n');
  
  // Cache statistics
  const cacheSize = getCacheSize();
  const fileCount = getCacheFileCount();
  const cacheSizeMB = cacheSize / (1024 * 1024);
  
  console.log('📊 Cache Statistics:');
  console.log(`   Size: ${formatBytes(cacheSize)}`);
  console.log(`   Files: ${fileCount}`);
  console.log(`   Average file size: ${fileCount > 0 ? formatBytes(cacheSize / fileCount) : 'N/A'}`);
  
  if (cacheSizeMB < 1) {
    console.log('   ⚠️  Cache is very small - this may indicate underutilization');
  } else if (cacheSizeMB > CACHE_SIZE_THRESHOLD_MB) {
    console.log('   ⚠️  Cache is large - consider cleanup or remote caching');
  }
  
  console.log('\n📋 Configuration Analysis:');
  const { issues, recommendations } = analyzeTaskConfiguration();
  
  if (issues.length > 0) {
    console.log('   Issues:');
    issues.forEach(issue => console.log(`   ❌ ${issue}`));
  }
  
  if (recommendations.length > 0) {
    console.log('\n   Recommendations:');
    recommendations.forEach(rec => console.log(`   💡 ${rec}`));
  }
  
  console.log('\n🚀 Optimization Suggestions:');
  console.log('   1. Enable daemon mode: turbo.json → "daemon": true');
  console.log('   2. Use remote caching for CI: Set TURBO_TOKEN and TURBO_TEAM');
  console.log('   3. Optimize inputs: Be specific about which files affect each task');
  console.log('   4. Use --affected flag in CI to only run changed packages');
  console.log('   5. Monitor cache hit rate: turbo run build --dry-run');
  
  console.log('\n📝 Next Steps:');
  console.log('   - Run: turbo run build --dry-run to see what would be cached');
  console.log('   - Run: turbo run build --force to rebuild without cache');
  console.log('   - Run: turbo daemon status to check daemon status');
  console.log('   - Run: turbo run build --concurrency=50% for optimal CI performance');
}

// Main execution
if (require.main === module) {
  generateReport();
}