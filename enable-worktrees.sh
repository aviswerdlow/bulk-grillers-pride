#!/bin/bash
# Enable worktree support for current shell session
# Source this file: source enable-worktrees.sh

# Export environment variables
export ENABLE_WORKTREES=true
export WORKTREE_BASE=.worktrees
export TASK_MAPPING_FILE=.worktree-task-mapping.json

# Monitoring configuration
export STALE_DAYS=7
export WARN_SIZE_MB=500
export CRITICAL_SIZE_MB=1000

# Task system configuration
export TASK_SYSTEM=github

# Source task library functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/scripts/migration/task_lib.sh" ]; then
    source "$SCRIPT_DIR/scripts/migration/task_lib.sh"
    echo "✓ Task library functions loaded"
else
    echo "⚠ Warning: Could not find task_lib.sh"
fi

# Create helpful aliases
alias wt-status='./scripts/monitor-worktrees.sh report'
alias wt-list='./scripts/setup-agent-worktrees.sh list'
alias wt-cleanup='./scripts/monitor-worktrees.sh cleanup'
alias wt-orchestrate='./scripts/worktree-orchestrator.sh'

# Display status
echo "Git Worktree Support Enabled!"
echo "============================="
echo "ENABLE_WORKTREES=$ENABLE_WORKTREES"
echo "WORKTREE_BASE=$WORKTREE_BASE"
echo "TASK_SYSTEM=$TASK_SYSTEM"
echo ""
echo "Available commands:"
echo "  wt-status     - Show worktree health report"
echo "  wt-list       - List all agent worktrees"
echo "  wt-cleanup    - Generate cleanup script"
echo "  wt-orchestrate - Access orchestrator functions"
echo ""
echo "Task functions:"
echo "  claim_task_with_worktree <task-id> <agent-name>"
echo "  complete_task_with_cleanup <task-id> <summary>"
echo "  cleanup_task_worktree <task-id> <agent-name>"
echo "  list_agent_worktrees <agent-name>"
echo ""
echo "Ready to use worktrees!"