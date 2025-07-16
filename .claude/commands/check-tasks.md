---
description: Check for tasks appropriate for this agent
---

Check for tasks I can work on:

1. Identify which agent I am based on current directory:

   - If pwd contains "apps/web": I am frontend-agent
   - If pwd contains "convex": I am backend-agent
   - Otherwise: I am infra-agent

2. Read AGENTS_BOARD.md and find:

   - Tasks where Owner = my agent name AND Status = "assigned" or "👉 assigned"
   - Unassigned tasks where required skills match my skills from CLAUDE.md

3. Show the results clearly with task IDs and descriptions.
