---
description: Assign a task to an agent (orchestrator only)
parameters:
  - name: task_id
    description: Task ID
  - name: agent
    description: Agent to assign to (frontend-agent, backend-agent, or infra-agent)
---

In AGENTS_BOARD.md:

1. Find task {{task_id}}
2. Set Owner to {{agent}}
3. Set Status to "👉 assigned"
