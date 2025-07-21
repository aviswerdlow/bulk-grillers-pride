#!/usr/bin/env node

/**
 * Turbo Remote Cache Setup Script
 * 
 * Helps set up and optimize Turbo remote caching
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TURBO_CONFIG = 'turbo.json';
const OPTIMIZED_CONFIG = 'turbo-remote-cache.json';
const ENV_FILE = '.env.local';

function colorize(text, color) {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
  };
  return `${colors[color] || ''}${text}${colors.reset}`;
}

function log(message, type = 'info') {
  const prefix = {
    info: '💡',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    step: '🔄'
  };
  
  const color = {
    info: 'cyan',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    step: 'blue'
  };
  
  console.log(`${prefix[type] || ''} ${colorize(message, color[type] || 'reset')}`);
}

async function checkPrerequisites() {
  log('Checking prerequisites...', 'step');
  
  const checks = {
    'Turbo installed': () => {
      try {
        execSync('npx turbo --version', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    },
    'Git repository': () => fs.existsSync('.git'),
    'Turbo config exists': () => fs.existsSync(TURBO_CONFIG),
    'Node.js version >= 18': () => {
      const version = process.version;
      const major = parseInt(version.split('.')[0].substring(1));
      return major >= 18;
    }
  };
  
  let allPassed = true;
  
  for (const [check, validator] of Object.entries(checks)) {
    const passed = validator();
    console.log(`  ${passed ? '✓' : '✗'} ${check}`);
    if (!passed) allPassed = false;
  }
  
  if (!allPassed) {
    log('Prerequisites check failed. Please fix the issues above.', 'error');
    process.exit(1);
  }
  
  log('All prerequisites met!', 'success');
  return true;
}

async function checkCurrentSetup() {
  log('\nAnalyzing current setup...', 'step');
  
  const config = JSON.parse(fs.readFileSync(TURBO_CONFIG, 'utf8'));
  const hasRemoteCache = !!config.remoteCache;
  const hasToken = !!process.env.TURBO_TOKEN;
  const hasTeam = !!process.env.TURBO_TEAM;
  
  console.log(`  Remote cache configured: ${hasRemoteCache ? '✓' : '✗'}`);
  console.log(`  TURBO_TOKEN set: ${hasToken ? '✓' : '✗'}`);
  console.log(`  TURBO_TEAM set: ${hasTeam ? '✓' : '✗'}`);
  
  // Check cache size
  try {
    const cacheInfo = execSync('du -sh .turbo/cache 2>/dev/null || echo "0"', { encoding: 'utf8' });
    const cacheSize = cacheInfo.trim().split('\t')[0];
    console.log(`  Local cache size: ${cacheSize}`);
  } catch {
    console.log('  Local cache size: Not found');
  }
  
  return { hasRemoteCache, hasToken, hasTeam };
}

async function setupRemoteCache() {
  log('\nSetting up Turbo remote cache...', 'step');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise((resolve) => rl.question(query, resolve));
  
  try {
    // Check if user wants to log in
    const wantsLogin = await question('\nDo you want to log in to Vercel/Turbo? (y/N): ');
    
    if (wantsLogin.toLowerCase() === 'y') {
      log('Opening Turbo login...', 'info');
      
      // Run turbo login interactively
      await new Promise((resolve, reject) => {
        const loginProcess = spawn('npx', ['turbo', 'login'], {
          stdio: 'inherit',
          shell: true
        });
        
        loginProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('Login failed'));
          }
        });
      });
      
      log('Login successful!', 'success');
    }
    
    // Check if user wants to link
    const wantsLink = await question('\nDo you want to link this repository to Turbo? (y/N): ');
    
    if (wantsLink.toLowerCase() === 'y') {
      log('Linking repository...', 'info');
      
      await new Promise((resolve, reject) => {
        const linkProcess = spawn('npx', ['turbo', 'link'], {
          stdio: 'inherit',
          shell: true
        });
        
        linkProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('Linking failed'));
          }
        });
      });
      
      log('Repository linked successfully!', 'success');
    }
    
    // Add to .env.local if tokens are available
    const addToEnv = await question('\nDo you want to add TURBO_TOKEN and TURBO_TEAM to .env.local? (y/N): ');
    
    if (addToEnv.toLowerCase() === 'y') {
      let envContent = '';
      if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, 'utf8');
      }
      
      if (!envContent.includes('TURBO_TOKEN')) {
        const token = await question('Enter TURBO_TOKEN (or press Enter to skip): ');
        if (token) {
          envContent += `\n# Turbo Remote Cache\nTURBO_TOKEN=${token}\n`;
        }
      }
      
      if (!envContent.includes('TURBO_TEAM')) {
        const team = await question('Enter TURBO_TEAM (or press Enter to skip): ');
        if (team) {
          envContent += `TURBO_TEAM=${team}\n`;
        }
      }
      
      fs.writeFileSync(ENV_FILE, envContent);
      log('Environment variables saved to .env.local', 'success');
      
      // Add to .gitignore if not already there
      const gitignore = fs.readFileSync('.gitignore', 'utf8');
      if (!gitignore.includes('.env.local')) {
        fs.appendFileSync('.gitignore', '\n# Local environment variables\n.env.local\n');
        log('Added .env.local to .gitignore', 'success');
      }
    }
    
  } finally {
    rl.close();
  }
}

async function optimizeConfiguration() {
  log('\nOptimizing Turbo configuration...', 'step');
  
  // Check if optimized config exists
  if (!fs.existsSync(OPTIMIZED_CONFIG)) {
    log('Optimized configuration not found. Creating default...', 'warning');
    return false;
  }
  
  // Backup current config
  const backupPath = `${TURBO_CONFIG}.backup`;
  fs.copyFileSync(TURBO_CONFIG, backupPath);
  log(`Backed up current config to ${backupPath}`, 'info');
  
  // Copy optimized config
  fs.copyFileSync(OPTIMIZED_CONFIG, TURBO_CONFIG);
  log('Applied optimized configuration', 'success');
  
  // Remove temporary file
  fs.unlinkSync(OPTIMIZED_CONFIG);
  
  return true;
}

async function testRemoteCache() {
  log('\nTesting remote cache...', 'step');
  
  try {
    // Run a build with summary
    log('Running test build...', 'info');
    const output = execSync('npx turbo run build --summarize', { encoding: 'utf8' });
    
    // Check for cache hits
    const cacheHits = (output.match(/FULL TURBO/g) || []).length;
    const cacheMisses = (output.match(/MISS/g) || []).length;
    
    console.log(`  Cache hits: ${cacheHits}`);
    console.log(`  Cache misses: ${cacheMisses}`);
    
    if (cacheHits > 0) {
      log('Remote cache is working!', 'success');
    } else {
      log('No cache hits yet. This is normal for the first run.', 'warning');
    }
    
    // Show summary location
    const summaryMatch = output.match(/summary available at (.*)/);
    if (summaryMatch) {
      console.log(`  Full summary: ${summaryMatch[1]}`);
    }
    
  } catch (error) {
    log('Test build failed. Check your configuration.', 'error');
    console.error(error.message);
  }
}

async function showNextSteps() {
  log('\n📋 Next Steps:', 'info');
  
  const steps = [
    'Add TURBO_TOKEN and TURBO_TEAM to your CI/CD secrets',
    'Run `npm run cache:status` to check cache statistics',
    'Use `npm run build -- --remote-only` to test remote-only builds',
    'Monitor cache hit rates in your CI runs',
    'Consider setting up cache warming for better performance'
  ];
  
  steps.forEach((step, index) => {
    console.log(`  ${index + 1}. ${step}`);
  });
  
  log('\n💡 Pro Tips:', 'info');
  console.log('  - Use --filter to build only specific packages');
  console.log('  - Run --dry-run to see what would be cached');
  console.log('  - Use --force to bypass cache when needed');
  console.log('  - Check https://turbo.build/repo/docs/core-concepts/remote-caching for more info');
}

async function addNpmScripts() {
  log('\nAdding helpful npm scripts...', 'step');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const newScripts = {
    'cache:status': 'turbo run build --dry-run --summarize',
    'cache:clear': 'rm -rf .turbo/cache',
    'cache:analyze': 'node scripts/turbo-cache-analysis.js',
    'turbo:login': 'turbo login',
    'turbo:link': 'turbo link',
    'build:remote-only': 'turbo run build --remote-only'
  };
  
  let added = false;
  for (const [name, command] of Object.entries(newScripts)) {
    if (!packageJson.scripts[name]) {
      packageJson.scripts[name] = command;
      added = true;
      console.log(`  Added: npm run ${name}`);
    }
  }
  
  if (added) {
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
    log('npm scripts added successfully!', 'success');
  } else {
    log('All scripts already exist', 'info');
  }
}

// Main execution
async function main() {
  console.log(colorize('\n🚀 Turbo Remote Cache Setup\n', 'cyan'));
  
  await checkPrerequisites();
  const currentSetup = await checkCurrentSetup();
  
  if (!currentSetup.hasToken || !currentSetup.hasTeam) {
    await setupRemoteCache();
  } else {
    log('Remote cache already configured!', 'success');
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const optimize = await new Promise(resolve => {
    rl.question('\nDo you want to apply optimized configuration? (y/N): ', answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
  
  if (optimize) {
    await optimizeConfiguration();
  }
  
  await addNpmScripts();
  await testRemoteCache();
  await showNextSteps();
  
  log('\n✨ Setup complete!', 'success');
}

if (require.main === module) {
  main().catch(error => {
    log(`Error: ${error.message}`, 'error');
    process.exit(1);
  });
}