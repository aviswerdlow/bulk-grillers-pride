#!/bin/bash

echo "Installing Task Polling & Skill-Based Commands..."
echo "================================================"

# Check if commands directory exists
if [ ! -d ".claude/commands" ]; then
    echo "Creating .claude/commands directory..."
    mkdir -p .claude/commands
fi

# Count existing commands
EXISTING=$(ls .claude/commands/*.md 2>/dev/null | wc -l)
echo "Found $EXISTING existing commands"

echo ""
echo "New commands being installed:"
echo "✓ /check-tasks - Check for assigned tasks based on skills"
echo "✓ /complete-task - Mark tasks as done and unblock dependencies"
echo "✓ /agent-loop - Run continuous work loop"
echo "✓ /assign-task - Assign task to specific agent"
echo "✓ /bulk-assign - Auto-assign multiple tasks"
echo "✓ /tag-task - Add skill requirements to tasks"
echo "✓ /smart-assign - Intelligent skill-based assignment"
echo "✓ /verify-task - Verify task compatibility"

echo ""
echo "Task polling commands installed successfully!"
echo ""
echo "Quick Start Guide:"
echo "=================="
echo ""
echo "For Agents:"
echo "1. Run /check-tasks to see compatible tasks"
echo "2. Work on assigned tasks"
echo "3. Run /complete-task when done"
echo "4. Use /agent-loop for continuous checking"
echo ""
echo "For Orchestrator:"
echo "1. Use /tag-task to add skill requirements"
echo "2. Use /smart-assign for intelligent assignment"
echo "3. Use /bulk-assign to assign all ready tasks"
echo "4. Monitor with /agent-progress"
echo ""
echo "Skill Matching:"
echo "- Tasks only appear for agents with matching skills"
echo "- Anti-skills prevent incompatible assignments"
echo "- Agents stay in their expertise lane!"