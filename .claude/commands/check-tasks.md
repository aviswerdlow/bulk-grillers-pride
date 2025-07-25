---
description: Check for GitHub Issues appropriate for this agent
---

Check for tasks I can work on from GitHub Issues:

1. Identify which agent I am based on current directory's CLAUDE.md file:
   - Read agent_id from CLAUDE.md
   - Extract skills from CLAUDE.md

2. Fetch GitHub Issues using `gh` CLI:
   - Get all open issues with task labels
   - Parse issue metadata from labels and body

3. Filter issues based on:
   - Issues with my agent-specific label (e.g., `agent-infra-agent`)
   - Issues with skill labels matching my skills
   - Issues not assigned to other agents
   - Issues not marked as done

4. Categorize and display:
   - In Progress: My active tasks
   - Ready: Tasks with dependencies met
   - Available: Unassigned tasks I can work on
   - Blocked: Tasks waiting on dependencies

5. Show helpful commands for task management:
   - How to claim a task using `gh issue edit`
   - How to complete a task using `gh issue close`

This command requires GitHub CLI (`gh`) to be installed and authenticated.