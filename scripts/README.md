# Scripts Directory

This directory contains utility scripts for the bulk-grillers-pride project.

## Shell Utilities (`shell-utils.sh`)

Contains helpful shell functions for development workflows.

### Installation

Source the script in your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
# Add this line to your shell profile
source /path/to/bulk-grillers-pride/scripts/shell-utils.sh
```

Or source it manually for the current session:

```bash
source ./scripts/shell-utils.sh
```

### Available Functions

#### `wt` - Git Worktree Helper

Creates a new git worktree with a new branch in a `.worktrees` directory.

**Usage:**
```bash
wt <branch-name> [base-branch]
```

**Examples:**
```bash
wt feature-auth          # Creates worktree 'feature-auth' from 'main'
wt hotfix develop        # Creates worktree 'hotfix' from 'develop'
wt experiment feature-x  # Creates worktree 'experiment' from 'feature-x'
```

**Features:**
- Creates `.worktrees` directory at repository root
- Automatically adds `.worktrees` to `.gitignore`
- Creates new branch and worktree
- Automatically changes to the new worktree directory

## Other Scripts

See individual script files for documentation on their specific functionality.