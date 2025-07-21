#!/usr/bin/env python3
# Create test mappings for T167 verification
# This simulates the mapping that would exist after GitHub issues are created

import json
import random

# Load current board tasks
with open('AGENTS_BOARD.md', 'r') as f:
    board_content = f.read()

# Extract task IDs
import re
task_pattern = r'\| (T\d+) \|'
tasks = re.findall(task_pattern, board_content)

# Create test mappings (simulating GitHub issue numbers)
mappings = {
    "task_mappings": {},
    "sync_status": {
        "last_sync": "2025-07-19T21:00:00Z",
        "sync_direction": "board_to_github",
        "status": "success"
    }
}

# Simulate GitHub issue numbers for each task
github_issue_start = 1000  # Starting issue number
for i, task_id in enumerate(tasks):
    mappings["task_mappings"][task_id] = {
        "github_issue": github_issue_start + i,
        "created_at": "2025-07-19T20:00:00Z",
        "last_synced": "2025-07-19T21:00:00Z"
    }

# Save test mappings
with open('.task_mappings_test.json', 'w') as f:
    json.dump(mappings, f, indent=2)

print(f"Created test mappings for {len(tasks)} tasks")
print(f"Issue numbers: {github_issue_start} to {github_issue_start + len(tasks) - 1}")