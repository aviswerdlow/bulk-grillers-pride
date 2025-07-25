#!/usr/bin/env node

/**
 * /check-tasks command
 * Shows GitHub Issues appropriate for the current agent based on their skills and ownership
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

    // Deduplicate skills
    return [...new Set(skills)];
  } catch (error) {
    console.error('❌ Error getting agent skills:', error.message);
    return [];
  }
}

// Get GitHub issues using gh CLI
function getGitHubIssues() {
  try {
    // Check if gh CLI is available
    try {
      execSync('gh --version', { stdio: 'ignore' });
    } catch {
      console.error('❌ GitHub CLI (gh) is not installed. Please install it first.');
      console.error('   Visit: https://cli.github.com/');
      return [];
    }

    // Get all open issues with our task labels
    const issuesJson = execSync(
      'gh issue list --state open --limit 200 --json number,title,labels,assignees,state,body',
      { encoding: 'utf8' }
    );

    return JSON.parse(issuesJson);
  } catch (error) {
    console.error('❌ Error fetching GitHub issues:', error.message);
    return [];
  }
}

// Parse issue to extract task metadata
function parseIssue(issue) {
  const task = {
    id: `#${issue.number}`,
    title: issue.title,
    skills: [],
    owner: null,
    status: 'unassigned',
    priority: 99,
    estimate: 'unknown',
    labels: issue.labels.map(l => l.name),
    url: `gh issue view ${issue.number}`
  };

  // Extract priority from labels
  const priorityLabel = issue.labels.find(l => l.name.match(/^priority-p(\d)$/i));
  if (priorityLabel) {
    task.priority = parseInt(priorityLabel.name.match(/\d+/)[0]);
  }

  // Extract skills from labels
  const skillLabels = issue.labels.filter(l => l.name.startsWith('skill-'));
  task.skills = skillLabels.map(l => l.name.replace('skill-', ''));

  // Extract status from labels
  const statusLabel = issue.labels.find(l => 
    ['status-in-progress', 'status-blocked', 'status-ready', 'status-done'].includes(l.name)
  );
  if (statusLabel) {
    task.status = statusLabel.name.replace('status-', '');
  }

  // Extract owner from assignees or agent labels
  if (issue.assignees && issue.assignees.length > 0) {
    task.owner = issue.assignees[0].login;
  } else {
    const agentLabel = issue.labels.find(l => l.name.startsWith('agent-'));
    if (agentLabel) {
      task.owner = agentLabel.name.replace('agent-', '');
    }
  }

  // Try to extract estimate from body
  const estimateMatch = issue.body?.match(/estimate:\s*(\d+(?:\.\d+)?)\s*hours?/i);
  if (estimateMatch) {
    task.estimate = `${estimateMatch[1]} hours`;
  }

  return task;
}

// Determine if a task is appropriate for an agent
function isTaskAppropriate(task, agentId, skills) {
  // Check if task is already done
  if (task.status === 'done') {
    return false;
  }

  // Check if task is already assigned to another agent
  if (task.status === 'in-progress' && task.owner && task.owner !== agentId) {
    return false;
  }

  // Check if task has agent-specific label
  if (task.labels.includes(`agent-${agentId}`)) {
    return true;
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

  console.log(`\n🤖 Checking GitHub Issues for ${agentId}...\n`);

  const skills = getAgentSkills(agentId);
  const issues = getGitHubIssues();

  if (issues.length === 0) {
    console.log('📋 No issues found. Make sure you are authenticated with gh CLI.');
    console.log('   Run: gh auth login');
    return;
  }

  // Parse and categorize tasks
  const tasks = issues.map(parseIssue);
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
      } else if (task.status === 'unassigned' || (!task.owner && task.labels.includes(`agent-${agentId}`))) {
        appropriateTasks.push(task);
      }
    }
  }

  // Display results
  if (inProgressTasks.length > 0) {
    console.log('🔄 In Progress:');
    for (const task of inProgressTasks) {
      console.log(`   ${task.id} - ${task.title} (P${task.priority}, ${task.estimate})`);
      console.log(`        View: ${task.url}`);
    }
    console.log('');
  }

  if (readyTasks.length > 0) {
    console.log('✨ Ready Tasks (Dependencies Met):');
    const sorted = readyTasks.sort((a, b) => a.priority - b.priority);
    for (const task of sorted) {
      console.log(`   ${task.id} - ${task.title} (P${task.priority}, ${task.estimate})`);
      console.log(`        View: ${task.url}`);
    }
    console.log('');
  }

  if (appropriateTasks.length > 0) {
    console.log('📋 Available Tasks:');
    const sorted = appropriateTasks.sort((a, b) => a.priority - b.priority);
    for (const task of sorted) {
      console.log(`   ${task.id} - ${task.title} (P${task.priority}, ${task.estimate})`);
      console.log(`        View: ${task.url}`);
    }
    console.log('');
  }

  if (blockedTasks.length > 0) {
    console.log('🚧 Blocked Tasks:');
    for (const task of blockedTasks) {
      console.log(`   ${task.id} - ${task.title} (P${task.priority}, ${task.estimate})`);
      console.log(`        View: ${task.url}`);
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
    console.log('💡 To claim a task:');
    console.log('   gh issue edit <number> --add-assignee @me');
    console.log('   gh issue edit <number> --add-label "status-in-progress"');
    console.log('');
    console.log('💡 To complete a task:');
    console.log('   gh issue edit <number> --add-label "status-done"');
    console.log('   gh issue close <number> --comment "Task completed: <summary>"');
  }
}

// Run the command
checkTasks();