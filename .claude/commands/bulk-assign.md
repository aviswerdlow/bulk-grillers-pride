---
description: Assign multiple tasks based on skills
---

Analyze all "ready" or "unassigned" tasks and assign to best agents:

1. For each task, determine required skills
2. Match with agent capabilities from metrics.json
3. Calculate assignment scores:
   ```
   score = (skill_matches * 3) - (current_load * 2) + (success_rate * 1)
   ```
4. Balance workload (no agent gets >3 active tasks)
5. Run /assign-task for each match
6. Show summary of assignments:
   ```
   Assignment Summary:
   - frontend-agent: 2 tasks (UI components)
   - backend-agent: 1 task (API work)
   - infra-agent: 1 task (build setup)
   - quality-agent: 1 task (test coverage)
   ```

Note: Tasks with unmet dependencies stay in "blocked" status
