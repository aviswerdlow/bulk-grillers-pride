#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

async function analyzeTurboCachePerformance() {
  console.log(colorize('\n🚀 Turbo Remote Cache Analytics\n', 'bright'));

  try {
    // Check if TURBO_TOKEN is set
    const hasToken = process.env.TURBO_TOKEN || execSync('echo $TURBO_TOKEN', { encoding: 'utf8' }).trim();
    const hasTeam = process.env.TURBO_TEAM || execSync('echo $TURBO_TEAM', { encoding: 'utf8' }).trim();
    
    console.log('📋 Configuration Status:');
    console.log(`  - TURBO_TOKEN: ${hasToken ? colorize('✅ Set', 'green') : colorize('❌ Not set', 'red')}`);
    console.log(`  - TURBO_TEAM: ${hasTeam ? colorize('✅ Set', 'green') : colorize('❌ Not set', 'red')}`);
    console.log(`  - Remote Cache: ${hasToken && hasTeam ? colorize('Enabled', 'green') : colorize('Disabled', 'yellow')}`);
    console.log();

    // Get all tasks in dry-run mode
    console.log('🔍 Analyzing cache performance...\n');
    const dryRunOutput = execSync('npx turbo run build lint type-check test --dry-run=json 2>/dev/null', {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    const data = JSON.parse(dryRunOutput);
    
    // Calculate statistics
    const totalTasks = data.tasks.length;
    const cacheHits = data.tasks.filter(t => t.cache?.status === 'HIT').length;
    const remoteCacheHits = data.tasks.filter(t => t.cache?.status === 'HIT' && t.cache?.source === 'REMOTE').length;
    const localCacheHits = data.tasks.filter(t => t.cache?.status === 'HIT' && t.cache?.source === 'LOCAL').length;
    const cacheMisses = data.tasks.filter(t => t.cache?.status === 'MISS').length;
    
    const timeSaved = data.tasks
      .filter(t => t.cache?.status === 'HIT')
      .reduce((acc, t) => acc + (t.cache?.timeSaved || 0), 0);

    // Display summary
    console.log(colorize('📊 Cache Performance Summary', 'bright'));
    console.log('─'.repeat(50));
    console.log(`Total Tasks:        ${totalTasks}`);
    console.log(`Cache Hits:         ${colorize(cacheHits.toString(), 'green')} (${((cacheHits / totalTasks) * 100).toFixed(1)}%)`);
    console.log(`  - Remote:         ${colorize(remoteCacheHits.toString(), 'cyan')} (${((remoteCacheHits / totalTasks) * 100).toFixed(1)}%)`);
    console.log(`  - Local:          ${colorize(localCacheHits.toString(), 'magenta')} (${((localCacheHits / totalTasks) * 100).toFixed(1)}%)`);
    console.log(`Cache Misses:       ${colorize(cacheMisses.toString(), 'yellow')} (${((cacheMisses / totalTasks) * 100).toFixed(1)}%)`);
    console.log(`Time Saved:         ${colorize(formatTime(timeSaved), 'green')}`);
    console.log();

    // Task breakdown
    console.log(colorize('📦 Task Breakdown', 'bright'));
    console.log('─'.repeat(50));
    
    const tasksByPackage = {};
    data.tasks.forEach(task => {
      const [pkg, taskName] = task.taskId.split('#');
      if (!tasksByPackage[pkg]) {
        tasksByPackage[pkg] = [];
      }
      tasksByPackage[pkg].push({
        name: taskName,
        status: task.cache?.status || 'UNKNOWN',
        source: task.cache?.source || 'N/A',
        timeSaved: task.cache?.timeSaved || 0
      });
    });

    Object.entries(tasksByPackage).forEach(([pkg, tasks]) => {
      const packageHits = tasks.filter(t => t.status === 'HIT').length;
      const hitRate = ((packageHits / tasks.length) * 100).toFixed(0);
      console.log(`\n${colorize(pkg, 'cyan')} (${hitRate}% cached)`);
      
      tasks.forEach(task => {
        const statusIcon = task.status === 'HIT' ? '✅' : '🔨';
        const sourceTag = task.source !== 'N/A' ? ` [${task.source}]` : '';
        const timeInfo = task.timeSaved > 0 ? ` (saved ${formatTime(task.timeSaved)})` : '';
        console.log(`  ${statusIcon} ${task.name}${sourceTag}${timeInfo}`);
      });
    });

    // Check local cache size
    console.log(colorize('\n💾 Local Cache Size', 'bright'));
    console.log('─'.repeat(50));
    
    const turboCacheDir = path.join(process.cwd(), '.turbo', 'cache');
    if (fs.existsSync(turboCacheDir)) {
      const cacheSize = execSync(`du -sh "${turboCacheDir}" 2>/dev/null || echo "0"`, { encoding: 'utf8' }).trim();
      console.log(`Local cache directory: ${cacheSize}`);
    } else {
      console.log('No local cache directory found');
    }

    // Recommendations
    console.log(colorize('\n💡 Recommendations', 'bright'));
    console.log('─'.repeat(50));
    
    if (!hasToken || !hasTeam) {
      console.log('⚠️  ' + colorize('Enable remote caching for better CI performance:', 'yellow'));
      console.log('   1. Run: npx turbo login');
      console.log('   2. Run: npx turbo link');
      console.log('   3. Add TURBO_TOKEN and TURBO_TEAM to CI secrets');
    }

    if (remoteCacheHits === 0 && hasToken && hasTeam) {
      console.log('⚠️  ' + colorize('Remote cache is configured but not being used effectively', 'yellow'));
      console.log('   - Consider running cache warmup jobs');
      console.log('   - Check if cache keys are too specific');
    }

    if (cacheHits / totalTasks < 0.5) {
      console.log('⚠️  ' + colorize('Low cache hit rate detected', 'yellow'));
      console.log('   - Review input configurations in turbo.json');
      console.log('   - Ensure environment variables are properly configured');
      console.log('   - Check for unnecessary cache invalidations');
    }

    if (localCacheHits > remoteCacheHits && hasToken) {
      console.log('ℹ️  ' + colorize('Local cache is being used more than remote cache', 'cyan'));
      console.log('   - This is normal for local development');
      console.log('   - In CI, consider using TURBO_REMOTE_ONLY=true');
    }

    console.log('\n✨ Run with --verbose flag for detailed task timing\n');

  } catch (error) {
    console.error(colorize('❌ Error analyzing cache:', 'red'), error.message);
    process.exit(1);
  }
}

// Run the analysis
analyzeTurboCachePerformance();