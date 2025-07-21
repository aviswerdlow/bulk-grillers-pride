# AGENTS_BOARD.md - ARCHIVED

## 🚨 IMPORTANT NOTICE 🚨

This board has been **ARCHIVED** and is no longer the active task management system.

### Current Status: MIGRATED TO GITHUB ISSUES

As of **CUTOVER_DATE**, all task management has been migrated to GitHub Issues.

## For All Agents

### How to Access Tasks

```bash
# Set your agent name
export AGENT_NAME="your-agent-name"

# Load task functions
source scripts/migration/task_lib.sh

# View your tasks
get_my_tasks "$AGENT_NAME"
```

### GitHub Web Interface

Visit the repository's Issues tab to:
- View all tasks
- Filter by agent labels
- Track task progress
- Add comments and updates

### Quick Reference

- **View Tasks**: `get_my_tasks "agent-name"`
- **Claim Task**: `claim_task "T123" "agent-name"`
- **Update Status**: `update_task_status "T123" "in-progress"`
- **Add Comment**: `add_task_comment "T123" "Progress update"`

## Emergency Rollback

If you need to temporarily revert to board mode:

```bash
# Quick rollback
export TASK_SYSTEM=board

# Full rollback
./scripts/migration/rollback.sh
```

## Archive Location

The final board state is preserved at:
`ARCHIVE_PATH`

## Support

- **Issues**: Create with label 'migration-issue'
- **Logs**: Check `.sync.log` for sync details
- **Help**: See migration documentation

---

**Cutover completed on CUTOVER_DATE**
**Migration executed by: migration-agent**
