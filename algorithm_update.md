## Enhanced Task Assignment Algorithm

### Evidence-Based Scoring System
```yaml
Score_Calculation:
  # Primary factors (evidence-based)
  skill_match: count(required_skills ∩ agent.primary_skills) × 10
  persona_match: agent.has_appropriate_persona × 5
  mcp_compatibility: agent.supports_required_mcp × 3
  
  # Load balancing factors
  current_active: min(agent.active_tasks, MAX_ACTIVE_TASKS) × -8
  total_assigned: agent.total_tasks × -2
  
  # Performance factors
  success_rate: agent.completion_rate × 3
  avg_completion_time: (1 / agent.avg_hours) × 2
  
  # Context factors
  domain_expertise: agent.domain_matches × 4
  recent_similar: agent.similar_tasks_completed × 2

Assignment_Thresholds:
  - Score > 25: Excellent match (auto-assign)
  - Score 20-25: Strong match (recommend)
  - Score 15-20: Good match (consider)
  - Score 10-15: Acceptable (if needed)
  - Score < 10: Poor match (avoid)

Load_Limits:
  - max_active: 3 tasks per agent
  - max_total: 10 tasks per agent
  - min_idle_time: 2 hours between tasks
```

### Agent Capability Matrix (Updated)
| Agent | Primary Skills | Secondary Skills | SuperClaude Tools | Max Active |
|-------|---------------|------------------|-------------------|------------|
| ai-agent | CrewAI, LangChain, ML/AI | Python, APIs | --seq, --c7 | 3 |
| backend-agent | Convex, APIs, TypeScript | Testing, Security | --seq, --c7 | 3 |
| frontend-agent | React, Next.js, UI/UX | Testing, A11y | --magic, --c7 | 3 |
| infra-agent | CI/CD, DevOps, Testing | Security, Monitoring | --seq, --c7 | 3 |
| quality-agent | Testing, Security, Perf | Automation | --pup, --seq | 3 |
| docs-agent | Writing, Tutorials | i18n, Examples | --c7, --seq | 3 |
| design-agent | UI/UX, Figma, A11y | Components | --magic | 3 |
| systems-design-agent | Architecture, Planning | Documentation | --seq, --c7 | 3 |
| migration-agent | Data, Schema, Compat | Testing | --seq, --c7 | 3 |

### Assignment Process
1. **Parse Request**: Extract skills, complexity, urgency
2. **Filter Agents**: Remove overloaded (active >= 3)
3. **Calculate Scores**: Apply evidence-based algorithm
4. **Rank Candidates**: Sort by score descending
5. **Validate Assignment**: Check dependencies, conflicts
6. **Create Issue**: Assign with proper labels
7. **Monitor Progress**: Track status updates

### Evidence Language
```yaml
Good_Examples:
  - "ai-agent selected based on CrewAI expertise (score: 28)"
  - "frontend-agent assigned due to React skills and availability"
  - "quality-agent chosen for testing focus (2 active, 1 slot open)"

Bad_Examples:
  - "best agent for the job"
  - "optimal assignment"
  - "perfect match"
```
