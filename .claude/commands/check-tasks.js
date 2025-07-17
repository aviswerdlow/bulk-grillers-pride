#!/usr/bin/env node

/**
 * /check-tasks command
 * Shows tasks appropriate for the current agent based on their skills and ownership
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

// Parse AGENTS_BOARD.md to extract tasks
function parseTasks() {
  try {
    const boardPath = path.join(process.cwd(), 'AGENTS_BOARD.md');
    if (!fs.existsSync(boardPath)) {
      console.error('❌ AGENTS_BOARD.md not found');
      return [];
    }

    const content = fs.readFileSync(boardPath, 'utf8');
    const tasks = [];

    // Find the Tasks with Required Skills table
    const tableMatch = content.match(
      /## Tasks with Required Skills[\s\S]*?\n\| --- \|.*?\|\n([\s\S]*?)(?=\n\n## |$)/
    );
    if (!tableMatch) {
      console.error('❌ No Tasks table found in AGENTS_BOARD.md');
      return [];
    }

    // Parse table rows
    const tableRows = tableMatch[1].split('\n');
    for (const row of tableRows) {
      if (!row.trim() || row.includes('---')) continue;

      const cells = row
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell);
      if (cells.length >= 7) {
        const [id, title, skills, owner, status, antiSkills, priority, hours] = cells;

        // Parse status - handle various formats
        let taskStatus = 'unassigned';
        let assignee = owner || null;

        if (status.includes('done') || status.includes('✔️')) {
          taskStatus = 'done';
        } else if (status.includes('in-progress') || status.includes('🏃')) {
          taskStatus = 'in-progress';
        } else if (status.includes('blocked') || status.includes('⏸️')) {
          taskStatus = 'blocked';
        } else if (status.includes('ready') || status.includes('✨')) {
          taskStatus = 'ready';
        } else if (status.includes('unassigned') || status.includes('📋')) {
          taskStatus = 'unassigned';
        } else if (status.includes('assigned') || status.includes('✅')) {
          taskStatus = 'assigned';
        }

        tasks.push({
          id: id,
          title: title,
          skills: skills.split(',').map((s) => s.trim()),
          owner: assignee,
          status: taskStatus,
          priority: parseInt(priority.replace('P', '')) || 99,
          estimate: hours + ' hours',
        });
      }
    }

    return tasks;
  } catch (error) {
    console.error('❌ Error parsing AGENTS_BOARD.md:', error.message);
    return [];
  }
}

// Get agent skills from CLAUDE.md
function getAgentSkills(agentId) {
  try {
    const claudePath = path.join(process.cwd(), 'CLAUDE.md');
    const content = fs.readFileSync(claudePath, 'utf8');

    // Extract primary skills
    const primaryMatch = content.match(/primary:\s*(.+?)(?=secondary:|never:|$)/ms);
    const skills = [];

    if (primaryMatch) {
      const skillsText = primaryMatch[1];
      // Match patterns like "- jest: Testing framework..." or just "- jest" or "- ci-cd"
      const skillMatches = skillsText.matchAll(/[-•]\s*([\w-]+)(?:\s*:|,|\s|$)/g);
      for (const match of skillMatches) {
        skills.push(match[1].toLowerCase());
      }
    }

    // Also check the Agent Skills Registry table if agent ID matches
    const tableMatch = content.match(
      /\|\s*Agent\s*\|\s*Primary Skills[\s\S]*?\n([\s\S]*?)(?=\n\n|\n##|$)/
    );
    if (tableMatch) {
      const tableRows = tableMatch[1].split('\n');
      for (const row of tableRows) {
        if (row.includes(agentId)) {
          const cells = row.split('|').map((cell) => cell.trim());
          if (cells.length >= 2) {
            const primarySkills = cells[1].split(',').map((s) => s.trim().toLowerCase());
            skills.push(...primarySkills);
          }
          break;
        }
      }
    }

    // Deduplicate skills
    return [...new Set(skills)];
  } catch (error) {
    console.error('❌ Error getting agent skills:', error.message);
    return [];
  }
}

// Determine if a task is appropriate for an agent
function isTaskAppropriate(task, agentId, skills) {
  // Check if task is already done
  if (task.status === 'done') {
    return false;
  }

  // Check if task is already assigned to another agent
  // Note: owner field contains suggested agent even when unassigned
  if (task.status === 'in-progress' && task.owner && task.owner !== agentId) {
    return false;
  }

  // Check if task requires specific skills
  if (task.skills && task.skills.length > 0) {
    // Check if agent has at least one of the required skills
    for (const taskSkill of task.skills) {
      for (const agentSkill of skills) {
        if (
          taskSkill.toLowerCase().includes(agentSkill.toLowerCase()) ||
          agentSkill.toLowerCase().includes(taskSkill.toLowerCase())
        ) {
          return true;
        }
      }
    }

    // Infrastructure agent specific skill mappings
    const infraSkillMappings = {
      turbo: ['turbo', 'turborepo', 'monorepo', 'build'],
      jest: ['jest', 'test', 'testing', 'coverage'],
      'ci-cd': ['ci-cd', 'ci', 'cd', 'github-actions', 'vercel', 'deployment'],
      eslint: ['eslint', 'lint', 'linting'],
      npm: ['npm', 'package', 'dependency', 'scripting'],
      typescript: ['typescript', 'types', 'tsconfig'],
    };

    // Check with mapped skills
    for (const skill of skills) {
      const mappedSkills = infraSkillMappings[skill] || [skill];
      for (const mapped of mappedSkills) {
        for (const taskSkill of task.skills) {
          if (taskSkill.toLowerCase().includes(mapped)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

// Main function
function checkTasks() {
  const agentId = detectCurrentAgent();
  if (!agentId) {
    return;
  }

  console.log(`\n🤖 Checking tasks for ${agentId}...\n`);

  const skills = getAgentSkills(agentId);
  const tasks = parseTasks();

  if (tasks.length === 0) {
    console.log('📋 No tasks found in AGENTS_BOARD.md');
    return;
  }

  // Categorize tasks
  const appropriateTasks = [];
  const blockedTasks = [];
  const inProgressTasks = [];
  const readyTasks = [];

  for (const task of tasks) {
    if (task.status === 'done') continue;


    if (isTaskAppropriate(task, agentId, skills)) {
      if (task.status === 'blocked') {
        blockedTasks.push(task);
      } else if (task.status === 'in-progress' && task.owner === agentId) {
        inProgressTasks.push(task);
      } else if (task.status === 'ready') {
        readyTasks.push(task);
      } else if (task.status === 'unassigned' || task.status === 'assigned') {
        appropriateTasks.push(task);
      }
    }
  }

  // Display results
  if (inProgressTasks.length > 0) {
    console.log('🔄 In Progress:');
    for (const task of inProgressTasks) {
      console.log(`   ${task.id} - ${task.title} (P${task.priority}, ${task.estimate})`);
    }
    console.log('');
  }

  if (readyTasks.length > 0) {
    console.log('✨ Ready Tasks (Dependencies Met):');
    const sorted = readyTasks.sort((a, b) => a.priority - b.priority);
    for (const task of sorted) {
      console.log(`   ${task.id} - ${task.title} (P${task.priority}, ${task.estimate})`);
    }
    console.log('');
  }

  if (appropriateTasks.length > 0) {
    console.log('📋 Available Tasks:');
    const sorted = appropriateTasks.sort((a, b) => a.priority - b.priority);
    for (const task of sorted) {
      console.log(`   ${task.id} - ${task.title} (P${task.priority}, ${task.estimate})`);
    }
    console.log('');
  }

  if (blockedTasks.length > 0) {
    console.log('🚧 Blocked Tasks:');
    for (const task of blockedTasks) {
      console.log(`   ${task.id} - ${task.title} (P${task.priority}, ${task.estimate})`);
    }
    console.log('');
  }

  if (
    appropriateTasks.length === 0 &&
    inProgressTasks.length === 0 &&
    blockedTasks.length === 0 &&
    readyTasks.length === 0
  ) {
    console.log('📭 No appropriate tasks found for your skill set.');
    console.log(`💡 Your skills: ${skills.join(', ')}`);
  } else {
    console.log('💡 Use `/claim-task <id>` to claim a task');
    console.log('💡 Use `/complete-task <id> <summary>` to mark a task as done');
  }
}

// Run the command
checkTasks();
