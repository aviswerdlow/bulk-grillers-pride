---
description: Acquire a lock on a file
parameters:
  - name: file
    description: File path to lock
  - name: duration
    description: Lock duration in minutes
---

Update /.locks/file-locks.json to set locks[{{file}}] to:
{
"agent": "{{agent_id}}",
"timestamp": "{{current_timestamp}}",
"expires": "{{expiry_timestamp}}"
}
