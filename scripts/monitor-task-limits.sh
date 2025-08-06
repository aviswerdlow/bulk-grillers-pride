#!/bin/bash
# Monitor Task Limits for Multi-Agent System
# Issue #144 - Enforce max 3 active tasks per agent

# Source the task library with enhanced functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/migration/task_lib.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

# Show header
echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║                  TASK LIMIT MONITORING DASHBOARD               ║${NC}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${YELLOW}Generated: $(date)${NC}\n"

# Show configuration
echo -e "${BOLD}Configuration:${NC}"
echo -e "  Max Active Tasks: ${GREEN}${MAX_ACTIVE_TASKS:-3}${NC}"
echo -e "  Stale Task Hours: ${YELLOW}${STALE_TASK_HOURS:-24}${NC}"
echo -e "  Task System: ${BLUE}${TASK_SYSTEM:-github}${NC}"
echo ""

# Check if we're in GitHub mode
if [ "${TASK_SYSTEM:-github}" != "github" ]; then
    echo -e "${YELLOW}Warning: Task limits only enforced in GitHub mode${NC}"
    echo -e "Set TASK_SYSTEM=github to enable enforcement"
    exit 0
fi

# Show agent workload summary
echo -e "${BOLD}${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
get_agent_workload_summary

# Check for stale tasks
echo -e "\n${BOLD}${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
check_stale_tasks

# Enforce task limits
echo -e "\n${BOLD}${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
enforce_task_limits

# Show P0 issues
echo -e "\n${BOLD}${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${RED}P0 Priority Issues:${NC}"
gh issue list --label "priority-P0" --state open --limit 10 \
    --json number,title,assignees \
    --jq '.[] | "  #\(.number): \(.title)"'

# Summary
echo -e "\n${BOLD}${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Summary:${NC}"

# Count total active tasks
total_active=$(gh issue list --label "status-in-progress" --state open --limit 200 --json number | jq 'length')
echo -e "  Total Active Tasks: ${YELLOW}$total_active${NC}"

# Count agents at limit
agents_at_limit=0
agents=$(gh label list --limit 100 --json name | jq -r '.[] | select(.name | startswith("agent-")) | .name' | sed 's/agent-//' | sort -u)
for agent in $agents; do
    active=$(get_active_task_count "$agent")
    if [ "$active" -ge "${MAX_ACTIVE_TASKS:-3}" ]; then
        ((agents_at_limit++))
    fi
done
echo -e "  Agents at Limit: ${RED}$agents_at_limit${NC}"

# Provide recommendations
echo -e "\n${BOLD}Recommendations:${NC}"
if [ "$agents_at_limit" -gt 0 ]; then
    echo -e "  ${RED}⚠${NC} Some agents are at capacity - complete tasks before claiming new ones"
fi

if [ "$total_active" -gt 20 ]; then
    echo -e "  ${YELLOW}⚠${NC} High number of active tasks - consider completing before starting new work"
fi

echo -e "\n${GREEN}✓${NC} Task limit enforcement is ${GREEN}ACTIVE${NC}"
echo -e "   Agents cannot claim more than ${MAX_ACTIVE_TASKS:-3} active tasks"