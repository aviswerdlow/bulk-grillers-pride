#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Turbo Daemon Monitor Script
 * Monitors and manages Turbo daemon health to prevent timeout issues
 */

const TURBO_DAEMON_LOG = '.turbo/daemon/daemon-monitor.log';
const MAX_RETRIES = 3;

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  
  // Ensure log directory exists
  const logDir = path.dirname(TURBO_DAEMON_LOG);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.appendFileSync(TURBO_DAEMON_LOG, logMessage);
}

function runCommand(command, silent = false) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    if (!silent) {
      log(`Command failed: ${command}`);
      log(`Error: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

function checkDaemonStatus() {
  const result = runCommand('npx turbo daemon status', true);
  return result.success && result.output.includes('daemon is running');
}

function stopDaemon() {
  log('Stopping Turbo daemon...');
  runCommand('npx turbo daemon stop');
  
  // Kill any orphaned processes
  runCommand('pkill -f turbo', true);
  
  // Wait for process to fully stop
  return new Promise(resolve => setTimeout(resolve, 2000));
}

async function startDaemon() {
  log('Starting Turbo daemon...');
  const result = runCommand('npx turbo daemon start');
  
  if (result.success) {
    // Wait for daemon to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (checkDaemonStatus()) {
      log('Turbo daemon started successfully');
      return true;
    }
  }
  
  log('Failed to start Turbo daemon');
  return false;
}

async function restartDaemon() {
  log('Restarting Turbo daemon...');
  await stopDaemon();
  return await startDaemon();
}

async function monitorDaemon() {
  log('Starting Turbo daemon monitor...');
  
  let retryCount = 0;
  
  // Initial check and start if needed
  if (!checkDaemonStatus()) {
    log('Daemon not running, starting...');
    await startDaemon();
  }
  
  // Continuous monitoring
  setInterval(async () => {
    if (!checkDaemonStatus()) {
      log('Daemon health check failed');
      
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        log(`Attempting restart (${retryCount}/${MAX_RETRIES})...`);
        
        const success = await restartDaemon();
        if (success) {
          retryCount = 0;
          log('Daemon recovered successfully');
        }
      } else {
        log('Max retries reached. Manual intervention required.');
        process.exit(1);
      }
    } else {
      // Reset retry count on successful check
      if (retryCount > 0) {
        retryCount = 0;
      }
    }
  }, 30000); // Check every 30 seconds
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'status':
    if (checkDaemonStatus()) {
      console.log('✓ Turbo daemon is running');
    } else {
      console.log('✗ Turbo daemon is not running');
      process.exit(1);
    }
    break;
    
  case 'restart':
    restartDaemon().then(success => {
      process.exit(success ? 0 : 1);
    });
    break;
    
  case 'monitor':
    monitorDaemon();
    break;
    
  default:
    console.log('Usage: node turbo-daemon-monitor.js [status|restart|monitor]');
    console.log('  status  - Check daemon status');
    console.log('  restart - Restart the daemon');
    console.log('  monitor - Continuously monitor daemon health');
    process.exit(1);
}