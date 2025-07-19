# Test Coverage Improvement Plan

**Created by**: quality-agent  
**Date**: 2025-07-18  
**Current Coverage**: ~7% (temporarily lowered from 70% threshold)  
**Target Coverage**: 70% for critical business logic, 50% overall

## Executive Summary

This plan outlines a phased approach to improve test coverage from the current 7% to our target of 70% for critical business logic. The plan prioritizes quick wins, addresses systemic testing issues, and establishes sustainable testing practices.

## Current State Analysis

### Coverage Metrics
- **Overall**: 7.17% statements, 7.15% branches, 6.26% functions
- **Test Pass Rate**: 51% (277/540 tests passing)
- **Critical Files**: 0% coverage in core business logic

### Key Issues
1. **Systemic Problems**: Jest configuration issues with Convex imports (partially fixed)
2. **Mock Infrastructure**: Incomplete mocking causing test failures
3. **Test Maintenance**: Outdated tests not aligned with current implementation
4. **Coverage Gaps**: Entire domains (backend, utilities) lack tests

## Phase 1: Foundation & Quick Wins (Week 1)
**Target**: 7% → 20% coverage

### 1.1 Fix Remaining Test Infrastructure
- [ ] Fix dashboard navigation test failures
- [ ] Update Convex API mocks for all test suites
- [ ] Ensure all test utilities are properly configured
- **Owner**: quality-agent with infra-agent support
- **Effort**: 1 day

### 1.2 Test Utility Functions (T89)
High-value targets for immediate coverage gains:

#### Frontend Utilities
```typescript
// Priority files:
- /apps/web/src/utils/slugValidation.ts (30+ lines)
- /apps/web/src/utils/csv-templates.ts (100+ lines)  
- /apps/web/src/utils/error-monitoring.ts (60+ lines)
- /apps/web/src/lib/utils.ts (50+ lines)
```

#### Backend Utilities
```typescript
// Priority files:
- /convex/lib/slugValidation.ts (40+ lines)
- /convex/lib/auth.ts (150+ lines)
```

**Expected Coverage Gain**: +10-15%  
**Owner**: quality-agent  
**Effort**: 3-4 days

### 1.3 Complete UI Component Tests
Frontend-agent completed button, card, dialog. Remaining components:
- [ ] Form components (input, select, textarea)
- [ ] Layout components (header, sidebar)
- [ ] Data display (table, loading states)

**Expected Coverage Gain**: +5%  
**Owner**: frontend-agent  
**Effort**: 2 days

## Phase 2: Core Business Logic (Week 2-3)
**Target**: 20% → 40% coverage

### 2.1 Convex Function Testing
Priority order based on criticality:

#### Authentication & Authorization
```typescript
// Critical paths:
- convex/functions/auth/users.ts
- convex/functions/auth/sessions.ts  
- convex/functions/auth/permissions.ts
```

#### Core Business Entities
```typescript
// High-priority:
- convex/functions/categories/queries.ts
- convex/functions/categories/mutations.ts
- convex/functions/products/products.ts
- convex/functions/organizations/organizations.ts
```

**Expected Coverage Gain**: +15-20%  
**Owner**: backend-agent (primary), quality-agent (support)  
**Effort**: 5 days

### 2.2 React Component Integration Tests
Fix and enhance existing component tests:
- [ ] Product components (ProductCard, ProductDialogs)
- [ ] Category components (CategorySelector, CategoryTree)
- [ ] Organization components (OrgSwitcher, TeamMembers)

**Expected Coverage Gain**: +5%  
**Owner**: frontend-agent  
**Effort**: 3 days

## Phase 3: Integration & E2E Testing (Week 4)
**Target**: 40% → 55% coverage

### 3.1 API Contract Tests (T94)
Test the integration between frontend and backend:
- [ ] Authentication flow contracts
- [ ] CRUD operation contracts
- [ ] Real-time update contracts
- [ ] Error handling contracts

**Expected Coverage Gain**: +10%  
**Owner**: quality-agent  
**Effort**: 4 days

### 3.2 Critical User Flows
E2E tests for essential workflows:
- [ ] User registration and onboarding
- [ ] Product import via CSV
- [ ] AI categorization workflow
- [ ] Team management

**Expected Coverage Gain**: +5%  
**Owner**: quality-agent with frontend-agent  
**Effort**: 3 days

## Phase 4: Advanced Testing (Week 5-6)
**Target**: 55% → 70% coverage

### 4.1 Test Data Factories (T93)
Create reusable test data generators:
```typescript
// Example factories needed:
- UserFactory
- OrganizationFactory
- ProductFactory
- CategoryFactory
- ImportJobFactory
```

**Owner**: quality-agent  
**Effort**: 3 days

### 4.2 Performance & Edge Cases
- [ ] Load testing for bulk operations
- [ ] Error boundary testing
- [ ] Concurrent operation handling
- [ ] Large dataset handling

**Expected Coverage Gain**: +10%  
**Owner**: quality-agent with backend-agent  
**Effort**: 4 days

### 4.3 AI & Advanced Features
- [ ] LangChain integration tests
- [ ] Model provider switching
- [ ] Rate limiting and retry logic
- [ ] Cost estimation accuracy

**Expected Coverage Gain**: +5%  
**Owner**: backend-agent  
**Effort**: 3 days

## Implementation Guidelines

### Testing Best Practices
1. **Test Pyramid**: 70% unit, 20% integration, 10% E2E
2. **Coverage Goals**: 
   - Critical business logic: 80%
   - UI components: 70%
   - Utilities: 90%
   - Experimental features: 50%

### Test Writing Standards
```typescript
// Example test structure
describe('FeatureName', () => {
  // Setup and teardown
  beforeEach(() => {
    // Common setup
  });

  describe('Scenario', () => {
    it('should handle expected behavior', () => {
      // Arrange
      // Act  
      // Assert
    });

    it('should handle error cases', () => {
      // Test error scenarios
    });
  });
});
```

### Continuous Improvement
1. **Daily Coverage Checks**: Monitor coverage trends
2. **PR Requirements**: No PR merges if coverage drops
3. **Weekly Reviews**: Assess progress and adjust plan
4. **Knowledge Sharing**: Document testing patterns

## Success Metrics

### Week 1 Targets
- [ ] All test suites passing (100% pass rate)
- [ ] Coverage increased to 20%
- [ ] Utility functions fully tested

### Week 2-3 Targets  
- [ ] Core business logic tested
- [ ] Coverage increased to 40%
- [ ] No critical paths untested

### Week 4-6 Targets
- [ ] Integration tests implemented
- [ ] Coverage reached 70% for critical code
- [ ] Test data factories operational
- [ ] E2E tests for major workflows

## Risk Mitigation

### Potential Blockers
1. **Complex Mocking Requirements**: May need additional infrastructure work
2. **Time Constraints**: Plan assumes full-time testing focus
3. **Technical Debt**: Some code may need refactoring for testability

### Mitigation Strategies
1. **Incremental Approach**: Deliver value weekly
2. **Parallel Work**: Multiple agents working on different areas
3. **Regular Sync**: Daily updates in AGENTS_BOARD.md
4. **Flexibility**: Adjust targets based on discoveries

## Next Steps

1. **Immediate Actions** (Today):
   - Fix remaining test infrastructure issues
   - Begin testing utility functions
   - Update AGENTS_BOARD.md with progress

2. **This Week**:
   - Complete Phase 1 objectives
   - Begin Phase 2 planning
   - Coordinate with other agents

3. **Ongoing**:
   - Daily coverage monitoring
   - Weekly plan reviews
   - Knowledge documentation

## Appendix: Coverage Commands

```bash
# Run tests with coverage
npm test -- --coverage

# Generate detailed coverage report
npm test -- --coverage --coverageReporters=html

# Check coverage for specific paths
npm test -- --coverage --collectCoverageFrom="apps/web/src/utils/**"

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- apps/web/src/utils/__tests__/slugValidation.test.ts
```

## References

- [Jest Documentation](https://jestjs.io/docs/configuration)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Convex Testing Guide](https://docs.convex.dev/functions/testing)
- Project Testing Docs: `/docs/TESTING.md`