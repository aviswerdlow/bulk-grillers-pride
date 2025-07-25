# Hybrid Task Management Workflow

## Overview

The hybrid task management system combines GitHub's user assignment features with agent labels for identification:

- **User Assignment**: Tasks are assigned to the actual GitHub user (`aviswerdlow`)
- **Agent Labels**: Agent identity is preserved through labels (e.g., `agent-infra-agent`)
- **Notifications**: GitHub notifications and "Assigned to me" feature work properly

## Key Benefits

1. **GitHub Integration**: Native GitHub features work as expected
2. **Agent Identity**: Clear visibility of which agent is handling each task
3. **User Notifications**: Proper email/web notifications for task assignments
4. **Search & Filter**: Easy to find tasks by agent or user

## Usage

### Claiming a Task
```bash
source scripts/migration/task_lib.sh
claim_task T123 frontend-agent
```

This will:
- Assign the issue to `aviswerdlow` (GitHub user)
- Add label `agent-frontend-agent`
- Update status labels appropriately

### Viewing Agent Tasks
```bash
get_my_tasks frontend-agent
```

This searches for issues:
- Assigned to: `aviswerdlow`
- With label: `agent-frontend-agent`
- In state: open

### Updating Task Status
```bash
update_task_status T123 in-progress
update_task_status T123 done
```

## Agent Labels

Each agent has a corresponding label:
- `agent-infra-agent` - Infrastructure agent
- `agent-frontend-agent` - Frontend agent
- `agent-backend-agent` - Backend agent
- `agent-quality-agent` - Quality agent
- `agent-docs-agent` - Documentation agent
- `agent-migration-agent` - Migration agent

## Implementation Details

The hybrid approach modifies the `claim_task()` function to:
1. Detect the GitHub username using `gh api user`
2. Assign issues to the actual user (not agent name)
3. Add agent-specific labels for identification
4. Maintain backward compatibility

## Testing

Run the test script to verify the implementation:
```bash
scripts/migration/test_hybrid_workflow.sh
```