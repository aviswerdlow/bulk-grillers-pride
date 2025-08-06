#!/usr/bin/env node
/* eslint-disable no-unused-vars */
/* global require, module, process, console */

/**
 * Collect stability metrics for the main branch
 * This script analyzes various aspects of the codebase and CI/CD pipeline
 * to calculate a comprehensive stability score
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Execute a command and return the output
 */
function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return '';
  }
}

/**
 * Get test coverage from the last coverage report
 */
function getTestCoverage() {
  try {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const totalCoverage = coverage.total;

      // Calculate average coverage across all metrics
      const metrics = ['lines', 'statements', 'functions', 'branches'];
      const avgCoverage =
        metrics.reduce((sum, metric) => {
          return sum + (totalCoverage[metric]?.pct || 0);
        }, 0) / metrics.length;

      return Math.round(avgCoverage * 10) / 10;
    }

    // If no coverage report exists, try to generate one
    console.warn('No coverage report found, attempting to generate...');
    exec('npm run test:coverage -- --silent', { stdio: 'pipe' });

    // Try reading again after generation
    if (fs.existsSync(coveragePath)) {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const totalCoverage = coverage.total;
      const metrics = ['lines', 'statements', 'functions', 'branches'];
      const avgCoverage =
        metrics.reduce((sum, metric) => {
          return sum + (totalCoverage[metric]?.pct || 0);
        }, 0) / metrics.length;

      return Math.round(avgCoverage * 10) / 10;
    }

    // Default to 0 if we can't get coverage
    return 0;
  } catch (error) {
    console.error('Error getting test coverage:', error.message);
    return 0;
  }
}

/**
 * Get test pass rate from Jest results
 */
function getTestPassRate() {
  try {
    // Run tests with JSON reporter
    const result = exec('npm test -- --json --silent', { stdio: 'pipe' });
    if (result) {
      const testResults = JSON.parse(result);
      const totalTests = testResults.numTotalTests || 0;
      const passedTests = testResults.numPassedTests || 0;

      if (totalTests === 0) return 0;
      return Math.round((passedTests / totalTests) * 1000) / 10;
    }
    return 0;
  } catch (error) {
    // If tests fail, try to parse the error output
    const errorOutput = error.stdout || '';
    const match = errorOutput.match(/Tests:.*?(\d+) passed.*?(\d+) total/);
    if (match) {
      const passed = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      if (total === 0) return 0;
      return Math.round((passed / total) * 1000) / 10;
    }
    console.error('Error getting test pass rate:', error.message);
    return 0;
  }
}

/**
 * Get CI success rate for the last 7 days
 */
async function getCISuccessRate() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateString = sevenDaysAgo.toISOString().split('T')[0];

    // Get workflow runs from the last 7 days
    const runs = exec(
      `gh run list --branch main --limit 100 --json conclusion,createdAt,status --jq '.[] | select(.createdAt >= "${dateString}")'`
    );

    if (!runs) return 100; // Default to 100% if no runs

    const runLines = runs.split('\n').filter((line) => line.trim());
    let totalRuns = 0;
    let successfulRuns = 0;

    runLines.forEach((line) => {
      try {
        const run = JSON.parse(line);
        if (run.status === 'completed') {
          totalRuns++;
          if (run.conclusion === 'success') {
            successfulRuns++;
          }
        }
      } catch (_e) {
        // Skip invalid JSON lines
      }
    });

    if (totalRuns === 0) return 100; // Default to 100% if no completed runs
    return Math.round((successfulRuns / totalRuns) * 1000) / 10;
  } catch (error) {
    console.error('Error getting CI success rate:', error.message);
    return 100; // Default to 100% on error
  }
}

/**
 * Count open bugs by priority
 */
function getBugCounts() {
  try {
    // Count P0 bugs
    const p0Bugs = exec(
      'gh issue list --label "bug,priority-P0" --state open --json number --jq ". | length"'
    );
    const p0Count = parseInt(p0Bugs, 10) || 0;

    // Count P1 bugs
    const p1Bugs = exec(
      'gh issue list --label "bug,priority-P1" --state open --json number --jq ". | length"'
    );
    const p1Count = parseInt(p1Bugs, 10) || 0;

    return { p0: p0Count, p1: p1Count };
  } catch (error) {
    console.error('Error getting bug counts:', error.message);
    return { p0: 0, p1: 0 };
  }
}

/**
 * Calculate overall stability score
 * Formula:
 * - Test Coverage: 30%
 * - CI Success Rate: 30%
 * - Bug Impact: 20% (100 - P0 bugs * 10)
 * - Test Pass Rate: 20%
 */
function calculateStabilityScore(metrics) {
  const { testCoverage, ciSuccessRate, testPassRate, p0BugCount } = metrics;

  // Calculate bug impact score (0-100)
  // Each P0 bug reduces score by 10 points, minimum 0
  const bugImpactScore = Math.max(0, 100 - p0BugCount * 10);

  // Calculate weighted stability score
  const stabilityScore =
    testCoverage * 0.3 + ciSuccessRate * 0.3 + bugImpactScore * 0.2 + testPassRate * 0.2;

  return Math.round(stabilityScore * 10) / 10;
}

/**
 * Main execution
 */
async function main() {
  console.warn('📊 Collecting stability metrics...\n');

  // Collect all metrics
  const testCoverage = getTestCoverage();
  console.warn(`Test Coverage: ${testCoverage}%`);

  const testPassRate = getTestPassRate();
  console.warn(`Test Pass Rate: ${testPassRate}%`);

  const ciSuccessRate = await getCISuccessRate();
  console.warn(`CI Success Rate (7d): ${ciSuccessRate}%`);

  const bugCounts = getBugCounts();
  console.warn(`P0 Bugs: ${bugCounts.p0}`);
  console.warn(`P1 Bugs: ${bugCounts.p1}`);

  // Calculate stability score
  const metrics = {
    testCoverage,
    ciSuccessRate,
    testPassRate,
    p0BugCount: bugCounts.p0,
    p1BugCount: bugCounts.p1,
  };

  const stabilityScore = calculateStabilityScore(metrics);
  console.warn(`\n🎯 Stability Score: ${stabilityScore}%`);

  // Output metrics for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    const output = [
      `stability-score=${stabilityScore}`,
      `test-coverage=${testCoverage}`,
      `ci-success-rate=${ciSuccessRate}`,
      `test-pass-rate=${testPassRate}`,
      `p0-bug-count=${bugCounts.p0}`,
      `p1-bug-count=${bugCounts.p1}`,
    ].join('\n');

    fs.appendFileSync(process.env.GITHUB_OUTPUT, output + '\n');
  }

  // Also output as JSON for other consumers
  const jsonOutput = {
    timestamp: new Date().toISOString(),
    stabilityScore,
    metrics: {
      testCoverage,
      ciSuccessRate,
      testPassRate,
      p0BugCount: bugCounts.p0,
      p1BugCount: bugCounts.p1,
    },
    status: stabilityScore >= 90 ? 'healthy' : stabilityScore >= 75 ? 'warning' : 'critical',
  };

  console.warn('\n📋 Full metrics report:');
  console.warn(JSON.stringify(jsonOutput, null, 2));

  // Write to file for dashboard consumption
  const metricsDir = path.join(process.cwd(), '.github', 'metrics');
  if (!fs.existsSync(metricsDir)) {
    fs.mkdirSync(metricsDir, { recursive: true });
  }

  const metricsFile = path.join(metricsDir, 'latest-metrics.json');
  fs.writeFileSync(metricsFile, JSON.stringify(jsonOutput, null, 2));

  console.warn(`\n✅ Metrics saved to ${metricsFile}`);

  // Exit with appropriate code based on stability
  if (stabilityScore < 70) {
    console.error('\n🚨 Critical: Stability score is below 70%');
    process.exit(1);
  } else if (stabilityScore < 90) {
    console.warn('\n⚠️ Warning: Stability score is below 90%');
  } else {
    console.warn('\n✅ Main branch stability is healthy');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  getTestCoverage,
  getTestPassRate,
  getCISuccessRate,
  getBugCounts,
  calculateStabilityScore,
};
