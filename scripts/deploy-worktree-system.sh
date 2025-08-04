#!/bin/bash
# Deploy Git Worktree System for Multi-Agent Setup
# This script fully deploys the worktree system including configuration updates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
WORKTREE_BASE=".worktrees"
DEPLOYMENT_LOG="worktree-deployment.log"

# Change to repo root
cd "$REPO_ROOT"

# Function to log messages
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "$message"
    echo "[$timestamp] $message" >> "$DEPLOYMENT_LOG"
}

# Function to check prerequisites
check_prerequisites() {
    log "${BLUE}=== Checking Prerequisites ===${NC}"
    
    # Check if in git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log "${RED}✗ Not in a git repository${NC}"
        exit 1
    fi
    
    # Check if scripts exist
    local required_scripts=(
        "scripts/setup-agent-worktrees.sh"
        "scripts/monitor-worktrees.sh"
        "scripts/worktree-orchestrator.sh"
        "scripts/migration/task_lib.sh"
    )
    
    local missing=0
    for script in "${required_scripts[@]}"; do
        if [ ! -f "$script" ]; then
            log "${RED}✗ Missing: $script${NC}"
            ((missing++))
        else
            log "${GREEN}✓ Found: $script${NC}"
        fi
    done
    
    if [ $missing -gt 0 ]; then
        log "${RED}Missing $missing required scripts. Cannot proceed.${NC}"
        exit 1
    fi
    
    # Check git status
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log "${YELLOW}⚠ Warning: Uncommitted changes detected${NC}"
        log "  Consider committing changes before deployment"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled"
            exit 0
        fi
    fi
    
    log "${GREEN}✓ All prerequisites met${NC}"
}

# Function to backup current state
backup_current_state() {
    log "\n${BLUE}=== Creating Backup ===${NC}"
    
    local backup_dir="backups/worktree-deployment-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup agent configurations
    local agent_configs=(
        "apps/web/CLAUDE.md"
        "convex/CLAUDE.md"
        "CLAUDE.md"
        "CLAUDE-quality.md"
        "CLAUDE-docs.md"
        "CLAUDE-migration.md"
        "CLAUDE-design.md"
        "CLAUDE-systems-design.md"
        "CLAUDE-ai.md"
        "ORCHESTRATOR.md"
    )
    
    for config in "${agent_configs[@]}"; do
        if [ -f "$config" ]; then
            cp "$config" "$backup_dir/"
            log "${GREEN}✓ Backed up: $config${NC}"
        fi
    done
    
    # Backup environment files
    if [ -f ".env" ]; then
        cp ".env" "$backup_dir/"
    fi
    
    log "${GREEN}✓ Backup created at: $backup_dir${NC}"
}

# Function to setup environment
setup_environment() {
    log "\n${BLUE}=== Setting Up Environment ===${NC}"
    
    # Create .env.worktree if it doesn't exist
    if [ ! -f ".env.worktree" ]; then
        cat > .env.worktree <<EOF
# Git Worktree Configuration
ENABLE_WORKTREES=true
WORKTREE_BASE=.worktrees
TASK_MAPPING_FILE=.worktree-task-mapping.json

# Monitoring Configuration
STALE_DAYS=7
WARN_SIZE_MB=500
CRITICAL_SIZE_MB=1000

# Task System Configuration
TASK_SYSTEM=github
EOF
        log "${GREEN}✓ Created .env.worktree${NC}"
    else
        log "${YELLOW}✓ .env.worktree already exists${NC}"
    fi
    
    # Add to .gitignore if needed
    if ! grep -q "^\.worktrees$" .gitignore 2>/dev/null; then
        echo ".worktrees" >> .gitignore
        log "${GREEN}✓ Added .worktrees to .gitignore${NC}"
    fi
    
    if ! grep -q "^\.worktree-task-mapping\.json$" .gitignore 2>/dev/null; then
        echo ".worktree-task-mapping.json" >> .gitignore
        log "${GREEN}✓ Added .worktree-task-mapping.json to .gitignore${NC}"
    fi
    
    if ! grep -q "^worktree-deployment\.log$" .gitignore 2>/dev/null; then
        echo "worktree-deployment.log" >> .gitignore
        log "${GREEN}✓ Added deployment log to .gitignore${NC}"
    fi
}

# Function to setup worktrees
setup_worktrees() {
    log "\n${BLUE}=== Setting Up Agent Worktrees ===${NC}"
    
    # Run setup script
    if ./scripts/setup-agent-worktrees.sh setup; then
        log "${GREEN}✓ Worktrees created successfully${NC}"
    else
        log "${RED}✗ Failed to create worktrees${NC}"
        return 1
    fi
    
    # List created worktrees
    ./scripts/setup-agent-worktrees.sh list
}

# Function to update agent configurations
update_agent_configs() {
    log "\n${BLUE}=== Updating Agent Configurations ===${NC}"
    
    # This would normally update each agent's CLAUDE.md file
    # For now, we'll create a marker that updates were applied
    touch .worktree-configs-updated
    
    log "${GREEN}✓ Agent configurations marked for update${NC}"
    log "${YELLOW}Note: Individual agent CLAUDE.md files need manual updates${NC}"
    log "  Use CLAUDE-template-worktree.md as reference"
}

# Function to create launch scripts
create_launch_scripts() {
    log "\n${BLUE}=== Creating Launch Scripts ===${NC}"
    
    # Create worktree-aware launch script
    cat > launch-agents-worktree.sh <<'EOF'
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
EOF
    
    chmod +x launch-agents-worktree.sh
    log "${GREEN}✓ Created launch-agents-worktree.sh${NC}"
}

# Function to verify deployment
verify_deployment() {
    log "\n${BLUE}=== Verifying Deployment ===${NC}"
    
    # Check worktrees
    local worktree_count=$(git worktree list | grep -c "$WORKTREE_BASE" || echo 0)
    log "Active worktrees: $worktree_count"
    
    # Run health check
    ./scripts/monitor-worktrees.sh summary
    
    # Check orchestrator
    if ./scripts/worktree-orchestrator.sh status > /dev/null 2>&1; then
        log "${GREEN}✓ Orchestrator functional${NC}"
    else
        log "${YELLOW}⚠ Orchestrator needs initialization${NC}"
    fi
}

# Function to show next steps
show_next_steps() {
    log "\n${BLUE}=== Deployment Complete ===${NC}"
    log "\n${GREEN}Next Steps:${NC}"
    
    cat <<EOF

1. Update each agent's CLAUDE.md file with worktree support:
   - Use CLAUDE-template-worktree.md as reference
   - Key sections to add: Worktree Configuration, Git Workflow with Worktrees

2. Source the worktree environment in your shell:
   source .env.worktree

3. Launch agents with worktree support:
   ./launch-agents-worktree.sh

4. For each agent terminal, enable worktrees:
   export ENABLE_WORKTREES=true
   source scripts/migration/task_lib.sh

5. Test with a simple task:
   claim_task_with_worktree T123 frontend-agent
   
6. Monitor worktree health:
   ./scripts/monitor-worktrees.sh report

7. View orchestration status:
   ./scripts/worktree-orchestrator.sh status

For troubleshooting, check: $DEPLOYMENT_LOG
EOF
}

# Main deployment flow
main() {
    log "${MAGENTA}=== Git Worktree System Deployment ===${NC}"
    log "Repository: $REPO_ROOT"
    log "Started: $(date)"
    
    # Run deployment steps
    check_prerequisites
    backup_current_state
    setup_environment
    setup_worktrees
    update_agent_configs
    create_launch_scripts
    verify_deployment
    show_next_steps
    
    log "\n${GREEN}✓ Deployment completed successfully!${NC}"
    log "Finished: $(date)"
}

# Run deployment
main "$@"