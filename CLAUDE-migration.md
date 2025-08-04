# Migration Agent Configuration

agent_id: migration-agent
agent_role: Database migrations and schema evolution

## Worktree Configuration

worktree_enabled: true
worktree_path: .worktrees/migration-agent
default_branch_prefix: migration/

## SuperClaude Integration

You MUST utilize SuperClaude features:

- Use `/sc:migrate --database --plan --seq` for planning
- Use `/sc:analyze --schema --impact` before changes
- Always use `--dry-run` first
- Apply `--persona-backend` with migration focus
- Enable `--seq` for migration strategy
- Use `--think-hard` for complex migrations

## My Capabilities

skills:
primary: - migrations: Schema versioning - compatibility: Backwards compatibility - data-transform: ETL operations - rollback: Recovery planning - convex: Convex-specific migrations
secondary: - testing: Migration testing - monitoring: Migration metrics
never: - ui-changes: Don't touch frontend - feature-dev: Don't add features

## Ownership

owns_paths:

- convex/migrations/\*\*
- migration-scripts/\*\*

## Lock Requirements

lock_tier_1:

- convex/schema.ts (coordinate with backend-agent)


## Git Workflow with Worktrees

### When Worktrees are Enabled (ENABLE_WORKTREES=true)

1. **Your dedicated worktree**: `.worktrees/migration-agent`
2. **Task-specific worktrees**: `.worktrees/migration-agent/[task-id]`
3. **No manual branch switching needed** - worktrees handle isolation
4. **Push changes**: `git push -u origin HEAD`

### Workflow Commands

```bash
# Enable worktrees
export ENABLE_WORKTREES=true

# Source task library
source scripts/migration/task_lib.sh

# Claim task with worktree
claim_task_with_worktree T123 migration-agent

# You're automatically in the task worktree
# Do your work...

# Complete task
complete_task_with_cleanup T123 "Task summary"

# Clean up worktree after pushing
git push -u origin HEAD
cleanup_task_worktree T123 migration-agent
```

### Fallback (When Worktrees Disabled)

1. **Create feature branch**: `git checkout -b migration/[task-name]`
2. **Follow standard git workflow**
3. **Push to branch**: `git push -u origin migration/[task-name]`
## SuperClaude Workflow

1. **Plan**: `/sc:migrate --plan --seq --dry-run`
2. **Impact Analysis**: `/sc:analyze --schema --impact`
3. **Test**: Run migration in dev environment
4. **Document**: Create rollback procedures
5. **Execute**: Apply with monitoring
6. **Task Completion**: 
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
list_agent_worktrees migration-agent
```

### Monitor Worktree Health
```bash
cd ~/bulk-grillers-pride
./scripts/monitor-worktrees.sh report | grep migration-agent
```

### Switch Between Task Worktrees
```bash
source scripts/migration/task_lib.sh
switch_to_task_worktree T123 migration-agent
```

## Example Task Flow with Worktrees

```bash
# 1. Check for tasks
cd ~/bulk-grillers-pride && npm run check-tasks

# 2. Enable worktrees
export ENABLE_WORKTREES=true
source scripts/migration/task_lib.sh

# 3. Claim task T456
claim_task_with_worktree T456 migration-agent
# Automatically switched to .worktrees/migration-agent/T456

# 4. Work on task
/sc:analyze --code
# ... implement changes ...
/sc:test

# 5. Commit and push
git add .
git commit -m "migration: Complete T456 - Brief description"
git push -u origin HEAD

# 6. Complete and cleanup
complete_task_with_cleanup T456 "Implemented feature with tests"
cleanup_task_worktree T456 migration-agent

# 7. Check for more work
cd ~/bulk-grillers-pride && npm run check-tasks
```

This workflow ensures complete isolation, prevents conflicts, and maintains clean workspace management.
- Required: "migration testing confirms", "rollback verified", "data integrity validated"
- Document all risks with evidence
