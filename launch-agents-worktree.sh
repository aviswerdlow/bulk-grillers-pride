#!/bin/bash
# Launch agents with worktree support

# Source environment
[ -f .env.worktree ] && source .env.worktree

# Enable worktrees
export ENABLE_WORKTREES=true

echo "Launching agents with worktree support..."
echo "Each agent will work in: $WORKTREE_BASE/[agent-name]"
echo ""
echo "Start each agent in a new terminal with these commands:"
echo ""

agents=(
    "frontend-agent:apps/web"
    "backend-agent:convex"
    "infra-agent:."
    "quality-agent:."
    "docs-agent:."
    "migration-agent:."
    "design-agent:."
    "systems-design-agent:."
    "ai-agent:."
    "orchestrator:."
)

for agent_info in "${agents[@]}"; do
    IFS=':' read -r agent_name default_path <<< "$agent_info"
    
    if [ -d ".worktrees/$agent_name" ]; then
        echo "# Terminal for $agent_name:"
        echo "cd $(pwd)/.worktrees/$agent_name && claude --dangerously-skip-permissions"
    else
        echo "# Terminal for $agent_name (fallback to default):"
        echo "cd $(pwd)/$default_path && claude --dangerously-skip-permissions"
    fi
    echo ""
done

echo "Don't forget to paste the agent initialization prompt for each!"
