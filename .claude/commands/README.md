# Multi-Agent Task Management Commands

This directory contains custom slash commands for the multi-agent development system to improve task discovery and assignment workflow.

## Available Commands

### `/check-tasks`

Shows tasks appropriate for the current agent based on their skills and ownership paths.

**Usage:**

```bash
/check-tasks
```

**Features:**

- Auto-detects current agent from CLAUDE.md
- Filters tasks based on agent skills and keywords
- Shows tasks by status: In Progress, Available, Blocked
- Sorts by priority (P0 highest)

**Example Output:**

```
🤖 Checking tasks for infra-agent...

🔄 In Progress:
   T51 - Implement /check-tasks Command (P1, 1.5 hours)

✅ Available Tasks:
   T47 - Setup Husky Pre-commit Hooks (P1, 1 hour)

💡 Use /claim-task <id> to claim a task
💡 Use /complete-task <id> <summary> to mark a task as done
```

### `/claim-task <id>`

Claims a task and marks it as in-progress for the current agent.

**Usage:**

```bash
/claim-task T45
```

**Features:**

- Validates task exists and is available
- Updates task status to in-progress
- Updates agent's current_task field
- Shows task details after claiming

**Error Cases:**

- Task already assigned/completed
- Invalid task ID format
- Task not found

### `/complete-task <id> <summary>`

Marks a task as done with a completion summary.

**Usage:**

```bash
/complete-task T45 "Upgraded Turbo to v2 with 40% performance improvement"
```

**Features:**

- Validates agent owns the task
- Updates task status to done
- Adds entry to completion log with timestamp
- Clears agent's current_task
- Updates agent metrics (tasks completed)
- Checks for newly unblocked tasks

**Error Cases:**

- Task not assigned to current agent
- Invalid task ID format
- Task not found

### `/assign-task <id> <agent>`

Assigns a task to a specific agent (for coordination).

**Usage:**

```bash
/assign-task T47 quality-agent
```

**Valid Agents:**

- frontend-agent
- backend-agent
- infra-agent
- quality-agent
- docs-agent
- migration-agent

**Features:**

- Validates target agent exists
- Updates task assignment
- Shows task details
- Notifies how target agent can claim it

**Error Cases:**

- Task already completed
- Invalid agent ID
- Task not found

## Implementation Details

### Agent Detection

All commands detect the current agent by reading `agent_id` from the CLAUDE.md file in the current directory.

### Task Parsing

Tasks are parsed from the `## Tasks` section in AGENTS_BOARD.md with format:

```
- T{id} - {title} (P{priority}, {estimate}) - {status} [{assignee}]
```

### Status Values

- `unassigned` - Available for any appropriate agent
- `assigned` - Assigned but not started
- `in-progress` - Actively being worked on
- `blocked` - Waiting on dependencies
- `done` - Completed

### Skill Matching

For infra-agent, tasks are matched based on:

- Primary skills: turbo, jest, ci-cd, eslint, npm, typescript
- Skill-specific keywords (e.g., "build" matches turbo skill)
- General infrastructure keywords

## Setup Instructions

1. Ensure Node.js is installed
2. Commands are already executable (`chmod +x`)
3. Run from project root or agent directory with CLAUDE.md

## Integration with Claude Code

These commands integrate with the multi-agent system by:

- Reading agent configuration from CLAUDE.md
- Updating shared state in AGENTS_BOARD.md
- Tracking metrics in .agent-metrics/
- Following the agent coordination protocol

## Future Enhancements

Potential improvements:

- Task dependencies visualization
- Time tracking integration
- Skill-based task recommendations
- Cross-agent task handoffs
- Task priority updates
- Bulk operations
