#!/usr/bin/env node

/**
 * /assign-task command
 * Assigns a task to a specific agent
 */

const fs = require('fs');
const path = require('path');

// List of valid agent IDs
const VALID_AGENTS = [
  'frontend-agent',
  'backend-agent',
  'infra-agent',
  'quality-agent',
  'docs-agent',
  'migration-agent',
];

// Update task status in AGENTS_BOARD.md
function assignTask(taskId, targetAgent) {
  try {
    const boardPath = path.join(process.cwd(), 'AGENTS_BOARD.md');
    if (!fs.existsSync(boardPath)) {
      console.error('❌ AGENTS_BOARD.md not found');
      return false;
    }

    let content = fs.readFileSync(boardPath, 'utf8');

    // Find the task line
    const taskRegex = new RegExp(
      `^(\\s*-\\s*${taskId}\\s*-\\s*.+?\\(P\\d+,\\s*.+?\\))(?:\\s*-\\s*\\w+)?(?:\\s*\\[.+?\\])?$`,
      'gm'
    );
    const match = content.match(taskRegex);

    if (!match) {
      console.error(`❌ Task ${taskId} not found`);
      return false;
    }

    // Check if task is already done
    if (match[0].includes(' - done')) {
      console.error(`❌ Task ${taskId} is already completed`);
      return false;
    }

    // Update the task line - assigned but not in-progress
    const newLine = match[0].replace(taskRegex, `$1 - assigned [${targetAgent}]`);
    content = content.replace(match[0], newLine);

    // Write back to file
    fs.writeFileSync(boardPath, content, 'utf8');

    console.log(`✅ Successfully assigned ${taskId} to ${targetAgent}`);

    // Show the task details
    const taskMatch = match[0].match(/T\d+\s*-\s*(.+?)\s*\(P(\d+),\s*(.+?)\)/);
    if (taskMatch) {
      console.log(`\n📌 Task: ${taskMatch[1]}`);
      console.log(`👤 Assigned to: ${targetAgent}`);
      console.log(`⏱️  Estimate: ${taskMatch[3]}`);
      console.log(`🎯 Priority: P${taskMatch[2]}`);
    }

    console.log(`\n💡 ${targetAgent} can use /claim-task ${taskId} to start working on it`);

    return true;
  } catch (error) {
    console.error('❌ Error updating AGENTS_BOARD.md:', error.message);
    return false;
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error('Usage: /assign-task <task-id> <agent-id>');
    console.error('Example: /assign-task T45 infra-agent');
    console.error('\nValid agents:');
    VALID_AGENTS.forEach((agent) => console.error(`  - ${agent}`));
    process.exit(1);
  }

  const taskId = args[0].toUpperCase();
  const targetAgent = args[1].toLowerCase();

  if (!taskId.match(/^T\d+$/)) {
    console.error('❌ Invalid task ID format. Use format like T45');
    process.exit(1);
  }

  if (!VALID_AGENTS.includes(targetAgent)) {
    console.error(`❌ Invalid agent ID: ${targetAgent}`);
    console.error('\nValid agents:');
    VALID_AGENTS.forEach((agent) => console.error(`  - ${agent}`));
    process.exit(1);
  }

  const success = assignTask(taskId, targetAgent);
  process.exit(success ? 0 : 1);
}

// Run the command
main();
