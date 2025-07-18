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
  console.log('🔍 Checking bundle sizes...\n');

  if (!fs.existsSync(BUILD_MANIFEST)) {
    console.error('❌ Build manifest not found. Run `npm run build` first.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(BUILD_MANIFEST, 'utf8'));
  
  // Calculate sizes
  const results = {
    passed: true,
    details: []
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
  });

  // Print results
  console.log('📊 Bundle Size Report\n');
  results.details.forEach(detail => console.log(detail));
  
  if (!results.passed) {
    console.log('\n❌ Bundle size check failed. Please optimize your bundles.');
    process.exit(1);
  } else {
    console.log('\n✅ All bundle sizes within budget!');
  }
}

// Run the check
checkBundleSize();