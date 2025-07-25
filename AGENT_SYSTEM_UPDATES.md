# Agent System Updates Summary

## Key Changes Implemented

### 1. ✅ Single Agent Assignment Rule
- **Policy**: Only one agent can be assigned to a GitHub issue
- **Handoffs**: Use issue comments for agent-to-agent handoffs
- **Implementation**: Updated task assignment logic to enforce single ownership

### 2. ✅ New AI Agent Created
- **Agent ID**: ai-agent
- **Role**: AI/ML systems, CrewAI migration, LangChain operations
- **Skills**: CrewAI, LangChain, OpenAI, Anthropic, Gemini, ML-Ops
- **Assigned Tasks**: 21 AI/ML related tasks
- **Config File**: `CLAUDE-ai.md` (root directory)

### 3. ✅ Launch Instructions Updated
- **File**: `launch-agents-specific-path.md`
- **Changes**:
  - Added AI agent as Terminal 7
  - Orchestrator moved to Terminal 8
  - Updated to "8 Agents Total"
  - Added AI agent capabilities and routing

### 4. ✅ Fixed /check-tasks Command
- **Problem**: Agents couldn't run `/check-tasks` (not a valid command)
- **Solution**: Changed all references to `npm run check-tasks`
- **Updated Files**:
  - `launch-agents-specific-path.md` (all references)
  - `apps/web/CLAUDE.md` (frontend agent)
  - `convex/CLAUDE.md` (backend agent)
  - `CLAUDE-ai.md` (new ai agent)

### 5. ✅ Agent CLAUDE.md Files Updated
- **Frontend Agent**: Added path navigation (`cd ../..`) for task commands
- **Backend Agent**: Added path navigation (`cd ..`) for task commands
- **AI Agent**: Created new comprehensive configuration
- **Orchestrator**: Added ai-agent to capabilities matrix

## Task Command Reference

### For Frontend Agent (in apps/web/)
```bash
# Check tasks
cd ../.. && npm run check-tasks

# Task management
cd ../.. && source scripts/migration/task_lib.sh
claim_task T123 frontend-agent
update_task_status T123 in-progress
update_task_status T123 done
```

### For Backend Agent (in convex/)
```bash
# Check tasks  
cd .. && npm run check-tasks

# Task management
cd .. && source scripts/migration/task_lib.sh
claim_task T123 backend-agent
update_task_status T123 in-progress
update_task_status T123 done
```

### For Root-Level Agents (infra, quality, docs, migration, ai)
```bash
# Check tasks
npm run check-tasks

# Task management
source scripts/migration/task_lib.sh
claim_task T123 agent-name
update_task_status T123 in-progress
update_task_status T123 done
```

## Current Agent Distribution

| Agent | Total Tasks | Active | Role |
|-------|-------------|--------|------|
| ai-agent | 21 | 1 | AI/ML systems, CrewAI migration |
| quality-agent | 19 | 2 | Testing, security, performance |
| frontend-agent | 17 | 0 | React, UI/UX, accessibility |
| infra-agent | 13 | 1 | CI/CD, build tools, DevOps |
| docs-agent | 7 | 0 | Documentation, tutorials |
| backend-agent | 5 | 1 | Convex, APIs, business logic |
| systems-design-agent | 4 | 1 | Architecture, planning |
| migration-agent | 4 | 0 | Schema evolution, data |
| design-agent | 0 | 0 | UI/UX design, Figma |

## Quick Launch Reference

```bash
# Terminal 1: Frontend (cd apps/web)
# Terminal 2: Backend (cd convex)  
# Terminal 3: Infra (root)
# Terminal 4: Quality (root)
# Terminal 5: Docs (root)
# Terminal 6: Migration (root)
# Terminal 7: AI (root)
# Terminal 8: Orchestrator (root)
```

## Important Notes

1. **Task Assignment**: Remember only ONE agent per issue
2. **Check Tasks**: Use `npm run check-tasks` not `/check-tasks`
3. **Path Navigation**: Frontend/backend agents need to navigate to root
4. **AI Agent**: Now handles all CrewAI and LangChain tasks
5. **Evidence Language**: All agents must use evidence-based language