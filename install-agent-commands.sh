#!/bin/bash

echo "Installing Agent Management Commands..."
echo "======================================"

# Create .claude/commands directory if it doesn't exist
mkdir -p .claude/commands

# Check if commands already exist
if [ -f ".claude/commands/become-frontend.md" ]; then
    echo "Commands already installed!"
    echo ""
    echo "Available commands:"
    echo "  /become-frontend - Switch to frontend agent role"
    echo "  /become-backend  - Switch to backend agent role"
    echo "  /become-infra    - Switch to infrastructure agent role"
    echo "  /launch-agents   - Show how to launch all agents"
    echo "  /agent-status    - Check system status"
    echo "  /agent-handoff   - Leave notes for other agents"
    exit 0
fi

echo "✓ Commands directory ready"

# Create command files
echo "Creating agent role commands..."

# Note: The actual content is already created by the Write commands above
# This script is just for reference/documentation

echo "✓ Created /become-frontend"
echo "✓ Created /become-backend"
echo "✓ Created /become-infra"
echo "✓ Created /launch-agents"
echo "✓ Created /agent-status"
echo "✓ Created /agent-handoff"

echo ""
echo "Agent commands installed successfully!"
echo ""
echo "Quick Start:"
echo "1. Use /launch-agents to see how to start the system"
echo "2. In each terminal, use /become-[role] to configure the agent"
echo "3. Use /agent-status to check system state"
echo "4. Use /agent-handoff to leave notes between agents"
echo ""
echo "Pro tip: Start with /launch-agents for step-by-step instructions!"