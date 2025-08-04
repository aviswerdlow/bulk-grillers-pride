#!/bin/bash
# Worktree Orchestrator for Multi-Agent System
# Coordinates worktree operations, task mappings, and lifecycle management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
WORKTREE_BASE="${WORKTREE_BASE:-.worktrees}"
TASK_MAPPING_FILE="${TASK_MAPPING_FILE:-.worktree-task-mapping.json}"
ENABLE_WORKTREES="${ENABLE_WORKTREES:-false}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source task library
if [ -f "$SCRIPT_DIR/migration/task_lib.sh" ]; then
    source "$SCRIPT_DIR/migration/task_lib.sh"
fi

# Ensure we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Get repository root
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Initialize task mapping file if not exists
init_task_mapping() {
    if [ ! -f "$TASK_MAPPING_FILE" ]; then
        echo '{"worktree_task_mappings": {}, "metadata": {"created": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}}' > "$TASK_MAPPING_FILE"
        echo -e "${GREEN}✓ Initialized task mapping file${NC}"
    fi
}

# Add task-worktree mapping
add_task_mapping() {
    local task_id="$1"
    local agent_name="$2"
    local worktree_path="$3"
    local branch_name="$4"
    
    init_task_mapping
    
    local temp_file=$(mktemp)
    jq --arg task "$task_id" \
       --arg agent "$agent_name" \
       --arg path "$worktree_path" \
       --arg branch "$branch_name" \
       --arg created "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.worktree_task_mappings[$task] = {
          "agent": $agent,
          "worktree_path": $path,
          "branch": $branch,
          "created": $created,
          "status": "active"
        }' "$TASK_MAPPING_FILE" > "$temp_file"
    
    mv "$temp_file" "$TASK_MAPPING_FILE"
    echo -e "${GREEN}✓ Added mapping for task $task_id${NC}"
}

# Remove task-worktree mapping
remove_task_mapping() {
    local task_id="$1"
    
    if [ -f "$TASK_MAPPING_FILE" ]; then
        local temp_file=$(mktemp)
        jq --arg task "$task_id" 'del(.worktree_task_mappings[$task])' "$TASK_MAPPING_FILE" > "$temp_file"
        mv "$temp_file" "$TASK_MAPPING_FILE"
        echo -e "${GREEN}✓ Removed mapping for task $task_id${NC}"
    fi
}

# Get task mapping
get_task_mapping() {
    local task_id="$1"
    
    if [ -f "$TASK_MAPPING_FILE" ]; then
        jq -r --arg task "$task_id" '.worktree_task_mappings[$task] // empty' "$TASK_MAPPING_FILE"
    fi
}

# List all task mappings
list_task_mappings() {
    if [ -f "$TASK_MAPPING_FILE" ]; then
        echo -e "${BLUE}=== Task-Worktree Mappings ===${NC}"
        jq -r '.worktree_task_mappings | to_entries[] | 
            "\(.key): \(.value.agent) → \(.value.worktree_path) [\(.value.branch)] (\(.value.status))"' \
            "$TASK_MAPPING_FILE" | while read -r line; do
            echo -e "  $line"
        done
    else
        echo -e "${YELLOW}No task mappings found${NC}"
    fi
}

# Orchestrate task claim with worktree
orchestrate_task_claim() {
    local task_id="$1"
    local agent_name="$2"
    
    echo -e "${BLUE}Orchestrating task claim for $task_id by $agent_name${NC}"
    
    # Check if worktrees are enabled
    if [ "$ENABLE_WORKTREES" != "true" ]; then
        echo -e "${YELLOW}Worktrees disabled. Use standard claim process.${NC}"
        claim_task "$task_id" "$agent_name"
        return
    fi
    
    # Check if task already has a worktree
    local existing_mapping=$(get_task_mapping "$task_id")
    if [ -n "$existing_mapping" ]; then
        local existing_agent=$(echo "$existing_mapping" | jq -r '.agent')
        echo -e "${YELLOW}Task $task_id already has a worktree for $existing_agent${NC}"
        return 1
    fi
    
    # Claim task with worktree
    claim_task_with_worktree "$task_id" "$agent_name"
    
    # Add mapping
    local worktree_path="$WORKTREE_BASE/$agent_name/$task_id"
    local branch_name="$agent_name/$task_id"
    add_task_mapping "$task_id" "$agent_name" "$worktree_path" "$branch_name"
    
    echo -e "${GREEN}✓ Task $task_id claimed with worktree for $agent_name${NC}"
}

# Orchestrate task completion with cleanup
orchestrate_task_completion() {
    local task_id="$1"
    local summary="$2"
    local force_cleanup="${3:-false}"
    
    echo -e "${BLUE}Orchestrating task completion for $task_id${NC}"
    
    # Get task mapping
    local mapping=$(get_task_mapping "$task_id")
    if [ -z "$mapping" ]; then
        echo -e "${YELLOW}No worktree mapping found for task $task_id${NC}"
        update_task_status "$task_id" "done"
        return
    fi
    
    local agent_name=$(echo "$mapping" | jq -r '.agent')
    local worktree_path=$(echo "$mapping" | jq -r '.worktree_path')
    
    # Complete task
    complete_task_with_cleanup "$task_id" "$summary" "$agent_name"
    
    # Check if worktree can be cleaned up
    if [ "$force_cleanup" = "true" ] || [ "$ENABLE_WORKTREES" = "true" ]; then
        echo -e "${YELLOW}Checking if worktree can be cleaned up...${NC}"
        
        # Check for uncommitted changes
        if [ -d "$worktree_path" ]; then
            cd "$worktree_path"
            if git diff --quiet && git diff --cached --quiet; then
                # Check if all commits are pushed
                local branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
                if [ -n "$branch" ]; then
                    local unpushed=$(git rev-list --count "origin/$branch..$branch" 2>/dev/null || echo "1")
                    if [ "$unpushed" -eq 0 ]; then
                        cd "$REPO_ROOT"
                        cleanup_task_worktree "$task_id" "$agent_name"
                        remove_task_mapping "$task_id"
                        echo -e "${GREEN}✓ Worktree cleaned up successfully${NC}"
                    else
                        echo -e "${YELLOW}⚠ Unpushed commits found. Push before cleanup.${NC}"
                    fi
                fi
            else
                echo -e "${YELLOW}⚠ Uncommitted changes found. Commit before cleanup.${NC}"
            fi
            cd "$REPO_ROOT"
        fi
    fi
}

# Batch orchestration for multiple agents
orchestrate_batch_setup() {
    echo -e "${BLUE}Setting up worktrees for all agents...${NC}"
    
    # Run setup script
    "$SCRIPT_DIR/setup-agent-worktrees.sh" setup
    
    # Initialize task mapping
    init_task_mapping
    
    echo -e "${GREEN}✓ Batch setup complete${NC}"
}

# Health check with recommendations
orchestrate_health_check() {
    echo -e "${BLUE}=== Worktree Health Check ===${NC}"
    
    # Run monitor script
    "$SCRIPT_DIR/monitor-worktrees.sh" report
    
    # Check for orphaned mappings
    echo -e "\n${BLUE}Checking for orphaned mappings...${NC}"
    if [ -f "$TASK_MAPPING_FILE" ]; then
        jq -r '.worktree_task_mappings | to_entries[] | 
            "\(.key)|\(.value.worktree_path)"' "$TASK_MAPPING_FILE" | while IFS='|' read -r task_id path; do
            if [ ! -d "$path" ]; then
                echo -e "${YELLOW}⚠ Orphaned mapping: Task $task_id → $path (worktree missing)${NC}"
                echo -e "  Run: orchestrate_cleanup_orphaned"
            fi
        done
    fi
}

# Clean up orphaned mappings
orchestrate_cleanup_orphaned() {
    echo -e "${BLUE}Cleaning up orphaned mappings...${NC}"
    
    if [ -f "$TASK_MAPPING_FILE" ]; then
        local tasks_to_remove=()
        
        # Find orphaned mappings
        while IFS='|' read -r task_id path; do
            if [ ! -d "$path" ]; then
                tasks_to_remove+=("$task_id")
            fi
        done < <(jq -r '.worktree_task_mappings | to_entries[] | "\(.key)|\(.value.worktree_path)"' "$TASK_MAPPING_FILE")
        
        # Remove orphaned mappings
        for task_id in "${tasks_to_remove[@]}"; do
            remove_task_mapping "$task_id"
        done
        
        echo -e "${GREEN}✓ Cleaned up ${#tasks_to_remove[@]} orphaned mappings${NC}"
    fi
}

# Generate status report
orchestrate_status_report() {
    echo -e "${BLUE}=== Worktree Orchestration Status ===${NC}"
    echo -e "Repository: $REPO_ROOT"
    echo -e "Worktrees enabled: $ENABLE_WORKTREES"
    echo -e "Base directory: $WORKTREE_BASE"
    echo ""
    
    # Active worktrees
    local worktree_count=$(git worktree list | grep -c "$WORKTREE_BASE" || echo 0)
    echo -e "Active worktrees: $worktree_count"
    
    # Task mappings
    if [ -f "$TASK_MAPPING_FILE" ]; then
        local mapping_count=$(jq -r '.worktree_task_mappings | length' "$TASK_MAPPING_FILE")
        echo -e "Task mappings: $mapping_count"
    else
        echo -e "Task mappings: 0 (not initialized)"
    fi
    
    echo ""
    list_task_mappings
    
    # Disk usage
    if [ -d "$WORKTREE_BASE" ]; then
        echo -e "\n${BLUE}Disk Usage:${NC}"
        du -sh "$WORKTREE_BASE" 2>/dev/null || echo "Unable to calculate"
    fi
}

# Main command dispatcher
main() {
    local command="${1:-help}"
    shift || true
    
    case "$command" in
        "claim")
            orchestrate_task_claim "$@"
            ;;
        "complete")
            orchestrate_task_completion "$@"
            ;;
        "setup")
            orchestrate_batch_setup
            ;;
        "health")
            orchestrate_health_check
            ;;
        "status")
            orchestrate_status_report
            ;;
        "mappings")
            list_task_mappings
            ;;
        "cleanup-orphaned")
            orchestrate_cleanup_orphaned
            ;;
        "help"|*)
            cat <<EOF
Worktree Orchestrator - Coordinate worktree operations for multi-agent system

Usage: $0 <command> [arguments]

Commands:
  claim <task-id> <agent>      - Orchestrate task claim with worktree
  complete <task-id> [summary] - Complete task and cleanup worktree
  setup                        - Setup worktrees for all agents
  health                       - Run health check with recommendations
  status                       - Show orchestration status
  mappings                     - List all task-worktree mappings
  cleanup-orphaned            - Remove orphaned task mappings

Environment Variables:
  ENABLE_WORKTREES    - Enable worktree features (true/false)
  WORKTREE_BASE       - Base directory for worktrees (default: .worktrees)
  TASK_MAPPING_FILE   - Task mapping file (default: .worktree-task-mapping.json)

Examples:
  $0 claim T123 frontend-agent
  $0 complete T123 "Fixed navigation bug"
  $0 health
  $0 status
EOF
            ;;
    esac
}

# Run main function
main "$@"