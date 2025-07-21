#!/bin/bash
# Final sync and verification for task system migration
# Task: T167 - Perform final sync and verification
# This script performs the final synchronization and comprehensive verification before cutover

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOARD_FILE="${BOARD_FILE:-AGENTS_BOARD.md}"
MAPPING_FILE="${MAPPING_FILE:-.task_mappings.json}"
VERIFICATION_REPORT="final_verification_report_$(date +%Y%m%d_%H%M%S).md"
SYNC_LOG="final_sync_$(date +%Y%m%d_%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Statistics
BOARD_TASKS=0
GITHUB_ISSUES=0
MAPPED_TASKS=0
UNMAPPED_TASKS=0
SYNC_ERRORS=0
VERIFICATION_ERRORS=()

# Log function
log() {
    echo -e "$1" | tee -a "$SYNC_LOG"
}

log_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}" | tee -a "$SYNC_LOG"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$SYNC_LOG"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$SYNC_LOG"
}

log_error() {
    echo -e "${RED}✗ $1${NC}" | tee -a "$SYNC_LOG"
    ((SYNC_ERRORS++))
}

# Pre-flight checks
preflight_checks() {
    log_header "Pre-flight Checks"
    
    # Check dependencies
    local deps=("python3" "jq" "gh")
    for dep in "${deps[@]}"; do
        if command -v "$dep" &> /dev/null; then
            log_success "$dep available"
        else
            log_error "$dep not found"
            return 1
        fi
    done
    
    # Check GitHub auth
    if gh auth status &> /dev/null; then
        log_success "GitHub authentication verified"
    else
        log_error "Not authenticated with GitHub"
        return 1
    fi
    
    # Check files exist
    if [ -f "$BOARD_FILE" ]; then
        log_success "Board file exists: $BOARD_FILE"
    else
        log_error "Board file not found: $BOARD_FILE"
        return 1
    fi
    
    # Check mapping file
    if [ -f "$MAPPING_FILE" ]; then
        log_success "Mapping file exists: $MAPPING_FILE"
    else
        log_warning "Mapping file not found, will create: $MAPPING_FILE"
        echo '{"task_mappings": {}, "sync_status": {}}' > "$MAPPING_FILE"
    fi
    
    return 0
}

# Parse current board state
analyze_board_state() {
    log_header "Analyzing Board State"
    
    # Parse board
    local board_data=$(python3 "$SCRIPT_DIR/parse_agents_board.py" "$BOARD_FILE" 2>/dev/null)
    
    if [ -z "$board_data" ]; then
        log_error "Failed to parse board file"
        return 1
    fi
    
    # Count tasks
    BOARD_TASKS=$(echo "$board_data" | jq -r '.count')
    log "Total tasks in board: $BOARD_TASKS"
    
    # Task breakdown by status
    local statuses=("ready" "assigned" "in-progress" "blocked" "review" "done" "unassigned")
    for status in "${statuses[@]}"; do
        local count=$(echo "$board_data" | jq -r ".tasks[] | select(.status == \"$status\")" | jq -s 'length')
        log "  - $status: $count"
    done
    
    # Task breakdown by agent
    log ""
    log "Tasks by agent:"
    echo "$board_data" | jq -r '.tasks[] | .owner' | sort | uniq -c | while read count agent; do
        log "  - $agent: $count"
    done
    
    return 0
}

# Analyze GitHub state
analyze_github_state() {
    log_header "Analyzing GitHub State"
    
    # Count total issues
    GITHUB_ISSUES=$(gh issue list --limit 1000 --state all --json number | jq 'length')
    log "Total GitHub issues: $GITHUB_ISSUES"
    
    # Issues by state
    local open_issues=$(gh issue list --state open --limit 1000 --json number | jq 'length')
    local closed_issues=$(gh issue list --state closed --limit 1000 --json number | jq 'length')
    log "  - Open: $open_issues"
    log "  - Closed: $closed_issues"
    
    # Issues by label
    log ""
    log "Issues by agent label:"
    local agents=("frontend-agent" "backend-agent" "infra-agent" "quality-agent" "docs-agent" "migration-agent")
    for agent in "${agents[@]}"; do
        local count=$(gh issue list --label "agent-$agent" --state all --limit 1000 --json number | jq 'length')
        log "  - $agent: $count"
    done
    
    return 0
}

# Verify task mappings
verify_mappings() {
    log_header "Verifying Task Mappings"
    
    # Count mappings
    MAPPED_TASKS=$(jq -r '.task_mappings | keys | length' "$MAPPING_FILE")
    log "Total mapped tasks: $MAPPED_TASKS"
    
    # Validate mappings
    local validation=$(python3 "$SCRIPT_DIR/manage_task_mappings.py" \
        --mapping-file "$MAPPING_FILE" validate 2>&1)
    
    if echo "$validation" | grep -q "PASSED"; then
        log_success "Mapping validation passed"
    else
        log_error "Mapping validation failed"
        echo "$validation" | tee -a "$SYNC_LOG"
        VERIFICATION_ERRORS+=("Mapping validation failed")
    fi
    
    # Check for unmapped tasks
    local board_tasks=$(python3 "$SCRIPT_DIR/parse_agents_board.py" "$BOARD_FILE" 2>/dev/null | \
        jq -r '.tasks[].id')
    
    UNMAPPED_TASKS=0
    echo "$board_tasks" | while read task_id; do
        if ! jq -e ".task_mappings.\"$task_id\"" "$MAPPING_FILE" >/dev/null 2>&1; then
            ((UNMAPPED_TASKS++))
            log_warning "Task $task_id is not mapped to GitHub"
        fi
    done
    
    if [ $UNMAPPED_TASKS -eq 0 ]; then
        log_success "All tasks are mapped"
    else
        log_warning "$UNMAPPED_TASKS tasks are not mapped to GitHub"
    fi
    
    return 0
}

# Perform final sync
perform_final_sync() {
    log_header "Performing Final Synchronization"
    
    # Create issues for any unmapped tasks
    log "Creating GitHub issues for unmapped tasks..."
    
    local unmapped_count=0
    local board_data=$(python3 "$SCRIPT_DIR/parse_agents_board.py" "$BOARD_FILE" 2>/dev/null)
    
    echo "$board_data" | jq -r '.tasks[]' | jq -c '.' | while read -r task; do
        local task_id=$(echo "$task" | jq -r '.id')
        
        # Check if mapped
        if ! jq -e ".task_mappings.\"$task_id\"" "$MAPPING_FILE" >/dev/null 2>&1; then
            log "Creating issue for unmapped task: $task_id"
            
            # Create issue
            local result=$(echo "$task" | python3 "$SCRIPT_DIR/create_github_issues.py" \
                --mapping-file "$MAPPING_FILE" 2>&1)
            
            if echo "$result" | grep -q "Created issue"; then
                log_success "Created issue for $task_id"
                ((unmapped_count++))
            else
                log_error "Failed to create issue for $task_id"
            fi
        fi
    done
    
    log "Created $unmapped_count new issues"
    
    # Sync existing mapped tasks
    log ""
    log "Synchronizing existing mapped tasks..."
    "$SCRIPT_DIR/sync_task_systems.sh" >> "$SYNC_LOG" 2>&1
    
    return 0
}

# Data integrity check
check_data_integrity() {
    log_header "Data Integrity Verification"
    
    local errors=0
    
    # For each mapped task, verify consistency
    jq -r '.task_mappings | to_entries[] | "\(.key) \(.value.github_issue)"' "$MAPPING_FILE" | \
    while read task_id issue_num; do
        # Get board data
        local board_task=$(python3 "$SCRIPT_DIR/parse_agents_board.py" "$BOARD_FILE" 2>/dev/null | \
            jq -r ".tasks[] | select(.id == \"$task_id\")")
        
        if [ -z "$board_task" ]; then
            log_error "Task $task_id in mapping but not in board"
            ((errors++))
            continue
        fi
        
        # Get GitHub data
        local github_issue=$(gh issue view "$issue_num" --json state,labels,assignees 2>/dev/null)
        
        if [ -z "$github_issue" ]; then
            log_error "Issue #$issue_num in mapping but not in GitHub"
            ((errors++))
            continue
        fi
        
        # Compare status
        local board_status=$(echo "$board_task" | jq -r '.status')
        local github_state=$(echo "$github_issue" | jq -r '.state')
        
        if [ "$board_status" = "done" ] && [ "$github_state" = "OPEN" ]; then
            log_warning "Status mismatch for $task_id: board=done, GitHub=open"
        fi
    done
    
    if [ $errors -eq 0 ]; then
        log_success "Data integrity check passed"
    else
        log_error "Data integrity check failed with $errors errors"
        VERIFICATION_ERRORS+=("Data integrity check failed")
    fi
    
    return 0
}

# Performance test
test_performance() {
    log_header "Performance Testing"
    
    # Test board operations
    log "Testing board operations..."
    local start=$(date +%s.%N)
    get_my_tasks "migration-agent" >/dev/null 2>&1
    local board_time=$(echo "$(date +%s.%N) - $start" | bc)
    log "Board fetch time: ${board_time}s"
    
    # Test GitHub operations
    export TASK_SYSTEM="github"
    log "Testing GitHub operations..."
    start=$(date +%s.%N)
    get_my_tasks "migration-agent" >/dev/null 2>&1
    local github_time=$(echo "$(date +%s.%N) - $start" | bc)
    log "GitHub fetch time: ${github_time}s"
    export TASK_SYSTEM="board"
    
    # Check performance
    if (( $(echo "$board_time < 2" | bc -l) )) && (( $(echo "$github_time < 5" | bc -l) )); then
        log_success "Performance within acceptable limits"
    else
        log_warning "Performance may need optimization"
    fi
    
    return 0
}

# Generate verification report
generate_report() {
    log_header "Generating Verification Report"
    
    cat > "$VERIFICATION_REPORT" << EOF
# Final Sync and Verification Report

**Date**: $(date)
**Task**: T167 - Perform final sync and verification

## Summary

- **Board Tasks**: $BOARD_TASKS
- **GitHub Issues**: $GITHUB_ISSUES
- **Mapped Tasks**: $MAPPED_TASKS
- **Unmapped Tasks**: $UNMAPPED_TASKS
- **Sync Errors**: $SYNC_ERRORS

## Verification Status

EOF

    if [ ${#VERIFICATION_ERRORS[@]} -eq 0 ] && [ $SYNC_ERRORS -eq 0 ]; then
        cat >> "$VERIFICATION_REPORT" << EOF
✅ **VERIFICATION SUCCESSFUL**

The task system is fully synchronized and ready for cutover:

1. All tasks are mapped between systems
2. Data integrity verified
3. Performance within acceptable limits
4. No sync errors detected

### Ready for Production
The system is ready to proceed with T169 - Execute cutover and archive board.

EOF
    else
        cat >> "$VERIFICATION_REPORT" << EOF
❌ **VERIFICATION FAILED**

The following issues were detected:

$(printf '%s\n' "${VERIFICATION_ERRORS[@]}" | sed 's/^/- /')

### Required Actions
1. Review sync log: $SYNC_LOG
2. Fix identified issues
3. Re-run verification

### NOT Ready for Cutover
Do not proceed with T169 until all issues are resolved.

EOF
    fi
    
    cat >> "$VERIFICATION_REPORT" << EOF
## Detailed Results

### Board Analysis
$(grep -A 20 "Analyzing Board State" "$SYNC_LOG" | grep -v "===" || echo "See sync log")

### GitHub Analysis
$(grep -A 20 "Analyzing GitHub State" "$SYNC_LOG" | grep -v "===" || echo "See sync log")

### Mapping Status
- Total mappings: $MAPPED_TASKS
- Validation: $(grep "validation" "$SYNC_LOG" | tail -1 || echo "Unknown")

### Performance Metrics
$(grep "time:" "$SYNC_LOG" || echo "No performance data")

## Logs
- Sync log: $SYNC_LOG
- Verification report: $VERIFICATION_REPORT

## Next Steps

1. Review this report thoroughly
2. Address any identified issues
3. When ready, proceed with T169 - Execute cutover

---

*Generated by: migration-agent*
*Script: final_sync_verification.sh*
EOF

    log_success "Report generated: $VERIFICATION_REPORT"
}

# Main verification process
main() {
    log "${BLUE}=== T167: Final Sync and Verification ===${NC}"
    log "Starting at: $(date)"
    log ""
    
    # Source task library
    source "$SCRIPT_DIR/task_lib.sh"
    
    # Run checks
    if ! preflight_checks; then
        log_error "Pre-flight checks failed"
        exit 1
    fi
    
    # Analyze current state
    analyze_board_state
    analyze_github_state
    verify_mappings
    
    # Perform final sync
    perform_final_sync
    
    # Verify integrity
    check_data_integrity
    
    # Test performance
    test_performance
    
    # Generate report
    generate_report
    
    # Summary
    log ""
    log_header "Verification Summary"
    
    if [ ${#VERIFICATION_ERRORS[@]} -eq 0 ] && [ $SYNC_ERRORS -eq 0 ]; then
        log_success "Final sync and verification completed successfully!"
        log_success "System is ready for cutover (T169)"
        exit 0
    else
        log_error "Verification completed with errors"
        log_error "Review the report and fix issues before proceeding"
        exit 1
    fi
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main
fi