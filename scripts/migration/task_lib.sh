#!/bin/bash
# Task Wrapper Library for Multi-Agent System
# Task: T160 - Create task wrapper library
# Provides unified interface for agents to work with both AGENTS_BOARD.md and GitHub Issues

# Configuration
TASK_SYSTEM="${TASK_SYSTEM:-board}"
BOARD_FILE="${BOARD_FILE:-AGENTS_BOARD.md}"
MAPPING_FILE="${MAPPING_FILE:-.task_mappings.json}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detect which task system to use
get_task_system() {
    echo "${TASK_SYSTEM}"
}

# Get current agent name from environment or parameter
get_agent_name() {
    local agent="${1:-${AGENT_NAME}}"
    if [ -z "$agent" ]; then
        echo "Error: Agent name not specified" >&2
        return 1
    fi
    echo "$agent"
}

# Get tasks for current agent
get_my_tasks() {
    local agent_name="$1"
    local system=$(get_task_system)
    
    if [ -z "$agent_name" ]; then
        echo "Error: Agent name required" >&2
        return 1
    fi
    
    case "$system" in
        "github")
            # Get tasks from GitHub
            echo -e "${BLUE}Fetching tasks from GitHub...${NC}" >&2
            gh issue list \
                --assignee "$agent_name" \
                --state open \
                --limit 100 \
                --json number,title,labels,state \
                --jq '.[] | "\(.number)\t\(.title)\t\(.labels | map(.name) | join(","))"'
            ;;
        "sync")
            # Get from GitHub but show both sources
            echo -e "${YELLOW}[SYNC MODE] Showing GitHub tasks (source of truth)${NC}" >&2
            get_my_tasks_github "$agent_name"
            ;;
        "board"|*)
            # Get tasks from board
            echo -e "${BLUE}Fetching tasks from AGENTS_BOARD.md...${NC}" >&2
            python3 "$SCRIPT_DIR/parse_agents_board.py" "$BOARD_FILE" \
                --filter-owner "$agent_name" \
                --pretty 2>/dev/null | \
                jq -r '.tasks[] | select(.status != "done") | "\(.id)\t\(.description)\t\(.status)"'
            ;;
    esac
}

# Get specific task details
get_task_details() {
    local task_id="$1"
    local system=$(get_task_system)
    
    case "$system" in
        "github")
            # If task_id starts with T, look up GitHub issue number
            if [[ $task_id == T* ]]; then
                if [ -f "$MAPPING_FILE" ]; then
                    issue_num=$(jq -r ".task_mappings.\"$task_id\".github_issue // empty" "$MAPPING_FILE")
                    if [ -z "$issue_num" ]; then
                        echo "Error: No GitHub issue found for $task_id" >&2
                        return 1
                    fi
                else
                    echo "Error: Mapping file not found" >&2
                    return 1
                fi
            else
                issue_num=$task_id
            fi
            
            gh issue view "$issue_num" --json number,title,body,labels,assignees,state
            ;;
        "board"|*)
            # Get from board
            python3 "$SCRIPT_DIR/parse_agents_board.py" "$BOARD_FILE" --pretty 2>/dev/null | \
                jq ".tasks[] | select(.id == \"$task_id\")"
            ;;
    esac
}

# Claim a task
claim_task() {
    local task_id="$1"
    local agent_name="$2"
    local system=$(get_task_system)
    
    if [ -z "$task_id" ] || [ -z "$agent_name" ]; then
        echo "Error: Task ID and agent name required" >&2
        return 1
    fi
    
    echo -e "${BLUE}Claiming task $task_id for $agent_name...${NC}"
    
    case "$system" in
        "github")
            # Update GitHub issue
            if [[ $task_id == T* ]] && [ -f "$MAPPING_FILE" ]; then
                issue_num=$(jq -r ".task_mappings.\"$task_id\".github_issue // empty" "$MAPPING_FILE")
            else
                issue_num=$task_id
            fi
            
            if [ -n "$issue_num" ]; then
                gh issue edit "$issue_num" \
                    --add-assignee "$agent_name" \
                    --remove-label "status-ready,status-unassigned" \
                    --add-label "status-assigned"
                echo -e "${GREEN}✓ Claimed issue #$issue_num${NC}"
            fi
            ;;
        "sync")
            # Update both systems
            claim_task_board "$task_id" "$agent_name"
            claim_task_github "$task_id" "$agent_name"
            ;;
        "board"|*)
            claim_task_board "$task_id" "$agent_name"
            ;;
    esac
}

# Helper: Claim task in board
claim_task_board() {
    local task_id="$1"
    local agent_name="$2"
    
    # Update board file
    sed -i.bak "s/| $task_id |\\([^|]*\\)|\\([^|]*\\)|[^|]*|[^|]*|/| $task_id |\\1|\\2| $agent_name | ✅ assigned |/" "$BOARD_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Updated $task_id in board${NC}"
    else
        echo -e "${RED}✗ Failed to update board${NC}"
        return 1
    fi
}

# Helper: Claim task in GitHub
claim_task_github() {
    local task_id="$1"
    local agent_name="$2"
    
    if [[ $task_id == T* ]] && [ -f "$MAPPING_FILE" ]; then
        issue_num=$(jq -r ".task_mappings.\"$task_id\".github_issue // empty" "$MAPPING_FILE")
        if [ -n "$issue_num" ]; then
            gh issue edit "$issue_num" \
                --add-assignee "$agent_name" \
                --remove-label "status-ready" \
                --add-label "status-assigned"
        fi
    fi
}

# Update task status
update_task_status() {
    local task_id="$1"
    local new_status="$2"
    local system=$(get_task_system)
    
    echo -e "${BLUE}Updating task $task_id to status: $new_status${NC}"
    
    # Map status to emoji for board
    local board_status
    case "$new_status" in
        "ready") board_status="✨ ready" ;;
        "assigned") board_status="✅ assigned" ;;
        "in-progress") board_status="🏃 in-progress" ;;
        "blocked") board_status="⏸️ blocked" ;;
        "review") board_status="📋 review" ;;
        "done") board_status="✔️ done" ;;
        *) board_status="$new_status" ;;
    esac
    
    case "$system" in
        "github")
            update_task_status_github "$task_id" "$new_status"
            ;;
        "sync")
            update_task_status_board "$task_id" "$board_status"
            update_task_status_github "$task_id" "$new_status"
            ;;
        "board"|*)
            update_task_status_board "$task_id" "$board_status"
            ;;
    esac
}

# Helper: Update status in board
update_task_status_board() {
    local task_id="$1"
    local new_status="$2"
    
    # Update board file - match task ID and update status field
    sed -i.bak "s/| $task_id |\\([^|]*\\)|\\([^|]*\\)|\\([^|]*\\)|[^|]*|/| $task_id |\\1|\\2|\\3| $new_status |/" "$BOARD_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Updated $task_id status in board${NC}"
    else
        echo -e "${RED}✗ Failed to update board${NC}"
        return 1
    fi
}

# Helper: Update status in GitHub
update_task_status_github() {
    local task_id="$1"
    local new_status="$2"
    
    if [[ $task_id == T* ]] && [ -f "$MAPPING_FILE" ]; then
        issue_num=$(jq -r ".task_mappings.\"$task_id\".github_issue // empty" "$MAPPING_FILE")
    else
        issue_num=$task_id
    fi
    
    if [ -n "$issue_num" ]; then
        # Remove all status labels
        gh issue edit "$issue_num" \
            --remove-label "status-ready,status-assigned,status-in-progress,status-blocked,status-review,status-done"
        
        # Add new status label
        gh issue edit "$issue_num" --add-label "status-$new_status"
        
        # Close issue if done
        if [ "$new_status" = "done" ]; then
            gh issue close "$issue_num" --comment "Task completed"
        fi
        
        echo -e "${GREEN}✓ Updated issue #$issue_num status${NC}"
    fi
}

# Add comment to task
add_task_comment() {
    local task_id="$1"
    local comment="$2"
    local system=$(get_task_system)
    
    case "$system" in
        "github"|"sync")
            if [[ $task_id == T* ]] && [ -f "$MAPPING_FILE" ]; then
                issue_num=$(jq -r ".task_mappings.\"$task_id\".github_issue // empty" "$MAPPING_FILE")
            else
                issue_num=$task_id
            fi
            
            if [ -n "$issue_num" ]; then
                gh issue comment "$issue_num" --body "$comment"
                echo -e "${GREEN}✓ Added comment to issue #$issue_num${NC}"
            fi
            ;;
        "board"|*)
            echo -e "${YELLOW}Comments not supported in board mode${NC}"
            ;;
    esac
}

# List all tasks (for debugging/overview)
list_all_tasks() {
    local system=$(get_task_system)
    
    case "$system" in
        "github")
            gh issue list --limit 100 --state all --label "agent-"
            ;;
        "board"|*)
            python3 "$SCRIPT_DIR/parse_agents_board.py" "$BOARD_FILE" --pretty
            ;;
    esac
}

# Export functions for use by other scripts
export -f get_task_system
export -f get_agent_name
export -f get_my_tasks
export -f get_task_details
export -f claim_task
export -f update_task_status
export -f add_task_comment
export -f list_all_tasks

# If script is run directly, show usage
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    echo "Task Library Functions:"
    echo "  get_my_tasks <agent-name>     - Get tasks for an agent"
    echo "  claim_task <task-id> <agent>  - Claim a task"
    echo "  update_task_status <id> <status> - Update task status"
    echo "  get_task_details <task-id>    - Get task details"
    echo "  add_task_comment <id> <text>  - Add comment to task"
    echo "  list_all_tasks                - List all tasks"
    echo ""
    echo "Environment variables:"
    echo "  TASK_SYSTEM=${TASK_SYSTEM} (board|github|sync)"
    echo "  AGENT_NAME=${AGENT_NAME}"
fi