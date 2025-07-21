#!/usr/bin/env python3
"""
Add detailed comments to GitHub issues with full task context
This ensures agents have all the information they need to work on tasks
"""

import json
import subprocess
import time
import re

# Task details that need to be added as comments
TASK_DETAILS = {
    "T141": {
        "title": "Unit tests for mutations",
        "context": "Product deletion feature needs comprehensive unit tests",
        "details": """
## Task Details

### Overview
Create unit tests for all product deletion mutations in Convex.

### Scope
- Test `deleteProduct` mutation
- Test `permanentlyDeleteProduct` mutation  
- Test `restoreProduct` mutation
- Test edge cases and error conditions

### Requirements
1. Test successful deletion scenarios
2. Test permission checks
3. Test with non-existent products
4. Test cascade behavior
5. Mock external dependencies

### Files to Test
- `convex/functions/products/mutations.ts`
- `convex/functions/products/deletion.ts`

### Acceptance Criteria
- [ ] 90%+ code coverage for deletion mutations
- [ ] All edge cases covered
- [ ] Tests are isolated and don't affect other tests
- [ ] Clear test descriptions
- [ ] Uses Jest best practices
        """
    },
    
    "T142": {
        "title": "Integration tests for flows",
        "context": "Test complete deletion workflows end-to-end",
        "details": """
## Task Details

### Overview
Create integration tests for the complete product deletion flow including UI interactions.

### Test Scenarios
1. User deletes product from manage page
2. Product moves to trash
3. User views trash
4. User restores product
5. User permanently deletes product

### Requirements
- Test full user journey
- Verify UI updates correctly
- Check database state changes
- Test error handling
- Verify notifications/toasts

### Key Components
- `/products/manage` page
- `/trash` page
- Deletion dialogs
- Toast notifications

### Acceptance Criteria
- [ ] All user flows tested
- [ ] Database state verified
- [ ] UI updates confirmed
- [ ] Error states handled
- [ ] Performance within limits
        """
    },
    
    "T143": {
        "title": "E2E tests with Playwright",
        "context": "Browser-based end-to-end testing for deletion feature",
        "details": """
## Task Details

### Overview
Implement Playwright E2E tests for product deletion feature across different browsers.

### Test Coverage
1. Delete product workflow
2. Bulk deletion
3. Trash management
4. Restoration process
5. Permanent deletion
6. Mobile responsiveness

### Browser Matrix
- Chrome
- Firefox  
- Safari
- Mobile viewports

### Requirements
- Visual regression tests
- Performance metrics
- Accessibility checks
- Cross-browser compatibility
- Screenshot on failure

### Key User Flows
1. Navigate to products → Select products → Delete → Confirm
2. Navigate to trash → View deleted → Restore
3. Navigate to trash → Permanently delete → Confirm

### Acceptance Criteria
- [ ] All browsers tested
- [ ] Mobile viewports work
- [ ] Screenshots captured
- [ ] Performance benchmarks met
- [ ] No accessibility violations
        """
    },
    
    "T144": {
        "title": "Performance testing",
        "context": "Ensure deletion operations are performant at scale",
        "details": """
## Task Details

### Overview
Performance test the deletion feature with large datasets.

### Test Scenarios
1. Delete single product (baseline)
2. Bulk delete 10 products
3. Bulk delete 100 products
4. Bulk delete 1000 products
5. Trash page with 10,000 items

### Metrics to Measure
- Response time
- Database query time
- UI render time
- Memory usage
- Network payload size

### Performance Targets
- Single delete: <500ms
- Bulk delete (100): <3s
- Trash page load: <2s
- No memory leaks
- Smooth UI (60fps)

### Tools
- Jest performance testing
- Lighthouse CI
- Custom performance marks
- Database query profiling

### Acceptance Criteria
- [ ] All targets met
- [ ] Performance regression tests added
- [ ] Bottlenecks identified
- [ ] Optimization recommendations
- [ ] CI integration
        """
    },
    
    "T145": {
        "title": "Security audit", 
        "context": "Security review of deletion feature",
        "details": """
## Task Details

### Overview
Comprehensive security audit of the product deletion feature.

### Security Checklist
1. **Authorization**
   - Verify user permissions
   - Test role-based access
   - Check organization boundaries
   
2. **Data Protection**
   - Ensure soft delete preserves data
   - Verify permanent deletion is complete
   - Check for data leaks in logs
   
3. **API Security**
   - Validate all inputs
   - Rate limiting on deletion
   - CSRF protection
   
4. **Audit Trail**
   - All deletions logged
   - User actions traceable
   - Compliance ready

### Threat Modeling
- Unauthorized deletion
- Data recovery attacks
- Bulk deletion abuse
- Cross-tenant access

### Tools
- OWASP ZAP scan
- Manual penetration testing
- Code security review
- Dependency scanning

### Acceptance Criteria
- [ ] No critical vulnerabilities
- [ ] All OWASP Top 10 checked
- [ ] Audit trail complete
- [ ] Security best practices followed
- [ ] Documentation updated
        """
    },
    
    "T146": {
        "title": "API documentation",
        "context": "Document deletion APIs for developers",
        "details": """
## Task Details

### Overview
Create comprehensive API documentation for the deletion feature.

### Documentation Sections
1. **Overview**
   - Deletion concepts
   - Soft vs hard delete
   - Trash management
   
2. **API Reference**
   - deleteProduct(productId)
   - bulkDeleteProducts(productIds[])
   - restoreProduct(productId)
   - permanentlyDeleteProduct(productId)
   - getTrashItems(filters)
   
3. **Examples**
   - Single deletion
   - Bulk operations
   - Filtering trash
   - Error handling

4. **Best Practices**
   - When to use soft delete
   - Retention policies
   - Performance considerations
   - Security guidelines

### Format
- OpenAPI 3.0 specification
- JSDoc comments in code
- README with examples
- Postman collection

### Acceptance Criteria
- [ ] All endpoints documented
- [ ] Examples for each operation
- [ ] Error codes listed
- [ ] Performance notes included
- [ ] Security considerations documented
        """
    },
    
    "T147": {
        "title": "User guide for deletion",
        "context": "End-user documentation for product deletion",
        "details": """
## Task Details

### Overview
Create user-friendly guide for the product deletion feature.

### Guide Sections
1. **Getting Started**
   - What is product deletion?
   - Soft delete vs permanent delete
   - Understanding the trash
   
2. **How-To Guides**
   - Delete a single product
   - Delete multiple products
   - Find deleted products
   - Restore products
   - Permanently remove products
   
3. **Best Practices**
   - Regular trash cleanup
   - Backup before bulk delete
   - Using filters effectively
   
4. **Troubleshooting**
   - Can't delete product
   - Can't find in trash  
   - Restore not working
   - Performance issues

### Format
- Markdown documentation
- Screenshots for each step
- Video walkthrough
- FAQ section
- Searchable format

### Acceptance Criteria
- [ ] Covers all user scenarios
- [ ] Clear step-by-step instructions
- [ ] Visual aids included
- [ ] Accessible language
- [ ] Mobile-friendly format
        """
    },
    
    "T148": {
        "title": "Admin guide for trash", 
        "context": "Administrator documentation for trash management",
        "details": """
## Task Details

### Overview
Create admin guide for managing the trash system and retention policies.

### Guide Contents
1. **Trash Overview**
   - How trash works
   - Data retention
   - Storage implications
   
2. **Configuration**
   - Retention periods
   - Auto-cleanup settings
   - Storage quotas
   - Permissions setup
   
3. **Monitoring**
   - Trash size metrics
   - Deletion activity
   - Storage usage
   - Performance monitoring
   
4. **Maintenance**
   - Manual cleanup
   - Bulk operations
   - Database optimization
   - Backup procedures

5. **Compliance**
   - Data retention laws
   - Audit requirements
   - Export capabilities
   - GDPR considerations

### Format
- Technical documentation
- Configuration examples
- Monitoring dashboards
- Scripts and tools

### Acceptance Criteria
- [ ] Complete admin coverage
- [ ] Configuration templates
- [ ] Monitoring setup guide
- [ ] Compliance checklist
- [ ] Troubleshooting section
        """
    },
    
    "T149": {
        "title": "Review deletion flow UX",
        "context": "UX review and improvements for deletion workflow",
        "details": """
## Task Details

### Overview
Conduct UX review of the entire deletion flow and implement improvements.

### Review Areas
1. **Deletion Initiation**
   - Clear delete buttons
   - Confirmation dialogs
   - Bulk selection UX
   
2. **Feedback & Status**
   - Progress indicators
   - Success messages
   - Error handling
   - Undo options
   
3. **Trash Interface**
   - Findability
   - Filtering/sorting
   - Bulk operations
   - Visual hierarchy

4. **Mobile Experience**
   - Touch targets
   - Swipe actions
   - Responsive design
   - Performance

### Research Methods
- User interviews (5-8 users)
- Usability testing
- A/B testing options
- Analytics review
- Competitive analysis

### Deliverables
- UX audit report
- Improvement recommendations
- Wireframes/mockups
- Implementation plan
- Success metrics

### Acceptance Criteria
- [ ] User research completed
- [ ] Pain points identified
- [ ] Improvements designed
- [ ] Stakeholder approval
- [ ] Implementation plan ready
        """
    },
    
    "T150": {
        "title": "Create warning level visuals",
        "context": "Design visual system for deletion warnings",
        "details": """
## Task Details

### Overview
Design and implement visual warning system for different deletion severity levels.

### Warning Levels
1. **Info (Blue)**
   - Recoverable actions
   - Trash available
   - Example: "Product moved to trash"
   
2. **Warning (Yellow)**
   - Caution needed
   - Bulk operations
   - Example: "About to delete 50 products"
   
3. **Danger (Red)**
   - Permanent actions
   - No recovery
   - Example: "Permanent deletion - cannot be undone"
   
4. **Critical (Red + Animation)**
   - High-impact actions
   - Affects other data
   - Example: "Deleting category will affect 100 products"

### Design Requirements
- Color system (accessible)
- Icon set
- Animation patterns
- Typography hierarchy
- Spacing standards

### Components
- Alert boxes
- Modal warnings
- Inline warnings
- Toast notifications
- Confirmation dialogs

### Accessibility
- WCAG AA compliant
- Screen reader friendly
- Keyboard navigable
- High contrast mode
- Reduced motion support

### Acceptance Criteria
- [ ] Design system documented
- [ ] All components built
- [ ] Accessibility tested
- [ ] Cross-browser verified
- [ ] Style guide updated
        """
    },
    
    "T151": {
        "title": "Design mobile interactions",
        "context": "Mobile-specific deletion interactions",
        "details": """
## Task Details

### Overview
Design and implement mobile-optimized deletion interactions.

### Mobile Patterns
1. **Swipe to Delete**
   - iOS-style swipe
   - Android long-press
   - Reveal actions
   
2. **Bulk Selection**
   - Multi-select mode
   - Select all option
   - Clear selection
   
3. **Confirmation**
   - Bottom sheets
   - Modal dialogs
   - Haptic feedback
   
4. **Gestures**
   - Pull to refresh
   - Swipe between tabs
   - Pinch to zoom (lists)

### Responsive Breakpoints
- Mobile: 320-768px
- Tablet: 768-1024px
- Desktop: 1024px+

### Platform Considerations
- iOS Safari quirks
- Android Chrome
- PWA capabilities
- Native app prep

### Performance
- Touch responsiveness
- Smooth animations
- Minimal reflows
- Optimized assets

### Acceptance Criteria
- [ ] All interactions designed
- [ ] Prototypes created
- [ ] User testing completed
- [ ] Performance validated
- [ ] Implementation ready
        """
    },
    
    "T152": {
        "title": "Review technical architecture",
        "context": "Architecture review of deletion system",
        "details": """
## Task Details

### Overview
Comprehensive technical architecture review of the deletion implementation.

### Review Areas
1. **Data Architecture**
   - Soft delete pattern
   - Database schema
   - Indexing strategy
   - Data integrity
   
2. **API Design**
   - RESTful principles
   - Error handling
   - Versioning strategy
   - Rate limiting
   
3. **Frontend Architecture**
   - Component structure
   - State management
   - Data flow
   - Code organization
   
4. **Performance**
   - Query optimization
   - Caching strategy
   - Lazy loading
   - Bundle size

5. **Scalability**
   - Horizontal scaling
   - Database sharding
   - Queue systems
   - Monitoring

### Deliverables
- Architecture diagram
- Decision records (ADRs)
- Improvement roadmap
- Risk assessment
- Migration plan

### Review Process
1. Code walkthrough
2. Load testing
3. Security review
4. Team feedback
5. External review

### Acceptance Criteria
- [ ] Full architecture documented
- [ ] Risks identified
- [ ] Improvements prioritized
- [ ] Team alignment
- [ ] Roadmap created
        """
    },
    
    "T153": {
        "title": "Monitor trash table performance",
        "context": "Performance monitoring for trash operations",
        "details": """
## Task Details

### Overview
Implement comprehensive monitoring for trash table performance.

### Monitoring Metrics
1. **Query Performance**
   - SELECT query time
   - INSERT performance
   - UPDATE operations
   - DELETE (permanent)
   
2. **Table Metrics**
   - Row count
   - Table size
   - Index usage
   - Lock waits
   
3. **Application Metrics**
   - API response time
   - Throughput
   - Error rates
   - Queue depth

4. **User Experience**
   - Page load time
   - Time to interactive
   - Smooth scrolling
   - Search performance

### Tools Setup
- Database monitoring
- APM integration
- Custom dashboards
- Alert configuration
- Log aggregation

### Alert Thresholds
- Query time >1s
- Table size >1GB
- Error rate >1%
- Queue depth >1000

### Reporting
- Daily performance
- Weekly trends
- Monthly summary
- Incident reports

### Acceptance Criteria
- [ ] All metrics tracked
- [ ] Dashboards created
- [ ] Alerts configured
- [ ] Documentation complete
- [ ] Team trained
        """
    },
    
    "T154": {
        "title": "Validate cascade deletion",
        "context": "Ensure cascade deletions work correctly",
        "details": """
## Task Details

### Overview
Validate that cascade deletion of related data works correctly and safely.

### Cascade Scenarios
1. **Product → SKUs**
   - All SKUs deleted
   - SKU history preserved
   
2. **Product → Images**
   - Image references removed
   - CDN cleanup queued
   
3. **Product → Categories**
   - Category links removed
   - Category counts updated
   
4. **Product → Inventory**
   - Stock records archived
   - History maintained

5. **Product → Orders**
   - Historical orders unchanged
   - Future orders blocked

### Test Cases
- Single product cascade
- Bulk deletion cascade
- Restore with relations
- Partial cascade failure
- Concurrent modifications

### Data Integrity
- Foreign key constraints
- Orphaned data check
- Referential integrity
- Transaction boundaries
- Rollback capability

### Edge Cases
- Circular dependencies
- Missing relations
- Concurrent updates
- Large cascades (>1000)
- Network failures

### Acceptance Criteria
- [ ] All cascades tested
- [ ] Data integrity verified
- [ ] Performance acceptable
- [ ] Error handling complete
- [ ] Documentation updated
        """
    },
    
    "T167": {
        "title": "Perform final sync and verification",
        "context": "Final sync between board and GitHub before cutover",
        "details": """
## Task Details

### Overview
Perform final synchronization and verification before migrating to GitHub Issues.

### Verification Steps
1. **Board State Analysis**
   - Count total tasks
   - Identify completed vs pending
   - Check task dependencies
   - Verify agent assignments
   
2. **GitHub State Check**
   - Verify labels created
   - Check issue templates
   - Validate permissions
   - Test API access
   
3. **Mapping Verification**
   - All tasks mapped
   - No duplicate mappings
   - Bidirectional sync works
   - Conflict detection ready

4. **Infrastructure Check**
   - Scripts executable
   - Rollback tested
   - Documentation complete
   - Team notified

### Success Criteria
- Zero data loss
- All tasks accounted for
- Rollback procedure tested
- Performance validated
- Team sign-off obtained

### Deliverables
- Verification report
- Mapping database
- Rollback plan
- Go/no-go decision
- Timeline confirmation

### Acceptance Criteria
- [ ] All systems verified
- [ ] Data integrity confirmed
- [ ] Performance acceptable
- [ ] Rollback tested
- [ ] Approval obtained
        """
    },
    
    "T169": {
        "title": "Execute cutover and archive board",
        "context": "Final cutover from board to GitHub Issues",
        "details": """
## Task Details

### Overview
Execute the final cutover from AGENTS_BOARD.md to GitHub Issues.

### Cutover Steps
1. **Pre-Cutover**
   - Final backup
   - Team notification
   - Freeze board updates
   
2. **Cutover Execution**
   - Run cutover script
   - Update .env files
   - Archive board file
   - Update documentation
   
3. **Post-Cutover**
   - Verify GitHub access
   - Test workflows
   - Monitor issues
   - Support team

### Rollback Plan
- Restore from backup
- Revert .env changes
- Sync GitHub → Board
- Notify team
- Document issues

### Communication Plan
- Pre-cutover notice (1 hour)
- Cutover start notification
- Progress updates
- Completion announcement
- Support availability

### Success Metrics
- Zero downtime
- All agents migrated
- No data loss
- Workflows functional
- Team productive

### Acceptance Criteria
- [ ] Cutover completed
- [ ] Board archived
- [ ] GitHub primary
- [ ] Team migrated
- [ ] Documentation updated
        """
    },
    
    "T171": {
        "title": "Monitor migration success metrics",
        "context": "Post-migration monitoring and support",
        "details": """
## Task Details

### Overview
Monitor the migration success and provide support during transition.

### Monitoring Areas
1. **Adoption Metrics**
   - Agents using GitHub
   - Issues created/updated
   - Board access attempts
   - Error rates
   
2. **Performance Metrics**
   - GitHub API latency
   - Script execution time
   - Search performance
   - Update speed
   
3. **User Feedback**
   - Agent surveys
   - Pain points
   - Feature requests
   - Training needs

4. **System Health**
   - API rate limits
   - Error logs
   - Sync conflicts
   - Data integrity

### Support Plan
- Office hours
- Slack channel
- FAQ document
- Video tutorials
- Troubleshooting guide

### Issue Types
- Can't find tasks
- Permission issues
- Workflow confusion
- Performance problems
- Feature requests

### Success Criteria
- 100% agent adoption
- <5% error rate
- Positive feedback
- No data loss
- Stable performance

### Acceptance Criteria
- [ ] Monitoring active
- [ ] Metrics collected
- [ ] Issues resolved
- [ ] Documentation updated
- [ ] Team satisfied
        """
    },
    
    "T172": {
        "title": "Optimize and clean up compatibility layer",
        "context": "Optimize the task wrapper for performance",
        "details": """
## Task Details

### Overview
Optimize the task wrapper library for better performance in GitHub-primary mode.

### Optimization Areas
1. **Code Cleanup**
   - Remove board-mode code
   - Simplify GitHub paths
   - Reduce dependencies
   - Minimize file size
   
2. **Performance**
   - Cache GitHub queries
   - Batch operations
   - Async improvements
   - Error handling
   
3. **Usability**
   - Better error messages
   - Improved logging
   - Helper functions
   - Auto-completion

4. **Maintenance**
   - Code documentation
   - Test coverage
   - Version management
   - Deprecation plan

### Benchmarks
- Current size: ~10KB
- Target size: <5KB
- API calls: -50%
- Response time: <1s
- Memory usage: minimal

### Cleanup Tasks
- Remove legacy functions
- Consolidate utilities
- Update dependencies
- Improve types
- Add comments

### Migration Path
- Version compatibility
- Deprecation warnings
- Migration guide
- Timeline planning
- Team training

### Acceptance Criteria
- [ ] 50% size reduction
- [ ] Performance improved
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Team approved
        """
    },
    
    "T173": {
        "title": "Fix API Path Structure in Tests",
        "context": "Fix incorrect Convex API paths in test files",
        "details": """
## Task Details

### Overview
Fix the API path structure in tests to match Convex's actual API format.

### Problem
Tests are using incorrect path structure:
- Wrong: `api.functions.dashboard.queries.getDashboardStats`
- Correct: `api.functions.dashboard.getDashboardStats`

### Root Cause
Convex doesn't support directory-based function organization. All functions must be in single files.

### Files to Fix
- `apps/web/src/app/(dashboard)/[orgSlug]/page.test.tsx`
- Any other test files using nested API paths
- Mock files that reference the API

### Changes Required
1. Update all test imports
2. Fix mock paths
3. Update type references
4. Verify with type checking

### Example Fix
```typescript
// Before
const result = await ctx.db.query(api.functions.dashboard.queries.getDashboardStats)

// After  
const result = await ctx.db.query(api.functions.dashboard.getDashboardStats)
```

### Testing
- Run all affected tests
- Ensure mocks work
- No type errors
- Coverage maintained

### Acceptance Criteria
- [ ] All API paths corrected
- [ ] Tests passing
- [ ] Types valid
- [ ] No regressions
- [ ] Documentation updated
        """
    },
    
    "T175": {
        "title": "Update Contract Validation Tests",
        "context": "Fix contract validation to match actual Convex function signatures",
        "details": """
## Task Details

### Overview
Update contract validation tests to properly validate Convex function signatures.

### Problem
Contract tests are failing because they expect different signatures than what Convex actually provides.

### Issues to Fix
1. **Function Signatures**
   - Convex functions have specific argument patterns
   - Return types include metadata
   - Error handling differs
   
2. **Validation Logic**
   - Update validators for Convex patterns
   - Handle async properly
   - Check error formats

3. **Mock Alignment**
   - Mocks must match real signatures
   - Include all metadata
   - Handle edge cases

### Affected Files
- `apps/web/src/__tests__/contracts/`
- Contract validation utilities
- Mock generators

### Implementation
1. Analyze actual Convex functions
2. Update contract definitions
3. Fix validation logic
4. Update all tests
5. Verify with integration tests

### Example Update
```typescript
// Before
expect(api.someFunction).toMatchContract({
  args: { id: 'string' },
  returns: 'object'
})

// After
expect(api.someFunction).toMatchContract({
  args: [{ id: v.string() }],
  handler: 'function',
  returns: Promise<object>
})
```

### Acceptance Criteria
- [ ] Contracts match reality
- [ ] All tests passing
- [ ] Validation accurate
- [ ] Documentation updated
- [ ] Examples provided
        """
    },
    
    "T177": {
        "title": "Increase Test Coverage to 20%",
        "context": "Strategic increase of test coverage from 7% to 20%",
        "details": """
## Task Details

### Overview
Increase test coverage from current 7% to 20% by targeting high-value areas.

### Current State
- Overall coverage: 7%
- Frontend coverage: 5%
- Backend coverage: 10%
- Critical paths: untested

### Target Areas (Priority Order)
1. **Critical User Paths** (5% gain)
   - User authentication
   - Product creation
   - Order processing
   - Payment flow
   
2. **API Endpoints** (4% gain)
   - All mutations
   - Key queries
   - Error handling
   - Validation
   
3. **React Components** (3% gain)
   - Form components
   - Data displays
   - Navigation
   - Modals

4. **Utilities** (1% gain)
   - Formatters
   - Validators
   - Helpers
   - Constants

### Strategy
- Focus on high-use code
- Test critical paths first
- Use coverage reports
- Automate where possible
- Share testing patterns

### Milestones
- Week 1: 10% (critical paths)
- Week 2: 15% (APIs)
- Week 3: 18% (components)
- Week 4: 20% (cleanup)

### Tools
- Jest for unit tests
- React Testing Library
- Playwright for E2E
- Coverage reporters
- CI integration

### Acceptance Criteria
- [ ] 20% coverage achieved
- [ ] Critical paths tested
- [ ] CI enforcement active
- [ ] Team trained
- [ ] Patterns documented
        """
    },
    
    "T178": {
        "title": "Standardize Convex Mock Pattern",
        "context": "Create standard pattern for mocking Convex in tests",
        "details": """
## Task Details

### Overview
Create and implement a standardized pattern for mocking Convex across all tests.

### Current Problems
- Inconsistent mocking approaches
- Brittle test setup
- Difficult maintenance
- Poor type safety
- Flaky tests

### Solution Design
1. **Mock Factory**
   - Centralized mock creation
   - Type-safe builders
   - Preset configurations
   - Easy customization
   
2. **Test Utilities**
   - Setup helpers
   - Cleanup functions
   - Common assertions
   - Debug tools

3. **Patterns**
   - Query mocking
   - Mutation mocking
   - Subscription mocking
   - Error simulation

### Implementation
```typescript
// Example pattern
const mockConvex = createConvexMock({
  queries: {
    getUser: mockQuery((id) => ({ id, name: 'Test' }))
  },
  mutations: {
    updateUser: mockMutation((args) => args)
  }
})
```

### Migration Plan
1. Create mock utilities
2. Document patterns
3. Update one test file
4. Team review
5. Gradual migration

### Benefits
- Consistent tests
- Easier maintenance
- Better types
- Faster development
- Fewer bugs

### Acceptance Criteria
- [ ] Pattern documented
- [ ] Utilities created
- [ ] Examples provided
- [ ] Team trained
- [ ] Migration started
        """
    },
    
    "T179": {
        "title": "Create Convex Test Helper Package",
        "context": "Build reusable test helper package for Convex",
        "details": """
## Task Details

### Overview
Create a dedicated test helper package for Convex testing utilities.

### Package Structure
```
packages/convex-test-utils/
├── src/
│   ├── mocks/
│   │   ├── database.ts
│   │   ├── functions.ts
│   │   └── auth.ts
│   ├── builders/
│   │   ├── query.ts
│   │   ├── mutation.ts
│   │   └── schema.ts
│   ├── assertions/
│   │   ├── database.ts
│   │   └── response.ts
│   └── index.ts
├── package.json
└── README.md
```

### Core Features
1. **Mock Builders**
   - Type-safe mocks
   - Fluent API
   - Preset data
   - Customization
   
2. **Test Database**
   - In-memory DB
   - Seed data
   - Transactions
   - Cleanup

3. **Assertions**
   - Custom matchers
   - Async helpers
   - Error checking
   - Performance

4. **Utilities**
   - Time control
   - Auth mocking
   - File uploads
   - Webhooks

### API Design
```typescript
import { ConvexTest } from '@internal/convex-test-utils'

const ctx = ConvexTest.create()
  .withUser({ id: '123' })
  .withData('products', [product1, product2])
  .build()

await expect(
  ctx.mutation(api.products.create, { name: 'Test' })
).toSucceed()
```

### Documentation
- Getting started
- API reference
- Best practices
- Examples
- Migration guide

### Acceptance Criteria
- [ ] Package created
- [ ] Core features built
- [ ] Tests written
- [ ] Docs complete
- [ ] Team adopted
        """
    },
    
    "T180": {
        "title": "Refactor Frontend Tests to Use Standard Pattern",
        "context": "Migrate all frontend tests to standardized Convex mocking",
        "details": """
## Task Details

### Overview
Refactor all frontend tests to use the new standardized Convex mock pattern.

### Current State
- Mixed mocking approaches
- Inconsistent setup
- Duplicate code
- Type issues
- Maintenance burden

### Migration Scope
1. **Component Tests** (~50 files)
   - Product components
   - User components
   - Dashboard views
   - Forms
   
2. **Page Tests** (~20 files)
   - Route handlers
   - Data fetching
   - Error states
   - Loading states

3. **Hook Tests** (~15 files)
   - Custom hooks
   - Data hooks
   - Auth hooks
   - Utility hooks

4. **Integration Tests** (~10 files)
   - User flows
   - Data flows
   - Error flows
   - Edge cases

### Migration Process
1. Start with simple components
2. Update test by test
3. Verify coverage maintained
4. Update documentation
5. Remove old patterns

### Example Migration
```typescript
// Before
jest.mock('convex/react', () => ({
  useQuery: jest.fn()
}))

// After
import { mockConvex } from '@internal/convex-test-utils'

const { getByText } = render(
  <Component />,
  { wrapper: mockConvex.Provider }
)
```

### Quality Checks
- All tests passing
- Coverage maintained
- No type errors
- Consistent patterns
- Performance good

### Acceptance Criteria
- [ ] All tests migrated
- [ ] Coverage maintained
- [ ] Performance improved
- [ ] Docs updated
- [ ] Team trained
        """
    },
    
    "T181": {
        "title": "Refactor Backend Tests to Use Standard Pattern",
        "context": "Migrate backend tests to standardized pattern",
        "details": """
## Task Details

### Overview
Refactor all backend Convex function tests to use standardized mocking pattern.

### Current Issues
- Direct database access
- No transaction isolation  
- Shared test state
- Race conditions
- Slow test execution

### Migration Scope
1. **Mutation Tests** (~30 files)
   - Product mutations
   - User mutations
   - Order mutations
   - System mutations
   
2. **Query Tests** (~25 files)
   - List queries
   - Detail queries
   - Search queries
   - Aggregate queries

3. **Action Tests** (~10 files)
   - External API calls
   - File processing
   - Email sending
   - Webhooks

4. **Scheduled Functions** (~5 files)
   - Cron jobs
   - Delayed tasks
   - Cleanup jobs
   - Reports

### Test Isolation
```typescript
// New pattern
describe('products mutations', () => {
  let ctx: TestContext
  
  beforeEach(() => {
    ctx = createTestContext()
  })
  
  afterEach(() => {
    ctx.cleanup()
  })
  
  test('creates product', async () => {
    const result = await ctx.run(
      api.products.create,
      { name: 'Test' }
    )
    expect(result).toMatchObject({ name: 'Test' })
  })
})
```

### Performance Goals
- Test suite: <30s
- Individual test: <100ms
- Parallel execution
- Minimal I/O
- Efficient cleanup

### Acceptance Criteria
- [ ] All tests migrated
- [ ] Isolation complete
- [ ] Performance targets met
- [ ] CI integration working
- [ ] Documentation updated
        """
    },
    
    "T182": {
        "title": "Document Convex Testing Best Practices",
        "context": "Create comprehensive testing guide for Convex",
        "details": """
## Task Details

### Overview
Create comprehensive documentation for testing Convex applications.

### Documentation Structure
1. **Getting Started**
   - Testing overview
   - Environment setup
   - First test
   - Running tests
   
2. **Testing Patterns**
   - Unit testing
   - Integration testing
   - E2E testing
   - Performance testing

3. **Convex Specifics**
   - Mocking strategies
   - Database testing
   - Auth testing
   - Real-time testing

4. **Best Practices**
   - Test organization
   - Naming conventions
   - Assertion patterns
   - Performance tips

5. **Advanced Topics**
   - CI/CD integration
   - Coverage reports
   - Test debugging
   - Flaky test handling

### Code Examples
- Simple query test
- Mutation with auth
- Complex data setup
- Error scenarios
- Performance test
- E2E flow

### Common Pitfalls
- Shared state
- Race conditions
- Memory leaks
- Slow tests
- Flaky tests
- Type issues

### Troubleshooting
- Debug techniques
- Common errors
- Performance issues
- CI failures
- Coverage gaps

### Resources
- API reference
- Example repo
- Video tutorials
- Team contacts
- External links

### Acceptance Criteria
- [ ] Complete guide written
- [ ] Examples working
- [ ] Team reviewed
- [ ] Published to docs
- [ ] Feedback incorporated
        """
    },
    
    "T183": {
        "title": "Add Convex Mock Examples to Test Utils",
        "context": "Add comprehensive examples to test utilities",
        "details": """
## Task Details

### Overview
Add comprehensive examples and templates to the Convex test utilities package.

### Example Categories
1. **Basic Examples**
   - Simple query mock
   - Basic mutation test
   - Auth simulation
   - Error handling
   
2. **Real-World Scenarios**
   - E-commerce flow
   - User registration
   - Data import
   - Report generation

3. **Advanced Patterns**
   - Optimistic updates
   - Conflict resolution
   - Rate limiting
   - Webhooks

4. **Performance Tests**
   - Load testing
   - Stress testing
   - Memory profiling
   - Query optimization

### Template Structure
```
examples/
├── basic/
│   ├── query-mock.test.ts
│   ├── mutation-test.test.ts
│   └── auth-test.test.ts
├── scenarios/
│   ├── ecommerce-flow.test.ts
│   ├── user-lifecycle.test.ts
│   └── data-processing.test.ts
├── advanced/
│   ├── optimistic-ui.test.ts
│   ├── conflict-handling.test.ts
│   └── rate-limiting.test.ts
└── performance/
    ├── load-test.test.ts
    └── memory-test.test.ts
```

### Documentation
- Example index
- Use case mapping
- Code walkthrough
- Best practices
- Common variations

### Interactive Features
- CodeSandbox demos
- Copy-paste ready
- Type checking
- Lint rules
- Test runners

### Quality Standards
- All examples tested
- Clear comments
- Error handling
- Performance notes
- Accessibility considered

### Acceptance Criteria
- [ ] 20+ examples created
- [ ] All categories covered
- [ ] Documentation complete
- [ ] Interactive demos
- [ ] Team feedback incorporated
        """
    }
}

def add_details_to_issue(issue_number: int, task_id: str):
    """Add detailed comment to a GitHub issue"""
    if task_id not in TASK_DETAILS:
        print(f"No details found for {task_id}")
        return
        
    details = TASK_DETAILS[task_id]
    comment = details['details']
    
    # Add comment to issue
    cmd = [
        'gh', 'issue', 'comment', str(issue_number),
        '--body', comment
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ Added details to issue #{issue_number} ({task_id})")
        else:
            print(f"✗ Failed to add comment to #{issue_number}: {result.stderr}")
    except Exception as e:
        print(f"✗ Error adding comment: {e}")
    
    # Small delay to avoid rate limiting
    time.sleep(0.5)

def main():
    """Add details to all open issues"""
    print("Adding detailed comments to GitHub issues...")
    
    # Map of task IDs to issue numbers (from the creation output)
    task_to_issue = {
        "T141": 13, "T142": 14, "T143": 15, "T144": 16, "T145": 17,
        "T146": 18, "T147": 19, "T148": 20, "T149": 21, "T150": 22,
        "T151": 23, "T152": 24, "T153": 25, "T154": 26, "T167": 27,
        "T169": 28, "T171": 29, "T172": 30, "T173": 31, "T175": 32,
        "T177": 33, "T178": 34, "T179": 35, "T180": 36, "T181": 37,
        "T182": 38, "T183": 39
    }
    
    # Add details to each issue
    for task_id, issue_number in task_to_issue.items():
        add_details_to_issue(issue_number, task_id)
    
    print("\nCompleted adding details to all issues!")
    print("Agents can now see full context when viewing issues.")

if __name__ == '__main__':
    main()