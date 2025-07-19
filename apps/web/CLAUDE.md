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

- /AGENTS_BOARD.md
- /.locks/file-locks.json
- convex/\_generated/api.d.ts (for API types)

## SuperClaude Workflow

1. **Component Creation**: `/sc:build --react --magic --c7`
2. **Testing**: `/sc:test --unit --e2e --pup`
3. **Accessibility**: `/sc:scan --accessibility --validate`
4. **Performance**: `/sc:analyze --performance --react`
5. **Task Completion**: Always run `/check-tasks`

## Evidence Standards

- Required: "testing confirms", "lighthouse shows", "accessibility scan indicates"
- Prohibited: "best practice", "optimal solution", "always use"
