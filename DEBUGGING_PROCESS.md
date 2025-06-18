# 🔧 MANDATORY DEBUGGING & DEVELOPMENT PROCESS

**⚠️ CRITICAL: This process MUST be followed for every issue, no exceptions.**

## 🔍 PHASE 1: RESEARCH & ANALYSIS (MANDATORY FIRST STEP)

### Step 1.1: Current State Assessment
**NEVER skip this step. Always run these commands FIRST:**

```bash
# 1. Check all environment configurations
echo "=== ROOT ENV ===" && cat .env.local || echo "No root .env.local"
echo "=== WEB ENV ===" && cat apps/web/.env.local || echo "No web .env.local"

# 2. Check running processes
echo "=== CONVEX PROCESSES ===" && ps aux | grep convex | grep -v grep || echo "No convex processes"
echo "=== NODE PROCESSES ===" && ps aux | grep node | grep -v grep || echo "No node processes"

# 3. Check network connections
echo "=== ACTIVE CONNECTIONS ===" && lsof -i :3000-3002 || echo "No connections on ports 3000-3002"

# 4. Verify file structure
echo "=== PROJECT STRUCTURE ===" && ls -la && echo "=== APPS DIR ===" && ls -la apps/ || echo "No apps dir"
```

### Step 1.2: Error Analysis
**Before making ANY changes, document:**

1. **Exact error messages** (copy/paste, no paraphrasing)
2. **When the error occurs** (startup, runtime, user action)
3. **What was working before** (if anything)
4. **Recent changes made** (environment, code, deployments)

### Step 1.3: Root Cause Hypothesis
**Write down 3 possible causes ranked by likelihood:**

1. Most likely cause:
2. Secondary cause:
3. Edge case cause:

## 🧪 PHASE 2: SYSTEMATIC TESTING

### Step 2.1: Verify Assumptions
**Test each hypothesis systematically:**

```bash
# Test connectivity
curl -s [API_ENDPOINT] || echo "Endpoint unreachable"

# Test environment variables
echo "Testing env vars:" && printenv | grep [RELEVANT_PREFIX]

# Test file permissions
ls -la [RELEVANT_FILES]
```

### Step 2.2: Minimal Reproduction
**Create the smallest possible test case that reproduces the issue**

## 🔧 PHASE 3: IMPLEMENTATION (Only after Phases 1-2)

### Step 3.1: Single Change Rule
**Make ONE change at a time. Never batch changes.**

1. Document what you're changing and why
2. Make the change
3. Test immediately
4. Document the result
5. If failed, revert before trying next approach

### Step 3.2: Change Documentation Template
```markdown
**Change #[N]**
- **Objective**: [What you're trying to fix]
- **Action**: [Exact change being made]
- **Expected Result**: [What should happen]
- **Actual Result**: [What actually happened]
- **Status**: [Success/Failure/Partial]
- **Next Action**: [If failed, what's next]
```

## 🧐 PHASE 4: VERIFICATION

### Step 4.1: Full System Test
**After each successful change:**

1. Test the specific issue that was fixed
2. Test related functionality
3. Test basic user flows
4. Check for new errors in logs

### Step 4.2: Environment Consistency Check
```bash
# Verify all environments match expected state
echo "=== FINAL STATE VERIFICATION ==="
echo "Root env:" && grep [RELEVANT] .env.local
echo "Web env:" && grep [RELEVANT] apps/web/.env.local
echo "Running processes:" && ps aux | grep -E "(convex|node)" | grep -v grep
```

## 🚨 CRITICAL RULES

### Rule 1: NO ASSUMPTIONS
- **NEVER assume** environment state
- **NEVER assume** processes are running
- **NEVER assume** configurations are correct
- **ALWAYS verify** before proceeding

### Rule 2: RESEARCH BEFORE ACTION
- **NEVER make changes** without understanding current state
- **NEVER copy/paste solutions** without understanding them
- **ALWAYS read** error messages completely
- **ALWAYS check** official documentation first

### Rule 3: ONE THING AT A TIME
- **NEVER make** multiple changes simultaneously
- **NEVER skip** verification steps
- **NEVER assume** a change worked without testing
- **ALWAYS revert** failed changes before trying new ones

### Rule 4: DOCUMENT EVERYTHING
- **ALWAYS document** what you're doing and why
- **ALWAYS capture** error messages exactly
- **ALWAYS record** the results of each change
- **ALWAYS explain** your reasoning

## 🛠️ COMMON ISSUES CHECKLIST

### Authentication Issues
- [ ] JWT template exists and correctly configured
- [ ] Environment variables match between services
- [ ] Clerk domain configuration is correct
- [ ] API keys are valid and not expired

### Environment Mismatches
- [ ] All .env.local files point to same deployment
- [ ] Convex deployment is actually running
- [ ] Port conflicts resolved
- [ ] Process ownership verified

### Database/API Issues
- [ ] Database schema deployed
- [ ] Functions deployed and accessible
- [ ] Network connectivity verified
- [ ] Permissions configured correctly

## 📋 MANDATORY CHECKLIST BEFORE ANY CHANGE

- [ ] Current state documented
- [ ] Error messages captured exactly
- [ ] Running processes identified
- [ ] Environment configurations verified
- [ ] Root cause hypothesis formulated
- [ ] Test plan created
- [ ] Rollback plan prepared

## 🔄 ROLLBACK PROCEDURES

**ALWAYS have a rollback plan before making changes:**

1. **Environment Changes**: Copy current .env files before modification
2. **Code Changes**: Note exact lines being changed
3. **Process Changes**: Document how to restart/stop services
4. **Configuration Changes**: Backup original configs

---

**🎯 REMEMBER: Slow and systematic beats fast and broken every time.** 