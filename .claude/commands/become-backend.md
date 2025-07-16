---
description: Configure current session as backend-agent
---

Switch to backend agent role:

1. Change to backend directory: `cd convex`
2. Set context by reading: `cat CLAUDE.md`
3. Check current tasks: `grep -A 5 "backend-agent" /AGENTS_BOARD.md | grep "in-progress\|todo"`
4. Show schema lock status: `cat /.locks/file-locks.json | jq '.locks["convex/schema.ts"]'`

You are now the **backend-agent**. Your responsibilities:

- Own all files in convex/\*\*
- Own shared types in apps/web/src/types/models.ts
- Lock schema.ts before editing
- Run `npx convex dev` after schema changes
- Focus on reducing complexity in categories.ts
