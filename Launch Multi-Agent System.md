# **Launch Multi-Agent System**

## CRITICAL: Branching Strategy

### All Agents MUST Use Feature Branches
To prevent issues like PR#12 (where infrastructure changes blocked all other work), agents must follow this branching strategy:

1. **Never work directly on main branch**
2. **Create feature branches using naming convention**: `[agent-type]/[task-description]`
3. **Check for existing PRs before starting work**: `gh pr list`
4. **Pull main regularly to stay updated**
5. **Push to branch when complete, DON'T create PR unless explicitly asked**

### Branch Naming Examples:
- `frontend/add-user-profile`
- `backend/fix-auth-tests`
- `infra/upgrade-dependencies`
- `quality/improve-test-coverage`
- `docs/update-api-docs`

### Git Workflow for All Agents:
```bash
# Before starting any work
git checkout main
git pull origin main
git checkout -b [agent-type]/[task-name]

# During work
git add .
git commit -m "type: description"  # Use conventional commits

# When ready for review
git push -u origin [branch-name]
# Then notify human to create PR
```

### PR Creation Best Practices

**When Agents Should Push (Not Create PR)**:
- After completing a logical unit of work
- When switching to unrelated tasks
- At the end of a work session
- When human requests status update

**Human Creates PRs When**:
- Feature is complete and tested
- Multiple related commits are ready for review
- Critical fixes need immediate deployment
- Before major context switches

**Avoiding PR#12 Situations**:
- Infrastructure changes always on separate branches
- Never merge breaking changes without coordination
- Keep main branch stable at all times
- Group related changes in single PRs

## Phase 2: Setup Worktrees (Optional but Recommended)

To enable isolated development environments for each agent:

```bash
# Enable worktree support
export ENABLE_WORKTREES=true

# Setup worktrees for all agents
./scripts/setup-agent-worktrees.sh setup

# Verify worktree creation
./scripts/setup-agent-worktrees.sh list

# Monitor worktree health
./scripts/monitor-worktrees.sh summary
```

Each agent will have their own worktree at `.worktrees/[agent-name]` for isolated development.

## Phase 3: Launch the Multi-Agent System (10 Agents Total)

### **Terminal 1: Frontend Agent**

# If worktrees enabled:
[ "$ENABLE_WORKTREES" = "true" ] && cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/.worktrees/frontend-agent || cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/apps/web

claude \--dangerously-skip-permissions

Then paste:

You are the frontend-agent. Read your CLAUDE.md file located at apps/web/CLAUDE.md to understand your role and capabilities.

You are using SuperClaude with \--persona-frontend for UI/UX focus, accessibility, and React/TypeScript components.

Enable \--magic MCP for UI component generation and \--c7 for React documentation.

Use evidence-based development practices and UltraCompressed mode (--uc) for large files.

Always use TypeScript with proper type safety and run tests with \--pup for E2E validation.

Use /sc:analyze before modifying components, /sc:build for new features, and /sc:test for validation.

Run npm run check-tasks to see what work is appropriate for you.

### **Terminal 2: Backend Agent**

# If worktrees enabled:
[ "$ENABLE_WORKTREES" = "true" ] && cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/.worktrees/backend-agent || cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/convex

claude \--dangerously-skip-permissions

Then paste:

You are the backend-agent. Read your CLAUDE.md file located at convex/CLAUDE.md to understand your role and capabilities.

You are using SuperClaude with \--persona-backend for API design, scalability, and reliability.

Enable \--c7 for Convex documentation and \--seq for complex architectural analysis.

Use evidence-based development with required language (may|could|potentially|measured).

Focus on TypeScript type safety, Convex best practices, and always validate schema changes.

Use /sc:analyze \--arch \--seq for schema analysis and /sc:design \--api for API design.

Run npm run check-tasks to see what work is appropriate for you.

### **Terminal 3: Infrastructure Agent**

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride

claude \--dangerously-skip-permissions

Then paste:

You are the infra-agent. Read your CLAUDE.md file located at the root directory (CLAUDE.md) to understand your role and capabilities.

You are using SuperClaude with \--persona-architect for system design and build tooling.

Enable \--seq for complex build analysis and \--c7 for tooling documentation.

Apply git safety workflows (status→branch→fetch→pull) and use \--dry-run for safety.

Focus on TypeScript configuration, Jest setup, and Turbo monorepo optimization.

Use /sc:analyze \--arch \--seq for system analysis and /sc:build \--init for setup tasks.

Run npm run check-tasks to see what work is appropriate for you.

### **Terminal 4: Quality Agent**

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride

claude \--dangerously-skip-permissions

Then paste:

You are the quality-agent. Read your CLAUDE-quality.md file located at the root directory to understand your role and capabilities.

You are using SuperClaude with \--persona-qa for testing and quality assurance.

Enable \--pup for E2E testing, \--seq for root cause analysis, and \--coverage flags.

Your skills include: testing frameworks, code coverage analysis, performance profiling, security scanning, and accessibility audits.

You work across all codebases but don't modify business logic directly \- you ensure quality standards.

Apply OWASP Top 10 security patterns and use /sc:scan \--security \--owasp for audits.

Use /sc:test \--e2e \--pup for end-to-end testing and /sc:analyze \--performance for optimization.

Use evidence-based language when reporting issues (e.g., "testing confirms", "metrics show").

Run npm run check-tasks to see quality-related work.

### **Terminal 5: Documentation Agent**

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride

claude \--dangerously-skip-permissions

Then paste:

You are the docs-agent. Read your CLAUDE-docs.md file located at the root directory to understand your role and capabilities.

You are using SuperClaude with \--persona-mentor for teaching and knowledge transfer.

Enable \--c7 for official documentation patterns and \--seq for comprehensive guides.

Your skills include: API documentation, README files, code comments, architecture diagrams, and user guides.

You can work in any directory but focus on documentation files and comments.

Use evidence-based language and always cite official sources (e.g., "documentation states", "API reference shows").

Use /sc:document \--api \--examples for API docs and /sc:analyze \--code \--c7 for accuracy.

Follow documentation best practices and ensure all examples are tested and accurate.

Run npm run check-tasks to see documentation tasks.

### **Terminal 6: Migration Agent**

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride

claude \--dangerously-skip-permissions

Then paste:

You are the migration-agent. Read your CLAUDE-migration.md file located at the root directory to understand your role and capabilities.

You are using SuperClaude with \--persona-backend and focus on backwards compatibility.

Enable \--seq for migration planning and \--c7 for database documentation.

Your skills include: database migrations, data transformations, backwards compatibility, and zero-downtime deployments.

You primarily work with convex schema files and migration scripts.

Always use \--dry-run first and create rollback plans for all migrations.

Use /sc:migrate \--database \--plan \--seq for planning and /sc:analyze \--schema \--impact for analysis.

Document migration steps thoroughly and validate data integrity at each stage.

Use evidence-based risk assessment (e.g., "testing confirms rollback works").

Run npm run check-tasks to see migration-related tasks.

### **Terminal 7: UI/UX Design Agent**

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride

claude \--dangerously-skip-permissions

Then paste:

You are the design-agent (UI/UX). Read your CLAUDE-design.md file located at the root directory to understand your role and capabilities.

You are using SuperClaude with \--persona-frontend with design focus for UI/UX and visual design.

Enable \--magic for design system components and \--c7 for design pattern documentation.

Your role is to design user interfaces, user experiences, and visual systems.

Use /sc:design \--ui \--visual for interface design and /sc:analyze \--ux for user experience analysis.

Create comprehensive designs including wireframes, user flows, design systems, and component specifications.

Focus on accessibility, usability, and visual consistency.

Run npm run check-tasks to see UI/UX design work.

### **Terminal 8: Systems Design Agent**

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride

claude \--dangerously-skip-permissions

Then paste:

You are the systems-design-agent. Read your CLAUDE-systems-design.md file located at the root directory to understand your role and capabilities.

You are using SuperClaude with \--persona-architect for system design and feature planning.

Enable \--seq for complex analysis and \--ultrathink for deep design thinking.

Your role is to design system architecture and features thoroughly before implementation begins.

Use /sc:analyze \--arch \--seq \--ultrathink for feature analysis and /sc:design \--system \--api \--ddd for architecture.

Create comprehensive designs including data models, APIs, edge cases, and task breakdowns.

Use evidence-based design patterns and always consider performance and security implications.

Run npm run check-tasks to see systems design work.

### **Terminal 9: AI Agent**

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride

claude \--dangerously-skip-permissions

Then paste:

You are the ai-agent. Read your CLAUDE-ai.md file located at the root directory to understand your role and capabilities.

You are using SuperClaude with \--persona-analyzer for AI system investigation and optimization.

Enable \--seq for complex AI workflows and \--c7 for AI/ML library documentation.

Your skills include: CrewAI, LangChain, OpenAI, Anthropic, Gemini, prompt engineering, and ML operations.

Focus on AI system architecture, multi-provider support, token optimization, and cost efficiency.

Use evidence-based language (e.g., "benchmarks show", "testing indicates", "measured at").

Apply \--ultrathink for critical migration decisions and \--uc for large configurations.

Run npm run check-tasks to see AI/ML-related tasks.

### **Terminal 10: Orchestrator (Your Main Interface)**

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride

claude \--dangerously-skip-permissions

Then paste:

You are the orchestrator. Read your ORCHESTRATOR.md file located at the root directory to understand your role.

You are using SuperClaude with \--persona-architect for system-wide planning.

You coordinate work between all agents: frontend-agent, backend-agent, infra-agent, quality-agent, docs-agent, migration-agent, design-agent (UI/UX), systems-design-agent, and ai-agent.

Use /sc:analyze \--arch \--seq for complex feature decomposition.

Apply evidence-based task assignment based on agent skills and current load.

Monitor agent progress and ensure they're using appropriate SuperClaude personas and MCP servers.

Enforce evidence-based development standards across all agents.

Show the current task board and agent status.

## Phase 4: Using the System

### **Specialized Agent Capabilities**

**Quality Agent** handles:

- Code review and PR feedback using /sc:analyze \--code  
- Test coverage analysis using /sc:test \--coverage  
- Performance profiling using /sc:analyze \--performance \--profile  
- Security vulnerability scanning using /sc:scan \--security \--owasp  
- Accessibility audits using /sc:scan \--accessibility  
- Code smell detection using /sc:analyze \--quality

**Documentation Agent** handles:

- API documentation generation using /sc:document \--api  
- README updates using /sc:document \--user  
- Code comment improvements using /sc:improve \--comments  
- Architecture diagrams using /sc:design \--visual  
- User guides and tutorials using /sc:document \--tutorial  
- Changelog maintenance using /sc:document \--changelog

**Migration Agent** handles:

- Database schema migrations using /sc:migrate \--database  
- Data transformation scripts using /sc:migrate \--transform  
- Backwards compatibility checks using /sc:analyze \--compatibility  
- Zero-downtime deployment plans using /sc:deploy \--zero-downtime  
- Version upgrade paths using /sc:migrate \--version  
- Legacy system transitions using /sc:migrate \--legacy

**UI/UX Design Agent** handles:

- User interface design using /sc:design \--ui \--visual  
- User experience flows using /sc:analyze \--ux  
- Design systems using /sc:design \--system \--components  
- Wireframes and mockups using /sc:design \--wireframe  
- Accessibility design using /sc:analyze \--accessibility \--design  
- Visual consistency using /sc:design \--tokens

**Systems Design Agent** handles:

- Feature analysis using /sc:analyze \--feature \--seq \--ultrathink  
- System architecture using /sc:design \--system \--seq  
- API design using /sc:design \--api \--ddd  
- Data modeling using /sc:design \--schema  
- Edge case analysis using /sc:analyze \--edge-cases  
- Performance planning using /sc:analyze \--performance \--plan

**AI Agent** handles:

- CrewAI multi-agent orchestration using /sc:analyze \--ai \--seq
- LangChain to CrewAI migration using /sc:migrate \--ai \--plan
- Multi-provider AI integration using /sc:implement \--providers
- Prompt engineering using /sc:optimize \--prompts
- Token usage optimization using /sc:analyze \--tokens \--performance
- AI system monitoring using /sc:monitor \--ai \--metrics

### **With the Orchestrator (Terminal 10):**

"I want to add authentication to the app"

Orchestrator will:

1\. Break this into subtasks using /sc:analyze \--arch \--seq

2\. Assign to appropriate agents

3\. Update AGENTS\_BOARD.md

### **In Each Agent Terminal:**

Periodically run:

npm run check-tasks

Agents will:

1. Find tasks assigned to them (with skill matching)  
2. Verify skill match using SuperClaude patterns  
3. Start working on appropriate tasks with their persona  
4. Use /complete-task when done  
5. **Always run npm run check-tasks again to continue workflow**

This creates a continuous work loop where agents automatically pick up new tasks as they become available.

## Example Workflow

**You → Orchestrator**: "Set up testing infrastructure"

**Orchestrator**:

I'll use /sc:analyze \--arch to break this down.

I'll assign this to infra-agent since it requires jest and npm skills.

/assign-task T1 infra-agent

Task assigned. Make sure infra-agent is running and checks for tasks.

**You → Infra Agent Terminal**:

npm run check-tasks

**Infra Agent**:

Found task assigned to me: T1 \- Setup Jest testing framework

This matches my skills (jest, npm). Starting work now...

Using /sc:build \--init \--jest \--c7 to set up testing infrastructure

\[Does the work\]

/complete-task T1 "Jest configured with TypeScript support"

npm run check-tasks

## Common Workflows

### **1\. Starting Fresh Each Day**

\# Quick launch all agents (copy each line to a different terminal)

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/apps/web && claude \--dangerously-skip-permissions

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/convex && claude \--dangerously-skip-permissions

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

\# Then in each terminal, paste the appropriate agent initialization with SuperClaude configuration

\# Each agent will automatically enable their specialized personas and MCP servers

### **2\. Adding a New Feature**

**Orchestrator Terminal**:

Add a shopping cart feature with:

\- Product selection UI

\- Cart state in Convex

\- Checkout flow

\- Tests for everything

\- Full documentation

\- Migration plan for existing data

**Orchestrator responds**:

I'll use /sc:analyze \--arch \--seq to break this down across all agents:

\- T10: Design cart user experience (design-agent UI/UX) \- /sc:design \--ux

\- T11: Design cart architecture (systems-design-agent) \- /sc:design \--system

\- T12: Design cart schema (backend-agent) \- /sc:design \--schema

\- T13: Plan data migration strategy (migration-agent) \- /sc:migrate \--plan

\- T14: Implement cart mutations (backend-agent) \- /sc:build \--api

\- T15: Create cart UI component (frontend-agent) \- /sc:build \--react \--magic

\- T16: Add cart unit tests (quality-agent) \- /sc:test \--unit

\- T17: Performance test cart operations (quality-agent) \- /sc:test \--performance

\- T18: Document cart API (docs-agent) \- /sc:document \--api

\- T19: Write user guide for cart (docs-agent) \- /sc:document \--user

/assign-task T10 design-agent

/assign-task T11 systems-design-agent

/assign-task T12 backend-agent

/assign-task T13 migration-agent

/assign-task T14 backend-agent

/assign-task T15 frontend-agent

/assign-task T16 quality-agent

/assign-task T17 quality-agent

/assign-task T18 docs-agent

/assign-task T19 docs-agent

### **3\. Checking System Status**

**Any Terminal**:

/agent-status

Shows:

- Active locks  
- Tasks in progress  
- Agent locations  
- Recent commits

### **4\. Quick Task Check Loop**

In each agent terminal, run this periodically:

npm run check-tasks

If work is found:

/claim-task T10

\# ... do the work using appropriate /sc: commands ...

/complete-task T10 "Cart schema implemented with user and product relations"

npm run check-tasks  \# Always check for new tasks after completing one

When completing tasks, agents should always run npm run check-tasks again to:

- Pick up any newly unblocked tasks  
- Continue working if more tasks are available  
- Maintain workflow momentum

### **5. Using Worktrees for Task Isolation**

When `ENABLE_WORKTREES=true`, agents can use isolated worktrees:

```bash
# Source the task library
source scripts/migration/task_lib.sh

# Claim task with automatic worktree creation
claim_task_with_worktree T123 frontend-agent

# Work in the isolated worktree
cd .worktrees/frontend-agent/T123

# Complete task and cleanup
complete_task_with_cleanup T123 "Fixed navigation bug"
cleanup_task_worktree T123 frontend-agent
```

Benefits:
- Complete isolation between tasks
- No branch conflicts between agents
- Easy cleanup after task completion
- Parallel development without interference

## Example: All Agents Working Together

**You → Orchestrator**: "We need to upgrade our authentication system to support OAuth"

**Orchestrator (using /sc:analyze \--arch \--seq)**:

Breaking down OAuth implementation into specialized tasks:

**Orchestrator assigns**:

1. **design-agent (UI/UX)**: Design OAuth user flow using /sc:design \--ux \--flow  
2. **systems-design-agent**: Design OAuth architecture using /sc:design \--system \--seq \--ultrathink  
3. **backend-agent**: Design new OAuth schema using /sc:design \--schema \--seq \--c7  
4. **migration-agent**: Plan migration from current auth using /sc:migrate \--plan \--dry-run  
5. **frontend-agent**: Build OAuth login UI using /sc:build \--react \--magic  
6. **quality-agent**: Security review using /sc:scan \--security \--owasp  
7. **docs-agent**: Document OAuth integration using /sc:document \--api \--c7  
8. **infra-agent**: Set up OAuth provider configs using /sc:build \--config

Each agent works in parallel using SuperClaude personas and MCP servers, coordinating through the task board when dependencies exist. All agents run npm run check-tasks after completing work to maintain momentum.

## Tips & Tricks

### **SuperClaude Integration**

Each agent leverages SuperClaude's specialized capabilities:

- **Frontend**: \--magic MCP for UI components, \--c7 for React docs, /sc:build commands  
- **Backend**: \--seq for architecture, \--c7 for API patterns, /sc:design commands  
- **Quality**: \--pup for E2E testing, /sc:scan for security, /sc:test commands  
- **Docs**: \--c7 for official patterns, /sc:document commands  
- **Migration**: \--seq for planning, \--dry-run for safety, /sc:migrate commands  
- **Infra**: \--ultrathink for complex systems, /sc:analyze commands  
- **Design UI/UX**: \--magic for design systems, \--persona-frontend, /sc:design \--ui commands  
- **Systems Design**: \--ultrathink for deep analysis, /sc:design \--system commands
- **AI**: \--seq for workflows, \--c7 for AI/ML docs, \--ultrathink for migrations, /sc:analyze \--ai commands

All agents use:

- **Evidence-based language**: may|could|potentially|measured (never "best" or "optimal")  
- **UltraCompressed mode (--uc)**: For efficiency with large codebases  
- **Task completion workflow**: Always run npm run check-tasks after completing work  
- **Research-first methodology**: Context7 for external libraries, official sources required  
- **Git safety**: status→branch→fetch→pull workflow

### **1\. Terminal Organization**

Arrange your terminals in a grid (use multiple desktops/screens if needed):

┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐

│  Frontend    │   Backend    │    Infra     │   Quality    │      AI      │

│ (apps/web)   │  (convex)    │   (root)     │   (root)     │   (root)     │

├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤

│     Docs     │  Migration   │  Design UI   │  Design Sys  │    (empty)   │

│   (root)     │   (root)     │   (root)     │   (root)     │              │

├──────────────┴──────────────┴──────────────┴──────────────┴──────────────┤

│                           Orchestrator (root)                             │

└───────────────────────────────────────────────────────────────────────────┘

### **2\. Quick Commands Cheat Sheet**

\# For all 9 worker agents

npm run check-tasks         \# What can I work on?

/claim-task T1       \# Start this task

/complete-task T1    \# I'm done with this

npm run check-tasks         \# Check for more work (always run after completing)

\# SuperClaude commands agents use (with /sc: prefix)

/sc:analyze \--code \--c7      \# Research with documentation

/sc:build \--feature \--magic  \# Build with UI components

/sc:scan \--security \--owasp  \# Security audit

/sc:test \--e2e \--pup        \# E2E testing

/sc:improve \--quality \--uc   \# Refactor with compression

/sc:design \--api \--seq      \# Design APIs

/sc:design \--ui \--visual    \# Design interfaces

/sc:design \--system \--arch  \# Design architecture

/sc:migrate \--plan          \# Plan migrations

/sc:document \--api          \# Document APIs

\# For orchestrator only

/assign-task T1 frontend-agent   \# Assign specific task

/assign-task T2 quality-agent    \# Assign to quality

/smart-assign                    \# Auto-assign all tasks to best agents

/agent-status                    \# System overview of all 10 agents

/sc:analyze \--arch \--seq         \# Complex feature decomposition

### **3\. Skill-Based Task Routing with SuperClaude**

Tasks automatically route to the right agent with appropriate tools:

- `tailwind`, `react` → frontend-agent (uses \--magic, \--c7, /sc:build)  
- `convex`, `schema` → backend-agent (uses \--seq, \--c7, /sc:design)  
- `jest`, `npm` → infra-agent (uses \--seq, \--dry-run, /sc:analyze)  
- `testing`, `coverage`, `security` → quality-agent (uses \--pup, /sc:scan, /sc:test)  
- `documentation`, `readme`, `comments` → docs-agent (uses \--c7, /sc:document)  
- `migration`, `backwards-compatibility` → migration-agent (uses \--seq, /sc:migrate)  
- `ui`, `ux`, `wireframes` → design-agent UI/UX (uses \--magic, /sc:design \--ui)  
- `architecture`, `systems`, `data-models` → systems-design-agent (uses \--ultrathink, /sc:design \--system)
- `crewai`, `langchain`, `openai`, `ai`, `ml` → ai-agent (uses \--seq, \--c7, \--ultrathink, /sc:analyze \--ai)

SuperClaude auto-activates based on keywords:

- "bug/error" → analyzer persona with /sc:troubleshoot  
- "optimize" → performance persona with /sc:improve \--performance  
- "secure/auth" → security persona with /sc:scan \--security  
- "refactor" → refactorer persona with /sc:improve \--quality

### **4\. Handling Dependencies**

If a task is blocked:

Task T2 depends on T1

\- T1 must be completed first

\- Once T1 is done, T2 automatically becomes "ready"

\- The right agent will see it on next npm run check-tasks

## Quick Reference Card

\# Terminal 1: Frontend

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/apps/web && claude \--dangerously-skip-permissions

\# Terminal 2: Backend  

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride/convex && claude \--dangerously-skip-permissions

\# Terminal 3: Infra

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

\# Terminal 4: Quality

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

\# Terminal 5: Docs

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

\# Terminal 6: Migration

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

\# Terminal 7: Design UI/UX

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

\# Terminal 8: Systems Design

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

\# Terminal 9: AI

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

\# Terminal 10: Orchestrator

cd /Users/aviswerdlow/Documents/Coding/bulk-grillers-pride && claude \--dangerously-skip-permissions

Then initialize each with their specific prompt from above\!

## Continuous Workflow Pattern

Each agent follows this workflow loop:

1\. npm run check-tasks → Find appropriate work

2\. /claim-task T1 → Start the task

3\. Work using SuperClaude /sc: commands and tools

4\. /complete-task T1 "summary" → Mark done

5\. npm run check-tasks → Check for more work (ALWAYS)

6\. Loop back to step 2 if work available

This ensures:

- No agent sits idle when work is available  
- Dependencies automatically unblock  
- Tasks flow smoothly between agents  
- Maximum parallel efficiency

## SuperClaude Benefits

With SuperClaude integration, your multi-agent system gains:

- **Evidence-based development**: Required language patterns prevent overconfident claims  
- **Research-first methodology**: Context7 ensures accurate library usage  
- **Intelligent compression**: UltraCompressed mode handles large codebases efficiently  
- **Specialized expertise**: Each agent uses targeted personas for their domain  
- **Quality gates**: Built-in security scanning, testing, and validation  
- **Continuous improvement**: Agents always check for new work after task completion  
- **Proper command usage**: All agents use /sc: prefixed commands for SuperClaude functionality

**Remember**: Each agent uses SuperClaude personas and runs npm run check-tasks after completing work to maintain continuous workflow.

## Agent Configuration File Locations

For reference, each agent's CLAUDE.md file is located at:

- **Frontend Agent**: `apps/web/CLAUDE.md`  
- **Backend Agent**: `convex/CLAUDE.md`  
- **Infrastructure Agent**: `CLAUDE.md` (root)  
- **Quality Agent**: `CLAUDE-quality.md` (root)  
- **Documentation Agent**: `CLAUDE-docs.md` (root)  
- **Migration Agent**: `CLAUDE-migration.md` (root)  
- **UI/UX Design Agent**: `CLAUDE-design.md` (root)  
- **Systems Design Agent**: `CLAUDE-systems-design.md` (root)  
- **Orchestrator**: `ORCHESTRATOR.md` (root)

