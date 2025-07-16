---
description: Automatically assign tasks to agents based on skills and availability
parameters:
  - name: task_id
    description: Task ID to assign
---

Auto-assign task {{task_id}} using this algorithm:

```python
# Check dependencies
if not all_dependencies_complete(task):
    set_status(task, 'blocked')
    return None

# Score each agent
scores = {}
for agent in available_agents:
    score = 0
    score += skill_match(agent, task) * 10
    score -= current_load(agent) * 5
    score += success_rate(agent) * 3
    score -= context_switches_today(agent) * 2
    scores[agent] = score

# Assign to best agent
best_agent = max(scores, key=scores.get)
if current_load(best_agent) < 3:
    assign_task(task, best_agent)
    update_board(task, best_agent, 'assigned')
else:
    set_status(task, 'queued')
```

Update AGENTS_BOARD.md with assignment and notify agent via /agent-message.
