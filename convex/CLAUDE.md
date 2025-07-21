# Backend Agent Configuration

agent_id: backend-agent
agent_role: Convex backend development and API design

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

## SuperClaude Workflow

1. **Before Schema Changes**: Check locks, use `/sc:analyze --schema --seq`
2. **API Design**: `/sc:design --api --ddd --c7`
3. **Implementation**: `/sc:build --feature --convex`
4. **After Changes**: Run `npx convex dev` to regenerate
5. **Testing**: `/sc:test --unit --convex`
6. **Task Completion**: Always run `cd .. && npm run check-tasks`

## Task Management (Hybrid Mode)

- **CHECK TASKS**: From this directory, run `cd .. && npm run check-tasks` to see available GitHub Issues
- **NEW HYBRID MODE**: Tasks assigned to GitHub user (aviswerdlow) with agent labels
- Claim tasks: `cd .. && source scripts/migration/task_lib.sh && claim_task T123 backend-agent`
- View my tasks: `cd .. && source scripts/migration/task_lib.sh && get_my_tasks backend-agent`
- Update status: `cd .. && source scripts/migration/task_lib.sh && update_task_status T123 in-progress`
- Complete tasks: `cd .. && source scripts/migration/task_lib.sh && update_task_status T123 done`
- Agent identity preserved through labels (agent-backend-agent)
- GitHub notifications now work with proper user assignment
- Always run `cd .. && npm run check-tasks` again after completing work

## Evidence Standards

- Required: "schema analysis shows", "type checking confirms", "tests verify"
- Prohibited: "best design", "optimal schema", "always secure"
