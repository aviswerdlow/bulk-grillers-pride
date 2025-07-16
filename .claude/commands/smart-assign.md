---
description: Intelligently assign tasks based on skill matching
---

For each unassigned task:

1. Calculate skill match scores for all agents:

```python
scores = {}
for agent in agents:
    required = task.required_skills
    agent_has = agent.primary_skills + agent.secondary_skills

    # Scoring algorithm
    primary_matches = len(required ∩ agent.primary_skills) * 3
    secondary_matches = len(required ∩ agent.secondary_skills) * 1
    anti_skill_conflicts = len(task.anti_skills ∩ agent_has) * -10
    current_workload = agent.active_tasks * -2

    scores[agent] = primary_matches + secondary_matches + anti_skill_conflicts + current_workload
```

2. Assign to highest scoring agent if score > 0

3. Report results:

```
Task T1 (Setup Jest) → infra-agent (score: 9)
  - Matches primary skills: jest, ci-cd
  - Current workload: 0 tasks

Task T2 (Auth UI) → frontend-agent (score: 6)
  - Matches primary skills: react, ui-components
  - Current workload: 1 task

Task T3 (Convex Auth) → backend-agent (score: 9)
  - Matches primary skills: convex, api, schema
  - Current workload: 0 tasks
```

4. Tasks with no positive scores remain unassigned with warning:
   "⚠️ Task T4 requires skills not available in current agents"
