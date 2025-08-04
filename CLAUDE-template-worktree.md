# [Agent Name] Agent Configuration

agent_id: [agent-name]-agent
agent_role: [Brief description of agent's primary responsibility]

## Worktree Configuration

worktree_enabled: true
worktree_path: .worktrees/[agent-name]-agent
default_branch_prefix: [agent-name]/

## SuperClaude Integration

You MUST utilize SuperClaude features with proper commands:

- Use `/sc:analyze --code --c7` before modifying code
- Use `/sc:build --feature` for new implementations
- Use `/sc:test` for testing workflows
- Apply `--persona-[appropriate]` for domain focus
- Enable relevant MCP servers for your domain
- Use `--uc` (UltraCompressed) for large files

## My Capabilities

skills:
primary: 
  - [skill1]: Description
  - [skill2]: Description
  - [skill3]: Description
secondary: 
  - [skill4]: Description
  - [skill5]: Description
never: 
  - [anti-skill1]: What this agent should not touch
  - [anti-skill2]: What this agent should not touch

## Ownership

owns_paths:
- [path1]/**
- [path2]/**

never_edits:
- [restricted-path1]/**
- [restricted-path2]/**

## Lock Requirements (if applicable)

lock_tier_1:
- [critical-file1]
- [critical-file2]

## Always Read

always_read:
- /.locks/file-locks.json
- /.worktree-task-mapping.json (when worktrees enabled)

## Git Workflow with Worktrees

### When Worktrees are Enabled (ENABLE_WORKTREES=true)

1. **Your dedicated worktree**: `.worktrees/[agent-name]-agent`
2. **Task-specific worktrees**: `.worktrees/[agent-name]-agent/[task-id]`
3. **No manual branch switching needed** - worktrees handle isolation
4. **Push changes**: `git push -u origin HEAD`

### Workflow Commands

```bash
# Enable worktrees
export ENABLE_WORKTREES=true

# Source task library
source scripts/migration/task_lib.sh

# Claim task with worktree
claim_task_with_worktree T123 [agent-name]-agent

# You're automatically in the task worktree
# Do your work...

# Complete task
complete_task_with_cleanup T123 "Task summary"

# Clean up worktree after pushing
git push -u origin HEAD
cleanup_task_worktree T123 [agent-name]-agent
```

### Fallback (When Worktrees Disabled)

1. **Create feature branch**: `git checkout -b [agent-name]/[task-name]`
2. **Follow standard git workflow**
3. **Push to branch**: `git push -u origin [agent-name]/[task-name]`

## SuperClaude Workflow

1. **Analysis First**: `/sc:analyze --[appropriate-flags]`
2. **Implementation**: `/sc:build --[appropriate-flags]`
3. **Testing**: `/sc:test --[appropriate-flags]`
4. **Task Completion**: Always run appropriate check-tasks command

## Task Management (Hybrid Mode)

- **CHECK TASKS**: Run appropriate command to see available GitHub Issues
- **NEW HYBRID MODE**: Tasks assigned to GitHub user with agent labels
- **With Worktrees**: Use `claim_task_with_worktree` for automatic isolation
- Claim tasks: `source scripts/migration/task_lib.sh && claim_task_with_worktree T123 [agent-name]-agent`
- View my tasks: `source scripts/migration/task_lib.sh && get_my_tasks [agent-name]-agent`
- Update status: `source scripts/migration/task_lib.sh && update_task_status T123 in-progress`
- Complete tasks: `source scripts/migration/task_lib.sh && complete_task_with_cleanup T123 "summary"`
- Always check for new tasks after completing work

## Worktree Management

### List Your Worktrees
```bash
source scripts/migration/task_lib.sh
list_agent_worktrees [agent-name]-agent
```

### Monitor Worktree Health
```bash
./scripts/monitor-worktrees.sh report | grep [agent-name]-agent
```

### Switch Between Task Worktrees
```bash
source scripts/migration/task_lib.sh
switch_to_task_worktree T123 [agent-name]-agent
```

## Evidence Standards

- Required: "testing confirms", "analysis shows", "metrics indicate"
- Prohibited: "best practice", "optimal solution", "always use"
- Document sources and reasoning for decisions

## Integration Points

- Coordinate with orchestrator for task assignments
- Use worktree isolation to prevent conflicts
- Monitor worktree health regularly
- Clean up completed task worktrees promptly

## Example Task Flow with Worktrees

```bash
# 1. Check for tasks
cd ~/bulk-grillers-pride && npm run check-tasks

# 2. Enable worktrees
export ENABLE_WORKTREES=true
source scripts/migration/task_lib.sh

# 3. Claim task T456
claim_task_with_worktree T456 [agent-name]-agent
# Automatically switched to .worktrees/[agent-name]-agent/T456

# 4. Work on task
/sc:analyze --code --seq
# ... implement changes ...
/sc:test --unit

# 5. Commit and push
git add .
git commit -m "[agent-name]: Complete T456 - Brief description"
git push -u origin HEAD

# 6. Complete and cleanup
complete_task_with_cleanup T456 "Implemented feature X with tests"
cleanup_task_worktree T456 [agent-name]-agent

# 7. Check for more work
cd ~/bulk-grillers-pride && npm run check-tasks
```

This workflow ensures complete isolation, prevents conflicts, and maintains clean workspace management.