#!/bin/bash
# Task Wrapper Library for Multi-Agent System
# Task: T160 - Create task wrapper library
# Provides unified interface for agents to work with both AGENTS_BOARD.md and GitHub Issues
# Enhanced with Git Worktree support for isolated agent development

# Configuration
TASK_SYSTEM="${TASK_SYSTEM:-board}"
BOARD_FILE="${BOARD_FILE:-AGENTS_BOARD.md}"
MAPPING_FILE="${MAPPING_FILE:-.task_mappings.json}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKTREE_BASE="${WORKTREE_BASE:-.worktrees}"
ENABLE_WORKTREES="${ENABLE_WORKTREES:-false}"

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
    
    # Get the actual GitHub username for hybrid mode
    local github_user=$(gh api user --jq '.login' 2>/dev/null)
    
    case "$system" in
        "github")
            # Get tasks from GitHub - hybrid approach
            echo -e "${BLUE}Fetching tasks from GitHub (hybrid mode)...${NC}" >&2
            if [ -n "$github_user" ]; then
                # First try to get tasks assigned to the GitHub user with the agent label
                gh issue list \
                    --assignee "$github_user" \
                    --label "agent-$agent_name" \
                    --state open \
                    --limit 100 \
                    --json number,title,labels,state \
                    --jq '.[] | "\(.number)\t\(.title)\t\(.labels | map(.name) | join(","))"'
            else
                # Fallback to agent name if no GitHub user
                gh issue list \
                    --label "agent-$agent_name" \
                    --state open \
                    --limit 100 \
                    --json number,title,labels,state \
                    --jq '.[] | "\(.number)\t\(.title)\t\(.labels | map(.name) | join(","))"'
            fi
            ;;
        "sync")
            # Get from GitHub but show both sources
            echo -e "${YELLOW}[SYNC MODE] Showing GitHub tasks (source of truth)${NC}" >&2
            get_my_tasks "$agent_name"
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
    
    # Get the actual GitHub username
    local github_user=$(gh api user --jq '.login' 2>/dev/null)
    if [ -z "$github_user" ]; then
        echo -e "${YELLOW}Warning: Could not determine GitHub username, using agent name${NC}" >&2
        github_user="$agent_name"
    fi
    
    case "$system" in
        "github")
            # Update GitHub issue - hybrid approach
            if [[ $task_id == T* ]] && [ -f "$MAPPING_FILE" ]; then
                issue_num=$(jq -r ".task_mappings.\"$task_id\".github_issue // empty" "$MAPPING_FILE")
            else
                issue_num=$task_id
            fi
            
            if [ -n "$issue_num" ]; then
                # Assign to actual GitHub user, add agent label
                gh issue edit "$issue_num" \
                    --add-assignee "$github_user" \
                    --remove-label "status-ready,status-unassigned" \
                    --add-label "status-assigned,agent-$agent_name"
                echo -e "${GREEN}✓ Claimed issue #$issue_num for user $github_user (agent: $agent_name)${NC}"
            fi
            ;;
        "sync")
            # Update both systems
            claim_task_board "$task_id" "$agent_name"
            claim_task_github_hybrid "$task_id" "$agent_name" "$github_user"
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

# Helper: Claim task in GitHub (legacy - for backward compatibility)
claim_task_github() {
    local task_id="$1"
    local agent_name="$2"
    
    # Get the actual GitHub username
    local github_user=$(gh api user --jq '.login' 2>/dev/null)
    if [ -z "$github_user" ]; then
        github_user="$agent_name"
    fi
    
    claim_task_github_hybrid "$task_id" "$agent_name" "$github_user"
}

# Helper: Claim task in GitHub with hybrid approach
claim_task_github_hybrid() {
    local task_id="$1"
    local agent_name="$2"
    local github_user="$3"
    
    if [[ $task_id == T* ]] && [ -f "$MAPPING_FILE" ]; then
        issue_num=$(jq -r ".task_mappings.\"$task_id\".github_issue // empty" "$MAPPING_FILE")
        if [ -n "$issue_num" ]; then
            # Assign to actual user, add agent label
            gh issue edit "$issue_num" \
                --add-assignee "$github_user" \
                --remove-label "status-ready" \
                --add-label "status-assigned,agent-$agent_name"
            echo -e "${GREEN}✓ Updated issue #$issue_num: assigned to $github_user, labeled as agent-$agent_name${NC}"
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

# ========== Git Worktree Functions ==========

# Check if worktrees are enabled
worktrees_enabled() {
    [ "$ENABLE_WORKTREES" = "true" ] || [ "$ENABLE_WORKTREES" = "1" ]
}

# Get worktree path for a task
get_task_worktree_path() {
    local task_id="$1"
    local agent_name="$2"
    echo "$WORKTREE_BASE/$agent_name/$task_id"
}

# Create worktree for a specific task
create_task_worktree() {
    local task_id="$1"
    local agent_name="$2"
    local base_branch="${3:-main}"
    
    if ! worktrees_enabled; then
        echo -e "${YELLOW}Worktrees disabled. Set ENABLE_WORKTREES=true to enable${NC}" >&2
        return 0
    fi
    
    local branch_name="$agent_name/$task_id"
    local worktree_path=$(get_task_worktree_path "$task_id" "$agent_name")
    
    echo -e "${BLUE}Creating worktree for task $task_id...${NC}"
    
    # Check if worktree already exists
    if git worktree list | grep -q "$worktree_path"; then
        echo -e "${YELLOW}Worktree already exists at $worktree_path${NC}"
        return 0
    fi
    
    # Ensure parent directory exists
    mkdir -p "$(dirname "$worktree_path")"
    
    # Create the worktree
    if git worktree add -b "$branch_name" "$worktree_path" "$base_branch" 2>/dev/null; then
        echo -e "${GREEN}✓ Created worktree at $worktree_path${NC}"
        echo -e "${GREEN}✓ Branch: $branch_name${NC}"
        
        # Create task info file in worktree
        cat > "$worktree_path/TASK_INFO.md" <<EOF
# Task: $task_id
Agent: $agent_name
Branch: $branch_name
Created: $(date)

## Task Details
Run \`get_task_details $task_id\` to see full task information.

## Commands
- Work in this directory: \`cd $worktree_path\`
- Push changes: \`git push -u origin HEAD\`
- Update status: \`update_task_status $task_id in-progress\`
- Complete task: \`update_task_status $task_id done\`
EOF
        
        return 0
    else
        echo -e "${RED}✗ Failed to create worktree for task $task_id${NC}" >&2
        return 1
    fi
}

# Switch to task worktree
switch_to_task_worktree() {
    local task_id="$1"
    local agent_name="$2"
    
    if ! worktrees_enabled; then
        return 0
    fi
    
    local worktree_path=$(get_task_worktree_path "$task_id" "$agent_name")
    
    if [ -d "$worktree_path" ]; then
        echo -e "${GREEN}Switching to worktree: $worktree_path${NC}"
        cd "$worktree_path"
    else
        echo -e "${YELLOW}Worktree not found. Create it with: create_task_worktree $task_id $agent_name${NC}" >&2
    fi
}

# Clean up task worktree after completion
cleanup_task_worktree() {
    local task_id="$1"
    local agent_name="$2"
    local force="${3:-false}"
    
    if ! worktrees_enabled; then
        return 0
    fi
    
    local worktree_path=$(get_task_worktree_path "$task_id" "$agent_name")
    
    echo -e "${BLUE}Cleaning up worktree for task $task_id...${NC}"
    
    # Check if worktree exists
    if ! git worktree list | grep -q "$worktree_path"; then
        echo -e "${YELLOW}Worktree not found${NC}"
        return 0
    fi
    
    # Check for uncommitted changes unless forced
    if [ "$force" != "true" ]; then
        if [ -d "$worktree_path" ]; then
            cd "$worktree_path"
            if ! git diff --quiet || ! git diff --cached --quiet; then
                echo -e "${RED}✗ Uncommitted changes in worktree. Commit or stash changes first.${NC}" >&2
                echo -e "${YELLOW}  Use 'cleanup_task_worktree $task_id $agent_name true' to force removal${NC}" >&2
                return 1
            fi
            cd - > /dev/null
        fi
    fi
    
    # Remove the worktree
    if git worktree remove "$worktree_path" ${force:+--force} 2>/dev/null; then
        echo -e "${GREEN}✓ Removed worktree for task $task_id${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to remove worktree${NC}" >&2
        return 1
    fi
}

# List all task worktrees for an agent
list_agent_worktrees() {
    local agent_name="$1"
    
    if ! worktrees_enabled; then
        echo -e "${YELLOW}Worktrees disabled${NC}"
        return 0
    fi
    
    echo -e "${BLUE}Worktrees for $agent_name:${NC}"
    git worktree list | grep "$WORKTREE_BASE/$agent_name" | while read -r line; do
        local path=$(echo "$line" | awk '{print $1}')
        local commit=$(echo "$line" | awk '{print $2}')
        local branch=$(echo "$line" | awk '{print $3}' | tr -d '[]')
        echo -e "  ${GREEN}$branch${NC} at $path"
    done
}

# Enhanced claim task with worktree creation
claim_task_with_worktree() {
    local task_id="$1"
    local agent_name="$2"
    
    # First claim the task normally
    claim_task "$task_id" "$agent_name"
    
    # Then create worktree if enabled
    if worktrees_enabled; then
        create_task_worktree "$task_id" "$agent_name"
        switch_to_task_worktree "$task_id" "$agent_name"
    fi
}

# Enhanced task completion with worktree cleanup
complete_task_with_cleanup() {
    local task_id="$1"
    local summary="$2"
    local agent_name="${3:-$(get_agent_name)}"
    
    # Update task status
    update_task_status "$task_id" "done"
    
    if [ -n "$summary" ]; then
        add_task_comment "$task_id" "Task completed: $summary"
    fi
    
    # Cleanup worktree if enabled
    if worktrees_enabled; then
        echo -e "${YELLOW}Remember to push your changes before cleaning up the worktree${NC}"
        echo -e "To cleanup worktree: cleanup_task_worktree $task_id $agent_name"
    fi
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

# Export worktree functions
export -f worktrees_enabled
export -f get_task_worktree_path
export -f create_task_worktree
export -f switch_to_task_worktree
export -f cleanup_task_worktree
export -f list_agent_worktrees
export -f claim_task_with_worktree
export -f complete_task_with_cleanup

# If script is run directly, show usage
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    echo "Task Library Functions:"
    echo ""
    echo "Core Task Functions:"
    echo "  get_my_tasks <agent-name>        - Get tasks for an agent"
    echo "  claim_task <task-id> <agent>     - Claim a task"
    echo "  update_task_status <id> <status> - Update task status"
    echo "  get_task_details <task-id>       - Get task details"
    echo "  add_task_comment <id> <text>     - Add comment to task"
    echo "  list_all_tasks                   - List all tasks"
    echo ""
    echo "Worktree Functions (when ENABLE_WORKTREES=true):"
    echo "  create_task_worktree <task-id> <agent> [base-branch] - Create worktree for task"
    echo "  switch_to_task_worktree <task-id> <agent>            - Switch to task worktree"
    echo "  cleanup_task_worktree <task-id> <agent> [force]      - Remove task worktree"
    echo "  list_agent_worktrees <agent>                         - List agent's worktrees"
    echo "  claim_task_with_worktree <task-id> <agent>           - Claim task and create worktree"
    echo "  complete_task_with_cleanup <task-id> <summary>       - Complete task with cleanup hint"
    echo ""
    echo "Environment variables:"
    echo "  TASK_SYSTEM=${TASK_SYSTEM} (board|github|sync)"
    echo "  AGENT_NAME=${AGENT_NAME}"
    echo "  ENABLE_WORKTREES=${ENABLE_WORKTREES} (true|false)"
    echo "  WORKTREE_BASE=${WORKTREE_BASE}"
fi