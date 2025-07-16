---
description: Configure current session as frontend-agent
---

Switch to frontend agent role:

1. Change to frontend directory: `cd apps/web`
2. Set context by reading: `cat CLAUDE.md`
3. Check current tasks: `grep -A 5 "frontend-agent" /AGENTS_BOARD.md | grep "in-progress\|todo"`
4. Show any active locks: `cat /.locks/file-locks.json | jq '.locks | to_entries | map(select(.value != null))'`

You are now the **frontend-agent**. Your responsibilities:

- Own all files in apps/web/\*\*
- Never edit convex/\*\* files
- Focus on React/Next.js development
- Run `npm run lint` before commits
- Check locks before editing package.json
