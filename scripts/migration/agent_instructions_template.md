# Agent Task Management Instructions (Dual-Mode)

## Overview

The task system now supports both AGENTS_BOARD.md and GitHub Issues to enable smooth migration. The active mode is controlled by the `TASK_SYSTEM` environment variable.

**Current Mode**: Check with `echo $TASK_SYSTEM` (defaults to 'board' if unset)

## Quick Start

```bash
# Load the task library functions
source scripts/migration/task_lib.sh

# Set your agent name
export AGENT_NAME="your-agent-name"

# Check current mode
echo "Task system mode: $(get_task_system)"
```

## Common Task Operations

### 1. View Your Tasks

```bash
# View all your assigned tasks
get_my_tasks "$AGENT_NAME"

# Example output:
# T123    Implement user authentication    in-progress
# T124    Add test coverage                assigned
```

### 2. Claim a Task

```bash
# Claim a task by ID
claim_task "T129" "$AGENT_NAME"

# Works with both T-numbers and GitHub issue numbers
claim_task "301" "$AGENT_NAME"  # GitHub issue number
```

### 3. Update Task Status

```bash
# Update task status
update_task_status "T129" "in-progress"

# Available statuses:
# - ready
# - assigned
# - in-progress
# - blocked
# - review
# - done
```

### 4. Get Task Details

```bash
# Get detailed information about a task
get_task_details "T129"
```

### 5. Add Progress Comments

```bash
# Add a comment to track progress (GitHub mode only)
add_task_comment "T129" "Completed initial implementation, starting tests"
```

## Mode-Specific Behavior

### When TASK_SYSTEM=board (default)

- Tasks are managed in AGENTS_BOARD.md
- Updates are made directly to the markdown file
- No external dependencies required
- Works exactly as before migration

**Example Workflow**:
```bash
# 1. View available tasks
get_my_tasks "$AGENT_NAME"

# 2. Claim a task
claim_task "T150" "$AGENT_NAME"

# 3. Update status as you work
update_task_status "T150" "in-progress"

# 4. Mark complete when done
update_task_status "T150" "done"
```

### When TASK_SYSTEM=github

- Tasks are GitHub Issues
- All updates go through GitHub API
- Comments and richer interaction available
- Task IDs can be T-numbers (mapped) or issue numbers

**Example Workflow**:
```bash
# 1. View your GitHub issues
get_my_tasks "$AGENT_NAME"

# 2. Claim an issue
claim_task "T150" "$AGENT_NAME"  # Uses mapping
claim_task "425" "$AGENT_NAME"   # Direct issue number

# 3. Add progress updates
add_task_comment "T150" "Working on API endpoints"

# 4. Update status
update_task_status "T150" "review"

# 5. Close when complete
update_task_status "T150" "done"
```

### When TASK_SYSTEM=sync

- Updates both systems automatically
- Board and GitHub stay synchronized
- Use either workflow
- Check logs for sync conflicts

## Manual Operations

### For Board Mode

Edit AGENTS_BOARD.md directly:
```bash
# Find your task line
grep "T150" AGENTS_BOARD.md

# Update status manually if needed
vim AGENTS_BOARD.md
```

### For GitHub Mode

Use gh CLI directly:
```bash
# List your issues
gh issue list --assignee @me

# View an issue
gh issue view 425

# Comment on an issue
gh issue comment 425 -b "Progress update"

# Close an issue
gh issue close 425 -c "Completed in PR #123"
```

## Troubleshooting

### Task Not Found

```bash
# Check if task exists in mapping
python3 scripts/migration/manage_task_mappings.py get T150

# List all mappings
python3 scripts/migration/manage_task_mappings.py list
```

### Sync Issues

```bash
# Check for conflicts
python3 scripts/migration/manage_task_mappings.py conflicts

# Force sync
TASK_SYSTEM=sync scripts/migration/sync_task_systems.sh
```

### Wrong Mode

```bash
# Check current mode
echo $TASK_SYSTEM

# Change mode temporarily
export TASK_SYSTEM=github

# Change mode permanently (add to your shell profile)
echo 'export TASK_SYSTEM=github' >> ~/.bashrc
```

## Best Practices

1. **Always claim tasks** before starting work
2. **Update status regularly** to keep team informed
3. **Add comments** (GitHub mode) for important updates
4. **Check for conflicts** if something seems wrong
5. **Use task IDs** (T-numbers) for consistency across modes

## Migration Timeline

- **Phase 1**: Board mode (current default)
- **Phase 2**: Sync mode for testing
- **Phase 3**: GitHub mode for early adopters
- **Phase 4**: GitHub mode as default
- **Phase 5**: Board mode deprecated

## Need Help?

- Check migration guide: `/docs/TASK_MIGRATION_GUIDE.md`
- View logs: `tail -f .sync.log`
- Report issues: Create issue with label 'migration-issue'