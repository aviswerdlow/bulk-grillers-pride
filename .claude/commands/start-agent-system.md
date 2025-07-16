---
description: Initialize the enhanced multi-agent system
---

Starting Enhanced Multi-Agent System...

1. **Initialize System State:**

```bash
echo "Initializing agent system..."
touch .agent-messages/system-start-$(date +%s).log
echo "System started at $(date)" >> AGENTS_BOARD.md
```

2. **Verify All Components:**

- ✓ Orchestrator config: `test -f ORCHESTRATOR.md && echo "OK" || echo "MISSING"`
- ✓ Agent configs: `ls */CLAUDE.md 2>/dev/null | wc -l` agents configured
- ✓ Lock system: `test -f .locks/file-locks.json && echo "OK" || echo "MISSING"`
- ✓ Metrics system: `test -f .agent-metrics/metrics.json && echo "OK" || echo "MISSING"`
- ✓ Message system: `test -d .agent-messages && echo "OK" || echo "MISSING"`

3. **Available Agents:**

- orchestrator (you) - Central coordinator
- frontend-agent - React/Next.js specialist
- backend-agent - Convex specialist
- infra-agent - Build/CI/CD specialist
- quality-agent - Testing/review specialist
- docs-agent - Documentation specialist
- migration-agent - Data migration specialist

4. **Next Steps:**
   As the orchestrator, you can now:

- Receive user requests and use /decompose-task
- Check system with /agent-progress
- Assign work with /auto-assign
- Coordinate via /agent-message

Ready to receive tasks! What would you like the team to work on?
