#!/bin/bash
# Update remaining agent CLAUDE.md files with worktree support

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# Function to update an agent config file
update_agent_config() {
    local agent_name="$1"
    local config_file="$2"
    local agent_id="${agent_name}-agent"
    
    echo -e "${BLUE}Updating $config_file for $agent_name...${NC}"
    
    # Create backup
    cp "$config_file" "${config_file}.bak.worktree"
    
    # Create temporary file with updates
    local temp_file=$(mktemp)
    local in_git_section=false
    local in_task_section=false
    local added_worktree_config=false
    local added_worktree_management=false
    
    while IFS= read -r line; do
        # Add worktree configuration after agent_role
        if [[ "$line" =~ ^agent_role: ]] && [ "$added_worktree_config" = false ]; then
            echo "$line" >> "$temp_file"
            echo "" >> "$temp_file"
            echo "## Worktree Configuration" >> "$temp_file"
            echo "" >> "$temp_file"
            echo "worktree_enabled: true" >> "$temp_file"
            echo "worktree_path: .worktrees/$agent_id" >> "$temp_file"
            echo "default_branch_prefix: $agent_name/" >> "$temp_file"
            added_worktree_config=true
            continue
        fi
        
        # Update Git Workflow section
        if [[ "$line" =~ ^##[[:space:]]Git[[:space:]]Workflow ]]; then
            echo "## Git Workflow with Worktrees" >> "$temp_file"
            echo "" >> "$temp_file"
            echo "### When Worktrees are Enabled (ENABLE_WORKTREES=true)" >> "$temp_file"
            echo "" >> "$temp_file"
            echo "1. **Your dedicated worktree**: \`.worktrees/$agent_id\`" >> "$temp_file"
            echo "2. **Task-specific worktrees**: \`.worktrees/$agent_id/[task-id]\`" >> "$temp_file"
            echo "3. **No manual branch switching needed** - worktrees handle isolation" >> "$temp_file"
            echo "4. **Push changes**: \`git push -u origin HEAD\`" >> "$temp_file"
            echo "" >> "$temp_file"
            echo "### Workflow Commands" >> "$temp_file"
            echo "" >> "$temp_file"
            echo '```bash' >> "$temp_file"
            echo "# Enable worktrees" >> "$temp_file"
            echo "export ENABLE_WORKTREES=true" >> "$temp_file"
            echo "" >> "$temp_file"
            echo "# Source task library" >> "$temp_file"
            echo "source scripts/migration/task_lib.sh" >> "$temp_file"
            echo "" >> "$temp_file"
            echo "# Claim task with worktree" >> "$temp_file"
            echo "claim_task_with_worktree T123 $agent_id" >> "$temp_file"
            echo "" >> "$temp_file"
            echo "# You're automatically in the task worktree" >> "$temp_file"
            echo "# Do your work..." >> "$temp_file"
            echo "" >> "$temp_file"
            echo "# Complete task" >> "$temp_file"
            echo 'complete_task_with_cleanup T123 "Task summary"' >> "$temp_file"
            echo "" >> "$temp_file"
            echo "# Clean up worktree after pushing" >> "$temp_file"
            echo "git push -u origin HEAD" >> "$temp_file"
            echo "cleanup_task_worktree T123 $agent_id" >> "$temp_file"
            echo '```' >> "$temp_file"
            echo "" >> "$temp_file"
            echo "### Fallback (When Worktrees Disabled)" >> "$temp_file"
            echo "" >> "$temp_file"
            echo "1. **Create feature branch**: \`git checkout -b $agent_name/[task-name]\`" >> "$temp_file"
            echo "2. **Follow standard git workflow**" >> "$temp_file"
            echo "3. **Push to branch**: \`git push -u origin $agent_name/[task-name]\`" >> "$temp_file"
            in_git_section=true
            continue
        fi
        
        # Skip old git workflow content
        if [ "$in_git_section" = true ]; then
            if [[ "$line" =~ ^## ]] && ! [[ "$line" =~ ^###[[:space:]] ]]; then
                in_git_section=false
            else
                continue
            fi
        fi
        
        # Update Always Read section
        if [[ "$line" =~ ^always_read: ]]; then
            echo "$line" >> "$temp_file"
            # Read the existing items
            while IFS= read -r next_line; do
                if [[ -z "$next_line" ]] || [[ "$next_line" =~ ^## ]]; then
                    echo "- /.worktree-task-mapping.json (when worktrees enabled)" >> "$temp_file"
                    echo "" >> "$temp_file"
                    if [[ "$next_line" =~ ^## ]]; then
                        echo "$next_line" >> "$temp_file"
                    fi
                    break
                else
                    echo "$next_line" >> "$temp_file"
                fi
            done
            continue
        fi
        
        # Add worktree management section before closing
        if [[ "$line" =~ ^##[[:space:]]Evidence[[:space:]]Standards ]] && [ "$added_worktree_management" = false ]; then
            echo "$line" >> "$temp_file"
            # Read evidence standards content
            while IFS= read -r next_line; do
                if [[ -z "$next_line" ]] && [ "$added_worktree_management" = false ]; then
                    added_worktree_management=true
                    echo "" >> "$temp_file"
                    echo "## Worktree Management" >> "$temp_file"
                    echo "" >> "$temp_file"
                    echo "### List Your Worktrees" >> "$temp_file"
                    echo '```bash' >> "$temp_file"
                    echo "source scripts/migration/task_lib.sh" >> "$temp_file"
                    echo "list_agent_worktrees $agent_id" >> "$temp_file"
                    echo '```' >> "$temp_file"
                    echo "" >> "$temp_file"
                    echo "### Monitor Worktree Health" >> "$temp_file"
                    echo '```bash' >> "$temp_file"
                    echo "cd ~/bulk-grillers-pride" >> "$temp_file"
                    echo "./scripts/monitor-worktrees.sh report | grep $agent_id" >> "$temp_file"
                    echo '```' >> "$temp_file"
                    echo "" >> "$temp_file"
                    echo "### Switch Between Task Worktrees" >> "$temp_file"
                    echo '```bash' >> "$temp_file"
                    echo "source scripts/migration/task_lib.sh" >> "$temp_file"
                    echo "switch_to_task_worktree T123 $agent_id" >> "$temp_file"
                    echo '```' >> "$temp_file"
                    echo "" >> "$temp_file"
                    echo "## Example Task Flow with Worktrees" >> "$temp_file"
                    echo "" >> "$temp_file"
                    echo '```bash' >> "$temp_file"
                    echo "# 1. Check for tasks" >> "$temp_file"
                    echo "cd ~/bulk-grillers-pride && npm run check-tasks" >> "$temp_file"
                    echo "" >> "$temp_file"
                    echo "# 2. Enable worktrees" >> "$temp_file"
                    echo "export ENABLE_WORKTREES=true" >> "$temp_file"
                    echo "source scripts/migration/task_lib.sh" >> "$temp_file"
                    echo "" >> "$temp_file"
                    echo "# 3. Claim task T456" >> "$temp_file"
                    echo "claim_task_with_worktree T456 $agent_id" >> "$temp_file"
                    echo "# Automatically switched to .worktrees/$agent_id/T456" >> "$temp_file"
                    echo "" >> "$temp_file"
                    echo "# 4. Work on task" >> "$temp_file"
                    echo "/sc:analyze --code" >> "$temp_file"
                    echo "# ... implement changes ..." >> "$temp_file"
                    echo "/sc:test" >> "$temp_file"
                    echo "" >> "$temp_file"
                    echo "# 5. Commit and push" >> "$temp_file"
                    echo "git add ." >> "$temp_file"
                    echo 'git commit -m "'$agent_name': Complete T456 - Brief description"' >> "$temp_file"
                    echo "git push -u origin HEAD" >> "$temp_file"
                    echo "" >> "$temp_file"
                    echo "# 6. Complete and cleanup" >> "$temp_file"
                    echo 'complete_task_with_cleanup T456 "Implemented feature with tests"' >> "$temp_file"
                    echo "cleanup_task_worktree T456 $agent_id" >> "$temp_file"
                    echo "" >> "$temp_file"
                    echo "# 7. Check for more work" >> "$temp_file"
                    echo "cd ~/bulk-grillers-pride && npm run check-tasks" >> "$temp_file"
                    echo '```' >> "$temp_file"
                    echo "" >> "$temp_file"
                    echo "This workflow ensures complete isolation, prevents conflicts, and maintains clean workspace management." >> "$temp_file"
                    break
                else
                    echo "$next_line" >> "$temp_file"
                fi
            done
            continue
        fi
        
        # Default: copy line as-is
        echo "$line" >> "$temp_file"
        
    done < "$config_file"
    
    # Move temp file to original
    mv "$temp_file" "$config_file"
    
    echo -e "${GREEN}✓ Updated $config_file${NC}"
}

# Update infrastructure agent (root CLAUDE.md)
update_agent_config "infra" "CLAUDE.md"

# Update other agents
update_agent_config "quality" "CLAUDE-quality.md"
update_agent_config "docs" "CLAUDE-docs.md"
update_agent_config "migration" "CLAUDE-migration.md"
update_agent_config "design" "CLAUDE-design.md"
update_agent_config "systems-design" "CLAUDE-systems-design.md"
update_agent_config "ai" "CLAUDE-ai.md"

echo -e "\n${GREEN}✓ All agent configurations updated!${NC}"
echo -e "${YELLOW}Note: Frontend and Backend agents were already updated manually${NC}"