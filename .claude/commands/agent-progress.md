---
description: Check progress of all agents and their tasks
---

Display comprehensive agent progress:

1. **Active Tasks by Agent:**

```bash
echo "=== Active Tasks ==="
grep -B 2 -A 5 "in-progress" AGENTS_BOARD.md | grep -E "(ID|Task|Owner|Status|Estimated)"
```

2. **Agent Workload:**

```bash
echo -e "\n=== Agent Load ==="
cat .agent-metrics/metrics.json | jq '.agents | to_entries | .[] | "\(.key): \(.value.current_load) tasks, \(.value.success_rate * 100)% success rate"'
```

3. **Blocked Tasks:**

```bash
echo -e "\n=== Blocked Tasks ==="
grep -B 2 -A 3 "blocked" AGENTS_BOARD.md
```

4. **Recent Completions:**

```bash
echo -e "\n=== Recently Completed ==="
grep -B 2 -A 2 "done" AGENTS_BOARD.md | head -20
```

5. **System Summary:**

```bash
echo -e "\n=== System Overview ==="
cat .agent-metrics/metrics.json | jq '.system'
```
