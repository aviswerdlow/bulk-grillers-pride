#!/usr/bin/env node

/**
 * Bundle Size Checker
 * 
 * Checks bundle sizes against defined budgets and fails CI if exceeded.
 * Run after build: node scripts/check-bundle-size.js
 */

const fs = require('fs');
const path = require('path');

// Bundle size budgets (in KB)
const BUDGETS = {
  'First Load JS': 200, // Total JS for initial page load
  'Route JS': 100,      // JS per route
  'Total': 500,         // Total bundle size
};

// Paths to check
const BUILD_MANIFEST = path.join(__dirname, '../apps/web/.next/build-manifest.json');
const APP_BUILD_MANIFEST = path.join(__dirname, '../apps/web/.next/app-build-manifest.json');

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function checkBundleSize() {
  const jsonOutput = process.argv.includes('--json');
  
  if (!jsonOutput) {
    console.log('🔍 Checking bundle sizes...\n');
  }

  if (!fs.existsSync(BUILD_MANIFEST)) {
    if (jsonOutput) {
      console.log(JSON.stringify({
        passed: false,
        error: 'Build manifest not found. Run `npm run build` first.',
        details: [],
        summary: {}
      }));
    } else {
      console.error('❌ Build manifest not found. Run `npm run build` first.');
    }
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(BUILD_MANIFEST, 'utf8'));
  
  // Calculate sizes
  const results = {
    passed: true,
    details: [],
    summary: {
      totalSize: '0 KB',
      firstLoadJS: '0 KB',
      routes: []
    }
  };

  // Check polyfills and main files
  const mainFiles = [
    ...(manifest.polyfillFiles || []),
    ...(manifest.rootMainFiles || [])
  ];

  let totalSize = 0;
  
  mainFiles.forEach(file => {
    const filePath = path.join(__dirname, '../apps/web/.next', file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    }
  });

  const totalSizeKB = totalSize / 1024;
  const firstLoadBudget = BUDGETS['First Load JS'];
  
  results.summary.firstLoadJS = formatBytes(totalSize);
  results.summary.totalSize = formatBytes(totalSize);
  
  if (totalSizeKB > firstLoadBudget) {
    results.passed = false;
    results.details.push(`❌ First Load JS: ${formatBytes(totalSize)} (budget: ${firstLoadBudget} KB)`);
  } else {
    results.details.push(`✅ First Load JS: ${formatBytes(totalSize)} (budget: ${firstLoadBudget} KB)`);
  }

  // Check individual routes
  Object.entries(manifest.pages || {}).forEach(([route, files]) => {
    let routeSize = 0;
    files.forEach(file => {
      const filePath = path.join(__dirname, '../apps/web/.next', file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        routeSize += stats.size;
      }
    });
    
    const routeSizeKB = routeSize / 1024;
    const routeBudget = BUDGETS['Route JS'];
    
    if (routeSizeKB > routeBudget) {
      results.passed = false;
      results.details.push(`❌ Route ${route}: ${formatBytes(routeSize)} (budget: ${routeBudget} KB)`);
    }
    
    // Add route info to summary
    results.summary.routes.push({
      route,
      size: formatBytes(routeSize),
      passed: routeSizeKB <= routeBudget
    });
  });

  // Print results
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('📊 Bundle Size Report\n');
    results.details.forEach(detail => console.log(detail));
    
    if (!results.passed) {
      console.log('\n❌ Bundle size check failed. Please optimize your bundles.');
      process.exit(1);
    } else {
      console.log('\n✅ All bundle sizes within budget!');
    }
  }
  
  // Exit with appropriate code
  if (!results.passed) {
    process.exit(1);
  }
}

// Run the check
checkBundleSize();