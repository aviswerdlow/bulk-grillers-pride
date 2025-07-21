#!/bin/bash

# Setup Agent Tools Script
# Creates convenient access to agent tools from any directory

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Setting up agent tools..."

# Create bin directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/bin"

# Create check-tasks symlink
if [ ! -L "$PROJECT_ROOT/bin/check-tasks" ]; then
  ln -s "$PROJECT_ROOT/scripts/check-tasks" "$PROJECT_ROOT/bin/check-tasks"
  echo "✓ Created check-tasks symlink in bin/"
else
  echo "✓ check-tasks symlink already exists"
fi

# Add to .gitignore if not already there
if ! grep -q "^bin/$" "$PROJECT_ROOT/.gitignore"; then
  echo -e "\n# Agent tools bin directory\nbin/" >> "$PROJECT_ROOT/.gitignore"
  echo "✓ Added bin/ to .gitignore"
fi

echo ""
echo "Setup complete! Agents can now use:"
echo "  - node scripts/check-tasks (from root)"
echo "  - node ../scripts/check-tasks (from subdirectory)"
echo "  - npm run check-tasks (from root)"
echo ""
echo "For the future, we could add bin/ to PATH in agent environments."