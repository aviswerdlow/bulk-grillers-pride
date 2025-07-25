#!/bin/bash
# Emergency rollback procedure for task system migration
# Task: T170 - Create rollback procedure

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOARD_FILE="${BOARD_FILE:-AGENTS_BOARD.md}"
MAPPING_FILE="${MAPPING_FILE:-.task_mappings.json}"
BACKUP_DIR="${BACKUP_DIR:-.migration_backups}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a rollback.log
}

error_exit() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

# Check if rollback is needed
check_rollback_needed() {
    local current_mode="${TASK_SYSTEM:-board}"
    
    echo -e "${BLUE}=== Rollback Assessment ===${NC}"
    echo "Current TASK_SYSTEM: $current_mode"
    
    if [ "$current_mode" = "board" ]; then
        echo -e "${GREEN}Already in board mode - no rollback needed${NC}"
        return 1
    fi
    
    return 0
}

# Create safety backup
create_safety_backup() {
    log "Creating safety backup before rollback..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Backup timestamp
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_subdir="$BACKUP_DIR/rollback_$timestamp"
    mkdir -p "$backup_subdir"
    
    # Backup critical files
    cp "$BOARD_FILE" "$backup_subdir/" 2>/dev/null || true
    cp "$MAPPING_FILE" "$backup_subdir/" 2>/dev/null || true
    cp .env "$backup_subdir/" 2>/dev/null || true
    
    # Backup GitHub issues list
    if command -v gh &> /dev/null; then
        gh issue list --limit 1000 --state all --json number,title,labels,state,body > \
            "$backup_subdir/github_issues.json" 2>/dev/null || true
    fi
    
    log "Safety backup created at: $backup_subdir"
    echo "$backup_subdir"
}

# Sync GitHub state back to board
sync_github_to_board_emergency() {
    log "Emergency sync from GitHub to board..."
    
    if ! command -v gh &> /dev/null; then
        error_exit "GitHub CLI not available - cannot sync from GitHub"
    fi
    
    # Get all task-related issues
    log "Fetching issues from GitHub..."
    local issues=$(gh issue list \
        --limit 1000 \
        --state all \
        --json number,title,labels,assignees,state,body \
        --jq '.[] | select(.labels | any(.name | startswith("agent-") or startswith("priority-")))')
    
    if [ -z "$issues" ]; then
        log "Warning: No task issues found on GitHub"
        return
    fi
    
    # Update board with GitHub data
    echo "$issues" | python3 "$SCRIPT_DIR/update_board_from_github.py" \
        --board-file "$BOARD_FILE" \
        --mapping-file "$MAPPING_FILE"
    
    log "Emergency sync completed"
}

# Restore from backup
restore_from_backup() {
    local backup_dir="$1"
    
    if [ ! -d "$backup_dir" ]; then
        error_exit "Backup directory not found: $backup_dir"
    fi
    
    log "Restoring from backup: $backup_dir"
    
    # Restore files
    if [ -f "$backup_dir/AGENTS_BOARD.md" ]; then
        cp "$backup_dir/AGENTS_BOARD.md" "$BOARD_FILE"
        log "Restored $BOARD_FILE"
    fi
    
    if [ -f "$backup_dir/.task_mappings.json" ]; then
        cp "$backup_dir/.task_mappings.json" "$MAPPING_FILE"
        log "Restored $MAPPING_FILE"
    fi
    
    log "Restore completed"
}

# Revert environment settings
revert_environment() {
    log "Reverting environment settings..."
    
    # Remove TASK_SYSTEM from .env
    if [ -f .env ]; then
        sed -i.bak '/TASK_SYSTEM=github/d' .env
        sed -i.bak '/TASK_SYSTEM=sync/d' .env
        log "Removed TASK_SYSTEM from .env"
    fi
    
    # Add board mode explicitly
    echo "TASK_SYSTEM=board" >> .env
    log "Set TASK_SYSTEM=board in .env"
    
    # Update current shell
    export TASK_SYSTEM=board
}

# Notify agents
notify_agents() {
    local message="$1"
    
    log "Notifying agents: $message"
    
    # Create notification file
    cat > ROLLBACK_NOTICE.txt << EOF
=== EMERGENCY ROLLBACK NOTICE ===
Date: $(date)

$message

Actions Required:
1. Stop any current GitHub-based operations
2. Reload your shell environment: source ~/.bashrc
3. Verify TASK_SYSTEM=board
4. Resume work using AGENTS_BOARD.md

The task system has been rolled back to board mode.
All agents should use the board file for task management.

If you experience issues:
- Check rollback.log for details
- Verify your tasks in AGENTS_BOARD.md
- Report problems to the migration team
EOF
    
    # Show notification
    cat ROLLBACK_NOTICE.txt
}

# Validate rollback
validate_rollback() {
    log "Validating rollback..."
    
    local errors=0
    
    # Check TASK_SYSTEM
    if [ "${TASK_SYSTEM}" != "board" ]; then
        log "Error: TASK_SYSTEM is not 'board'"
        ((errors++))
    fi
    
    # Check board file exists
    if [ ! -f "$BOARD_FILE" ]; then
        log "Error: Board file not found"
        ((errors++))
    fi
    
    # Check board file has content
    if [ -f "$BOARD_FILE" ]; then
        local task_count=$(grep -c "^| T[0-9]" "$BOARD_FILE" || echo 0)
        log "Board contains $task_count tasks"
        if [ "$task_count" -eq 0 ]; then
            log "Warning: No tasks found in board"
        fi
    fi
    
    # Check .env file
    if grep -q "TASK_SYSTEM=github\|TASK_SYSTEM=sync" .env 2>/dev/null; then
        log "Error: .env still contains non-board TASK_SYSTEM"
        ((errors++))
    fi
    
    if [ "$errors" -eq 0 ]; then
        log "Validation PASSED"
        return 0
    else
        log "Validation FAILED with $errors errors"
        return 1
    fi
}

# Main rollback procedure
perform_rollback() {
    echo -e "${RED}=== EMERGENCY ROLLBACK PROCEDURE ===${NC}"
    echo "This will revert the task system to board-only mode"
    echo ""
    
    # Confirm
    read -p "Are you sure you want to rollback? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Rollback cancelled"
        exit 0
    fi
    
    # Create safety backup
    local backup_dir=$(create_safety_backup)
    
    # Option to sync from GitHub
    read -p "Sync current GitHub state to board before rollback? (yes/no): " sync_choice
    if [ "$sync_choice" = "yes" ]; then
        sync_github_to_board_emergency
    fi
    
    # Revert environment
    revert_environment
    
    # Notify agents
    notify_agents "Emergency rollback completed - GitHub task system disabled"
    
    # Validate
    if validate_rollback; then
        echo -e "${GREEN}=== ROLLBACK SUCCESSFUL ===${NC}"
        echo "Task system reverted to board mode"
        echo "Backup saved at: $backup_dir"
    else
        echo -e "${RED}=== ROLLBACK COMPLETED WITH WARNINGS ===${NC}"
        echo "Please check rollback.log for issues"
        echo "Backup saved at: $backup_dir"
    fi
}

# Quick rollback option
quick_rollback() {
    log "Performing quick rollback..."
    
    # Just change the environment
    export TASK_SYSTEM=board
    sed -i.bak '/TASK_SYSTEM=/d' .env 2>/dev/null || true
    echo "TASK_SYSTEM=board" >> .env
    
    echo -e "${GREEN}Quick rollback completed${NC}"
    echo "TASK_SYSTEM set to board mode"
}

# Main
main() {
    case "${1:-}" in
        --quick)
            quick_rollback
            ;;
        --restore)
            if [ -z "$2" ]; then
                error_exit "Backup directory required for restore"
            fi
            restore_from_backup "$2"
            ;;
        --validate)
            validate_rollback
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  (no args)     Perform full rollback procedure"
            echo "  --quick       Quick rollback (environment only)"
            echo "  --restore DIR Restore from specific backup"
            echo "  --validate    Validate current state"
            echo "  --help        Show this help"
            ;;
        *)
            if check_rollback_needed; then
                perform_rollback
            fi
            ;;
    esac
}

# Run main
main "$@"