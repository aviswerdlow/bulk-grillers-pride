#!/bin/bash
# Orchestrator Dashboard - Real-time view of agent status and tasks
# Provides comprehensive view of multi-agent system health

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Configuration
MAX_ACTIVE_TASKS=3

# Clear screen and show header
show_header() {
    clear
    echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║            ORCHESTRATOR DASHBOARD - Multi-Agent System         ║${NC}"
    echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${CYAN}Generated: $(date)${NC}\n"
}

# Get agent workload
get_agent_stats() {
    local agent="$1"
    local total=$(gh issue list --label "agent-$agent" --state open --limit 100 --json number 2>/dev/null | jq 'length')
    local in_progress=$(gh issue list --label "agent-$agent,status-in-progress" --state open --limit 100 --json number 2>/dev/null | jq 'length')
    local blocked=$(gh issue list --label "agent-$agent,status-blocked" --state open --limit 100 --json number 2>/dev/null | jq 'length')
    
    echo "$total|$in_progress|$blocked"
}

# Show agent status table
show_agent_status() {
    echo -e "${BOLD}${YELLOW}📊 AGENT STATUS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    printf "%-20s │ %-8s │ %-10s │ %-8s │ %-10s │ %s\n" "Agent" "Total" "In Progress" "Blocked" "Capacity" "Status"
    echo -e "${BLUE}─────────────────────┼──────────┼────────────┼──────────┼────────────┼─────────${NC}"
    
    # List of all agents
    local agents=("ai-agent" "backend-agent" "frontend-agent" "infra-agent" "quality-agent" "docs-agent" "design-agent" "systems-design-agent" "migration-agent")
    
    for agent in "${agents[@]}"; do
        local stats=$(get_agent_stats "$agent")
        IFS='|' read -r total in_progress blocked <<< "$stats"
        
        # Calculate capacity
        local capacity=$((MAX_ACTIVE_TASKS - in_progress))
        local capacity_color="${GREEN}"
        local status_icon="✅"
        local status_text="Available"
        
        if [ "$in_progress" -ge "$MAX_ACTIVE_TASKS" ]; then
            capacity_color="${RED}"
            status_icon="❌"
            status_text="FULL"
            capacity=0
        elif [ "$in_progress" -ge $((MAX_ACTIVE_TASKS - 1)) ]; then
            capacity_color="${YELLOW}"
            status_icon="⚠️"
            status_text="Limited"
        fi
        
        if [ "$blocked" -gt 0 ]; then
            status_icon="🚧"
            status_text="Blocked"
        fi
        
        # Color code based on load
        local load_color="${NC}"
        if [ "$total" -gt 15 ]; then
            load_color="${RED}"
        elif [ "$total" -gt 10 ]; then
            load_color="${YELLOW}"
        fi
        
        printf "%-20s │ ${load_color}%-8s${NC} │ %-10s │ %-8s │ ${capacity_color}%-10s${NC} │ %s %s\n" \
            "$agent" "$total" "$in_progress" "$blocked" "$capacity" "$status_icon" "$status_text"
    done
    echo ""
}

# Show priority breakdown
show_priority_breakdown() {
    echo -e "${BOLD}${YELLOW}🎯 PRIORITY BREAKDOWN${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    local p0=$(gh issue list --label "priority-P0" --state open --limit 100 --json number 2>/dev/null | jq 'length')
    local p1=$(gh issue list --label "priority-P1" --state open --limit 100 --json number 2>/dev/null | jq 'length')
    local p2=$(gh issue list --label "priority-P2" --state open --limit 100 --json number 2>/dev/null | jq 'length')
    local p3=$(gh issue list --label "priority-P3" --state open --limit 100 --json number 2>/dev/null | jq 'length')
    
    echo -e "${RED}P0 (Critical):${NC} $p0 tasks"
    echo -e "${YELLOW}P1 (High):${NC} $p1 tasks"
    echo -e "${BLUE}P2 (Medium):${NC} $p2 tasks"
    echo -e "${GREEN}P3 (Low):${NC} $p3 tasks"
    echo ""
}

# Show recent activity
show_recent_activity() {
    echo -e "${BOLD}${YELLOW}🔄 RECENT ACTIVITY (Last 24h)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Get issues updated in last 24 hours
    local since=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ)
    gh issue list --state all --limit 20 --json number,title,updatedAt,state,labels \
        --jq ".[] | select(.updatedAt > \"$since\") | \"  #\(.number): \(.title[0:50])... (\(.state))\"" \
        | head -10
    echo ""
}

# Show blocked tasks
show_blocked_tasks() {
    echo -e "${BOLD}${YELLOW}🚧 BLOCKED TASKS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    local blocked=$(gh issue list --label "status-blocked" --state open --limit 10 \
        --json number,title,labels \
        --jq '.[] | "  #\(.number): \(.title[0:50])... (agent: \([.labels[] | select(.name | startswith("agent-")) | .name] | join(",")))"')
    
    if [ -z "$blocked" ]; then
        echo -e "${GREEN}  No blocked tasks ✓${NC}"
    else
        echo "$blocked"
    fi
    echo ""
}

# Show system health
show_system_health() {
    echo -e "${BOLD}${YELLOW}💚 SYSTEM HEALTH${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Check for overloaded agents
    local overloaded=0
    local agents=("ai-agent" "backend-agent" "frontend-agent" "infra-agent" "quality-agent")
    
    for agent in "${agents[@]}"; do
        local in_progress=$(gh issue list --label "agent-$agent,status-in-progress" --state open --limit 100 --json number 2>/dev/null | jq 'length')
        if [ "$in_progress" -gt "$MAX_ACTIVE_TASKS" ]; then
            ((overloaded++))
        fi
    done
    
    if [ "$overloaded" -eq 0 ]; then
        echo -e "${GREEN}✅ All agents within task limits${NC}"
    else
        echo -e "${RED}⚠️  $overloaded agents exceeding task limits${NC}"
    fi
    
    # Check stale tasks
    local stale_date=$(date -u -v-48H +%Y-%m-%dT%H:%M:%SZ)
    local stale_count=$(gh issue list --label "status-in-progress" --state open --limit 100 \
        --json updatedAt \
        --jq "[.[] | select(.updatedAt < \"$stale_date\")] | length")
    
    if [ "$stale_count" -eq 0 ]; then
        echo -e "${GREEN}✅ No stale in-progress tasks${NC}"
    else
        echo -e "${YELLOW}⚠️  $stale_count tasks stale (>48h in progress)${NC}"
    fi
    
    # Total open issues
    local total_open=$(gh issue list --state open --limit 200 --json number | jq 'length')
    echo -e "${BLUE}📋 Total open tasks: $total_open${NC}"
    echo ""
}

# Show recommendations
show_recommendations() {
    echo -e "${BOLD}${YELLOW}💡 RECOMMENDATIONS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Check AI agent load
    local ai_total=$(gh issue list --label "agent-ai-agent" --state open --limit 100 --json number 2>/dev/null | jq 'length')
    if [ "$ai_total" -gt 15 ]; then
        echo -e "${YELLOW}• Consider redistributing AI agent tasks (currently: $ai_total)${NC}"
    fi
    
    # Check for agents with no tasks
    local idle_agents=()
    for agent in "docs-agent" "design-agent" "migration-agent"; do
        local total=$(gh issue list --label "agent-$agent" --state open --limit 100 --json number 2>/dev/null | jq 'length')
        if [ "$total" -eq 0 ]; then
            idle_agents+=("$agent")
        fi
    done
    
    if [ ${#idle_agents[@]} -gt 0 ]; then
        echo -e "${BLUE}• Idle agents available: ${idle_agents[*]}${NC}"
    fi
    
    # Check P0 tasks
    local p0_count=$(gh issue list --label "priority-P0" --state open --limit 100 --json number 2>/dev/null | jq 'length')
    if [ "$p0_count" -gt 0 ]; then
        echo -e "${RED}• Focus on $p0_count P0 (critical) tasks${NC}"
    fi
    
    echo ""
}

# Main dashboard
main() {
    show_header
    show_agent_status
    show_priority_breakdown
    show_system_health
    show_blocked_tasks
    show_recent_activity
    show_recommendations
    
    echo -e "${CYAN}Press Ctrl+C to exit. Dashboard refreshes every 30 seconds...${NC}"
}

# Run dashboard
if [ "$1" == "--once" ]; then
    main
else
    while true; do
        main
        sleep 30
    done
fi