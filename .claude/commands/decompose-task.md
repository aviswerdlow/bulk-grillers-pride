---
description: Decompose a high-level task into agent-specific subtasks
parameters:
  - name: task_description
    description: High-level task to decompose
---

Analyze "{{task_description}}" and create subtasks:

1. Identify all technical domains involved
2. Break into atomic, testable units
3. Determine dependencies
4. Estimate effort for each
5. Suggest optimal agent assignment
6. Create entries in AGENTS_BOARD.md

Example decomposition:
"Add user authentication" →

- T1: Design auth schema (backend-agent, 2h)
- T2: Implement Convex auth functions (backend-agent, 4h)
- T3: Create login/signup UI (frontend-agent, 3h)
- T4: Add auth tests (quality-agent, 2h)
- T5: Update docs (docs-agent, 1h)

Output format for AGENTS_BOARD.md:

```
| ID | Task | Owner | Status | Depends On | Blocks | Priority | Hours |
|----|------|-------|--------|------------|--------|----------|-------|
| T[n] | [Subtask] | [agent] | todo | [deps] | [blocks] | P[0-3] | [est] |
```
