#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Coverage Trend Tracker
 * Tracks test coverage over time and generates reports
 */

const COVERAGE_HISTORY_FILE = '.coverage-history.json';
const COVERAGE_SUMMARY_FILE = 'coverage/coverage-summary.json';

function loadCoverageHistory() {
  if (fs.existsSync(COVERAGE_HISTORY_FILE)) {
    return JSON.parse(fs.readFileSync(COVERAGE_HISTORY_FILE, 'utf8'));
  }
  return [];
}

function saveCoverageHistory(history) {
  fs.writeFileSync(COVERAGE_HISTORY_FILE, JSON.stringify(history, null, 2));
}

function getCurrentCoverage() {
  if (!fs.existsSync(COVERAGE_SUMMARY_FILE)) {
    console.error('Coverage summary not found. Run tests with coverage first.');
    process.exit(1);
  }
  
  const summary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_FILE, 'utf8'));
  return {
    timestamp: new Date().toISOString(),
    statements: summary.total.statements.pct,
    branches: summary.total.branches.pct,
    functions: summary.total.functions.pct,
    lines: summary.total.lines.pct,
  };
}

function generateTrendReport(history) {
  if (history.length < 2) {
    return 'Not enough data for trend analysis. Run tests multiple times.';
  }
  
  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  
  const trends = {
    statements: latest.statements - previous.statements,
    branches: latest.branches - previous.branches,
    functions: latest.functions - previous.functions,
    lines: latest.lines - previous.lines,
  };
  
  let report = '## Coverage Trend Report\n\n';
  report += `### Current Coverage (${new Date(latest.timestamp).toLocaleDateString()})\n`;
  report += `- Statements: ${latest.statements.toFixed(2)}% (${trends.statements >= 0 ? '+' : ''}${trends.statements.toFixed(2)}%)\n`;
  report += `- Branches: ${latest.branches.toFixed(2)}% (${trends.branches >= 0 ? '+' : ''}${trends.branches.toFixed(2)}%)\n`;
  report += `- Functions: ${latest.functions.toFixed(2)}% (${trends.functions >= 0 ? '+' : ''}${trends.functions.toFixed(2)}%)\n`;
  report += `- Lines: ${latest.lines.toFixed(2)}% (${trends.lines >= 0 ? '+' : ''}${trends.lines.toFixed(2)}%)\n`;
  
  // Phase tracking
  const currentPhase = getPhase(latest.lines);
  const nextThreshold = getNextThreshold(latest.lines);
  
  report += `\n### Phase Progress\n`;
  report += `- Current Phase: ${currentPhase}\n`;
  report += `- Current Threshold: ${getThreshold(latest.lines)}%\n`;
  report += `- Next Target: ${nextThreshold}%\n`;
  report += `- Progress to Next: ${((latest.lines / nextThreshold) * 100).toFixed(1)}%\n`;
  
  return report;
}

function getPhase(coverage) {
  if (coverage < 15) return 'Phase 1: Foundation';
  if (coverage < 30) return 'Phase 2: Expansion';
  if (coverage < 50) return 'Phase 3: Maturity';
  if (coverage < 70) return 'Phase 4: Excellence';
  return 'Target Achieved! 🎉';
}

function getThreshold(coverage) {
  if (coverage < 15) return 15;
  if (coverage < 30) return 30;
  if (coverage < 50) return 50;
  if (coverage < 70) return 70;
  return 80;
}

function getNextThreshold(coverage) {
  if (coverage < 15) return 15;
  if (coverage < 30) return 30;
  if (coverage < 50) return 50;
  if (coverage < 70) return 70;
  return 80;
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'record':
    const history = loadCoverageHistory();
    const current = getCurrentCoverage();
    history.push(current);
    
    // Keep last 30 entries
    if (history.length > 30) {
      history.shift();
    }
    
    saveCoverageHistory(history);
    console.log('✅ Coverage recorded:', current);
    break;
    
  case 'report':
    const reportHistory = loadCoverageHistory();
    const report = generateTrendReport(reportHistory);
    console.log(report);
    
    // Save report to file
    fs.writeFileSync('coverage-trend-report.md', report);
    console.log('\n📊 Report saved to coverage-trend-report.md');
    break;
    
  case 'check':
    const checkHistory = loadCoverageHistory();
    if (checkHistory.length === 0) {
      console.log('No coverage history found.');
      break;
    }
    
    const latestCoverage = checkHistory[checkHistory.length - 1];
    const threshold = getThreshold(latestCoverage.lines);
    
    if (latestCoverage.lines >= threshold) {
      console.log(`✅ Coverage ${latestCoverage.lines.toFixed(2)}% meets threshold ${threshold}%`);
      process.exit(0);
    } else {
      console.log(`❌ Coverage ${latestCoverage.lines.toFixed(2)}% below threshold ${threshold}%`);
      process.exit(1);
    }
    break;
    
  default:
    console.log('Usage: node track-coverage.js [record|report|check]');
    console.log('  record - Record current coverage to history');
    console.log('  report - Generate trend report');
    console.log('  check  - Check if coverage meets threshold');
    process.exit(1);
}