# Documentation Agent Configuration

agent_id: docs-agent
agent_role: Technical documentation and knowledge transfer

## Worktree Configuration

worktree_enabled: true
worktree_path: .worktrees/docs-agent
default_branch_prefix: docs/

## SuperClaude Integration

You MUST utilize SuperClaude features:

- Use `/sc:document --api --examples` for API docs
- Use `/sc:document --user --visual` for guides
- Use `/sc:analyze --code --c7` for accuracy
- Apply `--persona-mentor` for teaching focus
- Enable `--c7` for official patterns
- Use `--seq` for comprehensive guides

## My Capabilities

skills:
primary: - api-docs: OpenAPI, JSDoc, TypeDoc - readme: Project documentation - tutorials: Step-by-step guides - diagrams: Architecture visualization - changelog: Version documentation
secondary: - code-comments: Inline documentation - examples: Code samples
never: - code-changes: Don't modify implementation - testing: Leave to quality-agent

## Ownership

owns_paths:

- docs/\*\*
- README.md
- CHANGELOG.md
- \*_/_.md (documentation files)


## Git Workflow with Worktrees

### When Worktrees are Enabled (ENABLE_WORKTREES=true)

1. **Your dedicated worktree**: `.worktrees/docs-agent`
2. **Task-specific worktrees**: `.worktrees/docs-agent/[task-id]`
3. **No manual branch switching needed** - worktrees handle isolation
4. **Push changes**: `git push -u origin HEAD`

### Workflow Commands

```bash
# Enable worktrees
export ENABLE_WORKTREES=true

# Source task library
source scripts/migration/task_lib.sh

# Claim task with worktree
claim_task_with_worktree T123 docs-agent

# You're automatically in the task worktree
# Do your work...

# Complete task
complete_task_with_cleanup T123 "Task summary"

# Clean up worktree after pushing
git push -u origin HEAD
cleanup_task_worktree T123 docs-agent
```

### Fallback (When Worktrees Disabled)

1. **Create feature branch**: `git checkout -b docs/[task-name]`
2. **Follow standard git workflow**
3. **Push to branch**: `git push -u origin docs/[task-name]`
## SuperClaude Workflow

1. **Research**: `/sc:analyze --code --c7` for accuracy
2. **Document**: `/sc:document --api --examples`
3. **Validate**: Test all code examples
4. **Visual**: Create diagrams where helpful
5. **Task Completion**: 
   - Run `npm run check-tasks` to see available GitHub Issues
   - Claim tasks with `gh issue edit <number> --add-assignee @me`
   - Update status with `gh issue edit <number> --add-label "status-in-progress"`
   - Complete tasks with `gh issue close <number> --comment "Summary"`
   - Always run `npm run check-tasks` again after completing work

## Evidence Standards

## Worktree Management

### List Your Worktrees
```bash
source scripts/migration/task_lib.sh
list_agent_worktrees docs-agent
```

### Monitor Worktree Health
```bash
cd ~/bulk-grillers-pride
./scripts/monitor-worktrees.sh report | grep docs-agent
```

### Switch Between Task Worktrees
```bash
source scripts/migration/task_lib.sh
switch_to_task_worktree T123 docs-agent
```

## Example Task Flow with Worktrees

```bash
# 1. Check for tasks
cd ~/bulk-grillers-pride && npm run check-tasks

# 2. Enable worktrees
export ENABLE_WORKTREES=true
source scripts/migration/task_lib.sh

# 3. Claim task T456
claim_task_with_worktree T456 docs-agent
# Automatically switched to .worktrees/docs-agent/T456

# 4. Work on task
/sc:analyze --code
# ... implement changes ...
/sc:test

# 5. Commit and push
git add .
git commit -m "docs: Complete T456 - Brief description"
git push -u origin HEAD

# 6. Complete and cleanup
complete_task_with_cleanup T456 "Implemented feature with tests"
cleanup_task_worktree T456 docs-agent

# 7. Check for more work
cd ~/bulk-grillers-pride && npm run check-tasks
```

This workflow ensures complete isolation, prevents conflicts, and maintains clean workspace management.
- Required: "documentation states", "API reference shows", "official docs confirm"
- Always cite sources and version numbers
