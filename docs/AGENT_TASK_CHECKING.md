# Agent Task Checking Guide

This guide explains how agents can check for available tasks from any directory within the project.

## Methods to Check Tasks

### Method 1: Using the Wrapper Script (Recommended)

From any directory in the project, run:
```bash
node scripts/check-tasks
```

Or if you're in a subdirectory:
```bash
node ../../scripts/check-tasks  # from apps/web
node ../../../scripts/check-tasks  # from apps/web/src
```

### Method 2: Using npm run (from project root only)

```bash
npm run check-tasks
```

### Method 3: Direct Execution

From project root:
```bash
node .claude/commands/check-tasks.js
```

## Examples by Agent Location

### Frontend Agent (apps/web)
```bash
# From apps/web directory
node ../../scripts/check-tasks

# Or navigate to root first
cd ../.. && npm run check-tasks
```

### Backend Agent (convex)
```bash
# From convex directory
node ../scripts/check-tasks

# Or navigate to root first
cd .. && npm run check-tasks
```

### Infra Agent (root)
```bash
# Already at root
npm run check-tasks
# or
node scripts/check-tasks
# or
node .claude/commands/check-tasks.js
```

## Implementation Details

The check-tasks wrapper script (`scripts/check-tasks`) automatically:
1. Finds the project root from any subdirectory
2. Locates the main check-tasks.js file
3. Executes it with the correct working directory
4. Passes through any command line arguments

This ensures consistent behavior regardless of where the agent is currently working.

## Troubleshooting

If you get "command not found" errors:
1. Make sure you're using the correct relative path to the scripts directory
2. Verify the wrapper script exists at `scripts/check-tasks`
3. Check that it has execute permissions: `chmod +x scripts/check-tasks`

## Future Improvements

Consider adding:
- Shell alias in agent environments
- PATH modification to make `check-tasks` available globally
- Integration with agent initialization scripts