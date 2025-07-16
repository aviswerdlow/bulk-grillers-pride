---
description: Run continuous work loop
---

Start agent work loop:

1. Run /check-tasks
2. If task found:
   - Work on the task
   - When done, run /complete-task
   - Loop back to step 1
3. If no tasks:
   - Show: "No tasks assigned. Checking again in 5 minutes..."
   - Suggest: "Run /check-tasks to check manually"
   - Or: "Run /claim [task-id] to take an unassigned task"

Work loop status:

- Active tasks: Check AGENTS_BOARD.md for in-progress
- Completed today: Check metrics.json
- Available tasks: Run /check-tasks

Remember: This is a manual loop - you need to run /check-tasks periodically!
