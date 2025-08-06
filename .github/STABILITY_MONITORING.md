# 🛡️ Stability Monitoring System Documentation

## Overview

The Stability Monitoring System provides automated, continuous monitoring of the main branch health through comprehensive metrics collection, analysis, and alerting. This system helps prevent stability issues before they become critical and ensures the main branch remains production-ready.

## Table of Contents

- [Architecture](#architecture)
- [Metrics](#metrics)
- [Workflows](#workflows)
- [Alerts](#alerts)
- [Dashboard](#dashboard)
- [Configuration](#configuration)
- [Response Procedures](#response-procedures)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                   GitHub Actions                         │
│  ┌────────────────────────────────────────────────┐     │
│  │         stability-monitor.yml                   │     │
│  │  - Scheduled (Daily 9 AM UTC)                  │     │
│  │  - Manual Trigger                              │     │
│  └────────────────┬───────────────────────────────┘     │
│                   │                                      │
│  ┌────────────────▼───────────────────────────────┐     │
│  │     collect-stability-metrics.js               │     │
│  │  - Test Coverage Analysis                      │     │
│  │  - CI Success Rate Calculation                 │     │
│  │  - Bug Count Collection                        │     │
│  │  - Stability Score Computation                 │     │
│  └────────────────┬───────────────────────────────┘     │
│                   │                                      │
│         ┌─────────┴──────────┬──────────────┐          │
│         ▼                    ▼              ▼          │
│   ┌──────────┐        ┌──────────┐   ┌──────────┐     │
│   │ Dashboard │        │  Alerts  │   │ Storage  │     │
│   │  Update   │        │ Creation │   │ History  │     │
│   └──────────┘        └──────────┘   └──────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Trigger**: Daily schedule or manual workflow dispatch
2. **Collection**: Metrics script gathers data from various sources
3. **Analysis**: Calculate stability score and detect anomalies
4. **Reporting**: Update dashboard and create summary
5. **Alerting**: Create GitHub issues for critical conditions
6. **Storage**: Save historical data for trend analysis

## Metrics

### Primary Metrics

#### 1. Test Coverage (30% weight)
- **Source**: Jest coverage reports
- **Target**: ≥80%
- **Calculation**: Average of lines, statements, functions, and branches coverage
- **Collection**: `coverage/coverage-summary.json`

#### 2. CI Success Rate (30% weight)
- **Source**: GitHub Actions API
- **Target**: ≥90%
- **Calculation**: Successful runs / Total runs (last 7 days)
- **Scope**: Main branch only

#### 3. Test Pass Rate (20% weight)
- **Source**: Jest test results
- **Target**: ≥95%
- **Calculation**: Passed tests / Total tests
- **Real-time**: Collected during monitoring run

#### 4. Bug Impact (20% weight)
- **Source**: GitHub Issues API
- **Target**: 0 P0 bugs, ≤5 P1 bugs
- **Calculation**: 100 - (P0 bugs × 10)
- **Labels**: `bug`, `priority-P0`, `priority-P1`

### Stability Score Formula

```javascript
stabilityScore = (
  (testCoverage × 0.3) +
  (ciSuccessRate × 0.3) +
  (bugImpactScore × 0.2) +
  (testPassRate × 0.2)
)
```

### Score Thresholds

| Score Range | Status | Indicator | Action Required |
|------------|--------|-----------|-----------------|
| 90-100% | Healthy | ✅ | None - maintain standards |
| 75-89% | Warning | ⚠️ | Review and plan fixes |
| 0-74% | Critical | 🚨 | Immediate intervention |

## Workflows

### Main Workflow: `stability-monitor.yml`

#### Schedule
- **Daily**: 9:00 AM UTC
- **Manual**: Via workflow_dispatch with optional alert threshold

#### Jobs

1. **collect-metrics**
   - Runs metrics collection script
   - Outputs all metric values
   - Checks alert thresholds

2. **generate-report**
   - Creates GitHub Actions summary
   - Updates stability dashboard
   - Generates recommendations

3. **create-alerts**
   - Runs only if alerts triggered
   - Creates GitHub issues for critical conditions
   - Avoids duplicate issues

4. **store-metrics**
   - Saves historical data
   - Maintains 90-day rolling window
   - Enables trend analysis

#### Permissions Required
- `contents: read` - Read repository files
- `issues: write` - Create alert issues
- `pull-requests: read` - Analyze PR metrics
- `actions: read` - Read workflow runs
- `checks: read` - Read check status

## Alerts

### Alert Conditions

#### Critical Alerts (P0)
- Stability score < 75%
- Any P0 bugs open
- CI success rate < 70%
- Test infrastructure completely broken

#### Warning Alerts (P1)
- Stability score 75-89%
- Test coverage drops >5%
- 3+ consecutive CI failures
- P1 bugs > 5

### Alert Mechanism

1. **Detection**: Thresholds checked in workflow
2. **Deduplication**: Check for existing open alerts
3. **Creation**: GitHub issue with details
4. **Labels**: `stability-alert`, `priority-P0`, `bug`
5. **Assignment**: Auto-assign to team leads
6. **Notification**: @ mention relevant stakeholders

### Alert Issue Template

```markdown
## 🚨 Stability Alert Triggered

**Date:** [timestamp]
**Stability Score:** [score]%

### Alert Reasons
[List of triggered conditions]

### Current Metrics
- Test Coverage: [value]%
- CI Success Rate: [value]%
- P0 Bugs: [count]
- P1 Bugs: [count]

### Immediate Actions Required
1. Review and address P0 bugs if any
2. Investigate failing CI builds
3. Review recent merges for potential issues
4. Check test infrastructure health

### Dashboard
[Link to stability dashboard]
```

## Dashboard

### Location
`.github/stability-dashboard.md`

### Components

1. **Status Badges**: Real-time CI/CD status
2. **Stability Score**: Current overall health
3. **Key Metrics Table**: All primary metrics
4. **Trend Charts**: Historical data visualization
5. **Active Alerts**: Current issues requiring attention
6. **Quick Actions**: Response procedures
7. **Documentation Links**: Related resources

### Update Frequency
- **Automatic**: Daily via workflow
- **Real-time**: Badges update with each CI run
- **Manual**: Can be triggered on-demand

## Configuration

### Workflow Configuration

```yaml
# Modify schedule
on:
  schedule:
    - cron: '0 9 * * *'  # Change time here

# Adjust alert threshold
workflow_dispatch:
  inputs:
    alert_threshold:
      default: '90'  # Change default threshold
```

### Metric Weights

To adjust metric weights, modify in `collect-stability-metrics.js`:

```javascript
const stabilityScore = (
  (testCoverage * 0.3) +    // Adjust weight
  (ciSuccessRate * 0.3) +   // Adjust weight
  (bugImpactScore * 0.2) +  // Adjust weight
  (testPassRate * 0.2)      // Adjust weight
);
```

### Alert Thresholds

Modify in workflow file:

```bash
# Coverage drop threshold
if (( $(echo "$COVERAGE_DROP > 5" | bc -l) )); then

# CI failure threshold
if (( $(echo "$CI_SUCCESS < 70" | bc -l) )); then
```

## Response Procedures

### Critical Alert Response (< 75%)

#### Immediate (0-1 hour)
1. **Stop deployments**: Halt all production deployments
2. **Assemble team**: Alert on-call engineers
3. **Initial assessment**: Review alert details and metrics
4. **Communication**: Update status page and stakeholders

#### Investigation (1-4 hours)
1. **Root cause analysis**: Identify what triggered the alert
2. **Recent changes**: Review last 24h of merges
3. **Infrastructure check**: Verify CI/CD systems operational
4. **Test locally**: Reproduce issues in development

#### Resolution (4-24 hours)
1. **Fix or revert**: Apply fixes or revert problematic changes
2. **Verify**: Run full test suite and checks
3. **Monitor**: Watch metrics after fix deployment
4. **Document**: Create post-mortem document

### Warning Alert Response (75-89%)

#### Assessment (0-2 hours)
1. **Review metrics**: Identify which metrics are low
2. **Prioritize**: Determine urgency of fixes
3. **Assign**: Designate owners for each issue

#### Planning (2-8 hours)
1. **Create issues**: Document each problem
2. **Sprint planning**: Include fixes in next sprint
3. **Set targets**: Define success criteria

#### Execution (1-5 days)
1. **Implement fixes**: Address identified issues
2. **Test thoroughly**: Ensure fixes don't introduce new problems
3. **Deploy carefully**: Use staged rollout if needed

## Maintenance

### Daily Tasks
- Review morning stability report
- Check for triggered alerts
- Verify workflow ran successfully

### Weekly Tasks
- Review stability trends
- Clean up resolved alert issues
- Update documentation if needed

### Monthly Tasks
- Analyze long-term trends
- Adjust thresholds based on data
- Review and optimize metric collection
- Archive old metric data

### Quarterly Tasks
- Comprehensive system review
- Update stability targets
- Team training on procedures
- Process improvement planning

## Troubleshooting

### Common Issues

#### Workflow Fails to Run
```bash
# Check workflow syntax
gh workflow view stability-monitor.yml

# Check recent runs
gh run list --workflow=stability-monitor.yml

# Trigger manually
gh workflow run stability-monitor.yml
```

#### Metrics Collection Errors
```bash
# Run script locally
node .github/scripts/collect-stability-metrics.js

# Check permissions
gh auth status

# Verify coverage exists
ls -la coverage/coverage-summary.json
```

#### Alert Not Created
```bash
# Check for existing alerts
gh issue list --label "stability-alert" --state open

# Check workflow logs
gh run view [run-id] --log
```

#### Dashboard Not Updating
- Verify workflow has write permissions
- Check if running on main branch
- Review workflow logs for errors

### Debug Mode

Enable debug logging:

```javascript
// In collect-stability-metrics.js
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('Debug: Raw metrics:', metrics);
}
```

Run with debug:
```bash
DEBUG=true node .github/scripts/collect-stability-metrics.js
```

## Integration Points

### CI/CD Pipeline
- Integrates with existing CI workflows
- Reads test and coverage reports
- Monitors workflow success rates

### Issue Tracking
- Creates and manages alert issues
- Counts bugs by priority labels
- Links to relevant issues

### Team Communication
- Can integrate with Slack/Discord webhooks
- Mentions team members in alerts
- Updates in daily standup notes

### Monitoring Stack
- Exports metrics as JSON
- Can feed into Datadog/Grafana
- Supports custom metric backends

## Future Enhancements

### Planned Features
1. **Slack Integration**: Direct notifications to team channels
2. **Predictive Alerts**: ML-based trend prediction
3. **Custom Metrics**: Extensible metric collection
4. **Performance Tracking**: Page load and API response times
5. **Deployment Correlation**: Link stability changes to deployments

### Contribution Guidelines
1. Test changes locally first
2. Update documentation for new features
3. Maintain backward compatibility
4. Add tests for new metrics
5. Follow existing code patterns

## Support

### Getting Help
- Review this documentation
- Check workflow logs
- Ask in #dev-infrastructure channel
- Create issue with `stability-monitoring` label

### Contacts
- **System Owner**: @infra-agent
- **Backup**: @quality-agent
- **Escalation**: @aviswerdlow

---

_Last Updated: [Auto-updated with each change]_
_Version: 1.0.0_