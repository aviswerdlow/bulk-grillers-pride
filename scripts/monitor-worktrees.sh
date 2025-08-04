#!/bin/bash
# Monitor Git Worktrees for Multi-Agent System
# Provides health checks, disk usage monitoring, and cleanup recommendations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
WORKTREE_BASE="${WORKTREE_BASE:-.worktrees}"
STALE_DAYS="${STALE_DAYS:-7}"
WARN_SIZE_MB="${WARN_SIZE_MB:-500}"
CRITICAL_SIZE_MB="${CRITICAL_SIZE_MB:-1000}"

# Ensure we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Get repository root
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Function to convert bytes to human readable
human_readable() {
    local bytes=$1
    local units=("B" "KB" "MB" "GB" "TB")
    local unit=0
    local size=$bytes
    
    while (( $(echo "$size > 1024" | bc -l) )) && (( unit < ${#units[@]} - 1 )); do
        size=$(echo "scale=2; $size / 1024" | bc -l)
        ((unit++))
    done
    
    printf "%.2f %s" "$size" "${units[$unit]}"
}

# Function to get directory size in MB
get_size_mb() {
    local path="$1"
    if [ -d "$path" ]; then
        local size_kb=$(du -sk "$path" 2>/dev/null | cut -f1)
        echo $(( size_kb / 1024 ))
    else
        echo 0
    fi
}

# Function to check if branch has unpushed commits
has_unpushed_commits() {
    local branch="$1"
    local upstream=$(git rev-parse --abbrev-ref "$branch@{upstream}" 2>/dev/null)
    
    if [ -n "$upstream" ]; then
        local ahead=$(git rev-list --count "$upstream..$branch" 2>/dev/null || echo 0)
        [ "$ahead" -gt 0 ]
    else
        # No upstream, so technically all commits are unpushed
        true
    fi
}

# Function to check if worktree has uncommitted changes
has_uncommitted_changes() {
    local worktree_path="$1"
    if [ -d "$worktree_path" ]; then
        (cd "$worktree_path" && ! git diff --quiet || ! git diff --cached --quiet)
    else
        false
    fi
}

# Function to get age of worktree in days
get_worktree_age_days() {
    local worktree_path="$1"
    if [ -d "$worktree_path" ]; then
        local created_time=$(stat -f %B "$worktree_path" 2>/dev/null || stat -c %Y "$worktree_path" 2>/dev/null || echo 0)
        local current_time=$(date +%s)
        local age_seconds=$((current_time - created_time))
        echo $((age_seconds / 86400))
    else
        echo 0
    fi
}

# Function to analyze a single worktree
analyze_worktree() {
    local worktree_path="$1"
    local branch="$2"
    local commit="$3"
    
    local size_mb=$(get_size_mb "$worktree_path")
    local age_days=$(get_worktree_age_days "$worktree_path")
    local has_changes=$(has_uncommitted_changes "$worktree_path" && echo "yes" || echo "no")
    local has_unpushed=$(has_unpushed_commits "$branch" && echo "yes" || echo "no")
    
    # Determine health status
    local status="healthy"
    local issues=()
    
    if [ "$has_changes" = "yes" ]; then
        status="warning"
        issues+=("uncommitted changes")
    fi
    
    if [ "$has_unpushed" = "yes" ]; then
        status="warning"
        issues+=("unpushed commits")
    fi
    
    if [ "$age_days" -gt "$STALE_DAYS" ]; then
        if [ "$status" = "healthy" ]; then
            status="stale"
        fi
        issues+=("${age_days} days old")
    fi
    
    if [ "$size_mb" -gt "$CRITICAL_SIZE_MB" ]; then
        status="critical"
        issues+=("very large: ${size_mb}MB")
    elif [ "$size_mb" -gt "$WARN_SIZE_MB" ]; then
        if [ "$status" = "healthy" ]; then
            status="warning"
        fi
        issues+=("large: ${size_mb}MB")
    fi
    
    # Output results
    echo "$worktree_path|$branch|$commit|$size_mb|$age_days|$has_changes|$has_unpushed|$status|$(IFS=,; echo "${issues[*]}")"
}

# Function to display summary statistics
display_summary() {
    local total_count=0
    local total_size_mb=0
    local healthy_count=0
    local warning_count=0
    local stale_count=0
    local critical_count=0
    
    while IFS='|' read -r path branch commit size_mb age_days has_changes has_unpushed status issues; do
        ((total_count++))
        total_size_mb=$((total_size_mb + size_mb))
        
        case "$status" in
            "healthy") ((healthy_count++)) ;;
            "warning") ((warning_count++)) ;;
            "stale") ((stale_count++)) ;;
            "critical") ((critical_count++)) ;;
        esac
    done
    
    echo -e "\n${BLUE}=== Worktree Summary ===${NC}"
    echo -e "Total worktrees: $total_count"
    echo -e "Total disk usage: ${total_size_mb}MB"
    echo -e "${GREEN}Healthy:${NC} $healthy_count"
    echo -e "${YELLOW}Warning:${NC} $warning_count"
    echo -e "${CYAN}Stale:${NC} $stale_count"
    echo -e "${RED}Critical:${NC} $critical_count"
}

# Function to display detailed report
display_detailed_report() {
    echo -e "${BLUE}=== Worktree Health Report ===${NC}"
    echo -e "Generated: $(date)"
    echo -e "Repository: $REPO_ROOT"
    echo -e "Stale threshold: $STALE_DAYS days"
    echo -e "Size warning: >${WARN_SIZE_MB}MB, critical: >${CRITICAL_SIZE_MB}MB\n"
    
    local has_issues=false
    
    # Critical worktrees
    echo -e "${RED}Critical Worktrees:${NC}"
    while IFS='|' read -r path branch commit size_mb age_days has_changes has_unpushed status issues; do
        if [ "$status" = "critical" ]; then
            has_issues=true
            echo -e "  ${RED}●${NC} $branch"
            echo -e "    Path: $path"
            echo -e "    Issues: $issues"
            echo -e "    Action: Consider immediate cleanup"
        fi
    done < <(cat)
    [ "$has_issues" = false ] && echo -e "  None"
    
    # Warning worktrees
    echo -e "\n${YELLOW}Warning Worktrees:${NC}"
    has_issues=false
    while IFS='|' read -r path branch commit size_mb age_days has_changes has_unpushed status issues; do
        if [ "$status" = "warning" ]; then
            has_issues=true
            echo -e "  ${YELLOW}●${NC} $branch"
            echo -e "    Path: $path"
            echo -e "    Issues: $issues"
            echo -e "    Action: Review and cleanup if needed"
        fi
    done < <(cat)
    [ "$has_issues" = false ] && echo -e "  None"
    
    # Stale worktrees
    echo -e "\n${CYAN}Stale Worktrees:${NC}"
    has_issues=false
    while IFS='|' read -r path branch commit size_mb age_days has_changes has_unpushed status issues; do
        if [ "$status" = "stale" ]; then
            has_issues=true
            echo -e "  ${CYAN}●${NC} $branch"
            echo -e "    Path: $path"
            echo -e "    Age: $age_days days"
            echo -e "    Action: Consider removal if work is complete"
        fi
    done < <(cat)
    [ "$has_issues" = false ] && echo -e "  None"
}

# Function to generate cleanup script
generate_cleanup_script() {
    local script_path="$1"
    
    echo "#!/bin/bash" > "$script_path"
    echo "# Auto-generated worktree cleanup script" >> "$script_path"
    echo "# Generated: $(date)" >> "$script_path"
    echo "# Review before running!" >> "$script_path"
    echo "" >> "$script_path"
    echo "set -e" >> "$script_path"
    echo "" >> "$script_path"
    
    local has_cleanups=false
    
    # Add stale worktrees for cleanup
    while IFS='|' read -r path branch commit size_mb age_days has_changes has_unpushed status issues; do
        if [ "$status" = "stale" ] && [ "$has_changes" = "no" ] && [ "$has_unpushed" = "no" ]; then
            has_cleanups=true
            echo "echo 'Removing stale worktree: $branch ($age_days days old)'" >> "$script_path"
            echo "git worktree remove '$path' || echo 'Failed to remove $path'" >> "$script_path"
            echo "" >> "$script_path"
        fi
    done < <(cat)
    
    if [ "$has_cleanups" = true ]; then
        echo "echo 'Cleanup complete!'" >> "$script_path"
        chmod +x "$script_path"
        echo -e "${GREEN}Generated cleanup script: $script_path${NC}"
    else
        rm -f "$script_path"
        echo -e "${YELLOW}No safe cleanup candidates found${NC}"
    fi
}

# Main monitoring function
monitor_worktrees() {
    local mode="${1:-report}"
    
    # Get all worktrees
    local worktree_data=""
    while IFS= read -r line; do
        if [[ "$line" =~ ^($WORKTREE_BASE/.+)[[:space:]]+([[:xdigit:]]+)[[:space:]]+\[(.+)\]$ ]]; then
            local path="${BASH_REMATCH[1]}"
            local commit="${BASH_REMATCH[2]}"
            local branch="${BASH_REMATCH[3]}"
            
            # Skip the main worktree
            if [ "$path" != "$REPO_ROOT" ]; then
                local analysis=$(analyze_worktree "$path" "$branch" "$commit")
                worktree_data="${worktree_data}${analysis}\n"
            fi
        fi
    done < <(git worktree list)
    
    case "$mode" in
        "summary")
            echo -e "$worktree_data" | display_summary
            ;;
        "report")
            echo -e "$worktree_data" | tee >(display_summary) | display_detailed_report
            ;;
        "cleanup")
            local cleanup_script="/tmp/worktree_cleanup_$(date +%Y%m%d_%H%M%S).sh"
            echo -e "$worktree_data" | generate_cleanup_script "$cleanup_script"
            ;;
        "json")
            # Output JSON format for integration with other tools
            echo "["
            local first=true
            echo -e "$worktree_data" | while IFS='|' read -r path branch commit size_mb age_days has_changes has_unpushed status issues; do
                [ -z "$path" ] && continue
                [ "$first" = false ] && echo ","
                first=false
                cat <<EOF
  {
    "path": "$path",
    "branch": "$branch",
    "commit": "$commit",
    "size_mb": $size_mb,
    "age_days": $age_days,
    "has_uncommitted_changes": $([ "$has_changes" = "yes" ] && echo "true" || echo "false"),
    "has_unpushed_commits": $([ "$has_unpushed" = "yes" ] && echo "true" || echo "false"),
    "status": "$status",
    "issues": "$(echo "$issues" | sed 's/,/", "/g')"
  }
EOF
            done
            echo "]"
            ;;
        *)
            echo "Usage: $0 [summary|report|cleanup|json]"
            echo ""
            echo "Modes:"
            echo "  summary - Show summary statistics only"
            echo "  report  - Show detailed health report (default)"
            echo "  cleanup - Generate cleanup script for safe removals"
            echo "  json    - Output in JSON format"
            exit 1
            ;;
    esac
}

# Run monitoring
monitor_worktrees "$@"