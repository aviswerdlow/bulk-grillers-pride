---
description: Broadcast to all agents
parameters:
  - name: subject
    description: Broadcast subject
  - name: message
    description: Broadcast message
  - name: action_required
    description: Whether action is required (true/false)
---

Create broadcast message in /.agent-messages/{{timestamp}}-BROADCAST.md:

```
FROM: {{current_agent}}
TO: ALL AGENTS
SUBJECT: {{subject}}
ACTION_REQUIRED: {{action_required}}
TIMESTAMP: {{timestamp}}

{{message}}

ACKNOWLEDGED_BY: []
```

Also update AGENTS_BOARD.md with:

```
## 🚨 System Broadcast
**Subject:** {{subject}}
**Action Required:** {{action_required}}
**Time:** {{timestamp}}
See /.agent-messages/{{timestamp}}-BROADCAST.md for details
```
