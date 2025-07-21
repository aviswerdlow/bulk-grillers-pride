# Launch Multi-Agent System

## Phase 2: Launch the Multi-Agent System (8 Agents Total)

### Terminal 1: Frontend Agent

```bash
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/apps/web
claude --dangerously-skip-permissions
```

Then paste:

```
You are the frontend-agent. Read your CLAUDE.md file located at apps/web/CLAUDE.md to understand your role and capabilities.
You are using Super Claude with --persona-frontend for UI/UX focus, accessibility, and React/TypeScript components.
Enable --magic MCP for UI component generation and --c7 for React documentation.
Use evidence-based development practices and UltraCompressed mode (--uc) for large files.
Always use TypeScript with proper type safety and run tests with --pup for E2E validation.
Run npm run check-tasks to see what work is appropriate for you.
```

### Terminal 2: Backend Agent

```bash
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/convex
claude --dangerously-skip-permissions
```

Then paste:

```
You are the backend-agent. Read your CLAUDE.md file located at convex/CLAUDE.md to understand your role and capabilities.
You are using Super Claude with --persona-backend for API design, scalability, and reliability.
Enable --c7 for Convex documentation and --seq for complex architectural analysis.
Use evidence-based development with required language (may|could|potentially|measured).
Focus on TypeScript type safety, Convex best practices, and always validate schema changes.
Run npm run check-tasks to see what work is appropriate for you.
```

### Terminal 3: Infrastructure Agent

```bash
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride
claude --dangerously-skip-permissions
```

Then paste:

```
You are the infra-agent. Read your CLAUDE.md file located at the root directory (CLAUDE.md) to understand your role and capabilities.
You are using Super Claude with --persona-architect for system design and build tooling.
Enable --seq for complex build analysis and --c7 for tooling documentation.
Apply git safety workflows (status→branch→fetch→pull) and use --dry-run for safety.
Focus on TypeScript configuration, Jest setup, and Turbo monorepo optimization.
Run npm run check-tasks to see what work is appropriate for you.
```

### Terminal 4: Quality Agent

```bash
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride
claude --dangerously-skip-permissions
```

Then paste:

```
You are the quality-agent. Read your CLAUDE-quality.md file located at the root directory to understand your role and capabilities.
You are using Super Claude with --persona-qa for testing and quality assurance.
Enable --pup for E2E testing, --seq for root cause analysis, and --coverage flags.
Your skills include: testing frameworks, code coverage analysis, performance profiling, security scanning, and accessibility audits.
You work across all codebases but don't modify business logic directly - you ensure quality standards.
Apply OWASP Top 10 security patterns and use /scan --security --owasp for audits.
Use evidence-based language when reporting issues (e.g., "testing confirms", "metrics show").
Run npm run check-tasks to see quality-related work.
```

### Terminal 5: Documentation Agent

```bash
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride
claude --dangerously-skip-permissions
```

Then paste:

```
You are the docs-agent. Read your CLAUDE-docs.md file located at the root directory to understand your role and capabilities.
You are using Super Claude with --persona-mentor for teaching and knowledge transfer.
Enable --c7 for official documentation patterns and --seq for comprehensive guides.
Your skills include: API documentation, README files, code comments, architecture diagrams, and user guides.
You can work in any directory but focus on documentation files and comments.
Use evidence-based language and always cite official sources (e.g., "documentation states", "API reference shows").
Follow documentation best practices and ensure all examples are tested and accurate.
Run npm run check-tasks to see documentation tasks.
```

### Terminal 6: Migration Agent

```bash
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride
claude --dangerously-skip-permissions
```

Then paste:

```
You are the migration-agent. Read your CLAUDE-migration.md file located at the root directory to understand your role and capabilities.
You are using Super Claude with --persona-backend and focus on backwards compatibility.
Enable --seq for migration planning and --c7 for database documentation.
Your skills include: database migrations, data transformations, backwards compatibility, and zero-downtime deployments.
You primarily work with convex schema files and migration scripts.
Always use --dry-run first and create rollback plans for all migrations.
Document migration steps thoroughly and validate data integrity at each stage.
Use evidence-based risk assessment (e.g., "testing confirms rollback works").
Run npm run check-tasks to see migration-related tasks.
```

### Terminal 7: AI Agent

```bash
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride
claude --dangerously-skip-permissions
```

Then paste:

```
You are the ai-agent. Read your CLAUDE-ai.md file located at the root directory to understand your role and capabilities.
You are using SuperClaude with --persona-analyzer for AI system investigation and optimization.
Enable --seq for complex AI workflows and --c7 for AI/ML library documentation.
Your skills include: CrewAI, LangChain, OpenAI, Anthropic, Gemini, prompt engineering, and ML operations.
Focus on AI system architecture, multi-provider support, token optimization, and cost efficiency.
Use evidence-based language (e.g., "benchmarks show", "testing indicates", "measured at").
Apply --ultrathink for critical migration decisions and --uc for large configurations.
Run npm run check-tasks to see AI/ML-related tasks.
```

### Terminal 8: Orchestrator (Your Main Interface)

```bash
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride
claude --dangerously-skip-permissions
```

Then paste:

```
You are the orchestrator. Read your ORCHESTRATOR.md file located at the root directory to understand your role.
You are using SuperClaude with --persona-architect for system-wide planning.
You coordinate work between all agents: frontend-agent, backend-agent, infra-agent, quality-agent, docs-agent, migration-agent, and ai-agent.
Use /sc:analyze --arch --seq for complex feature decomposition.
Apply evidence-based task assignment based on agent skills and current load.
Monitor agent progress and ensure they're using appropriate SuperClaude personas and MCP servers.
Enforce evidence-based development standards across all agents.
Show the current task board and agent status.
```

## Phase 3: Using the System

### Specialized Agent Capabilities

**Quality Agent** handles:

- Code review and PR feedback
- Test coverage analysis
- Performance profiling
- Security vulnerability scanning
- Accessibility audits
- Code smell detection

**Documentation Agent** handles:

- API documentation generation
- README updates
- Code comment improvements
- Architecture diagrams
- User guides and tutorials
- Changelog maintenance

**Migration Agent** handles:

- Database schema migrations
- Data transformation scripts
- Backwards compatibility checks
- Zero-downtime deployment plans
- Version upgrade paths
- Legacy system transitions

**AI Agent** handles:

- CrewAI multi-agent orchestration
- LangChain to CrewAI migration
- Multi-provider AI integration (OpenAI, Anthropic, Gemini)
- Prompt engineering and optimization
- Token usage and cost optimization
- AI system performance monitoring

### With the Orchestrator (Terminal 8):

```
"I want to add authentication to the app"

Orchestrator will:
1. Break this into subtasks
2. Assign to appropriate agents
3. Coordinate via GitHub Issues
```

### In Each Agent Terminal:

Periodically run:

```
npm run check-tasks
```

Agents will:

1. Find tasks assigned to them (with skill matching)
2. Verify skill match using Super Claude patterns
3. Start working on appropriate tasks with their persona
4. Use /complete-task when done
5. **Always run npm run check-tasks again to continue workflow**

This creates a continuous work loop where agents automatically pick up new tasks as they become available.

## Example Workflow

**You → Orchestrator**: "Set up testing infrastructure"

**Orchestrator**:

```
I'll assign this to infra-agent since it requires jest and npm skills.
/assign-task T1 infra-agent
Task assigned. Make sure infra-agent is running and checks for tasks.
```

**You → Infra Agent Terminal**:

```
npm run check-tasks
```

**Infra Agent**:

```
Found task assigned to me: T1 - Setup Jest testing framework
This matches my skills (jest, npm). Starting work now...
[Does the work]
/complete-task T1 "Jest configured with TypeScript support"
```

## Common Workflows

### 1. Starting Fresh Each Day

```bash
# Quick launch all agents (copy each line to a different terminal)
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/apps/web && claude --dangerously-skip-permissions
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/convex && claude --dangerously-skip-permissions
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude --dangerously-skip-permissions
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude --dangerously-skip-permissions
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude --dangerously-skip-permissions
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude --dangerously-skip-permissions
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude --dangerously-skip-permissions
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude --dangerously-skip-permissions

# Then in each terminal, paste the appropriate agent initialization with SuperClaude configuration
# Each agent will automatically enable their specialized personas and MCP servers
```

### 2. Adding a New Feature

**Orchestrator Terminal**:

```
Add a shopping cart feature with:
- Product selection UI
- Cart state in Convex
- Checkout flow
- Tests for everything
- Full documentation
- Migration plan for existing data
```

**Orchestrator responds**:

```
I'll break this down across all agents:
- T10: Design cart schema (backend-agent)
- T11: Plan data migration strategy (migration-agent)
- T12: Implement cart mutations (backend-agent)
- T13: Create cart UI component (frontend-agent)
- T14: Add cart unit tests (quality-agent)
- T15: Performance test cart operations (quality-agent)
- T16: Document cart API (docs-agent)
- T17: Write user guide for cart (docs-agent)

/assign-task T10 backend-agent
/assign-task T11 migration-agent
/assign-task T12 backend-agent
/assign-task T13 frontend-agent
/assign-task T14 quality-agent
/assign-task T15 quality-agent
/assign-task T16 docs-agent
/assign-task T17 docs-agent
```

### 3. Checking System Status

**Any Terminal**:

```
/agent-status
```

Shows:

- Active locks
- Tasks in progress
- Agent locations
- Recent commits

### 4. Quick Task Check Loop

In each agent terminal, run this periodically:

```
npm run check-tasks
```

If work is found:

```
/claim-task T10
# ... do the work ...
/complete-task T10 "Cart schema implemented with user and product relations"
npm run check-tasks  # Always check for new tasks after completing one
```

When completing tasks, agents should always run npm run check-tasks again to:

- Pick up any newly unblocked tasks
- Continue working if more tasks are available
- Maintain workflow momentum

## Example: All Agents Working Together

**You → Orchestrator**: "We need to upgrade our authentication system to support OAuth"

**Orchestrator (using /analyze --arch --seq)**:

```
Breaking down OAuth implementation into specialized tasks:
```

**Orchestrator assigns**:

1. **backend-agent**: Design new OAuth schema using --persona-backend --c7 for Convex patterns
2. **migration-agent**: Plan migration from current auth to OAuth with --dry-run validation
3. **frontend-agent**: Build OAuth login UI using --persona-frontend --magic for components
4. **quality-agent**: Security review using /scan --security --owasp
5. **docs-agent**: Document OAuth integration guide using --persona-mentor --c7
6. **infra-agent**: Set up OAuth provider configs with --persona-architect

Each agent works in parallel using Super Claude personas and MCP servers, coordinating through the task board when dependencies exist. All agents run npm run check-tasks after completing work to maintain momentum.

## Tips & Tricks

### Super Claude Integration

Each agent leverages Super Claude's specialized capabilities:

- **Frontend**: --magic MCP for UI components, --c7 for React docs
- **Backend**: --seq for architecture, --c7 for API patterns
- **Quality**: --pup for E2E testing, --scan for security
- **Docs**: --c7 for official patterns, evidence-based language
- **Migration**: --seq for planning, --dry-run for safety
- **Infra**: --ultrathink for complex systems, git safety workflows

All agents use:

- **Evidence-based language**: may|could|potentially|measured (never "best" or "optimal")
- **UltraCompressed mode (--uc)**: For efficiency with large codebases
- **Task completion workflow**: Always run npm run check-tasks after completing work
- **Research-first methodology**: Context7 for external libraries, official sources required
- **Git safety**: status→branch→fetch→pull workflow

### 1. **Terminal Organization**

Arrange your terminals in a grid (use multiple desktops/screens if needed):

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Frontend    │   Backend    │    Infra     │      AI      │
│ (apps/web)   │  (convex)    │   (root)     │   (root)     │
├──────────────┼──────────────┼──────────────┼──────────────┤
│  Quality     │    Docs      │  Migration   │    (empty)   │
│  (root)      │   (root)     │   (root)     │              │
├──────────────┴──────────────┴──────────────┴──────────────┤
│                    Orchestrator (root)                     │
└────────────────────────────────────────────────────────────┘
```

### 2. **Quick Commands Cheat Sheet**

```bash
# For all 6 worker agents
npm run check-tasks         # What can I work on?
/claim-task T1       # Start this task
/complete-task T1    # I'm done with this
npm run check-tasks         # Check for more work (always run after completing)

# Super Claude commands agents use
/analyze --code --c7      # Research with documentation
/build --feature --magic  # Build with UI components
/scan --security --owasp  # Security audit
/test --e2e --pup        # E2E testing
/improve --quality --uc   # Refactor with compression

# For orchestrator only
/assign-task T1 frontend-agent   # Assign specific task
/assign-task T2 quality-agent    # Assign to quality
/smart-assign                    # Auto-assign all tasks to best agents
/agent-status                    # System overview of all 7 agents
/analyze --arch --seq            # Complex feature decomposition
```

### 3. **Skill-Based Task Routing with SuperClaude**

Tasks automatically route to the right agent with appropriate tools:

- `tailwind`, `react` → frontend-agent (uses --magic, --c7)
- `convex`, `schema` → backend-agent (uses --seq, --c7)
- `jest`, `npm` → infra-agent (uses --seq, --dry-run)
- `testing`, `coverage`, `security` → quality-agent (uses --pup, --scan)
- `documentation`, `readme`, `comments` → docs-agent (uses --c7, --persona-mentor)
- `migration`, `backwards-compatibility` → migration-agent (uses --seq, --dry-run)
- `crewai`, `langchain`, `openai`, `ai`, `ml` → ai-agent (uses --seq, --c7, --ultrathink)

Super Claude auto-activates based on keywords:

- "bug/error" → analyzer persona
- "optimize" → performance persona
- "secure/auth" → security persona
- "refactor" → refactorer persona

### 4. **Handling Dependencies**

If a task is blocked:

```
Task T2 depends on T1
- T1 must be completed first
- Once T1 is done, T2 automatically becomes "ready"
- The right agent will see it on next npm run check-tasks
```

## Quick Reference Card

```bash
# Terminal 1: Frontend
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/apps/web && claude --dangerously-skip-permissions

# Terminal 2: Backend
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/convex && claude --dangerously-skip-permissions

# Terminal 3: Infra
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude --dangerously-skip-permissions

# Terminal 4: Quality
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude --dangerously-skip-permissions

# Terminal 5: Docs
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude --dangerously-skip-permissions

# Terminal 6: Migration
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude --dangerously-skip-permissions

# Terminal 7: AI
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude --dangerously-skip-permissions

# Terminal 8: Orchestrator
cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude --dangerously-skip-permissions
```

Then initialize each with their specific prompt from above!

## Continuous Workflow Pattern

Each agent follows this workflow loop:

```
1. npm run check-tasks → Find appropriate work
2. /claim-task T1 → Start the task
3. Work using Super Claude personas and tools
4. /complete-task T1 "summary" → Mark done
5. npm run check-tasks → Check for more work (ALWAYS)
6. Loop back to step 2 if work available
```

This ensures:

- No agent sits idle when work is available
- Dependencies automatically unblock
- Tasks flow smoothly between agents
- Maximum parallel efficiency

## Super Claude Benefits

With Super Claude integration, your multi-agent system gains:

- **Evidence-based development**: Required language patterns prevent overconfident claims
- **Research-first methodology**: Context7 ensures accurate library usage
- **Intelligent compression**: UltraCompressed mode handles large codebases efficiently
- **Specialized expertise**: Each agent uses targeted personas for their domain
- **Quality gates**: Built-in security scanning, testing, and validation
- **Continuous improvement**: Agents always check for new work after task completion

**Remember**: Each agent uses Super Claude personas and runs npm run check-tasks after completing work to maintain continuous workflow.

## Agent Configuration File Locations

For reference, each agent's CLAUDE.md file is located at:

- **Frontend Agent**: `apps/web/CLAUDE.md`
- **Backend Agent**: `convex/CLAUDE.md`
- **Infrastructure Agent**: `CLAUDE.md` (root)
- **Quality Agent**: `CLAUDE-quality.md` (root)
- **Documentation Agent**: `CLAUDE-docs.md` (root)
- **Migration Agent**: `CLAUDE-migration.md` (root)
- **AI Agent**: `CLAUDE-ai.md` (root)
- **Orchestrator**: `ORCHESTRATOR.md` (root)
