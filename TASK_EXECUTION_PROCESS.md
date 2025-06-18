# 📋 MANDATORY TASK EXECUTION PROCESS

**⚠️ CRITICAL: This process MUST be followed for EVERY task, no exceptions.**

## 📖 PHASE 1: TASK COMPREHENSION (MANDATORY FIRST STEP)

### Step 1.1: Read and Parse
**NEVER start working until you:**

1. **Read the user request 3 times**
2. **Identify the core objective** (what they actually want)
3. **Identify the scope** (how much work is involved)
4. **Identify any constraints** (time, technical, business)
5. **Flag any ambiguous parts** for clarification

### Step 1.2: Task Classification
**Classify the task type:**

- [ ] **Bug Fix** → Follow DEBUGGING_PROCESS.md
- [ ] **New Feature** → Follow feature development process
- [ ] **Refactoring** → Follow code improvement process
- [ ] **Configuration** → Follow setup/config process
- [ ] **Research** → Follow investigation process
- [ ] **Documentation** → Follow documentation process

### Step 1.3: Complexity Assessment
**Rate complexity (1-5):**

- **1-2: Simple** (< 30 min, single file, clear solution)
- **3: Medium** (30-60 min, multiple files, some research needed)
- **4-5: Complex** (> 60 min, architecture changes, extensive research)

**If complexity > 3, MUST break into smaller tasks**

## ❓ PHASE 2: CLARIFICATION & QUESTIONS

### Step 2.1: Mandatory Questions Checklist
**Ask these questions if ANY doubt exists:**

- [ ] **Scope**: "Do you want me to [specific action] or [alternative action]?"
- [ ] **Priority**: "Should I focus on [A] first or [B] first?"
- [ ] **Constraints**: "Are there any limitations I should know about?"
- [ ] **Success Criteria**: "How will we know this is complete?"
- [ ] **Integration**: "How should this work with [existing system]?"

### Step 2.2: Assumption Validation
**NEVER assume. Always state:**

"I'm assuming [X]. Is this correct?"

**Common assumptions to validate:**
- User's technical level
- Existing system state
- Compatibility requirements
- Performance expectations
- Timeline expectations

## 🔍 PHASE 3: RESEARCH & ANALYSIS

### Step 3.1: Current State Research
**MANDATORY: Always check current state first:**

```bash
# For code tasks
echo "=== CURRENT CODE STATE ===" 
find . -name "*.tsx" -o -name "*.ts" | head -10
git status
git log --oneline -5

# For configuration tasks  
echo "=== CURRENT CONFIG STATE ==="
find . -name "*.env*" -o -name "*.json" -o -name "*.config.*"
```

### Step 3.2: Requirements Research
**Research what's needed:**

1. **Check documentation** (official docs first)
2. **Check existing code patterns** (consistency)
3. **Check dependencies** (what's already installed)
4. **Check constraints** (technical limitations)

### Step 3.3: Solution Research
**Find the best approach:**

1. **Look for existing solutions** in codebase
2. **Check best practices** for the technology
3. **Consider multiple approaches** (minimum 2)
4. **Evaluate trade-offs** (performance, maintainability, complexity)

## 📝 PHASE 4: PLANNING

### Step 4.1: Solution Design
**Document your plan:**

```markdown
## SOLUTION PLAN

**Objective**: [Clear goal statement]

**Approach**: [High-level strategy]

**Steps**:
1. [First step with expected outcome]
2. [Second step with expected outcome]
3. [Third step with expected outcome]

**Files to modify**:
- `file1.ts` - [what changes]
- `file2.tsx` - [what changes]

**Dependencies needed**:
- [Any new packages]

**Risks**:
- [Potential issues]

**Testing plan**:
- [How to verify it works]

**Rollback plan**:
- [How to undo if needed]
```

### Step 4.2: Implementation Order
**Plan the sequence:**

1. **Setup/preparation** (backup, dependencies)
2. **Core implementation** (main functionality)
3. **Integration** (connecting parts)
4. **Testing** (verification)
5. **Cleanup** (remove temp files, optimize)

### Step 4.3: Validation Checkpoints
**Define success criteria for each step:**

- [ ] Step 1 success: [specific measurable outcome]
- [ ] Step 2 success: [specific measurable outcome]
- [ ] Step 3 success: [specific measurable outcome]

## 🔧 PHASE 5: IMPLEMENTATION

### Step 5.1: Preparation
**Before making ANY changes:**

1. **Backup critical files** if needed
2. **Verify current state** matches assumptions
3. **Check dependencies** are available
4. **Test current functionality** (baseline)

### Step 5.2: Incremental Implementation
**Follow the ONE CHANGE RULE:**

```markdown
**Change #1**
- **File**: [exact file path]
- **Action**: [specific change being made]
- **Expected Result**: [what should happen]
- **Test Command**: [how to verify]
- **Status**: [Pending/Success/Failed]
- **Actual Result**: [what actually happened]
```

### Step 5.3: Real-time Validation
**After EACH change:**

1. **Test immediately** (don't batch test)
2. **Check for errors** (logs, console, linter)
3. **Verify expected behavior** (manual test)
4. **Document result** (success/failure)

## ✅ PHASE 6: VERIFICATION

### Step 6.1: Functionality Testing
**Test all aspects:**

- [ ] **Core functionality** works as expected
- [ ] **Edge cases** handled properly
- [ ] **Error conditions** handled gracefully
- [ ] **Integration points** work correctly
- [ ] **No regressions** in existing features

### Step 6.2: Code Quality Check
**Verify standards:**

- [ ] **Code follows** existing patterns
- [ ] **No linter errors** or warnings
- [ ] **TypeScript** compiles without errors
- [ ] **Imports** are clean and organized
- [ ] **Console logs** removed (unless intentional)

### Step 6.3: User Experience Validation
**Check from user perspective:**

- [ ] **User flow** works end-to-end
- [ ] **Error messages** are helpful
- [ ] **Loading states** are appropriate
- [ ] **Performance** is acceptable

## 📋 PHASE 7: COMPLETION & HANDOFF

### Step 7.1: Final Verification
**Complete system check:**

```bash
# Run all relevant tests
npm run build  # or equivalent
npm run lint   # or equivalent
npm run test   # if tests exist
```

### Step 7.2: Documentation Update
**If needed, update:**

- [ ] **README** files
- [ ] **Code comments** for complex logic
- [ ] **Type definitions** 
- [ ] **Configuration docs**

### Step 7.3: User Communication
**Provide clear summary:**

```markdown
## ✅ TASK COMPLETED

**What was implemented**:
- [Specific features/fixes added]

**How to test**:
- [Step-by-step testing instructions]

**Files changed**:
- [List of modified files]

**Next steps** (if any):
- [What user should do next]

**Notes**:
- [Any important information]
```

## 🚨 CRITICAL RULES FOR ALL TASKS

### Rule 1: NO SHORTCUTS
- **NEVER skip** research phase
- **NEVER skip** planning phase  
- **NEVER skip** verification phase
- **ALWAYS follow** the process completely

### Rule 2: COMMUNICATE EARLY & OFTEN
- **ASK questions** when unclear
- **EXPLAIN your approach** before implementing
- **UPDATE user** on progress for complex tasks
- **CONFIRM understanding** before starting

### Rule 3: QUALITY OVER SPEED
- **Better to be slow and correct** than fast and broken
- **Better to ask questions** than make wrong assumptions
- **Better to plan thoroughly** than fix mistakes later
- **Better to test extensively** than deploy bugs

### Rule 4: ALWAYS BE LEARNING
- **Document new patterns** you discover
- **Note better approaches** for future reference
- **Ask about unfamiliar** technologies/patterns
- **Research thoroughly** before implementing

## 🎯 SUCCESS METRICS

**Every task should result in:**

- [ ] **User's problem** is completely solved
- [ ] **Code quality** is maintained or improved
- [ ] **System stability** is maintained or improved
- [ ] **Documentation** is accurate and helpful
- [ ] **User understands** what was done and why

## 🔄 CONTINUOUS IMPROVEMENT

**After each task, briefly note:**

1. **What went well** in this process
2. **What could be improved** next time
3. **What was learned** that's reusable
4. **What questions** should be asked earlier next time

---

**🎯 REMEMBER: Excellence is a habit, not an accident. Follow the process religiously.** 