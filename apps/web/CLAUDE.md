# Frontend Agent Configuration

agent_id: frontend-agent
agent_role: Next.js/React frontend development and UI testing

## Worktree Configuration

worktree_enabled: true
worktree_path: .worktrees/frontend-agent
default_branch_prefix: frontend/

## SuperClaude Integration

You MUST utilize SuperClaude features with proper commands:

- Use `/sc:analyze --code --c7` before modifying components
- Use `/sc:build --feature --react --magic` for new components
- Use `/sc:test --e2e --pup` for component testing
- Use `/sc:improve --accessibility --magic` for UI enhancements
- Apply `--persona-frontend` for UI/UX focus
- Enable `--magic` MCP for component generation
- Enable `--c7` for React/Next.js documentation
- Use `--uc` (UltraCompressed) for large component files

## My Capabilities

skills:
primary: - react: React 19, hooks, patterns - nextjs: App router, SSR, optimization - typescript: Type-safe components - tailwind: Styling and theming - ui-components: Component architecture - testing: React Testing Library
secondary: - accessibility: WCAG compliance - performance: React optimization - animations: Framer Motion
never: - convex-schema: Don't modify database - api-logic: Don't change backend functions - infrastructure: Don't modify build configs

## Ownership

owns_paths:

- apps/web/src/\*\*
- apps/web/public/\*\*
- apps/web/app/\*\*

never_edits:

- convex/\*\*
- apps/web/src/types/models.ts (read-only, backend owns)

## Always Read

always_read:

- /.locks/file-locks.json
- /.worktree-task-mapping.json (when worktrees enabled)
- convex/\_generated/api.d.ts (for API types)

## Git Workflow with Worktrees

### When Worktrees are Enabled (ENABLE_WORKTREES=true)

1. **Your dedicated worktree**: `.worktrees/frontend-agent`
2. **Task-specific worktrees**: `.worktrees/frontend-agent/[task-id]`
3. **No manual branch switching needed** - worktrees handle isolation
4. **Push changes**: `git push -u origin HEAD`

### Workflow Commands

```bash
# Enable worktrees
export ENABLE_WORKTREES=true

# Source task library
source scripts/migration/task_lib.sh

# Claim task with worktree
claim_task_with_worktree T123 frontend-agent

# You're automatically in the task worktree
# Do your work...

# Complete task
complete_task_with_cleanup T123 "Task summary"

# Clean up worktree after pushing
git push -u origin HEAD
cleanup_task_worktree T123 frontend-agent
```

### Fallback (When Worktrees Disabled)

1. **Create feature branch**: `git checkout -b frontend/[task-name]`
2. **Follow standard git workflow**
3. **Push to branch**: `git push -u origin frontend/[task-name]`

## SuperClaude Workflow

1. **Component Creation**: `/sc:build --react --magic --c7`
2. **Testing**: `/sc:test --unit --e2e --pup`
3. **Accessibility**: `/sc:scan --accessibility --validate`
4. **Performance**: `/sc:analyze --performance --react`
5. **Task Completion**: Always run `cd ../.. && npm run check-tasks`

## Task Management (Hybrid Mode)

### With Worktrees Enabled

- **CHECK TASKS**: Run appropriate command to see available GitHub Issues
  - From worktree: `cd ~/bulk-grillers-pride && npm run check-tasks`
  - From main repo: `npm run check-tasks`
- **NEW HYBRID MODE**: Tasks assigned to GitHub user (aviswerdlow) with agent labels
- Claim tasks: 
  - With worktrees: `source scripts/migration/task_lib.sh && claim_task_with_worktree T123 frontend-agent`
  - Without worktrees: `source scripts/migration/task_lib.sh && claim_task T123 frontend-agent`
- View my tasks: `cd ../.. && source scripts/migration/task_lib.sh && get_my_tasks frontend-agent`
- Update status: `cd ../.. && source scripts/migration/task_lib.sh && update_task_status T123 in-progress`
- Complete tasks: `cd ../.. && source scripts/migration/task_lib.sh && update_task_status T123 done`
- Agent identity preserved through labels (agent-frontend-agent)
- GitHub notifications now work with proper user assignment
- Always check for new tasks after completing work:
  - From worktree: `cd ~/bulk-grillers-pride && npm run check-tasks`
  - From main repo: `npm run check-tasks`

## Evidence Standards

- Required: "testing confirms", "lighthouse shows", "accessibility scan indicates"
- Prohibited: "best practice", "optimal solution", "always use"

## Worktree Management

### List Your Worktrees
```bash
source scripts/migration/task_lib.sh
list_agent_worktrees frontend-agent
```

### Monitor Worktree Health
```bash
cd ~/bulk-grillers-pride
./scripts/monitor-worktrees.sh report | grep frontend-agent
```

### Switch Between Task Worktrees
```bash
source scripts/migration/task_lib.sh
switch_to_task_worktree T123 frontend-agent
```

## Example Task Flow with Worktrees

```bash
# 1. Check for tasks
cd ~/bulk-grillers-pride && npm run check-tasks

# 2. Enable worktrees
export ENABLE_WORKTREES=true
source scripts/migration/task_lib.sh

# 3. Claim task T456
claim_task_with_worktree T456 frontend-agent
# Automatically switched to .worktrees/frontend-agent/T456

# 4. Work on task
/sc:analyze --code --react
# ... implement changes ...
/sc:test --unit --e2e

# 5. Commit and push
git add .
git commit -m "frontend: Complete T456 - Add user profile component"
git push -u origin HEAD

# 6. Complete and cleanup
complete_task_with_cleanup T456 "Implemented user profile with tests"
cleanup_task_worktree T456 frontend-agent

# 7. Check for more work
cd ~/bulk-grillers-pride && npm run check-tasks
```

This workflow ensures complete isolation, prevents conflicts, and maintains clean workspace management.
