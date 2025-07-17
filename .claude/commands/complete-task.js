#!/usr/bin/env node

/**
 * /complete-task command
 * Marks a task as done with a completion summary
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
function completeTask(taskId, summary, agentId) {
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

    // Check if task is assigned to current agent
    if (owner !== agentId) {
      console.error(
        `❌ Task ${taskId} is not assigned to ${agentId} (currently assigned to ${owner})`
      );
      return false;
    }

    // Create the new line with updated status
    const newLine = `| ${taskId} | ${title} | ${skills} | ${agentId} | ✔️ done | ${antiSkills} | ${priority} | ${hours} |`;
    content = content.replace(match[0], newLine);

    // Add completion message
    const today = new Date().toISOString().split('T')[0];
    const agentMessage = `\n**${agentId}** (${today}): Completed ${taskId} - ${title}. ${summary}`;

    // Find the Agent Messages section and add at the top
    const messagesRegex = /## Agent Messages\n\n_Latest messages appear here_\n/;
    if (content.match(messagesRegex)) {
      content = content.replace(
        messagesRegex,
        `## Agent Messages\n\n_Latest messages appear here_\n${agentMessage}\n`
      );
    }

    // Update agent metrics
    const metricsPath = path.join(process.cwd(), '.agent-metrics', 'metrics.json');
    if (fs.existsSync(metricsPath)) {
      try {
        const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
        if (!metrics[agentId]) {
          metrics[agentId] = { tasks_completed: 0, total_time: 0 };
        }
        metrics[agentId].tasks_completed += 1;
        fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2), 'utf8');
      } catch (e) {
        // Metrics update is optional, don't fail the command
      }
    }

    // Write back to file
    fs.writeFileSync(boardPath, content, 'utf8');

    console.log(`✅ Successfully completed ${taskId}`);
    console.log(`📝 Summary: ${summary}`);
    console.log(`🎉 Great work, ${agentId}!`);

    // Check for newly unblocked tasks
    console.log('\n🔍 Checking for newly unblocked tasks...');

    return true;
  } catch (error) {
    console.error('❌ Error updating AGENTS_BOARD.md:', error.message);
    return false;
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: /complete-task <task-id> <summary>');
    console.error(
      'Example: /complete-task T45 "Upgraded Turbo to v2 with 40% performance improvement"'
    );
    process.exit(1);
  }

  const taskId = args[0].toUpperCase();
  const summary = args.slice(1).join(' ');

  if (!taskId.match(/^T\d+$/)) {
    console.error('❌ Invalid task ID format. Use format like T45');
    process.exit(1);
  }

  const agentId = detectCurrentAgent();
  if (!agentId) {
    process.exit(1);
  }

  const success = completeTask(taskId, summary, agentId);
  process.exit(success ? 0 : 1);
}

// Run the command
main();
