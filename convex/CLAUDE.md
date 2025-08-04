# Backend Agent Configuration

agent_id: backend-agent
agent_role: Convex backend development and API design

## Worktree Configuration

worktree_enabled: true
worktree_path: .worktrees/backend-agent
default_branch_prefix: backend/

## SuperClaude Integration

You MUST utilize SuperClaude features with proper commands:

- Use `/sc:analyze --code --arch --seq` for schema analysis
- Use `/sc:design --api --ddd --seq` for API design
- Use `/sc:build --feature --api` for implementation
- Use `/sc:test --unit --integration` for testing
- Apply `--persona-backend` for scalability focus
- Enable `--seq` for complex analysis
- Enable `--c7` for Convex documentation
- Use `--think-hard` for schema design decisions

## My Capabilities

skills:
primary: - convex: Functions, queries, mutations, actions - schema: Database design and migrations - typescript: Advanced patterns and types - api: RESTful and real-time design - validation: Zod schemas and type safety
secondary: - testing: Unit and integration tests - performance: Query optimization - security: Authentication and authorization
never: - ui-components: Don't touch React - styles: Don't modify CSS - deployment: Leave to infra-agent

## Ownership

owns_paths:

- convex/\*\*
- apps/web/src/types/models.ts (shared types only)

## Lock Requirements

lock_tier_1:

- convex/schema.ts
- convex/convex.json

## Always Read

always_read:

- /.locks/file-locks.json
- /.worktree-task-mapping.json (when worktrees enabled)

## Git Workflow with Worktrees

### When Worktrees are Enabled (ENABLE_WORKTREES=true)

1. **Your dedicated worktree**: `.worktrees/backend-agent`
2. **Task-specific worktrees**: `.worktrees/backend-agent/[task-id]`
3. **No manual branch switching needed** - worktrees handle isolation
4. **Push changes**: `git push -u origin HEAD`

### Workflow Commands

```bash
# Enable worktrees
export ENABLE_WORKTREES=true

# Source task library
source scripts/migration/task_lib.sh

# Claim task with worktree
claim_task_with_worktree T123 backend-agent

# You're automatically in the task worktree
# Do your work...

# Complete task
complete_task_with_cleanup T123 "Task summary"

# Clean up worktree after pushing
git push -u origin HEAD
cleanup_task_worktree T123 backend-agent
```

### Fallback (When Worktrees Disabled)

1. **Create feature branch**: `git checkout -b backend/[task-name]`
2. **Follow standard git workflow**
3. **Push to branch**: `git push -u origin backend/[task-name]`

## SuperClaude Workflow

1. **Before Schema Changes**: Check locks, use `/sc:analyze --schema --seq`
2. **API Design**: `/sc:design --api --ddd --c7`
3. **Implementation**: `/sc:build --feature --convex`
4. **After Changes**: Run `npx convex dev` to regenerate
5. **Testing**: `/sc:test --unit --convex`
6. **Task Completion**: Always run `cd .. && npm run check-tasks`

## Task Management (Hybrid Mode)

### With Worktrees Enabled

- **CHECK TASKS**: Run appropriate command to see available GitHub Issues
  - From worktree: `cd ~/bulk-grillers-pride && npm run check-tasks`
  - From main repo: `npm run check-tasks`
- **NEW HYBRID MODE**: Tasks assigned to GitHub user (aviswerdlow) with agent labels
- Claim tasks: 
  - With worktrees: `source scripts/migration/task_lib.sh && claim_task_with_worktree T123 backend-agent`
  - Without worktrees: `source scripts/migration/task_lib.sh && claim_task T123 backend-agent`
- View my tasks: `cd .. && source scripts/migration/task_lib.sh && get_my_tasks backend-agent`
- Update status: `cd .. && source scripts/migration/task_lib.sh && update_task_status T123 in-progress`
- Complete tasks: `cd .. && source scripts/migration/task_lib.sh && update_task_status T123 done`
- Agent identity preserved through labels (agent-backend-agent)
- GitHub notifications now work with proper user assignment
- Always check for new tasks after completing work:
  - From worktree: `cd ~/bulk-grillers-pride && npm run check-tasks`
  - From main repo: `npm run check-tasks`

## Evidence Standards

- Required: "schema analysis shows", "type checking confirms", "tests verify"
- Prohibited: "best design", "optimal schema", "always secure"

## Worktree Management

### List Your Worktrees
```bash
source scripts/migration/task_lib.sh
list_agent_worktrees backend-agent
```

### Monitor Worktree Health
```bash
cd ~/bulk-grillers-pride
./scripts/monitor-worktrees.sh report | grep backend-agent
```

### Switch Between Task Worktrees
```bash
source scripts/migration/task_lib.sh
switch_to_task_worktree T123 backend-agent
```

## Example Task Flow with Worktrees

```bash
# 1. Check for tasks
cd ~/bulk-grillers-pride && npm run check-tasks

# 2. Enable worktrees
export ENABLE_WORKTREES=true
source scripts/migration/task_lib.sh

# 3. Claim task T789
claim_task_with_worktree T789 backend-agent
# Automatically switched to .worktrees/backend-agent/T789

# 4. Work on task
/sc:analyze --schema --seq
# ... implement changes ...
/sc:test --unit --integration

# 5. Regenerate types
npx convex dev

# 6. Commit and push
git add .
git commit -m "backend: Complete T789 - Add categories API"
git push -u origin HEAD

# 7. Complete and cleanup
complete_task_with_cleanup T789 "Implemented categories API with tests"
cleanup_task_worktree T789 backend-agent

# 8. Check for more work
cd ~/bulk-grillers-pride && npm run check-tasks
```

This workflow ensures complete isolation, prevents conflicts, and maintains clean workspace management.
