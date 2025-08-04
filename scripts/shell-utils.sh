#!/bin/bash
# Shell Utilities for bulk-grillers-pride repository
#
# This file contains helpful shell functions for development workflows.
# Source this file in your shell profile or manually:
#   source ./scripts/shell-utils.sh

# Git Worktree Helper Function
#
# USAGE:
#   wt <branch-name> [base-branch]
#
# DESCRIPTION:
#   Creates a new git worktree with a new branch in a `.worktrees` directory.
#   This allows you to work on multiple branches simultaneously in separate directories.
#
# PARAMETERS:
#   branch-name    (required) – Name of the new branch and worktree directory
#   base-branch    (optional) – Base branch to create the new branch from (defaults to 'main')
#
# EXAMPLES:
#   wt feature-auth          # Creates worktree 'feature-auth' from 'main'
#   wt hotfix develop        # Creates worktree 'hotfix' from 'develop'
#   wt experiment feature-x  # Creates worktree 'experiment' from 'feature-x'
#
# BEHAVIOR:
#   – Creates `.worktrees` directory in git repository root if it doesn't exist
#   – Adds `.worktrees` to .gitignore if not already present
#   – Creates new branch and worktree in `.worktrees/<branch-name>`
#   – Automatically changes directory to the new worktree
#
# REQUIREMENTS:
#   – Must be run from within a git repository
#   – Base branch must exist
#
wt() {
  if [ -z "$1" ]; then
    echo "Error: Branch name is required."
    echo "Usage: wt <branch-name> [base-branch]"
    return 1
  fi

  # Base branch (defaults to main)
  base_branch="${2:-main}"

  # Locate repo root
  git_root=$(git rev-parse --show-toplevel 2>/dev/null)
  if [ -z "$git_root" ]; then
    echo "Error: Not a git repository."
    return 1
  fi

  # Paths
  worktree_dir="$git_root/.worktrees"
  worktree_path="$worktree_dir/$1"
  gitignore_path="$git_root/.gitignore"

  # Ensure directory exists
  mkdir -p "$worktree_dir"

  # Ensure .gitignore entry
  if ! grep -qx '\.worktrees' "$gitignore_path" 2>/dev/null; then
    echo ".worktrees" >> "$gitignore_path"
  fi

  # Verify base branch exists
  if ! git rev-parse --verify "$base_branch" >/dev/null 2>&1; then
    echo "Error: Base branch '$base_branch' does not exist."
    return 1
  fi

  # Create worktree
  if git worktree add -b "$1" "$worktree_path" "$base_branch"; then
    echo "Worktree '$1' created from '$base_branch'."
    cd "$worktree_path" || return
  else
    echo "Error: Failed to create worktree '$1'."
    return 1
  fi
}

# Additional utility functions can be added here in the future

# Print available functions when sourced
echo "Shell utilities loaded. Available functions:"
echo "  wt <branch-name> [base-branch] - Create and switch to a git worktree"