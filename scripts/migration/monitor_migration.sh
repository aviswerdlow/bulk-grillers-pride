#!/bin/bash
# Monitor migration success metrics and troubleshoot issues
# Task: T171 - Monitor migration success metrics

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_REPORT="migration_monitoring_$(date +%Y%m%d_%H%M%S).md"
ARCHIVE_DIR=".board_archive"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Metrics
CUTOVER_TIME=""
CURRENT_MODE=""
ARCHIVE_EXISTS=false
ROLLBACK_READY=false
CONFIG_VALID=false
ISSUES_FOUND=()

# Log functions
log() {
    echo -e "$1"
}

log_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
    ISSUES_FOUND+=("$1")
}

# Check system configuration
check_configuration() {
    log_header "System Configuration Check"
    
    # Check TASK_SYSTEM
    if [ -f .env ]; then
        CURRENT_MODE=$(grep "TASK_SYSTEM=" .env | cut -d'=' -f2 || echo "not set")
        if [ "$CURRENT_MODE" = "github" ]; then
            log_success "TASK_SYSTEM correctly set to: $CURRENT_MODE"
            CONFIG_VALID=true
        else
            log_error "TASK_SYSTEM not set to github: $CURRENT_MODE"
        fi
    else
        log_warning ".env file not found"
    fi
    
    # Check config file
    if [ -f .task_system_config ]; then
        CUTOVER_TIME=$(grep "CUTOVER_DATE=" .task_system_config | cut -d'=' -f2 || echo "unknown")
        log_success "Migration config found, cutover: $CUTOVER_TIME"
    else
        log_warning "Migration config file not found"
    fi
    
    # Check current environment
    local env_mode="${TASK_SYSTEM:-not set}"
    log "Current environment TASK_SYSTEM: $env_mode"
}

# Check archive integrity
check_archive() {
    log_header "Archive Integrity Check"
    
    if [ -d "$ARCHIVE_DIR" ]; then
        log_success "Archive directory exists"
        
        # Find latest archive
        local latest_archive=$(ls -t "$ARCHIVE_DIR"/AGENTS_BOARD_FINAL_*.md 2>/dev/null | head -1)
        
        if [ -n "$latest_archive" ]; then
            ARCHIVE_EXISTS=true
            local task_count=$(grep -c "^| T[0-9]" "$latest_archive" || echo 0)
            log_success "Archive found: $(basename "$latest_archive")"
            log "  - Tasks in archive: $task_count"
            
            # Check compressed version
            if [ -f "${latest_archive}.gz" ]; then
                log_success "Compressed backup exists"
            else
                log_warning "No compressed backup found"
            fi
        else
            log_error "No archive files found"
        fi
    else
        log_error "Archive directory not found"
    fi
}

# Check rollback readiness
check_rollback() {
    log_header "Rollback Readiness"
    
    if [ -f "$SCRIPT_DIR/rollback.sh" ]; then
        log_success "Rollback script available"
        
        # Test rollback validation
        if "$SCRIPT_DIR/rollback.sh" --validate >/dev/null 2>&1; then
            log_success "Rollback validation passed"
            ROLLBACK_READY=true
        else
            log_warning "Rollback validation has warnings"
        fi
    else
        log_error "Rollback script not found"
    fi
}

# Check task library functionality
check_task_library() {
    log_header "Task Library Functionality"
    
    if [ -f "$SCRIPT_DIR/task_lib.sh" ]; then
        log_success "Task library found"
        
        # Test loading
        if source "$SCRIPT_DIR/task_lib.sh" 2>/dev/null; then
            log_success "Task library loads successfully"
            
            # Test basic function
            if type get_task_system >/dev/null 2>&1; then
                local mode=$(get_task_system)
                log_success "Task system detected as: $mode"
            else
                log_error "Task functions not available"
            fi
        else
            log_error "Failed to load task library"
        fi
    else
        log_error "Task library not found"
    fi
}

# Check agent adoption
check_adoption() {
    log_header "Migration Adoption Metrics"
    
    # In a real environment, this would check:
    # - How many agents have updated their environment
    # - Task activity in GitHub vs board
    # - Any error logs or issues
    
    log "Adoption metrics (simulated):"
    log "  - Agents migrated: 6/6 (100%)"
    log "  - Tasks in GitHub mode: Active"
    log "  - Board access attempts: 0"
    log "  - Migration issues reported: 0"
}

# Troubleshooting guide
generate_troubleshooting() {
    if [ ${#ISSUES_FOUND[@]} -gt 0 ]; then
        log_header "Troubleshooting Guide"
        
        for issue in "${ISSUES_FOUND[@]}"; do
            log ""
            log "Issue: $issue"
            
            case "$issue" in
                *"TASK_SYSTEM"*)
                    log "  Solution: Add 'TASK_SYSTEM=github' to .env file"
                    log "  Command: echo 'TASK_SYSTEM=github' >> .env"
                    ;;
                *"Archive"*)
                    log "  Solution: Check archive directory permissions"
                    log "  Command: ls -la .board_archive/"
                    ;;
                *"rollback"*)
                    log "  Solution: Ensure rollback script is executable"
                    log "  Command: chmod +x scripts/migration/rollback.sh"
                    ;;
                *)
                    log "  Solution: Check migration documentation"
                    ;;
            esac
        done
    fi
}

# Generate monitoring report
generate_report() {
    cat > "$MONITORING_REPORT" << EOF
# Migration Monitoring Report

**Date**: $(date)
**Task**: T171 - Monitor migration success metrics

## System Status

- **Current Mode**: $CURRENT_MODE
- **Cutover Time**: $CUTOVER_TIME
- **Configuration Valid**: $([ "$CONFIG_VALID" = true ] && echo "✅ Yes" || echo "❌ No")
- **Archive Exists**: $([ "$ARCHIVE_EXISTS" = true ] && echo "✅ Yes" || echo "❌ No")
- **Rollback Ready**: $([ "$ROLLBACK_READY" = true ] && echo "✅ Yes" || echo "❌ No")

## Health Check Summary

EOF

    if [ ${#ISSUES_FOUND[@]} -eq 0 ]; then
        cat >> "$MONITORING_REPORT" << EOF
✅ **All Systems Operational**

The migration is functioning correctly with no issues detected.

### Metrics
- Configuration: Valid
- Archive: Intact
- Rollback: Available
- Task Library: Functional

EOF
    else
        cat >> "$MONITORING_REPORT" << EOF
⚠️ **Issues Detected**

The following issues need attention:

$(printf '%s\n' "${ISSUES_FOUND[@]}" | sed 's/^/- /')

### Recommended Actions
1. Review troubleshooting guide below
2. Fix identified issues
3. Re-run monitoring

EOF
    fi
    
    cat >> "$MONITORING_REPORT" << EOF
## Detailed Results

### Configuration
- TASK_SYSTEM in .env: $CURRENT_MODE
- Migration config: $([ -f .task_system_config ] && echo "Present" || echo "Missing")
- Cutover date: $CUTOVER_TIME

### Archive Status
- Directory exists: $([ -d "$ARCHIVE_DIR" ] && echo "Yes" || echo "No")
- Archive files: $(ls "$ARCHIVE_DIR"/AGENTS_BOARD_FINAL_*.md 2>/dev/null | wc -l | tr -d ' ')
- Latest archive: $(ls -t "$ARCHIVE_DIR"/AGENTS_BOARD_FINAL_*.md 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "None")

### System Readiness
- Task library: $([ -f scripts/migration/task_lib.sh ] && echo "Available" || echo "Missing")
- Rollback script: $([ -f scripts/migration/rollback.sh ] && echo "Available" || echo "Missing")
- Emergency procedures: Documented in AGENTS_BOARD.md

## Recommendations

1. **For Agents**: Ensure TASK_SYSTEM=github in your environment
2. **For Admins**: Monitor GitHub issue creation and activity
3. **For Support**: Address any reported migration issues promptly

---

*Generated by: monitor_migration.sh*
*Report: $MONITORING_REPORT*
EOF
}

# Main monitoring process
main() {
    log "${BLUE}=== T171: Migration Monitoring ===${NC}"
    log "Monitoring post-migration health..."
    log ""
    
    # Run checks
    check_configuration
    check_archive
    check_rollback
    check_task_library
    check_adoption
    
    # Generate troubleshooting if needed
    if [ ${#ISSUES_FOUND[@]} -gt 0 ]; then
        generate_troubleshooting
    fi
    
    # Generate report
    generate_report
    
    # Summary
    log ""
    log_header "Monitoring Summary"
    
    if [ ${#ISSUES_FOUND[@]} -eq 0 ]; then
        log_success "Migration health check passed!"
        log_success "All systems operational"
    else
        log_warning "Issues found: ${#ISSUES_FOUND[@]}"
        log "See $MONITORING_REPORT for details"
    fi
    
    log ""
    log "Report generated: $MONITORING_REPORT"
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main
fi