#!/usr/bin/env node

/**
 * /claim-task command
 * Claims a task and marks it as in-progress for the current agent
 */

const fs = require('fs');
const path = require('path');

// Detect current agent based on CLAUDE.md file
function detectCurrentAgent() {
  try {
    const claudePath = path.join(process.cwd(), 'CLAUDE.md');
    if (!fs.existsSync(claudePath)) {
      console.error('❌ No CLAUDE.md file found. Are you in an agent directory?');
      return null;
    }

    const content = fs.readFileSync(claudePath, 'utf8');
    const agentMatch = content.match(/agent_id:\s*(\S+)/);
    if (agentMatch) {
      return agentMatch[1];
    }

    console.error('❌ Could not detect agent_id from CLAUDE.md');
    return null;
  } catch (error) {
    console.error('❌ Error reading CLAUDE.md:', error.message);
    return null;
  }
}

// Update task status in AGENTS_BOARD.md
function claimTask(taskId, agentId) {
  try {
    const boardPath = path.join(process.cwd(), 'AGENTS_BOARD.md');
    if (!fs.existsSync(boardPath)) {
      console.error('❌ AGENTS_BOARD.md not found');
      return false;
    }

    let content = fs.readFileSync(boardPath, 'utf8');

    // Find the task in the table
    const tableRegex = new RegExp(
      `^\\|\\s*${taskId}\\s*\\|([^|]+)\\|([^|]+)\\|([^|]+)\\|([^|]+)\\|([^|]+)\\|([^|]+)\\|([^|]+)\\|`,
      'gm'
    );
    const match = content.match(tableRegex);

    if (!match) {
      console.error(`❌ Task ${taskId} not found`);
      return false;
    }

    // Parse the current task line
    const cells = match[0]
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell);
    const [id, title, skills, owner, status, antiSkills, priority, hours] = cells;

    // Check if task is already done
    if (status.includes('done') || status.includes('✔️')) {
      console.error(`❌ Task ${taskId} is already completed`);
      return false;
    }

    // Check if task is already in-progress by another agent
    if (status.includes('in-progress') && owner !== agentId) {
      console.error(`❌ Task ${taskId} is already in-progress by ${owner}`);
      return false;
    }

    // Create the new line with updated status
    const newLine = `| ${taskId} | ${title} | ${skills} | ${agentId} | 🏃 in-progress | ${antiSkills} | ${priority} | ${hours} |`;
    content = content.replace(match[0], newLine);

    // Add agent message
    const today = new Date().toISOString().split('T')[0];
    const agentMessage = `\n**${agentId}** (${today}): Starting ${taskId} - ${title}. Will ${title.toLowerCase()}.`;

    // Find the Agent Messages section and add at the top
    const messagesRegex = /## Agent Messages\n\n_Latest messages appear here_\n/;
    if (content.match(messagesRegex)) {
      content = content.replace(
        messagesRegex,
        `## Agent Messages\n\n_Latest messages appear here_\n${agentMessage}\n`
      );
    }

    // Write back to file
    fs.writeFileSync(boardPath, content, 'utf8');

    console.log(`✅ Successfully claimed ${taskId}`);
    console.log(`📋 Task is now marked as in-progress for ${agentId}`);
    console.log(`\n📌 Task: ${title}`);
    console.log(`⏱️  Estimate: ${hours}`);
    console.log(`🎯 Priority: ${priority}`);

    return true;
  } catch (error) {
    console.error('❌ Error updating AGENTS_BOARD.md:', error.message);
    return false;
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error('Usage: /claim-task <task-id>');
    console.error('Example: /claim-task T45');
    process.exit(1);
  }

  const taskId = args[0].toUpperCase();
  if (!taskId.match(/^T\d+$/)) {
    console.error('❌ Invalid task ID format. Use format like T45');
    process.exit(1);
  }

  const agentId = detectCurrentAgent();
  if (!agentId) {
    process.exit(1);
  }

  const success = claimTask(taskId, agentId);
  process.exit(success ? 0 : 1);
}

// Run the command
main();
