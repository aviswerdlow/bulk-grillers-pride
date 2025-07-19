# Migration Agent - Task System Migration Plan

## Overview

The Migration Agent is responsible for transitioning the multi-agent system from AGENTS_BOARD.md to GitHub Issues while maintaining zero downtime and full backward compatibility.

## Agent Configuration

```yaml
agent_id: migration-agent
agent_role: System migration and infrastructure transitions
primary_skills:
  - github-api: GitHub Issues, Projects, Actions
  - scripting: Bash, Python migration scripts
  - data-migration: Parser development, data transformation
  - testing: Migration testing and validation
  - documentation: Migration guides and runbooks
```

## Migration Strategy

### Core Principles
1. **Zero Downtime**: Agents continue working normally throughout migration
2. **Feature Flag Control**: TASK_SYSTEM environment variable controls active system
3. **Bidirectional Sync**: Both systems stay synchronized during transition
4. **Incremental Rollout**: Test with individual agents before full migration
5. **Easy Rollback**: Simple environment variable change to revert

### Feature Flag Implementation

```bash
# Environment variable controls task system
TASK_SYSTEM=board  # Default: use AGENTS_BOARD.md
TASK_SYSTEM=github # New: use GitHub Issues
TASK_SYSTEM=sync   # Migration: write to both systems
```

## Phase 1: Infrastructure Setup (Week 1)

### 1.1 GitHub Configuration

#### Labels Structure
```yaml
# Agent Assignment Labels
agent-labels:
  - agent-frontend
  - agent-backend
  - agent-qa
  - agent-docs
  - agent-infra
  - agent-design
  - agent-systems-design
  - agent-migration

# Priority Labels
priority-labels:
  - priority-P0  # Critical, blocking
  - priority-P1  # High priority
  - priority-P2  # Normal priority
  - priority-P3  # Low priority

# Status Labels
status-labels:
  - status-ready      # Dependencies met, can be claimed
  - status-assigned   # Assigned to agent
  - status-in-progress # Active work
  - status-blocked    # Waiting on dependencies
  - status-review     # In code review
  - status-done       # Completed

# Skill Labels
skill-labels:
  - skill-react
  - skill-typescript
  - skill-convex
  - skill-nextjs
  - skill-tailwind
  - skill-testing
  - skill-jest
  - skill-playwright
  - skill-api
  - skill-database
  - skill-ci-cd
  - skill-documentation
```

#### Issue Templates
```markdown
# .github/ISSUE_TEMPLATE/agent-task.md
---
name: Agent Task
about: Task for multi-agent system
title: 'T[NUMBER]: [DESCRIPTION]'
labels: 'status-ready'
assignees: ''
---

## Task Description
[Clear description of what needs to be done]

## Skills Required
- skill-1
- skill-2

## Dependencies
- Depends on: #[issue-number]
- Blocks: #[issue-number]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Estimated Hours
[X] hours

## Technical Details
[Any additional context, links to specs, etc.]
```

#### GitHub Project Setup
```yaml
project_name: "Multi-Agent Development Board"
columns:
  - name: "Ready"
    automation: 
      - Add issues with 'status-ready' label
  - name: "Assigned"
    automation:
      - Add issues with 'status-assigned' label
  - name: "In Progress"
    automation:
      - Add issues with 'status-in-progress' label
  - name: "Blocked"
    automation:
      - Add issues with 'status-blocked' label
  - name: "Review"
    automation:
      - Add issues with 'status-review' label
  - name: "Done"
    automation:
      - Add closed issues
```

### 1.2 Migration Scripts

#### Task Parser Script
```python
# scripts/parse_agents_board.py
import re
import json
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Task:
    id: str
    description: str
    skills: List[str]
    owner: str
    status: str
    dependencies: List[str]
    priority: str
    hours: int

class BoardParser:
    def __init__(self, board_path: str):
        self.board_path = board_path
        
    def parse(self) -> List[Task]:
        """Parse AGENTS_BOARD.md and extract all tasks"""
        with open(self.board_path, 'r') as f:
            content = f.read()
        
        # Regex to match task rows
        task_pattern = r'\| (T\d+)\s*\| ([^|]+)\s*\| ([^|]+)\s*\| ([^|]+)\s*\| ([^|]+)\s*\| ([^|]+)\s*\| (P\d)\s*\| (\d+)\s*\|'
        
        tasks = []
        for match in re.finditer(task_pattern, content):
            task = Task(
                id=match.group(1).strip(),
                description=match.group(2).strip(),
                skills=[s.strip() for s in match.group(3).split(',')],
                owner=match.group(4).strip(),
                status=self._parse_status(match.group(5).strip()),
                dependencies=[d.strip() for d in match.group(6).split(',') if d.strip() and d.strip() != '-'],
                priority=match.group(7).strip(),
                hours=int(match.group(8).strip())
            )
            tasks.append(task)
        
        return tasks
    
    def _parse_status(self, status: str) -> str:
        """Convert emoji status to label"""
        status_map = {
            '✅ assigned': 'assigned',
            '🏃 in-progress': 'in-progress',
            '⏸️ blocked': 'blocked',
            '✨ ready': 'ready',
            '✔️ done': 'done',
            '📋 unassigned': 'ready'
        }
        return status_map.get(status, 'ready')
```

#### GitHub Issue Creator
```python
# scripts/create_github_issues.py
import subprocess
import json
from typing import List

class GitHubIssueCreator:
    def __init__(self, project_name: str, milestone: str = None):
        self.project_name = project_name
        self.milestone = milestone
    
    def create_issue(self, task: Task) -> int:
        """Create a GitHub issue from a task"""
        # Build labels
        labels = [f"priority-{task.priority}"]
        labels.append(f"status-{task.status}")
        
        # Add skill labels
        for skill in task.skills:
            labels.append(f"skill-{skill.replace(' ', '-')}")
        
        # Add agent label if assigned
        if task.owner != "unassigned" and task.owner != "📋 unassigned":
            labels.append(f"agent-{task.owner}")
        
        # Build issue body
        body = f"""## Task Description
{task.description}

## Original Task ID
{task.id}

## Skills Required
{', '.join(task.skills)}

## Dependencies
{', '.join(task.dependencies) if task.dependencies else 'None'}

## Estimated Hours
{task.hours} hours

## Status
Current status from board: {task.status}
"""
        
        # Create issue using gh CLI
        cmd = [
            "gh", "issue", "create",
            "--title", f"{task.id}: {task.description}",
            "--body", body,
            "--label", ",".join(labels)
        ]
        
        if self.milestone:
            cmd.extend(["--milestone", self.milestone])
        
        if self.project_name:
            cmd.extend(["--project", self.project_name])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            # Extract issue number from output
            issue_url = result.stdout.strip()
            issue_num = int(issue_url.split('/')[-1])
            return issue_num
        else:
            raise Exception(f"Failed to create issue: {result.stderr}")
```

#### Bidirectional Sync Script
```bash
#!/bin/bash
# scripts/sync_task_systems.sh

# Sync from AGENTS_BOARD.md to GitHub Issues
sync_board_to_github() {
    echo "Syncing AGENTS_BOARD.md to GitHub Issues..."
    python scripts/parse_agents_board.py | python scripts/sync_to_github.py
}

# Sync from GitHub Issues to AGENTS_BOARD.md  
sync_github_to_board() {
    echo "Syncing GitHub Issues to AGENTS_BOARD.md..."
    gh issue list --limit 1000 --json number,title,assignees,labels,state | \
        python scripts/update_board_from_github.py
}

# Run based on TASK_SYSTEM mode
case "$TASK_SYSTEM" in
    "sync")
        sync_board_to_github
        sync_github_to_board
        ;;
    "github")
        sync_board_to_github
        ;;
    "board")
        # No sync needed in board-only mode
        ;;
    *)
        echo "Unknown TASK_SYSTEM: $TASK_SYSTEM"
        exit 1
        ;;
esac
```

### 1.3 Mapping Database
```json
{
  "task_mappings": {
    "T1": {"github_issue": 234, "last_sync": "2025-01-20T10:00:00Z"},
    "T2": {"github_issue": 235, "last_sync": "2025-01-20T10:00:00Z"},
    "T129": {"github_issue": 301, "last_sync": "2025-01-20T10:00:00Z"}
  },
  "sync_status": {
    "last_board_to_github": "2025-01-20T10:00:00Z",
    "last_github_to_board": "2025-01-20T10:05:00Z",
    "conflicts": []
  }
}
```

## Phase 2: Agent Compatibility Layer (Week 2)

### 2.1 Task Wrapper Library
```bash
# scripts/task_lib.sh
#!/bin/bash

# Detect which task system to use
get_task_system() {
    echo "${TASK_SYSTEM:-board}"
}

# Get tasks for current agent
get_my_tasks() {
    local agent_name=$1
    local system=$(get_task_system)
    
    case "$system" in
        "github")
            gh issue list --assignee "$agent_name" --state open --json number,title,labels
            ;;
        "board"|*)
            grep -A 5 "$agent_name.*assigned\|in-progress" AGENTS_BOARD.md
            ;;
    esac
}

# Claim a task
claim_task() {
    local task_id=$1
    local agent_name=$2
    local system=$(get_task_system)
    
    case "$system" in
        "github")
            # If task_id starts with T, look up GitHub issue number
            if [[ $task_id == T* ]]; then
                issue_num=$(jq -r ".task_mappings.\"$task_id\".github_issue" .task_mappings.json)
                gh issue edit "$issue_num" --assignee "$agent_name"
            else
                gh issue edit "$task_id" --assignee "$agent_name"
            fi
            ;;
        "sync")
            # Update both systems
            claim_task_board "$task_id" "$agent_name"
            claim_task_github "$task_id" "$agent_name"
            ;;
        "board"|*)
            claim_task_board "$task_id" "$agent_name"
            ;;
    esac
}

# Update task status
update_task_status() {
    local task_id=$1
    local new_status=$2
    local system=$(get_task_system)
    
    case "$system" in
        "github")
            if [[ $task_id == T* ]]; then
                issue_num=$(jq -r ".task_mappings.\"$task_id\".github_issue" .task_mappings.json)
            else
                issue_num=$task_id
            fi
            
            # Remove old status labels
            gh issue edit "$issue_num" --remove-label "status-ready,status-assigned,status-in-progress,status-blocked,status-review"
            # Add new status label
            gh issue edit "$issue_num" --add-label "status-$new_status"
            ;;
        "board"|*)
            # Update board file (implementation depends on current format)
            update_board_status "$task_id" "$new_status"
            ;;
    esac
}
```

### 2.2 Updated Agent Instructions Template
```markdown
## Task Management (Dual-Mode)

The task system supports both AGENTS_BOARD.md and GitHub Issues.
Current mode: Check `echo $TASK_SYSTEM` (defaults to 'board' if unset)

### Common Task Operations

#### View Your Tasks
```bash
# Automatically uses correct system
source scripts/task_lib.sh
get_my_tasks "agent-name"
```

#### Claim a Task  
```bash
# Works with both T-numbers and issue numbers
claim_task "T129" "agent-name"
# or
claim_task "301" "agent-name"  # GitHub issue number
```

#### Update Status
```bash
update_task_status "T129" "in-progress"
```

### Mode-Specific Instructions

#### When TASK_SYSTEM=board (default)
- Edit AGENTS_BOARD.md directly
- Follow existing workflow
- No changes needed

#### When TASK_SYSTEM=github
- Use `gh issue` commands
- Task IDs can be T-numbers (mapped) or issue numbers
- Comments for progress updates: `gh issue comment <num> -b "Update"`
- Close with: `gh issue close <num> -c "Completed in PR #123"`

#### When TASK_SYSTEM=sync
- Updates both systems automatically
- Use either workflow
- Check for sync conflicts in logs
```

## Phase 3: Testing & Validation (Week 3)

### 3.1 Test Plan

#### Unit Tests
```python
# tests/test_migration.py
import pytest
from scripts.parse_agents_board import BoardParser, Task

def test_parse_task_row():
    parser = BoardParser("test_board.md")
    tasks = parser.parse()
    
    assert len(tasks) > 0
    assert tasks[0].id == "T129"
    assert tasks[0].priority == "P0"
    assert "convex" in tasks[0].skills

def test_status_mapping():
    parser = BoardParser("test_board.md")
    assert parser._parse_status("✅ assigned") == "assigned"
    assert parser._parse_status("📋 unassigned") == "ready"

def test_github_issue_creation():
    # Mock gh CLI calls
    # Test label generation
    # Test dependency handling
    pass
```

#### Integration Tests
```bash
#!/bin/bash
# tests/test_integration.sh

# Test 1: Create task in board, verify it appears in GitHub
echo "| T999 | Test Task | testing | unassigned | ready | - | P2 | 1 |" >> AGENTS_BOARD.md
TASK_SYSTEM=sync ./scripts/sync_task_systems.sh
issue_num=$(gh issue list --search "T999" --json number -q '.[0].number')
[[ -n "$issue_num" ]] || exit 1

# Test 2: Update issue in GitHub, verify board updates
gh issue edit "$issue_num" --assignee "test-agent"
TASK_SYSTEM=sync ./scripts/sync_task_systems.sh
grep "T999.*test-agent" AGENTS_BOARD.md || exit 1

# Test 3: Test rollback
TASK_SYSTEM=board
# Verify board-only mode works
```

### 3.2 Agent Testing Protocol

1. **Alpha Test with migration-agent**
   - Set `TASK_SYSTEM=github` for migration-agent only
   - Verify all operations work correctly
   - Monitor for errors

2. **Beta Test with volunteer agent**
   - Choose low-activity agent (e.g., docs-agent)
   - Run in dual mode for 24 hours
   - Collect feedback and fix issues

3. **Gradual Rollout**
   - Add one agent per day to GitHub mode
   - Monitor sync scripts for conflicts
   - Keep rollback ready

## Phase 4: Migration Execution (Week 4)

### 4.1 Pre-Migration Checklist
- [ ] All active tasks synced to GitHub
- [ ] Mapping database complete and verified
- [ ] All agents have updated CLAUDE.md files
- [ ] Sync scripts running without errors
- [ ] Rollback procedure tested
- [ ] Team notified of migration window

### 4.2 Migration Runbook

#### Step 1: Final Sync
```bash
# Stop all agent activity
echo "MIGRATION IN PROGRESS" > .migration_lock

# Final sync from board to GitHub
TASK_SYSTEM=sync ./scripts/sync_task_systems.sh

# Verify sync
./scripts/verify_sync.sh
```

#### Step 2: Switch Agents
```bash
# Update environment for all agents
echo "TASK_SYSTEM=github" >> .env

# Remove migration lock
rm .migration_lock

# Notify agents
echo "Migration complete. All agents now using GitHub Issues" | tee MIGRATION_COMPLETE.txt
```

#### Step 3: Archive Board
```bash
# Create final snapshot
cp AGENTS_BOARD.md "AGENTS_BOARD_FINAL_$(date +%Y%m%d).md"

# Update README
echo "Task management has moved to GitHub Issues" > AGENTS_BOARD.md
echo "See: https://github.com/USER/REPO/issues" >> AGENTS_BOARD.md
echo "Final snapshot: AGENTS_BOARD_FINAL_*.md" >> AGENTS_BOARD.md
```

### 4.3 Rollback Procedure
```bash
#!/bin/bash
# Emergency rollback if needed

# Revert environment
sed -i '/TASK_SYSTEM=github/d' .env

# Sync GitHub state back to board
TASK_SYSTEM=board ./scripts/sync_github_to_board_emergency.sh

# Notify team
echo "ROLLBACK COMPLETE - Using AGENTS_BOARD.md" | tee ROLLBACK_NOTICE.txt
```

## Phase 5: Post-Migration (Week 5+)

### 5.1 Monitoring
- Daily sync validation for 1 week
- Performance metrics (API calls, response times)
- Agent feedback collection
- Issue tracking for migration bugs

### 5.2 Optimization
- Remove sync overhead after stable
- Archive mapping database
- Clean up compatibility layer
- Update documentation

### 5.3 Enhancements
- GitHub Actions for auto-assignment
- Advanced project automation
- Integration with CI/CD
- Metrics dashboard

## Success Criteria

### Functional Requirements
- ✅ All tasks migrated to GitHub Issues
- ✅ No tasks lost during migration
- ✅ All agents working with new system
- ✅ Historical data preserved

### Performance Metrics
- GitHub API response time < 500ms
- No increase in task assignment latency
- Sync conflicts < 1%
- Zero data loss

### Quality Gates
- All unit tests passing
- Integration tests 100% success
- At least 3 agents tested before full rollout
- Rollback tested and verified

## Risk Mitigation

### Identified Risks
1. **GitHub API Rate Limits**
   - Mitigation: Batch operations, caching
   
2. **Sync Conflicts**
   - Mitigation: Conflict resolution logic, manual review

3. **Agent Confusion**
   - Mitigation: Clear documentation, gradual rollout

4. **Data Loss**
   - Mitigation: Multiple backups, verification scripts

5. **Performance Degradation**
   - Mitigation: Monitoring, optimization, caching

## Appendix: Command Reference

### Migration Agent Commands
```bash
# Setup infrastructure
./scripts/setup_github_infra.sh

# Parse board file
python scripts/parse_agents_board.py > tasks.json

# Create GitHub issues
python scripts/create_github_issues.py < tasks.json

# Run sync
TASK_SYSTEM=sync ./scripts/sync_task_systems.sh

# Verify migration
./scripts/verify_migration.sh

# Emergency rollback
./scripts/rollback.sh
```

### Monitoring Commands
```bash
# Check sync status
jq '.sync_status' .task_mappings.json

# Find conflicts
jq '.sync_status.conflicts' .task_mappings.json

# GitHub API usage
gh api rate_limit

# Task count verification
echo "Board tasks: $(grep -c "^| T[0-9]" AGENTS_BOARD.md)"
echo "GitHub tasks: $(gh issue list --limit 1000 --json number | jq length)"
```