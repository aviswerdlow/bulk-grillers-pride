---
description: Send a message between agents
parameters:
  - name: from
    description: Sender agent ID
  - name: to
    description: Recipient agent ID
  - name: subject
    description: Message subject
  - name: body
    description: Message content
  - name: priority
    description: Priority level (low, normal, high, urgent)
---

Post message to /.agent-messages/{{timestamp}}-{{from}}-to-{{to}}.md:

```
FROM: {{from}}
TO: {{to}}
SUBJECT: {{subject}}
PRIORITY: {{priority}}
TIMESTAMP: {{timestamp}}

{{body}}

STATUS: unread
```

Also append notification to AGENTS_BOARD.md under "## Agent Messages" section.
