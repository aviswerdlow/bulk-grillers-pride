---
description: Add skill requirements to a task
parameters:
  - name: task_id
    description: Task ID to tag
  - name: required_skills
    description: Comma-separated list of required skills
  - name: anti_skills
    description: Comma-separated list of skills that disqualify an agent
---

Update task {{task_id}} with skill requirements:

- Required: {{required_skills}}
- Anti-skills: {{anti_skills}}

This ensures only qualified agents will see this task as compatible.

Example:

- Task: "Build login UI"
- Required: react, ui-components, tailwind
- Anti-skills: database, convex-schema

This task will only appear for frontend-agent, not backend-agent.
