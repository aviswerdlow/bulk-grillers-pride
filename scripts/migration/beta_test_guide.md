# Beta Test Guide - Task System Migration (T166)

## Overview

This guide is for the volunteer agent participating in the beta test of the new GitHub Issues-based task management system. The goal is to validate that agents can seamlessly work with GitHub Issues while maintaining backward compatibility with AGENTS_BOARD.md.

## Selected Volunteer Agent: frontend-agent

**Rationale for Selection**:
- Active agent with current tasks
- Good mix of simple and complex tasks
- Frontend work is visible and easy to validate
- Has both assigned and unassigned tasks
- Critical for user-facing features

## Beta Test Objectives

1. **Validate Dual-Mode Operation**: Ensure agent can work in both board and GitHub modes
2. **Test Real Workflows**: Complete actual tasks using GitHub mode
3. **Monitor Performance**: Track operation speed and reliability
4. **Identify Issues**: Document any problems or confusion
5. **Gather Feedback**: Collect agent experience feedback

## Setup Instructions for frontend-agent

### 1. Environment Setup

```bash
# Set your agent name
export AGENT_NAME="frontend-agent"

# Enable GitHub mode
export TASK_SYSTEM="github"

# Source the task library
source scripts/migration/task_lib.sh
```

### 2. Test Scenarios

#### Scenario A: View Your Tasks
```bash
# List all your tasks
get_my_tasks "$AGENT_NAME"

# Expected: See tasks assigned to frontend-agent
```

#### Scenario B: Task Details
```bash
# Get details for a specific task
get_task_details "T123"  # Replace with actual task ID

# Expected: Full task information including description, labels, status
```

#### Scenario C: Claim New Task
```bash
# Find unassigned frontend tasks
gh issue list --label "skill-frontend" --label "status-unassigned" --state open

# Claim a task
claim_task "T124" "$AGENT_NAME"  # Replace with actual task ID

# Expected: Task assigned to you, status updated
```

#### Scenario D: Update Task Progress
```bash
# Mark task as in-progress
update_task_status "T124" "in-progress"

# Add progress comment
add_task_comment "T124" "Started implementing responsive design for product grid"

# Mark as done when complete
update_task_status "T124" "done"
```

#### Scenario E: Sync Mode Test
```bash
# Enable sync mode for testing
export TASK_SYSTEM="sync"

# Make an update (goes to both systems)
update_task_status "T125" "in-progress"

# Switch back to GitHub mode
export TASK_SYSTEM="github"
```

### 3. Monitoring and Feedback

During the beta test, please track:

1. **Performance Metrics**:
   - Time to fetch tasks
   - Time to update status
   - Any timeout issues

2. **Usability Issues**:
   - Confusing commands
   - Missing features
   - Error messages

3. **Data Integrity**:
   - Tasks showing correctly
   - Status updates working
   - Comments appearing

## Beta Test Checklist

- [ ] Environment setup completed
- [ ] Can view assigned tasks
- [ ] Can get task details
- [ ] Can claim new task
- [ ] Can update task status
- [ ] Can add comments
- [ ] Sync mode tested
- [ ] Performance acceptable
- [ ] No data loss observed
- [ ] Rollback procedure understood

## Feedback Collection

After completing the beta test, provide feedback on:

1. **Ease of Use**: How intuitive was the GitHub mode?
2. **Performance**: Any noticeable delays or issues?
3. **Feature Gaps**: Any missing functionality?
4. **Improvements**: Suggestions for enhancement?
5. **Confidence Level**: Ready for full migration?

## Support

If you encounter issues:

1. **Check Logs**: `.sync.log` for sync issues
2. **Mapping Issues**: `python3 scripts/migration/manage_task_mappings.py conflicts`
3. **Quick Rollback**: `export TASK_SYSTEM="board"` to revert
4. **Emergency**: Run `./scripts/migration/rollback.sh --quick`

## Success Criteria

The beta test is successful if:

1. ✅ Agent can complete real tasks using GitHub mode
2. ✅ No data loss or corruption
3. ✅ Performance within acceptable limits (<5s operations)
4. ✅ Agent confident in using new system
5. ✅ Rollback procedure tested and working

## Next Steps

After successful beta test:
1. Document any issues found
2. Apply fixes if needed
3. Prepare for T167 - Final sync and verification
4. Plan full migration rollout

---

**Beta Test Duration**: 2-4 hours
**Start Time**: _________________
**End Time**: _________________
**Result**: ⬜ Success / ⬜ Issues Found