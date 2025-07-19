# Claude Code Instructions to Update All Agent CLAUDE.md Files

Copy and paste this entire block into Claude Code:

```
Please update all agent CLAUDE.md files to use the correct SuperClaude command format with /sc: prefix:

## 1. Update root CLAUDE.md (Infrastructure Agent)

Find and replace in `CLAUDE.md`:
- Replace `/analyze` with `/sc:analyze`
- Replace `/build` with `/sc:build`
- Replace `/improve` with `/sc:improve`
- Replace `/test` with `/sc:test`
- Replace `/scan` with `/sc:scan`

Specifically update these sections:

In "SuperClaude Integration" section, change:
- "Use `/analyze --arch --seq`" → "Use `/sc:analyze --arch --seq`"
- "Use `/build --init`" → "Use `/sc:build --init`"
- "Use `/improve --quality --uc`" → "Use `/sc:improve --quality --uc`"
- "Use `/test --coverage`" → "Use `/sc:test --coverage`"

In "SuperClaude Workflow" section, change:
- "Always run `/analyze --arch --c7`" → "Always run `/sc:analyze --arch --c7`"

In "Instructions" sections, update all commands to use /sc: prefix.

In "Common Commands" section, update all example commands:
```bash
# Analyze build performance
/sc:analyze --performance --turbo --seq

# Set up testing
/sc:build --init --jest --c7

# Improve build times
/sc:improve --performance --turbo --uc

# Security audit
/sc:scan --deps --security --owasp

# Check for updates
/sc:analyze --deps --outdated --c7
```

## 2. Update ORCHESTRATOR.md

In "SuperClaude Integration" section, change:
- "Use `/analyze --arch --seq`" → "Use `/sc:analyze --arch --seq`"

In "Decision Flow with SuperClaude" section, change:
- "**Analyze Request**: `/analyze --arch --seq`" → "**Analyze Request**: `/sc:analyze --arch --seq`"

In "SuperClaude Commands for Orchestration" section, update all commands:
```bash
# Analyze complex feature request
/sc:analyze --arch --seq --ultrathink

# Check system architecture impact
/sc:design --system --seq --c7

# Validate task assignments
/sc:analyze --workload --evidence

# Monitor agent performance
/sc:analyze --metrics --performance
```

In "Common Workflows" section, update the example:
```bash
# Receive: "Add shopping cart feature"
/sc:analyze --arch --seq --feature "shopping cart"
```

## 3. Update apps/web/CLAUDE.md (Frontend Agent)

In "SuperClaude Integration" section, change all commands to use /sc: prefix:
- "Use `/analyze --code --c7`" → "Use `/sc:analyze --code --c7`"
- "Use `/build --feature --react --magic`" → "Use `/sc:build --feature --react --magic`"
- "Use `/test --e2e --pup`" → "Use `/sc:test --e2e --pup`"
- "Use `/improve --accessibility --magic`" → "Use `/sc:improve --accessibility --magic`"

In "SuperClaude Workflow" section, update:
1. **Component Creation**: `/sc:build --react --magic --c7`
2. **Testing**: `/sc:test --unit --e2e --pup`
3. **Accessibility**: `/sc:scan --accessibility --validate`
4. **Performance**: `/sc:analyze --performance --react`

## 4. Update convex/CLAUDE.md (Backend Agent)

In "SuperClaude Integration" section, change all commands:
- "Use `/analyze --code --arch --seq`" → "Use `/sc:analyze --code --arch --seq`"
- "Use `/design --api --ddd --seq`" → "Use `/sc:design --api --ddd --seq`"
- "Use `/build --feature --api`" → "Use `/sc:build --feature --api`"
- "Use `/test --unit --integration`" → "Use `/sc:test --unit --integration`"

In "SuperClaude Workflow" section, update:
1. **Before Schema Changes**: Check locks, use `/sc:analyze --schema --seq`
2. **API Design**: `/sc:design --api --ddd --c7`
3. **Implementation**: `/sc:build --feature --convex`
4. **Testing**: `/sc:test --unit --convex`

## 5. Create/Update CLAUDE-quality.md (Quality Agent)

Create or update this file with:

In "SuperClaude Integration" section:
- "Use `/sc:scan --security --owasp --deps`" 
- "Use `/sc:test --e2e --coverage --pup`"
- "Use `/sc:analyze --performance --profile`"
- "Use `/sc:scan --accessibility --validate`"

In "SuperClaude Workflow" section:
1. **Security Audit**: `/sc:scan --security --owasp --strict`
2. **Test Coverage**: `/sc:test --coverage --report`
3. **E2E Testing**: `/sc:test --e2e --pup --validate`
4. **Performance**: `/sc:analyze --performance --metrics`

## 6. Create/Update CLAUDE-docs.md (Documentation Agent)

In "SuperClaude Integration" section:
- "Use `/sc:document --api --examples`"
- "Use `/sc:document --user --visual`"
- "Use `/sc:analyze --code --c7`"

In "SuperClaude Workflow" section:
1. **Research**: `/sc:analyze --code --c7` for accuracy
2. **Document**: `/sc:document --api --examples`

## 7. Create/Update CLAUDE-migration.md (Migration Agent)

In "SuperClaude Integration" section:
- "Use `/sc:migrate --database --plan --seq`"
- "Use `/sc:analyze --schema --impact`"

In "SuperClaude Workflow" section:
1. **Plan**: `/sc:migrate --plan --seq --dry-run`
2. **Impact Analysis**: `/sc:analyze --schema --impact`

## 8. Create CLAUDE-design.md (Design Agent)

Create this new file at the root with:

```markdown
# Design Agent Configuration

agent_id: design-agent
agent_role: Feature design, architecture planning, and technical specifications

## SuperClaude Integration
You MUST utilize SuperClaude features:
- Use `/sc:analyze --arch --seq --ultrathink` for complex feature design
- Use `/sc:design --system --api --ddd` for architecture
- Apply `--persona-architect` for system thinking
- Enable `--seq` for multi-step analysis
- Use `--think-hard` for edge case analysis
- Apply `--c7` for researching best practices

## My Capabilities
skills:
  primary:
    - system-design: Architecture patterns, scalability
    - api-design: REST, GraphQL, real-time APIs
    - data-modeling: Schema design, relationships
    - user-flows: UX planning, state machines
    - edge-cases: Failure modes, error handling
  secondary:
    - performance: Optimization strategies
    - security: Threat modeling
    - integration: Third-party APIs
  never:
    - implementation: Don't write production code
    - deployment: Leave to other agents

## Ownership
owns_paths:
  - docs/design/**
  - docs/architecture/**
  - docs/specs/**

## Always Read
always_read:
  - /AGENTS_BOARD.md
  - /.locks/file-locks.json

## SuperClaude Workflow
1. **Analyze Request**: `/sc:analyze --feature --seq --ultrathink`
2. **Research Patterns**: `/sc:analyze --patterns --c7`
3. **Design System**: `/sc:design --system --api --ddd`
4. **Document Design**: Create comprehensive specs
5. **Identify Risks**: Edge cases, performance, security
6. **Task Breakdown**: Define implementation tasks
7. **Task Completion**: Always run `/check-tasks`

## Output Format
Always produce:
1. Data model changes
2. API specifications  
3. User flow diagrams
4. Edge case analysis
5. Performance considerations
6. Security implications
7. Implementation task list with effort estimates
8. Success criteria

## Common Commands
\`\`\`bash
# Analyze feature request
/sc:analyze --feature --seq --ultrathink

# Design system architecture
/sc:design --system --api --ddd

# Research best practices
/sc:analyze --patterns --c7

# Design data models
/sc:design --schema --seq

# Analyze edge cases
/sc:analyze --edge-cases --think-hard
\`\`\`

## Evidence Standards
- Required: "analysis indicates", "patterns suggest", "research shows"
- Prohibited: "best practice", "optimal design", "perfect solution"
- Always cite: Design patterns, architectural principles, case studies
```

## 9. Verify all files

After updating all files, run these commands to verify:
```bash
# Check that all files exist
ls -la CLAUDE*.md ORCHESTRATOR.md apps/web/CLAUDE.md convex/CLAUDE.md

# Verify /sc: commands are present
grep -r "/sc:" CLAUDE*.md ORCHESTRATOR.md apps/web/CLAUDE.md convex/CLAUDE.md

# Count occurrences to ensure updates
grep -r "/sc:" . --include="*.md" | wc -l
```

The count should show at least 50+ occurrences of /sc: commands across all configuration files.

## Summary of Changes

All SuperClaude commands now use the /sc: prefix:
- `/analyze` → `/sc:analyze`
- `/build` → `/sc:build`
- `/test` → `/sc:test`
- `/scan` → `/sc:scan`
- `/design` → `/sc:design`
- `/migrate` → `/sc:migrate`
- `/improve` → `/sc:improve`
- `/document` → `/sc:document`
- `/troubleshoot` → `/sc:troubleshoot`
- `/deploy` → `/sc:deploy`

This ensures all agents use the correct SuperClaude command format for proper functionality.
```