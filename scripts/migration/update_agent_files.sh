#!/bin/bash
# Update all agent CLAUDE.md files with task management instructions
# Task: T168 - Update all agent CLAUDE.md files

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FILE="$SCRIPT_DIR/agent_instructions_template.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Agent files to update
AGENT_FILES=(
    "CLAUDE.md"
    "CLAUDE-design.md"
    "CLAUDE-docs.md"
    "CLAUDE-migration.md"
    "CLAUDE-quality.md"
    "CLAUDE-systems-design.md"
    "apps/web/CLAUDE.md"
    "convex/CLAUDE.md"
    "quality-agent/CLAUDE.md"
    "docs-agent/CLAUDE.md"
    "migration-agent/CLAUDE.md"
)

# Section marker for task management
SECTION_MARKER="## Task Management"
MIGRATION_MARKER="## Task Management (Dual-Mode)"

# Update a single agent file
update_agent_file() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}Skipping $file (not found)${NC}"
        return
    fi
    
    echo -n "Updating $file... "
    
    # Create backup
    cp "$file" "$file.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Check if already has migration instructions
    if grep -q "$MIGRATION_MARKER" "$file"; then
        echo -e "${YELLOW}already updated${NC}"
        return
    fi
    
    # Create temporary file
    local temp_file=$(mktemp)
    
    # Check if file has existing task management section
    if grep -q "$SECTION_MARKER" "$file"; then
        # Replace existing section
        awk -v marker="$SECTION_MARKER" -v template="$TEMPLATE_FILE" '
            BEGIN { in_section = 0 }
            {
                if ($0 ~ marker) {
                    in_section = 1
                    # Insert new content
                    while ((getline line < template) > 0) {
                        print line
                    }
                    close(template)
                } else if (in_section && /^## /) {
                    # End of section, resume normal output
                    in_section = 0
                    print $0
                } else if (!in_section) {
                    print $0
                }
            }
        ' "$file" > "$temp_file"
    else
        # Append to end of file
        cat "$file" > "$temp_file"
        echo "" >> "$temp_file"
        echo "---" >> "$temp_file"
        echo "" >> "$temp_file"
        cat "$TEMPLATE_FILE" >> "$temp_file"
    fi
    
    # Replace original file
    mv "$temp_file" "$file"
    
    echo -e "${GREEN}✓${NC}"
}

# Create a summary of changes
create_summary() {
    cat > TASK_MIGRATION_SUMMARY.md << 'EOF'
# Task System Migration - Agent Updates

## Overview

All agent CLAUDE.md files have been updated with dual-mode task management instructions.

## What Changed

1. **New Section Added**: "Task Management (Dual-Mode)"
2. **Instructions Include**:
   - How to check current mode
   - Task operations for both board and GitHub modes
   - Mode-specific workflows
   - Troubleshooting guidance

## For Agents

### Quick Start

```bash
# Load task functions
source scripts/migration/task_lib.sh

# Set your agent name
export AGENT_NAME="your-agent-name"

# Check mode
echo $TASK_SYSTEM  # board (default) | github | sync
```

### Common Operations

- `get_my_tasks "$AGENT_NAME"` - View your tasks
- `claim_task "T123" "$AGENT_NAME"` - Claim a task
- `update_task_status "T123" "in-progress"` - Update status

## Migration Timeline

1. **Current**: Board mode (AGENTS_BOARD.md)
2. **Testing**: Sync mode for volunteers
3. **Rollout**: GitHub mode gradual adoption
4. **Future**: GitHub as default

## Support

- Issues: Report with label 'migration-issue'
- Logs: Check `.sync.log`
- Rollback: Run `scripts/migration/rollback.sh`
EOF
}

# Main
main() {
    echo -e "${BLUE}=== Updating Agent CLAUDE.md Files ===${NC}"
    
    # Check template exists
    if [ ! -f "$TEMPLATE_FILE" ]; then
        echo -e "${RED}Error: Template file not found: $TEMPLATE_FILE${NC}"
        exit 1
    fi
    
    # Update each agent file
    for file in "${AGENT_FILES[@]}"; do
        update_agent_file "$file"
    done
    
    # Create summary
    create_summary
    echo -e "\n${GREEN}Created TASK_MIGRATION_SUMMARY.md${NC}"
    
    echo -e "\n${GREEN}=== Update Complete ===${NC}"
    echo "All agent files have been updated with migration instructions"
    echo "Backups created with .backup.<timestamp> extension"
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main
fi