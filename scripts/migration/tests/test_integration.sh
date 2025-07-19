#!/bin/bash
# Integration tests for task system migration
# Task: T164 - Create integration test suite

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_BOARD="$TEST_DIR/test_board.md"
TEST_MAPPING="$TEST_DIR/test_mappings.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test framework
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    ((TESTS_RUN++))
    echo -n "Running $test_name... "
    
    if $test_function; then
        echo -e "${GREEN}PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}FAILED${NC}"
        ((TESTS_FAILED++))
    fi
}

# Setup test environment
setup_test_env() {
    # Create test board
    cat > "$TEST_BOARD" << 'EOF'
# Test Task Board

## Tasks

| ID | Task | Skills | Owner | Status | Dependencies | Priority | Hours |
|---|---|---|---|---|---|---|---|
| T900 | Test task one | testing | test-agent | ✨ ready | - | P1 | 2 |
| T901 | Test task two | testing, bash | test-agent | ✅ assigned | T900 | P0 | 3 |
| T902 | Test task three | python | 📋 unassigned | - | P2 | 1 |
EOF
    
    # Create empty mapping file
    echo '{"task_mappings": {}, "sync_status": {}}' > "$TEST_MAPPING"
    
    # Set test environment
    export BOARD_FILE="$TEST_BOARD"
    export MAPPING_FILE="$TEST_MAPPING"
}

# Cleanup test environment
cleanup_test_env() {
    rm -f "$TEST_BOARD" "$TEST_MAPPING" "$TEST_BOARD.bak"
    unset BOARD_FILE MAPPING_FILE
}

# Test 1: Parse board file
test_parse_board() {
    local output=$(python3 "$SCRIPT_DIR/parse_agents_board.py" "$TEST_BOARD" 2>/dev/null)
    local task_count=$(echo "$output" | jq -r '.count')
    
    [ "$task_count" = "3" ]
}

# Test 2: Filter by owner
test_filter_by_owner() {
    local output=$(python3 "$SCRIPT_DIR/parse_agents_board.py" "$TEST_BOARD" \
        --filter-owner "test-agent" 2>/dev/null)
    local task_count=$(echo "$output" | jq -r '.count')
    
    [ "$task_count" = "2" ]
}

# Test 3: Filter by status
test_filter_by_status() {
    local output=$(python3 "$SCRIPT_DIR/parse_agents_board.py" "$TEST_BOARD" \
        --filter-status "ready" 2>/dev/null)
    local task_count=$(echo "$output" | jq -r '.count')
    
    [ "$task_count" = "2" ]  # ready and unassigned both map to ready
}

# Test 4: Create GitHub issues (dry run)
test_create_issues_dry_run() {
    local output=$(python3 "$SCRIPT_DIR/parse_agents_board.py" "$TEST_BOARD" 2>/dev/null | \
        python3 "$SCRIPT_DIR/create_github_issues.py" --dry-run 2>&1)
    
    echo "$output" | grep -q "Would create issue for T900" && \
    echo "$output" | grep -q "Would create issue for T901" && \
    echo "$output" | grep -q "Would create issue for T902"
}

# Test 5: Task mapping management
test_mapping_management() {
    # Add mapping
    python3 "$SCRIPT_DIR/manage_task_mappings.py" \
        --mapping-file "$TEST_MAPPING" add T900 100 >/dev/null 2>&1
    
    # Get mapping
    local issue=$(python3 "$SCRIPT_DIR/manage_task_mappings.py" \
        --mapping-file "$TEST_MAPPING" get T900 2>&1 | grep -oE '#[0-9]+' | cut -c2-)
    
    [ "$issue" = "100" ]
}

# Test 6: Task library functions
test_task_library() {
    # Source library
    source "$SCRIPT_DIR/task_lib.sh"
    
    # Test in board mode
    export TASK_SYSTEM="board"
    
    # Get tasks (should work without error)
    get_my_tasks "test-agent" >/dev/null 2>&1
    local result=$?
    
    [ $result -eq 0 ]
}

# Test 7: Sync conflict detection
test_conflict_detection() {
    # Add conflict
    python3 "$SCRIPT_DIR/manage_task_mappings.py" \
        --mapping-file "$TEST_MAPPING" add T900 100 >/dev/null 2>&1
    
    # Add duplicate mapping (should create conflict)
    python3 "$SCRIPT_DIR/manage_task_mappings.py" \
        --mapping-file "$TEST_MAPPING" add T901 100 >/dev/null 2>&1
    
    # Validate
    local validation=$(python3 "$SCRIPT_DIR/manage_task_mappings.py" \
        --mapping-file "$TEST_MAPPING" validate 2>&1)
    
    echo "$validation" | grep -q "FAILED"
}

# Test 8: Board update functionality
test_board_update() {
    # Source library
    source "$SCRIPT_DIR/task_lib.sh"
    
    # Update task status
    export TASK_SYSTEM="board"
    update_task_status_board "T900" "🏃 in-progress" >/dev/null 2>&1
    
    # Check if updated
    grep -q "T900.*🏃 in-progress" "$TEST_BOARD"
}

# Test 9: Rollback validation
test_rollback_validation() {
    export TASK_SYSTEM="board"
    
    # Run validation
    "$SCRIPT_DIR/rollback.sh" --validate >/dev/null 2>&1
    local result=$?
    
    [ $result -eq 0 ]
}

# Test 10: End-to-end sync simulation
test_end_to_end_sync() {
    # Parse board
    local tasks=$(python3 "$SCRIPT_DIR/parse_agents_board.py" "$TEST_BOARD" 2>/dev/null)
    
    # Simulate creating mappings
    echo "$tasks" | jq -r '.tasks[] | "\(.id) \(.hours)"' | while read task_id hours; do
        # Simulate issue number based on hours (just for testing)
        issue_num=$((200 + hours))
        python3 "$SCRIPT_DIR/manage_task_mappings.py" \
            --mapping-file "$TEST_MAPPING" add "$task_id" "$issue_num" >/dev/null 2>&1
    done
    
    # Check mappings created
    local mapping_count=$(python3 "$SCRIPT_DIR/manage_task_mappings.py" \
        --mapping-file "$TEST_MAPPING" list --format json 2>/dev/null | \
        jq -r 'keys | length')
    
    [ "$mapping_count" = "3" ]
}

# Main test runner
main() {
    echo -e "${BLUE}=== Task Migration Integration Tests ===${NC}"
    echo ""
    
    # Check dependencies
    command -v python3 >/dev/null 2>&1 || { echo "Python 3 required"; exit 1; }
    command -v jq >/dev/null 2>&1 || { echo "jq required"; exit 1; }
    
    # Setup
    setup_test_env
    
    # Run tests
    run_test "Parse board file" test_parse_board
    run_test "Filter by owner" test_filter_by_owner
    run_test "Filter by status" test_filter_by_status
    run_test "Create issues (dry run)" test_create_issues_dry_run
    run_test "Mapping management" test_mapping_management
    run_test "Task library functions" test_task_library
    run_test "Conflict detection" test_conflict_detection
    run_test "Board update" test_board_update
    run_test "Rollback validation" test_rollback_validation
    run_test "End-to-end sync" test_end_to_end_sync
    
    # Cleanup
    cleanup_test_env
    
    # Summary
    echo ""
    echo -e "${BLUE}=== Test Summary ===${NC}"
    echo "Tests run: $TESTS_RUN"
    echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}Some tests failed!${NC}"
        exit 1
    fi
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main
fi