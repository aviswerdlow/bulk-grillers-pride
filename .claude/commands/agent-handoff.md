---
description: Create a handoff note for another agent
parameters:
  - name: to_agent
    description: Target agent (frontend-agent, backend-agent, or infra-agent)
  - name: message
    description: Handoff message
---

Create handoff note for {{to_agent}}:

1. Append to AGENTS_BOARD.md:

```
## Handoff Note
**From:** Current session
**To:** {{to_agent}}
**Time:** $(date)
**Message:** {{message}}
---
```

2. If it's about a file lock, also update the lock file with a note.

3. Suggest: The {{to_agent}} should check this message when they start their session.
