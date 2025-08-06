#!/bin/bash
# Enhanced Task Wrapper Library with Active Task Limits
# Implements task limits and status enforcement for agents
# Based on Issue #144 requirements

# Source the original task_lib.sh (if not already loaded)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -z "$TASK_LIB_LOADED" ]; then
    source "$SCRIPT_DIR/task_lib.sh"
fi

# Configuration
MAX_ACTIVE_TASKS="${MAX_ACTIVE_TASKS:-3}"
STALE_TASK_HOURS="${STALE_TASK_HOURS:-24}"

# Get active task count for an agent
get_active_task_count() {
    local agent_name="$1"
    local github_user=$(gh api user --jq '.login' 2>/dev/null)
    
    if [ -z "$agent_name" ]; then
        echo "0"
        return
    fi
    
    # Count tasks with status-in-progress label
    local count=$(gh issue list \
        --assignee "$github_user" \
        --label "agent-$agent_name,status-in-progress" \
        --state open \
        --limit 100 \
        --json number | jq 'length')
    
    echo "${count:-0}"
}

# Check if agent can take more tasks
can_take_task() {
    local agent_name="$1"
    local current_count=$(get_active_task_count "$agent_name")
    
    if [ "$current_count" -lt "$MAX_ACTIVE_TASKS" ]; then
        return 0  # true - can take task
    else
        return 1  # false - at limit
    fi
}

# Enhanced claim task with limit checking
claim_task_with_limits() {
    local task_id="$1"
    local agent_name="$2"
    
    if [ -z "$task_id" ] || [ -z "$agent_name" ]; then
        echo -e "${RED}Error: Task ID and agent name required${NC}" >&2
        return 1
    fi
    
    # Check if agent is at active task limit
    local active_count=$(get_active_task_count "$agent_name")
    if [ "$active_count" -ge "$MAX_ACTIVE_TASKS" ]; then
        echo -e "${RED}Error: Agent $agent_name already has $active_count active tasks (limit: $MAX_ACTIVE_TASKS)${NC}" >&2
        echo -e "${YELLOW}Complete or pause existing tasks before claiming new ones${NC}" >&2
        return 1
    fi
    
    # Proceed with normal claim
    claim_task "$task_id" "$agent_name"
    
    # Add status-not-started label
    if [[ $task_id == T* ]] && [ -f "$MAPPING_FILE" ]; then
        issue_num=$(jq -r ".task_mappings.\"$task_id\".github_issue // empty" "$MAPPING_FILE")
    else
        issue_num=$task_id
    fi
    
    if [ -n "$issue_num" ]; then
        gh issue edit "$issue_num" --add-label "status-not-started"
        echo -e "${GREEN}✓ Task claimed with status-not-started${NC}"
    fi
}

# Start working on a task (transition to in-progress)
start_task() {
    local task_id="$1"
    local agent_name="$2"
    
    if [ -z "$task_id" ] || [ -z "$agent_name" ]; then
        echo -e "${RED}Error: Task ID and agent name required${NC}" >&2
        return 1
    fi
    
    # Check if agent is at active task limit
    local active_count=$(get_active_task_count "$agent_name")
    if [ "$active_count" -ge "$MAX_ACTIVE_TASKS" ]; then
        echo -e "${RED}Error: Cannot start task - already have $active_count active tasks (limit: $MAX_ACTIVE_TASKS)${NC}" >&2
        echo -e "${YELLOW}Current active tasks:${NC}" >&2
        get_active_tasks "$agent_name"
        return 1
    fi
    
    # Update status to in-progress
    update_task_status "$task_id" "in-progress"
    add_task_comment "$task_id" "Agent $agent_name started working on this task"
    
    echo -e "${GREEN}✓ Task $task_id started by $agent_name${NC}"
}

# Get list of active tasks for an agent
get_active_tasks() {
    local agent_name="$1"
    local github_user=$(gh api user --jq '.login' 2>/dev/null)
    
    echo -e "${BLUE}Active tasks for $agent_name:${NC}"
    gh issue list \
        --assignee "$github_user" \
        --label "agent-$agent_name,status-in-progress" \
        --state open \
        --limit 100 \
        --json number,title,updatedAt \
        --jq '.[] | "  #\(.number): \(.title) (updated: \(.updatedAt))"'
}

# Check for stale tasks and auto-revert
check_stale_tasks() {
    local agent_name="${1:-all}"
    # Handle both macOS and Linux date commands
    if date -v-1H >/dev/null 2>&1; then
        # macOS
        local cutoff_date=$(date -u -v-${STALE_TASK_HOURS}H +%Y-%m-%dT%H:%M:%SZ)
    else
        # Linux
        local cutoff_date=$(date -u -d "${STALE_TASK_HOURS} hours ago" +%Y-%m-%dT%H:%M:%SZ)
    fi
    
    echo -e "${YELLOW}Checking for stale tasks (no update in ${STALE_TASK_HOURS}h)...${NC}"
    
    # Find stale in-progress tasks
    local stale_tasks=$(gh issue list \
        --label "status-in-progress" \
        --state open \
        --limit 100 \
        --json number,title,updatedAt,labels,assignees \
        --jq ".[] | select(.updatedAt < \"$cutoff_date\") | {number, title, updatedAt, agent: (.labels[] | select(.name | startswith(\"agent-\")) | .name)}")
    
    if [ -z "$stale_tasks" ]; then
        echo -e "${GREEN}No stale tasks found${NC}"
        return
    fi
    
    echo "$stale_tasks" | jq -r '"Issue #\(.number): \(.title) (agent: \(.agent), last update: \(.updatedAt))"'
    
    # Optionally auto-revert (uncomment to enable)
    # echo "$stale_tasks" | jq -r '.number' | while read issue_num; do
    #     echo -e "${YELLOW}Auto-reverting issue #$issue_num to not-started${NC}"
    #     gh issue edit "$issue_num" \
    #         --remove-label "status-in-progress" \
    #         --add-label "status-not-started"
    #     gh issue comment "$issue_num" --body "Task auto-reverted to not-started due to inactivity (${STALE_TASK_HOURS}h)"
    # done
}

# Get task load summary for all agents
get_agent_workload_summary() {
    echo -e "${BLUE}Agent Workload Summary:${NC}"
    echo -e "${BLUE}========================${NC}"
    
    # Get unique agent labels
    local agents=$(gh label list --limit 100 --json name \
        | jq -r '.[] | select(.name | startswith("agent-")) | .name' \
        | sed 's/agent-//' | sort -u)
    
    echo -e "Agent | Total | Active | Available"
    echo -e "------|-------|--------|----------"
    
    for agent in $agents; do
        local total=$(gh issue list --label "agent-$agent" --state open --limit 100 --json number | jq 'length')
        local active=$(get_active_task_count "$agent")
        local available=$((MAX_ACTIVE_TASKS - active))
        
        # Color code based on load
        local status_color="${GREEN}"
        if [ "$active" -ge "$MAX_ACTIVE_TASKS" ]; then
            status_color="${RED}"
        elif [ "$active" -ge $((MAX_ACTIVE_TASKS - 1)) ]; then
            status_color="${YELLOW}"
        fi
        
        printf "%-15s | %5d | ${status_color}%6d${NC} | %9d\n" "$agent" "$total" "$active" "$available"
    done
}

# Enforce task limits across all agents
enforce_task_limits() {
    echo -e "${BLUE}Enforcing task limits (max $MAX_ACTIVE_TASKS active per agent)...${NC}"
    
    local violations=$(gh issue list \
        --label "status-in-progress" \
        --state open \
        --limit 200 \
        --json number,assignees,labels \
        | jq -r 'group_by(.labels[] | select(.name | startswith("agent-")) | .name) | map({agent: .[0].labels[] | select(.name | startswith("agent-")) | .name, count: length, tasks: map(.number)}) | map(select(.count > env.MAX_ACTIVE_TASKS))')
    
    if [ "$violations" = "[]" ]; then
        echo -e "${GREEN}✓ All agents within task limits${NC}"
    else
        echo -e "${RED}⚠ Task limit violations found:${NC}"
        echo "$violations" | jq -r '.[] | "  \(.agent): \(.count) active tasks (limit: env.MAX_ACTIVE_TASKS)"'
    fi
}

# Export enhanced functions
export -f get_active_task_count
export -f can_take_task
export -f claim_task_with_limits
export -f start_task
export -f get_active_tasks
export -f check_stale_tasks
export -f get_agent_workload_summary
export -f enforce_task_limits

# Alias the enhanced claim function
alias claim_task='claim_task_with_limits'

# If script is run directly, show enhanced usage
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    echo "Enhanced Task Library Functions:"
    echo "  get_active_task_count <agent>    - Get active task count"
    echo "  can_take_task <agent>            - Check if agent can take more tasks"
    echo "  claim_task <task-id> <agent>     - Claim task with limit checking"
    echo "  start_task <task-id> <agent>     - Start working on a task"
    echo "  get_active_tasks <agent>         - List active tasks for agent"
    echo "  check_stale_tasks [agent]        - Find stale in-progress tasks"
    echo "  get_agent_workload_summary       - Show all agents' workload"
    echo "  enforce_task_limits              - Check for limit violations"
    echo ""
    echo "Configuration:"
    echo "  MAX_ACTIVE_TASKS=${MAX_ACTIVE_TASKS}"
    echo "  STALE_TASK_HOURS=${STALE_TASK_HOURS}"
fi