# GitHub Issues Migration Checklist

## ✅ Completed Items

### 1. Infrastructure Setup
- [x] GitHub labels created (agents, skills, status, priority)
- [x] Issue templates created (.github/ISSUE_TEMPLATE/agent-task.yml)
- [x] Migration scripts implemented
- [x] Task mappings file created (.task_mappings.json)
- [x] Board archived (.board_archive/)

### 2. Command Updates
- [x] `/check-tasks` command updated to use GitHub CLI
- [x] Command documentation updated

### 3. Agent Configuration Updates
- [x] All CLAUDE*.md files updated (12 agent configs)
- [x] Removed AGENTS_BOARD.md references
- [x] Added GitHub Issues task management sections

### 4. Documentation Updates
- [x] README.md updated
- [x] CONTRIBUTING.md updated
- [x] QUICKSTART.md updated
- [x] Other documentation files updated
- [x] Created GITHUB_ISSUES_QUICKSTART.md guide

## 🔄 Recommended Actions

### 1. Team Communication
- [ ] Announce migration completion to all agents
- [ ] Share GITHUB_ISSUES_QUICKSTART.md with team
- [ ] Schedule training session if needed

### 2. Process Verification
- [ ] Have each agent run `/check-tasks` to verify it works
- [ ] Test full workflow: claim → work → complete
- [ ] Verify all agents can authenticate with `gh auth status`

### 3. GitHub Setup
- [ ] Consider setting up GitHub Project board (requires additional permissions)
- [ ] Configure GitHub Actions for automated label management
- [ ] Set up issue assignment rules/automation

### 4. Monitoring & Maintenance
- [ ] Monitor first week of usage for issues
- [ ] Collect feedback from agents
- [ ] Update documentation based on feedback
- [ ] Consider creating agent-specific GitHub teams

### 5. Advanced Features (Optional)
- [ ] Set up GitHub Milestones for sprints
- [ ] Configure GitHub Discussions for agent communication
- [ ] Create GitHub Wiki for agent documentation
- [ ] Set up GitHub Projects automation

## 🚨 Important Reminders

1. **Authentication**: All agents must run `gh auth login` before using the system

2. **Permissions**: Ensure all agents have:
   - Repository write access
   - Issue management permissions
   - Label management permissions

3. **Rollback Plan**: If issues arise:
   ```bash
   # Quick rollback to board mode
   export TASK_SYSTEM=board
   
   # Full rollback
   ./scripts/migration/rollback.sh
   ```

4. **Training Resources**:
   - GITHUB_ISSUES_QUICKSTART.md - Quick reference
   - scripts/migration/agent_instructions_template.md - Detailed guide
   - GitHub CLI documentation: https://cli.github.com/

## 📊 Success Metrics

Track these metrics to ensure successful adoption:

1. **Adoption Rate**: % of agents using GitHub Issues
2. **Task Velocity**: Tasks completed per week
3. **Response Time**: Time from task creation to claim
4. **Completion Rate**: Tasks completed vs created
5. **Agent Satisfaction**: Feedback on new system

## 🔍 Common Issues & Solutions

### Issue: "No tasks found"
- Ensure labels are correctly applied to issues
- Check agent skills match task requirements
- Verify `gh auth status` shows proper authentication

### Issue: "Command not found: gh"
- Install GitHub CLI: `brew install gh` (macOS)
- Or download from: https://cli.github.com/

### Issue: "Permission denied"
- Check repository access permissions
- Ensure proper GitHub authentication
- Contact repository admin for access

### Issue: "Can't find my old task"
- Check `.task_mappings.json` for ID mapping
- Search by old task ID: `gh issue list --search "T123"`
- Check archived board in `.board_archive/`

## 📝 Next Steps

1. **Immediate** (Today):
   - Test `/check-tasks` with all agents
   - Ensure all agents can authenticate
   - Share quickstart guide

2. **Short-term** (This Week):
   - Monitor adoption and usage
   - Collect initial feedback
   - Address any urgent issues

3. **Long-term** (This Month):
   - Optimize workflows based on usage
   - Consider additional automations
   - Plan for advanced features

## 📞 Support

- **Technical Issues**: Create issue with `migration-issue` label
- **Process Questions**: Refer to GITHUB_ISSUES_QUICKSTART.md
- **Emergency**: Use rollback procedure if critical issues arise