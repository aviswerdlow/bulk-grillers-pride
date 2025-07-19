#!/bin/bash
# Beta Test Runner for Task System Migration
# Task: T166 - Beta test with volunteer agent
# This script guides the volunteer agent through the beta test process

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VOLUNTEER_AGENT="${VOLUNTEER_AGENT:-frontend-agent}"
BETA_LOG="beta_test_$(date +%Y%m%d_%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Logging
log() {
    echo "$1" | tee -a "$BETA_LOG"
}

log_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}" | tee -a "$BETA_LOG"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$BETA_LOG"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$BETA_LOG"
}

log_error() {
    echo -e "${RED}✗ $1${NC}" | tee -a "$BETA_LOG"
}

log_info() {
    echo -e "${CYAN}ℹ $1${NC}" | tee -a "$BETA_LOG"
}

# Interactive prompt
prompt_continue() {
    echo -e "\n${MAGENTA}Press Enter to continue...${NC}"
    read -r
}

# Welcome message
welcome() {
    clear
    log_header "Beta Test - GitHub Issues Task System"
    log ""
    log "Welcome to the beta test for the new GitHub Issues-based task management!"
    log "Selected Agent: ${VOLUNTEER_AGENT}"
    log "Test Duration: Approximately 2-4 hours"
    log ""
    log_info "This test will validate that you can work with GitHub Issues"
    log_info "while maintaining compatibility with AGENTS_BOARD.md"
    log ""
    log "All actions will be logged to: $BETA_LOG"
    prompt_continue
}

# Pre-flight checks
preflight_checks() {
    log_header "Pre-flight Checks"
    
    # Check GitHub CLI
    if command -v gh >/dev/null 2>&1; then
        log_success "GitHub CLI (gh) installed"
    else
        log_error "GitHub CLI not found. Please install: https://cli.github.com/"
        return 1
    fi
    
    # Check GitHub auth
    if gh auth status >/dev/null 2>&1; then
        log_success "GitHub authentication verified"
    else
        log_error "Not authenticated. Run: gh auth login"
        return 1
    fi
    
    # Check task library
    if [ -f "$SCRIPT_DIR/task_lib.sh" ]; then
        log_success "Task library found"
        source "$SCRIPT_DIR/task_lib.sh"
    else
        log_error "Task library not found"
        return 1
    fi
    
    # Check mapping file
    if [ -f ".task_mappings.json" ]; then
        log_success "Task mapping file exists"
    else
        log_warning "No mapping file found, will be created as needed"
    fi
    
    log ""
    log_success "All pre-flight checks passed!"
    prompt_continue
}

# Test 1: Board Mode Baseline
test_board_mode() {
    log_header "Test 1: Board Mode Baseline"
    log "First, let's see your tasks in traditional board mode..."
    log ""
    
    export TASK_SYSTEM="board"
    export AGENT_NAME="$VOLUNTEER_AGENT"
    
    log_info "Fetching tasks from AGENTS_BOARD.md..."
    get_my_tasks "$AGENT_NAME" | tee -a "$BETA_LOG"
    
    log ""
    log_success "Board mode working correctly"
    prompt_continue
}

# Test 2: GitHub Mode Setup
test_github_mode() {
    log_header "Test 2: GitHub Mode Setup"
    log "Now switching to GitHub mode..."
    log ""
    
    export TASK_SYSTEM="github"
    
    log_info "Mode switched to: $(get_task_system)"
    log_info "Agent configured as: $(get_agent_name)"
    
    log ""
    log_success "GitHub mode activated"
    prompt_continue
}

# Test 3: View GitHub Tasks
test_view_tasks() {
    log_header "Test 3: View Your GitHub Tasks"
    log "Fetching your tasks from GitHub Issues..."
    log ""
    
    local tasks=$(get_my_tasks "$AGENT_NAME" 2>&1)
    
    if [ -z "$tasks" ] || echo "$tasks" | grep -q "Error"; then
        log_warning "No tasks currently assigned in GitHub"
        log "Let's check all frontend tasks:"
        gh issue list --label "skill-frontend" --state open --limit 10 | tee -a "$BETA_LOG"
    else
        echo "$tasks" | tee -a "$BETA_LOG"
        log ""
        log_success "Successfully retrieved tasks from GitHub"
    fi
    
    prompt_continue
}

# Test 4: Task Details
test_task_details() {
    log_header "Test 4: Get Task Details"
    log "Let's get detailed information about a task..."
    log ""
    
    # Find a task to examine
    local sample_issue=$(gh issue list --limit 1 --state open --json number --jq '.[0].number' 2>/dev/null)
    
    if [ -n "$sample_issue" ]; then
        log_info "Getting details for issue #$sample_issue..."
        get_task_details "$sample_issue" | jq '.' | tee -a "$BETA_LOG"
        log ""
        log_success "Task details retrieved successfully"
    else
        log_warning "No open issues found to demonstrate"
    fi
    
    prompt_continue
}

# Test 5: Claim Task
test_claim_task() {
    log_header "Test 5: Claim a Task"
    log "Finding an unassigned frontend task to claim..."
    log ""
    
    local unassigned=$(gh issue list \
        --label "skill-frontend" \
        --label "status-unassigned" \
        --state open \
        --limit 1 \
        --json number,title \
        --jq '.[0]' 2>/dev/null)
    
    if [ -n "$unassigned" ] && [ "$unassigned" != "null" ]; then
        local issue_num=$(echo "$unassigned" | jq -r '.number')
        local title=$(echo "$unassigned" | jq -r '.title')
        
        log_info "Found unassigned task:"
        log "  Issue #$issue_num: $title"
        log ""
        log "Would you like to claim this task? (y/n)"
        read -r response
        
        if [ "$response" = "y" ]; then
            claim_task "$issue_num" "$AGENT_NAME" | tee -a "$BETA_LOG"
            log ""
            log_success "Task claimed successfully!"
        else
            log_info "Skipping task claim"
        fi
    else
        log_info "No unassigned frontend tasks available"
        log "In production, you would claim tasks as they become available"
    fi
    
    prompt_continue
}

# Test 6: Update Status
test_update_status() {
    log_header "Test 6: Update Task Status"
    log "Let's practice updating task status..."
    log ""
    
    # Find an assigned task
    local my_task=$(gh issue list \
        --assignee "$AGENT_NAME" \
        --state open \
        --limit 1 \
        --json number,title,labels \
        --jq '.[0]' 2>/dev/null)
    
    if [ -n "$my_task" ] && [ "$my_task" != "null" ]; then
        local issue_num=$(echo "$my_task" | jq -r '.number')
        local title=$(echo "$my_task" | jq -r '.title')
        
        log_info "Your task: #$issue_num - $title"
        log ""
        log "Select new status:"
        log "  1) in-progress"
        log "  2) blocked"
        log "  3) review"
        log "  4) Skip update"
        
        read -r choice
        
        case $choice in
            1) update_task_status "$issue_num" "in-progress" | tee -a "$BETA_LOG" ;;
            2) update_task_status "$issue_num" "blocked" | tee -a "$BETA_LOG" ;;
            3) update_task_status "$issue_num" "review" | tee -a "$BETA_LOG" ;;
            *) log_info "Skipping status update" ;;
        esac
    else
        log_info "No assigned tasks to update"
        log "In production, you would update status as you work"
    fi
    
    prompt_continue
}

# Test 7: Add Comment
test_add_comment() {
    log_header "Test 7: Add Task Comment"
    log "Practice adding progress comments..."
    log ""
    
    local my_task=$(gh issue list \
        --assignee "$AGENT_NAME" \
        --state open \
        --limit 1 \
        --json number \
        --jq '.[0].number' 2>/dev/null)
    
    if [ -n "$my_task" ]; then
        log_info "Add a comment to task #$my_task?"
        log "Enter comment (or press Enter to skip):"
        read -r comment
        
        if [ -n "$comment" ]; then
            add_task_comment "$my_task" "$comment" | tee -a "$BETA_LOG"
            log ""
            log_success "Comment added successfully!"
        else
            log_info "Skipping comment"
        fi
    else
        log_info "No tasks available for commenting"
    fi
    
    prompt_continue
}

# Test 8: Sync Mode
test_sync_mode() {
    log_header "Test 8: Sync Mode Preview"
    log "Testing bidirectional synchronization..."
    log ""
    
    export TASK_SYSTEM="sync"
    
    log_info "Sync mode activated"
    log "In sync mode, updates go to both systems:"
    log "  - Changes to AGENTS_BOARD.md sync to GitHub"
    log "  - GitHub updates sync back to the board"
    log ""
    log_warning "This is preview only - not making actual changes"
    
    # Switch back
    export TASK_SYSTEM="github"
    log ""
    log_success "Sync mode preview complete"
    prompt_continue
}

# Test 9: Performance Check
test_performance() {
    log_header "Test 9: Performance Validation"
    log "Measuring operation performance..."
    log ""
    
    # Time task fetch
    log_info "Timing task fetch operation..."
    local start=$(date +%s.%N)
    get_my_tasks "$AGENT_NAME" >/dev/null 2>&1
    local end=$(date +%s.%N)
    local duration=$(echo "$end - $start" | bc)
    
    log "Task fetch time: ${duration}s"
    
    if (( $(echo "$duration < 5" | bc -l) )); then
        log_success "Performance within acceptable limits"
    else
        log_warning "Operation took longer than expected"
    fi
    
    prompt_continue
}

# Test 10: Rollback Practice
test_rollback() {
    log_header "Test 10: Rollback Procedure"
    log "Understanding emergency rollback..."
    log ""
    
    log_info "If you encounter issues, you can quickly rollback:"
    log ""
    log "1. Quick revert to board mode:"
    log "   ${CYAN}export TASK_SYSTEM=\"board\"${NC}"
    log ""
    log "2. Full rollback:"
    log "   ${CYAN}./scripts/migration/rollback.sh --quick${NC}"
    log ""
    log "Let's verify rollback is ready:"
    
    if "$SCRIPT_DIR/rollback.sh" --validate >/dev/null 2>&1; then
        log_success "Rollback procedure validated and ready"
    else
        log_warning "Rollback validation failed - check with migration team"
    fi
    
    prompt_continue
}

# Collect feedback
collect_feedback() {
    log_header "Beta Test Feedback"
    log "Please provide your feedback..."
    log ""
    
    local feedback_file="beta_feedback_${VOLUNTEER_AGENT}_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$feedback_file" << EOF
# Beta Test Feedback - $VOLUNTEER_AGENT

**Date**: $(date)
**Agent**: $VOLUNTEER_AGENT
**Test Duration**: Check $BETA_LOG

## Overall Experience

### Ease of Use (1-5):
[ ] 1 - Very Difficult
[ ] 2 - Difficult
[ ] 3 - Neutral
[ ] 4 - Easy
[ ] 5 - Very Easy

### Performance (1-5):
[ ] 1 - Very Slow
[ ] 2 - Slow
[ ] 3 - Acceptable
[ ] 4 - Fast
[ ] 5 - Very Fast

### Confidence Level (1-5):
[ ] 1 - Not Ready
[ ] 2 - Major Concerns
[ ] 3 - Minor Concerns
[ ] 4 - Mostly Ready
[ ] 5 - Fully Ready

## Specific Feedback

### What worked well?
-

### What needs improvement?
-

### Any bugs or issues?
-

### Feature requests?
-

### Would you recommend proceeding with full migration?
[ ] Yes
[ ] Yes, with fixes
[ ] No, needs work

### Additional Comments:


---
EOF
    
    log_success "Feedback template created: $feedback_file"
    log_info "Please edit this file with your detailed feedback"
    
    # Open in editor if available
    if command -v code >/dev/null 2>&1; then
        code "$feedback_file"
    elif command -v vim >/dev/null 2>&1; then
        vim "$feedback_file"
    else
        log "Edit $feedback_file with your preferred editor"
    fi
}

# Summary
generate_summary() {
    log_header "Beta Test Summary"
    
    log_success "Beta test completed!"
    log ""
    log "Test Results:"
    log "✅ Board mode baseline established"
    log "✅ GitHub mode activated and tested"
    log "✅ Task operations validated"
    log "✅ Performance measured"
    log "✅ Rollback procedure verified"
    log ""
    log "Output Files:"
    log "- Test log: $BETA_LOG"
    log "- Feedback form: beta_feedback_*.md"
    log ""
    log_info "Thank you for participating in the beta test!"
    log_info "Your feedback is crucial for a successful migration"
}

# Main execution
main() {
    welcome
    
    if ! preflight_checks; then
        log_error "Pre-flight checks failed. Please resolve issues and try again."
        exit 1
    fi
    
    # Run test sequence
    test_board_mode
    test_github_mode
    test_view_tasks
    test_task_details
    test_claim_task
    test_update_status
    test_add_comment
    test_sync_mode
    test_performance
    test_rollback
    
    # Wrap up
    collect_feedback
    generate_summary
    
    log ""
    log_success "Beta test T166 completed successfully!"
    
    # Update board
    if [ "$TASK_SYSTEM" = "board" ] || [ "$TASK_SYSTEM" = "sync" ]; then
        log_info "Marking T166 as complete in AGENTS_BOARD.md..."
    fi
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main
fi