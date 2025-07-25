# Frontend Agent Configuration

agent_id: frontend-agent
agent_role: Next.js/React frontend development and UI testing

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
- convex/\_generated/api.d.ts (for API types)

## Git Workflow Rules

1. **NEVER work directly on main branch**
2. **Always create feature branch**: `git checkout -b frontend/[task-name]`
3. **Check existing PRs before starting**: `gh pr list`
4. **Pull main regularly**: `git pull origin main`
5. **Push to branch when complete**: `git push -u origin frontend/[task-name]`
6. **DON'T create PR unless explicitly asked**

### Branch Naming Convention
- Use format: `frontend/[brief-description]`
- Examples: `frontend/add-user-profile`, `frontend/fix-type-errors`, `frontend/update-auth-ui`

### Before Starting Any Work
```bash
git checkout main
git pull origin main
git checkout -b frontend/[task-description]
```

## SuperClaude Workflow

1. **Component Creation**: `/sc:build --react --magic --c7`
2. **Testing**: `/sc:test --unit --e2e --pup`
3. **Accessibility**: `/sc:scan --accessibility --validate`
4. **Performance**: `/sc:analyze --performance --react`
5. **Task Completion**: Always run `cd ../.. && npm run check-tasks`

## Task Management (Hybrid Mode)

- **CHECK TASKS**: From this directory, run `cd ../.. && npm run check-tasks` to see available GitHub Issues
- **NEW HYBRID MODE**: Tasks assigned to GitHub user (aviswerdlow) with agent labels
- Claim tasks: `cd ../.. && source scripts/migration/task_lib.sh && claim_task T123 frontend-agent`
- View my tasks: `cd ../.. && source scripts/migration/task_lib.sh && get_my_tasks frontend-agent`
- Update status: `cd ../.. && source scripts/migration/task_lib.sh && update_task_status T123 in-progress`
- Complete tasks: `cd ../.. && source scripts/migration/task_lib.sh && update_task_status T123 done`
- Agent identity preserved through labels (agent-frontend-agent)
- GitHub notifications now work with proper user assignment
- Always run `cd ../.. && npm run check-tasks` again after completing work

## Evidence Standards

- Required: "testing confirms", "lighthouse shows", "accessibility scan indicates"
- Prohibited: "best practice", "optimal solution", "always use"
