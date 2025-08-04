#!/bin/bash
# Verify Git Worktree System Deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to check file exists
check_file() {
    local file="$1"
    local description="$2"
    
    run_test "$description" "[ -f '$file' ]"
}

# Function to check directory exists
check_dir() {
    local dir="$1"
    local description="$2"
    
    run_test "$description" "[ -d '$dir' ]"
}

# Function to check worktree exists
check_worktree() {
    local agent="$1"
    
    run_test "Worktree for $agent" "git worktree list | grep -q '.worktrees/$agent'"
}

# Function to check config update
check_config_update() {
    local file="$1"
    local agent="$2"
    
    run_test "$agent config has worktree section" "grep -q 'Worktree Configuration' '$file'"
    run_test "$agent config has workflow section" "grep -q 'Git Workflow with Worktrees' '$file'"
}

# Main verification
echo -e "${BLUE}=== Git Worktree System Verification ===${NC}"
echo "Repository: $REPO_ROOT"
echo "Date: $(date)"
echo ""

echo -e "${CYAN}1. Core Scripts${NC}"
check_file "scripts/setup-agent-worktrees.sh" "setup-agent-worktrees.sh exists"
check_file "scripts/monitor-worktrees.sh" "monitor-worktrees.sh exists"
check_file "scripts/worktree-orchestrator.sh" "worktree-orchestrator.sh exists"
check_file "scripts/migration/task_lib.sh" "task_lib.sh exists"
check_file "scripts/deploy-worktree-system.sh" "deploy-worktree-system.sh exists"
check_file "enable-worktrees.sh" "enable-worktrees.sh exists"

echo ""
echo -e "${CYAN}2. Environment Files${NC}"
check_file ".env.worktree" ".env.worktree exists"
check_file ".gitignore" ".gitignore exists"
run_test ".worktrees in .gitignore" "grep -q '^\.worktrees$' .gitignore"
run_test ".worktree-task-mapping.json in .gitignore" "grep -q '^\.worktree-task-mapping\.json$' .gitignore"

echo ""
echo -e "${CYAN}3. Worktree Directories${NC}"
check_dir ".worktrees" ".worktrees directory exists"
check_worktree "frontend-agent"
check_worktree "backend-agent"
check_worktree "infra-agent"
check_worktree "quality-agent"
check_worktree "docs-agent"
check_worktree "migration-agent"
check_worktree "design-agent"
check_worktree "systems-design-agent"
check_worktree "ai-agent"
check_worktree "orchestrator"

echo ""
echo -e "${CYAN}4. Agent Configuration Updates${NC}"
check_config_update "apps/web/CLAUDE.md" "frontend-agent"
check_config_update "convex/CLAUDE.md" "backend-agent"
check_config_update "CLAUDE.md" "infra-agent"
check_config_update "CLAUDE-quality.md" "quality-agent"
check_config_update "CLAUDE-docs.md" "docs-agent"
check_config_update "CLAUDE-migration.md" "migration-agent"
check_config_update "CLAUDE-design.md" "design-agent"
check_config_update "CLAUDE-systems-design.md" "systems-design-agent"
check_config_update "CLAUDE-ai.md" "ai-agent"

echo ""
echo -e "${CYAN}5. Task Library Functions${NC}"
# Source the enable script to test functions
source enable-worktrees.sh > /dev/null 2>&1
run_test "worktrees_enabled function" "type worktrees_enabled"
run_test "create_task_worktree function" "type create_task_worktree"
run_test "cleanup_task_worktree function" "type cleanup_task_worktree"
run_test "claim_task_with_worktree function" "type claim_task_with_worktree"
run_test "complete_task_with_cleanup function" "type complete_task_with_cleanup"

echo ""
echo -e "${CYAN}6. Orchestrator Functionality${NC}"
run_test "Orchestrator status" "./scripts/worktree-orchestrator.sh status"
run_test "Monitor worktrees summary" "./scripts/monitor-worktrees.sh summary"

echo ""
echo -e "${CYAN}7. Launch Scripts${NC}"
check_file "launch-agents-worktree.sh" "launch-agents-worktree.sh exists"
run_test "Launch script is executable" "[ -x launch-agents-worktree.sh ]"

# Summary
echo ""
echo -e "${BLUE}=== Verification Summary ===${NC}"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All tests passed! The worktree system is fully deployed.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Source the environment: source enable-worktrees.sh"
    echo "2. Launch agents with: ./launch-agents-worktree.sh"
    echo "3. Test a task claim: claim_task_with_worktree T123 frontend-agent"
else
    echo ""
    echo -e "${RED}✗ Some tests failed. Please check the deployment.${NC}"
    exit 1
fi

# Optional: Show current status
echo ""
echo -e "${BLUE}Current Worktree Status:${NC}"
./scripts/monitor-worktrees.sh summary