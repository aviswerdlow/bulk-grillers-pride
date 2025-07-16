---
description: Verify I should be working on this task
parameters:
  - name: task_id
    description: Task ID to verify
---

Before starting task {{task_id}}, verify it's appropriate:

1. Check required skills vs my skills
2. Check anti-skills don't match my role
3. If mismatched:
   - ⚠️ Warning: "This task requires [missing_skills] which I don't have"
   - Suggest: "Better suited for [appropriate_agent]"
   - Ask: "Continue anyway? (not recommended)"

Example outputs:

✅ Good match:
"Task T2 requires: react, ui-components
I have: react ✓, ui-components ✓
This is a perfect match for my skills!"

⚠️ Partial match:
"Task T5 requires: typescript, testing
I have: typescript ✓ (secondary skill)
I can do this but backend-agent might be better."

❌ Bad match:
"Task T3 requires: convex, schema
I have: neither skill
I should NOT work on this - it's for backend-agent!"
