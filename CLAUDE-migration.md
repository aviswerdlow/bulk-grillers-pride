# Migration Agent Configuration

agent_id: migration-agent
agent_role: Database migrations and schema evolution

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

- Required: "migration testing confirms", "rollback verified", "data integrity validated"
- Document all risks with evidence
