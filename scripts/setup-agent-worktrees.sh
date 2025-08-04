#!/bin/bash
# Setup Git Worktrees for Multi-Agent System
# This script creates and manages worktrees for each agent in the system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
WORKTREE_BASE=".worktrees"
DEFAULT_BASE_BRANCH="main"

# List of all agents in the system
AGENTS=(
    "frontend-agent"
    "backend-agent"
    "infra-agent"
    "quality-agent"
    "docs-agent"
    "migration-agent"
    "design-agent"
    "systems-design-agent"
    "ai-agent"
    "orchestrator"
)

# Ensure we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Get repository root
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Source the wt function if available
if [ -f "$HOME/.bashrc" ] && grep -q "^wt()" "$HOME/.bashrc"; then
    source "$HOME/.bashrc"
elif [ -f "$HOME/.zshrc" ] && grep -q "^wt()" "$HOME/.zshrc"; then
    source "$HOME/.zshrc"
else
    # Define wt function inline if not found
    wt() {
        if [ -z "$1" ]; then
            echo "Error: Branch name is required."
            echo "Usage: wt <branch-name> [base-branch]"
            return 1
        fi

        local base_branch="${2:-main}"
        local git_root=$(git rev-parse --show-toplevel 2>/dev/null)
        if [ -z "$git_root" ]; then
            echo "Error: Not a git repository."
            return 1
        fi

        local worktree_dir="$git_root/.worktrees"
        local worktree_path="$worktree_dir/$1"
        local gitignore_path="$git_root/.gitignore"

        mkdir -p "$worktree_dir"

        if ! grep -qx '\.worktrees' "$gitignore_path" 2>/dev/null; then
            echo ".worktrees" >> "$gitignore_path"
        fi

        if ! git rev-parse --verify "$base_branch" >/dev/null 2>&1; then
            echo "Error: Base branch '$base_branch' does not exist."
            return 1
        fi

        if git worktree add -b "$1" "$worktree_path" "$base_branch"; then
            echo "Worktree '$1' created from '$base_branch'."
            cd "$worktree_path" || return
        else
            echo "Error: Failed to create worktree '$1'."
            return 1
        fi
    }
fi

# Function to create worktree for an agent
create_agent_worktree() {
    local agent_name="$1"
    local base_branch="${2:-$DEFAULT_BASE_BRANCH}"
    
    echo -e "${BLUE}Setting up worktree for $agent_name...${NC}"
    
    # Check if worktree already exists
    if git worktree list | grep -q "$WORKTREE_BASE/$agent_name"; then
        echo -e "${YELLOW}Worktree for $agent_name already exists${NC}"
        return 0
    fi
    
    # Create the worktree
    if git worktree add -b "$agent_name/base" "$WORKTREE_BASE/$agent_name" "$base_branch" 2>/dev/null; then
        echo -e "${GREEN}✓ Created worktree for $agent_name at $WORKTREE_BASE/$agent_name${NC}"
        
        # Create agent-specific README in the worktree
        cat > "$WORKTREE_BASE/$agent_name/WORKTREE_README.md" <<EOF
# Worktree for $agent_name

This is the dedicated worktree for $agent_name.

## Current Branch
\`$agent_name/base\`

## Usage
1. All work for this agent should be done in this worktree
2. Create task-specific branches with: \`git checkout -b $agent_name/[task-id]\`
3. Push changes with: \`git push -u origin HEAD\`

## Location
This worktree is located at: \`$WORKTREE_BASE/$agent_name\`

## Agent Configuration
See the agent's CLAUDE.md file for specific capabilities and restrictions.
EOF
        
        return 0
    else
        echo -e "${RED}✗ Failed to create worktree for $agent_name${NC}"
        return 1
    fi
}

# Function to clean up stale worktrees
cleanup_stale_worktrees() {
    echo -e "${BLUE}Cleaning up stale worktrees...${NC}"
    git worktree prune
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Function to list all agent worktrees
list_agent_worktrees() {
    echo -e "${BLUE}Current agent worktrees:${NC}"
    echo "------------------------"
    
    for agent in "${AGENTS[@]}"; do
        if git worktree list | grep -q "$WORKTREE_BASE/$agent"; then
            local worktree_info=$(git worktree list | grep "$WORKTREE_BASE/$agent")
            local branch=$(echo "$worktree_info" | awk '{print $3}' | tr -d '[]')
            echo -e "${GREEN}✓${NC} $agent: $WORKTREE_BASE/$agent [$branch]"
        else
            echo -e "${RED}✗${NC} $agent: Not created"
        fi
    done
}

# Function to remove agent worktree
remove_agent_worktree() {
    local agent_name="$1"
    
    echo -e "${BLUE}Removing worktree for $agent_name...${NC}"
    
    if git worktree remove "$WORKTREE_BASE/$agent_name" --force 2>/dev/null; then
        echo -e "${GREEN}✓ Removed worktree for $agent_name${NC}"
        return 0
    else
        echo -e "${YELLOW}Worktree for $agent_name not found or already removed${NC}"
        return 1
    fi
}

# Main execution
main() {
    local action="${1:-setup}"
    
    case "$action" in
        "setup")
            echo -e "${BLUE}Setting up worktrees for all agents...${NC}"
            echo "======================================"
            
            # Ensure .worktrees is in .gitignore
            if ! grep -qx '\.worktrees' .gitignore 2>/dev/null; then
                echo ".worktrees" >> .gitignore
                echo -e "${GREEN}✓ Added .worktrees to .gitignore${NC}"
            fi
            
            # Create worktree directory
            mkdir -p "$WORKTREE_BASE"
            
            # Create worktrees for all agents
            local failed=0
            for agent in "${AGENTS[@]}"; do
                if ! create_agent_worktree "$agent"; then
                    ((failed++))
                fi
            done
            
            echo ""
            echo "======================================"
            if [ $failed -eq 0 ]; then
                echo -e "${GREEN}✓ All agent worktrees created successfully!${NC}"
            else
                echo -e "${YELLOW}⚠ Created worktrees with $failed failures${NC}"
            fi
            
            echo ""
            list_agent_worktrees
            ;;
            
        "list")
            list_agent_worktrees
            ;;
            
        "cleanup")
            cleanup_stale_worktrees
            ;;
            
        "remove")
            if [ -z "$2" ]; then
                echo -e "${RED}Error: Agent name required${NC}"
                echo "Usage: $0 remove <agent-name>"
                exit 1
            fi
            remove_agent_worktree "$2"
            ;;
            
        "remove-all")
            echo -e "${YELLOW}Removing all agent worktrees...${NC}"
            for agent in "${AGENTS[@]}"; do
                remove_agent_worktree "$agent"
            done
            ;;
            
        *)
            echo "Usage: $0 [setup|list|cleanup|remove <agent>|remove-all]"
            echo ""
            echo "Commands:"
            echo "  setup       - Create worktrees for all agents (default)"
            echo "  list        - List all agent worktrees"
            echo "  cleanup     - Clean up stale worktrees"
            echo "  remove      - Remove specific agent worktree"
            echo "  remove-all  - Remove all agent worktrees"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"