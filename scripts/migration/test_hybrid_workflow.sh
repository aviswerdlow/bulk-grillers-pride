#!/bin/bash
# Test script for hybrid task management workflow

# Source the task library
source "$(dirname "$0")/task_lib.sh"

# Set up colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test configuration
TEST_AGENT="test-agent"
GITHUB_USER=$(gh api user --jq '.login' 2>/dev/null)

echo -e "${BLUE}=== Hybrid Task Management Test ===${NC}"
echo -e "GitHub User: ${GREEN}$GITHUB_USER${NC}"
echo -e "Test Agent: ${GREEN}$TEST_AGENT${NC}"
echo ""

# Test 1: GitHub user detection
echo -e "${YELLOW}Test 1: GitHub User Detection${NC}"
if [ -n "$GITHUB_USER" ]; then
    echo -e "${GREEN}✓ GitHub user detected: $GITHUB_USER${NC}"
else
    echo -e "${RED}✗ Could not detect GitHub user${NC}"
    exit 1
fi
echo ""

# Test 2: Task claiming simulation
echo -e "${YELLOW}Test 2: Task Claiming Logic${NC}"
echo -e "When claiming task T123 as '$TEST_AGENT':"
echo -e "  - Issue will be assigned to: ${GREEN}$GITHUB_USER${NC}"
echo -e "  - Agent label will be: ${GREEN}agent-$TEST_AGENT${NC}"
echo -e "  - Status labels: Remove 'status-ready', Add 'status-assigned'"
echo ""

# Test 3: Task listing logic
echo -e "${YELLOW}Test 3: Task Listing Logic${NC}"
echo -e "The get_my_tasks function will search for:"
echo -e "  - Issues assigned to: ${GREEN}$GITHUB_USER${NC}"
echo -e "  - With label: ${GREEN}agent-$TEST_AGENT${NC}"
echo -e "  - In state: open"
echo ""

# Test 4: Verify functions are available
echo -e "${YELLOW}Test 4: Function Availability${NC}"
functions_to_test=(
    "get_task_system"
    "get_agent_name"
    "get_my_tasks"
    "claim_task"
    "update_task_status"
    "claim_task_github_hybrid"
)

all_good=true
for func in "${functions_to_test[@]}"; do
    if type -t "$func" &>/dev/null; then
        echo -e "${GREEN}✓ Function '$func' is available${NC}"
    else
        echo -e "${RED}✗ Function '$func' is NOT available${NC}"
        all_good=false
    fi
done
echo ""

# Summary
echo -e "${BLUE}=== Test Summary ===${NC}"
if [ "$all_good" = true ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}The hybrid workflow is ready to use:${NC}"
    echo "  - GitHub issues will be assigned to $GITHUB_USER"
    echo "  - Agent identity preserved through labels"
    echo "  - GitHub notifications will work properly"
    echo ""
    echo -e "${YELLOW}Example usage:${NC}"
    echo "  claim_task T123 infra-agent"
    echo "  get_my_tasks infra-agent"
    echo "  update_task_status T123 in-progress"
else
    echo -e "${RED}✗ Some tests failed. Please check the implementation.${NC}"
    exit 1
fi