#!/usr/bin/env node

/**
 * Turbo Cache Monitoring Script
 * 
 * Provides detailed analytics and insights about Turbo cache performance
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TurboCacheMonitor {
  constructor() {
    this.summaryDir = '.turbo/runs';
    this.cacheDir = '.turbo/cache';
    this.results = {
      overview: {},
      tasks: {},
      packages: {},
      recommendations: []
    };
  }

  async analyze() {
    console.log('🔍 Turbo Cache Performance Analysis\n');
    
    try {
      this.collectCacheStats();
      this.analyzeRecentRuns();
      this.calculateMetrics();
      this.generateRecommendations();
      this.displayReport();
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    }
  }

  collectCacheStats() {
    console.log('📊 Collecting cache statistics...\n');
    
    // Local cache size
    try {
      const cacheSize = execSync(`du -sh ${this.cacheDir} 2>/dev/null || echo "0"`, { encoding: 'utf8' });
      this.results.overview.localCacheSize = cacheSize.trim().split('\t')[0];
    } catch {
      this.results.overview.localCacheSize = '0';
    }
    
    // Count cache entries
    try {
      const cacheEntries = execSync(`find ${this.cacheDir} -type f 2>/dev/null | wc -l`, { encoding: 'utf8' });
      this.results.overview.cacheEntries = parseInt(cacheEntries.trim());
    } catch {
      this.results.overview.cacheEntries = 0;
    }
    
    // Get Turbo version
    try {
      const version = execSync('npx turbo --version', { encoding: 'utf8' });
      this.results.overview.turboVersion = version.trim();
    } catch {
      this.results.overview.turboVersion = 'Unknown';
    }
  }

  analyzeRecentRuns() {
    console.log('🔄 Analyzing recent Turbo runs...\n');
    
    if (!fs.existsSync(this.summaryDir)) {
      console.log('  No recent runs found\n');
      return;
    }
    
    // Get all run directories
    const runs = fs.readdirSync(this.summaryDir)
      .filter(dir => fs.statSync(path.join(this.summaryDir, dir)).isDirectory())
      .sort()
      .slice(-10); // Last 10 runs
    
    this.results.overview.totalRuns = runs.length;
    
    let totalTasks = 0;
    let cacheHits = 0;
    let remoteCacheHits = 0;
    let totalTimeSaved = 0;
    
    runs.forEach(runId => {
      const summaryPath = path.join(this.summaryDir, runId, 'summary.json');
      
      if (fs.existsSync(summaryPath)) {
        try {
          const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
          
          if (summary.tasks) {
            summary.tasks.forEach(task => {
              totalTasks++;
              
              // Track by task name
              if (!this.results.tasks[task.task]) {
                this.results.tasks[task.task] = {
                  runs: 0,
                  hits: 0,
                  misses: 0,
                  timeSaved: 0,
                  avgDuration: []
                };
              }
              
              const taskStats = this.results.tasks[task.task];
              taskStats.runs++;
              
              if (task.cache) {
                if (task.cache.status === 'HIT') {
                  cacheHits++;
                  taskStats.hits++;
                  
                  if (task.cache.remote) {
                    remoteCacheHits++;
                  }
                  
                  if (task.cache.timeSaved) {
                    const saved = parseInt(task.cache.timeSaved);
                    totalTimeSaved += saved;
                    taskStats.timeSaved += saved;
                  }
                } else {
                  taskStats.misses++;
                }
              }
              
              // Track by package
              if (!this.results.packages[task.package]) {
                this.results.packages[task.package] = {
                  tasks: 0,
                  hits: 0,
                  misses: 0
                };
              }
              
              const pkgStats = this.results.packages[task.package];
              pkgStats.tasks++;
              
              if (task.cache?.status === 'HIT') {
                pkgStats.hits++;
              } else {
                pkgStats.misses++;
              }
              
              // Track duration
              if (task.duration) {
                taskStats.avgDuration.push(parseInt(task.duration));
              }
            });
          }
        } catch (error) {
          console.error(`  Failed to parse ${summaryPath}:`, error.message);
        }
      }
    });
    
    this.results.overview.totalTasks = totalTasks;
    this.results.overview.cacheHits = cacheHits;
    this.results.overview.cacheMisses = totalTasks - cacheHits;
    this.results.overview.remoteCacheHits = remoteCacheHits;
    this.results.overview.totalTimeSaved = totalTimeSaved;
  }

  calculateMetrics() {
    const { totalTasks, cacheHits, totalTimeSaved } = this.results.overview;
    
    if (totalTasks > 0) {
      this.results.overview.hitRate = ((cacheHits / totalTasks) * 100).toFixed(1);
      this.results.overview.avgTimeSaved = Math.round(totalTimeSaved / totalTasks);
    } else {
      this.results.overview.hitRate = 0;
      this.results.overview.avgTimeSaved = 0;
    }
    
    // Calculate per-task metrics
    Object.entries(this.results.tasks).forEach(([task, stats]) => {
      if (stats.runs > 0) {
        stats.hitRate = ((stats.hits / stats.runs) * 100).toFixed(1);
        
        if (stats.avgDuration.length > 0) {
          const sum = stats.avgDuration.reduce((a, b) => a + b, 0);
          stats.avgDuration = Math.round(sum / stats.avgDuration.length);
        } else {
          stats.avgDuration = 0;
        }
      }
    });
    
    // Calculate per-package metrics
    Object.entries(this.results.packages).forEach(([pkg, stats]) => {
      if (stats.tasks > 0) {
        stats.hitRate = ((stats.hits / stats.tasks) * 100).toFixed(1);
      }
    });
  }

  generateRecommendations() {
    const { hitRate, cacheEntries, localCacheSize } = this.results.overview;
    
    // Low hit rate
    if (hitRate < 50) {
      this.results.recommendations.push({
        severity: 'high',
        message: 'Cache hit rate is very low. Consider:',
        actions: [
          'Check if inputs are too broad (including unnecessary files)',
          'Ensure environment variables are consistent',
          'Verify remote cache is properly configured'
        ]
      });
    }
    
    // Small cache size
    if (localCacheSize === '0' || cacheEntries < 10) {
      this.results.recommendations.push({
        severity: 'medium',
        message: 'Cache appears to be empty or very small.',
        actions: [
          'Run builds to populate the cache',
          'Check if cache is being cleared too frequently',
          'Verify cache directory permissions'
        ]
      });
    }
    
    // Tasks with poor hit rates
    Object.entries(this.results.tasks).forEach(([task, stats]) => {
      if (stats.runs > 5 && parseFloat(stats.hitRate) < 30) {
        this.results.recommendations.push({
          severity: 'medium',
          message: `Task "${task}" has low cache hit rate (${stats.hitRate}%)`,
          actions: [
            'Review inputs configuration for this task',
            'Check if outputs are properly defined',
            'Ensure task dependencies are stable'
          ]
        });
      }
    });
    
    // Remote cache usage
    if (this.results.overview.remoteCacheHits === 0 && this.results.overview.totalTasks > 0) {
      this.results.recommendations.push({
        severity: 'low',
        message: 'No remote cache hits detected.',
        actions: [
          'Configure TURBO_TOKEN and TURBO_TEAM',
          'Run `npx turbo link` to connect to remote cache',
          'Check network connectivity to Turbo servers'
        ]
      });
    }
  }

  displayReport() {
    console.log('📈 Cache Performance Report\n');
    console.log('═══════════════════════════════════════════\n');
    
    // Overview
    console.log('📊 Overview:');
    console.log(`  Turbo Version: ${this.results.overview.turboVersion}`);
    console.log(`  Local Cache Size: ${this.results.overview.localCacheSize}`);
    console.log(`  Cache Entries: ${this.results.overview.cacheEntries}`);
    console.log(`  Total Runs Analyzed: ${this.results.overview.totalRuns}`);
    console.log(`  Total Tasks: ${this.results.overview.totalTasks}`);
    console.log(`  Cache Hits: ${this.results.overview.cacheHits} (${this.results.overview.hitRate}%)`);
    console.log(`  Remote Cache Hits: ${this.results.overview.remoteCacheHits}`);
    console.log(`  Time Saved: ${this.formatTime(this.results.overview.totalTimeSaved)}`);
    console.log(`  Avg Time Saved per Task: ${this.formatTime(this.results.overview.avgTimeSaved)}\n`);
    
    // Task breakdown
    if (Object.keys(this.results.tasks).length > 0) {
      console.log('📋 Task Performance:');
      console.log('  Task              Runs   Hit Rate   Avg Duration   Time Saved');
      console.log('  ────────────────  ─────  ─────────  ────────────   ──────────');
      
      Object.entries(this.results.tasks)
        .sort((a, b) => b[1].runs - a[1].runs)
        .forEach(([task, stats]) => {
          console.log(
            `  ${task.padEnd(16)}  ${stats.runs.toString().padStart(5)}  ${(stats.hitRate + '%').padStart(9)}  ${
              this.formatTime(stats.avgDuration).padStart(12)
            }   ${this.formatTime(stats.timeSaved).padStart(10)}`
          );
        });
      console.log('');
    }
    
    // Package breakdown
    if (Object.keys(this.results.packages).length > 0) {
      console.log('📦 Package Performance:');
      console.log('  Package                    Tasks   Hit Rate');
      console.log('  ─────────────────────────  ──────  ─────────');
      
      Object.entries(this.results.packages)
        .sort((a, b) => b[1].tasks - a[1].tasks)
        .slice(0, 10)
        .forEach(([pkg, stats]) => {
          console.log(
            `  ${pkg.padEnd(25)}  ${stats.tasks.toString().padStart(6)}  ${(stats.hitRate + '%').padStart(9)}`
          );
        });
      console.log('');
    }
    
    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('💡 Recommendations:\n');
      
      const grouped = {
        high: this.results.recommendations.filter(r => r.severity === 'high'),
        medium: this.results.recommendations.filter(r => r.severity === 'medium'),
        low: this.results.recommendations.filter(r => r.severity === 'low')
      };
      
      ['high', 'medium', 'low'].forEach(severity => {
        if (grouped[severity].length > 0) {
          const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
          console.log(`${icon} ${severity.toUpperCase()} Priority:\n`);
          
          grouped[severity].forEach(rec => {
            console.log(`  ${rec.message}`);
            rec.actions.forEach(action => {
              console.log(`    • ${action}`);
            });
            console.log('');
          });
        }
      });
    } else {
      console.log('✅ No issues detected! Cache is performing well.\n');
    }
    
    // Summary
    console.log('═══════════════════════════════════════════\n');
    console.log('📝 Summary:');
    
    if (this.results.overview.hitRate > 80) {
      console.log('  ✅ Excellent cache performance!');
    } else if (this.results.overview.hitRate > 60) {
      console.log('  ⚠️  Good cache performance, room for improvement.');
    } else {
      console.log('  ❌ Poor cache performance needs attention.');
    }
    
    console.log(`\n💾 To export this report: node ${__filename} --json > cache-report.json`);
  }

  formatTime(ms) {
    if (!ms || ms === 0) return '0ms';
    
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  exportJson() {
    console.log(JSON.stringify(this.results, null, 2));
  }
}

// Main execution
if (require.main === module) {
  const monitor = new TurboCacheMonitor();
  
  if (process.argv.includes('--json')) {
    monitor.analyze().then(() => monitor.exportJson());
  } else {
    monitor.analyze();
  }
}