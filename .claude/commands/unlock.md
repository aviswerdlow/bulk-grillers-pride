---
description: Release a lock on a file
parameters:
  - name: file
    description: File path to unlock
---

Update /.locks/file-locks.json to set locks[{{file}}] to null
