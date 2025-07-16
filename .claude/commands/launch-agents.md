---
description: Show instructions for launching all three agents
---

To launch the multi-agent system, open 3 separate terminals:

**Terminal 1 - Frontend Agent:**

```bash
cd apps/web
claude
# Then in Claude: /become-frontend
```

**Terminal 2 - Backend Agent:**

```bash
cd convex
claude
# Then in Claude: /become-backend
```

**Terminal 3 - Infrastructure Agent:**

```bash
claude  # stay at root
# Then in Claude: /become-infra
```

**Quick Copy Commands:**

- Terminal 1: `cd apps/web && claude`
- Terminal 2: `cd convex && claude`
- Terminal 3: `claude`

Each agent should then:

1. Use their /become-[role] command
2. Check /AGENTS_BOARD.md for tasks
3. Use /claim [task-id] to claim work
