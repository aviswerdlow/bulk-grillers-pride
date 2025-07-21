# GitHub Issues Quick Start Guide for Agents

## Overview

The task management system has migrated from AGENTS_BOARD.md to GitHub Issues. This guide helps agents quickly get started with the new workflow.

## Prerequisites

1. **Install GitHub CLI** (if not already installed):
   ```bash
   # macOS
   brew install gh
   
   # Or visit: https://cli.github.com/
   ```

2. **Authenticate with GitHub**:
   ```bash
   gh auth login
   ```

## Essential Commands

### 1. Check Available Tasks

From your agent directory (containing CLAUDE.md):
```bash
/check-tasks
```

This shows:
- 🔄 **In Progress**: Your active tasks
- ✨ **Ready**: Tasks with dependencies met
- 📋 **Available**: Tasks you can claim
- 🚧 **Blocked**: Tasks waiting on dependencies

### 2. View Task Details

```bash
gh issue view <number>
```

### 3. Claim a Task

```bash
# Assign to yourself
gh issue edit <number> --add-assignee @me

# Mark as in-progress
gh issue edit <number> --add-label "status-in-progress"

# Remove unassigned status
gh issue edit <number> --remove-label "status-unassigned"
```

### 4. Update Task Status

```bash
# Mark as blocked
gh issue edit <number> --add-label "status-blocked" --remove-label "status-in-progress"

# Mark as ready for review
gh issue edit <number> --add-label "status-review" --remove-label "status-in-progress"
```

### 5. Complete a Task

```bash
# Mark as done
gh issue edit <number> --add-label "status-done" --remove-label "status-in-progress"

# Close with summary
gh issue close <number> --comment "Task completed: <your summary here>"
```

### 6. Add Comments/Updates

```bash
gh issue comment <number> --body "Progress update: Implemented X, working on Y"
```

## Task Workflow

1. **Start Work**:
   ```bash
   /check-tasks                              # Find available work
   gh issue view 123                         # Review task details
   gh issue edit 123 --add-assignee @me     # Claim it
   gh issue edit 123 --add-label "status-in-progress"
   ```

2. **During Work**:
   ```bash
   gh issue comment 123 --body "Update: Completed first part"
   ```

3. **Complete Work**:
   ```bash
   gh issue edit 123 --add-label "status-done"
   gh issue close 123 --comment "Implemented feature X with tests"
   /check-tasks                              # Find next task
   ```

## Label Reference

### Status Labels
- `status-unassigned` - Available to claim
- `status-in-progress` - Being worked on
- `status-blocked` - Waiting on dependencies
- `status-review` - Ready for review
- `status-done` - Completed

### Agent Labels
- `agent-frontend-agent`
- `agent-backend-agent`
- `agent-infra-agent`
- `agent-quality-agent`
- `agent-design-agent`
- `agent-systems-design-agent`
- `agent-docs-agent`
- `agent-migration-agent`
- `agent-orchestrator`

### Priority Labels
- `priority-P0` - Critical
- `priority-P1` - High
- `priority-P2` - Medium
- `priority-P3` - Low

### Skill Labels
- `skill-react`, `skill-convex`, `skill-jest`, etc.

## Tips

1. **Filter by Your Agent**:
   ```bash
   gh issue list --label "agent-infra-agent"
   ```

2. **See All Open Tasks**:
   ```bash
   gh issue list --limit 100
   ```

3. **Search Tasks**:
   ```bash
   gh issue list --search "testing"
   ```

4. **View in Browser**:
   ```bash
   gh issue view <number> --web
   ```

## Troubleshooting

- **"No appropriate tasks found"**: Check if tasks have your agent label or matching skills
- **"gh: command not found"**: Install GitHub CLI first
- **Authentication errors**: Run `gh auth login`
- **Can't see issues**: Make sure you're in the correct repository

## Migration Notes

- Old task IDs (T123) are preserved in issue titles
- Task mappings are stored in `.task_mappings.json`
- The archived board is at `.board_archive/AGENTS_BOARD_FINAL_*.md`
- For rollback procedures, see `scripts/migration/rollback.sh`

## Need Help?

- Create an issue with label `migration-issue`
- Check `.sync.log` for sync operation details
- Review migration docs in `scripts/migration/`