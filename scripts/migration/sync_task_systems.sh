#!/bin/bash
# Bidirectional sync between AGENTS_BOARD.md and GitHub Issues
# Task: T159 - Create bidirectional sync system

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOARD_FILE="${BOARD_FILE:-AGENTS_BOARD.md}"
MAPPING_FILE="${MAPPING_FILE:-.task_mappings.json}"
LOG_FILE="${LOG_FILE:-.sync.log}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

# Check dependencies
check_dependencies() {
    command -v python3 >/dev/null 2>&1 || error_exit "Python 3 is required"
    command -v gh >/dev/null 2>&1 || error_exit "GitHub CLI (gh) is required"
    command -v jq >/dev/null 2>&1 || error_exit "jq is required"
    
    # Check if gh is authenticated
    gh auth status >/dev/null 2>&1 || error_exit "GitHub CLI is not authenticated. Run: gh auth login"
}

# Load or create mapping file
load_mappings() {
    if [ -f "$MAPPING_FILE" ]; then
        log "Loading existing mappings from $MAPPING_FILE"
    else
        log "Creating new mapping file at $MAPPING_FILE"
        echo '{"task_mappings": {}, "sync_status": {}}' > "$MAPPING_FILE"
    fi
}

# Sync from AGENTS_BOARD.md to GitHub Issues
sync_board_to_github() {
    log "=== Syncing AGENTS_BOARD.md to GitHub Issues ==="
    
    # Parse the board
    log "Parsing $BOARD_FILE..."
    PARSED_TASKS=$(python3 "$SCRIPT_DIR/parse_agents_board.py" "$BOARD_FILE" --pretty 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        error_exit "Failed to parse board file"
    fi
    
    # Count tasks
    TASK_COUNT=$(echo "$PARSED_TASKS" | jq -r '.count')
    log "Found $TASK_COUNT tasks in board"
    
    # Create/update issues
    log "Creating/updating GitHub issues..."
    echo "$PARSED_TASKS" | python3 "$SCRIPT_DIR/create_github_issues.py" \
        --mapping-file "$MAPPING_FILE" 2>&1 | tee -a "$LOG_FILE"
    
    # Update sync timestamp
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    jq ".sync_status.last_board_to_github = \"$TIMESTAMP\"" "$MAPPING_FILE" > "$MAPPING_FILE.tmp"
    mv "$MAPPING_FILE.tmp" "$MAPPING_FILE"
    
    log "Board to GitHub sync completed"
}

# Sync from GitHub Issues to AGENTS_BOARD.md
sync_github_to_board() {
    log "=== Syncing GitHub Issues to AGENTS_BOARD.md ==="
    
    # Create backup of board
    BACKUP_FILE="${BOARD_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$BOARD_FILE" "$BACKUP_FILE"
    log "Created backup at $BACKUP_FILE"
    
    # Fetch all issues with our labels
    log "Fetching issues from GitHub..."
    ISSUES=$(gh issue list \
        --limit 1000 \
        --state all \
        --json number,title,labels,assignees,state,body \
        --jq '.[] | select(.labels | any(.name | startswith("status-") or startswith("priority-") or startswith("agent-")))')
    
    # Process with Python script
    echo "$ISSUES" | python3 "$SCRIPT_DIR/update_board_from_github.py" \
        --board-file "$BOARD_FILE" \
        --mapping-file "$MAPPING_FILE" 2>&1 | tee -a "$LOG_FILE"
    
    # Update sync timestamp
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    jq ".sync_status.last_github_to_board = \"$TIMESTAMP\"" "$MAPPING_FILE" > "$MAPPING_FILE.tmp"
    mv "$MAPPING_FILE.tmp" "$MAPPING_FILE"
    
    log "GitHub to board sync completed"
}

# Check for conflicts
check_conflicts() {
    log "Checking for sync conflicts..."
    
    # Run conflict detection script
    python3 "$SCRIPT_DIR/detect_conflicts.py" \
        --board-file "$BOARD_FILE" \
        --mapping-file "$MAPPING_FILE" 2>&1 | tee -a "$LOG_FILE"
}

# Main sync logic
main() {
    # Check what mode we're in
    TASK_SYSTEM="${TASK_SYSTEM:-board}"
    
    log "Starting sync in mode: $TASK_SYSTEM"
    
    check_dependencies
    load_mappings
    
    case "$TASK_SYSTEM" in
        "sync")
            # Full bidirectional sync
            sync_board_to_github
            sync_github_to_board
            check_conflicts
            ;;
        "github")
            # One-way sync from board to GitHub
            sync_board_to_github
            ;;
        "board")
            # No sync needed in board-only mode
            log "Board-only mode - no sync needed"
            ;;
        *)
            error_exit "Unknown TASK_SYSTEM: $TASK_SYSTEM"
            ;;
    esac
    
    log "Sync completed successfully"
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --board-file)
            BOARD_FILE="$2"
            shift 2
            ;;
        --mapping-file)
            MAPPING_FILE="$2"
            shift 2
            ;;
        --log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --board-file FILE     Path to AGENTS_BOARD.md (default: AGENTS_BOARD.md)"
            echo "  --mapping-file FILE   Path to task mappings (default: .task_mappings.json)"
            echo "  --log-file FILE       Path to log file (default: .sync.log)"
            echo "  --help                Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  TASK_SYSTEM          sync|github|board (default: board)"
            exit 0
            ;;
        *)
            error_exit "Unknown option: $1"
            ;;
    esac
done

# Run main function
main