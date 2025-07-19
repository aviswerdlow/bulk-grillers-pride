# SKU Implementation Tasks

## Overview
This document breaks down the SKU preservation feature into specific implementation tasks for the multi-agent system.

## Task Breakdown by Agent

### Backend Agent Tasks (backend-agent)

#### T-SKU-B1: Add SKU Field to Product Schema
**Priority**: P0 (Critical)
**Estimated Time**: 2 hours
**Description**: Add SKU field to the products table with proper indexing
**Acceptance Criteria**:
- [ ] Add `sku: v.optional(v.string())` to products schema
- [ ] Add index `by_sku` with ['organizationId', 'sku']
- [ ] Run `npx convex dev` to regenerate types
- [ ] No breaking changes to existing data

#### T-SKU-B2: Create SKU Migration Script
**Priority**: P0 (Critical)
**Estimated Time**: 2 hours
**Description**: Migrate existing products to have SKUs from their default variants
**Acceptance Criteria**:
- [ ] Create migration script to copy SKUs from variants to products
- [ ] Generate SKUs for products without variants
- [ ] Handle edge cases (multiple variants, missing data)
- [ ] Test on sample data before production

#### T-SKU-B3: Update Product Import to Preserve SKUs
**Priority**: P0 (Critical)
**Estimated Time**: 2 hours
**Description**: Modify import process to store SKUs at product level
**Acceptance Criteria**:
- [ ] Update `createProductInternal` to save SKU to product
- [ ] Ensure SKU is required field in import validation
- [ ] Update CSV parsing to handle SKU column
- [ ] Maintain backward compatibility

#### T-SKU-B4: Implement SKU Search Query
**Priority**: P1 (High)
**Estimated Time**: 2 hours
**Description**: Create efficient SKU search functionality
**Acceptance Criteria**:
- [ ] Create `searchProductsBySku` query with exact match
- [ ] Update existing search to include SKU field
- [ ] Optimize with proper index usage
- [ ] Return SKU matches first in results

#### T-SKU-B5: Add SKU Uniqueness Validation
**Priority**: P1 (High)
**Estimated Time**: 1 hour
**Description**: Ensure SKUs are unique within an organization
**Acceptance Criteria**:
- [ ] Add validation in create/update mutations
- [ ] Check uniqueness at organization level
- [ ] Return clear error messages for duplicates
- [ ] Handle case-insensitive comparison

### Frontend Agent Tasks (frontend-agent)

#### T-SKU-F1: Add SKU Column to Products Table
**Priority**: P0 (Critical)
**Estimated Time**: 1 hour
**Description**: Display SKU in the products list table view
**Acceptance Criteria**:
- [ ] Add SKU column after Product Name
- [ ] Show SKU with monospace font
- [ ] Make column sortable
- [ ] Handle empty SKUs gracefully

#### T-SKU-F2: Display SKU on Product Cards
**Priority**: P0 (Critical)
**Estimated Time**: 1 hour
**Description**: Show SKU on product card components
**Acceptance Criteria**:
- [ ] Add SKU below product title
- [ ] Use consistent styling (mono font, muted color)
- [ ] Ensure responsive layout works
- [ ] Update both full and mini cards

#### T-SKU-F3: Add SKU to Search Functionality
**Priority**: P0 (Critical)
**Estimated Time**: 2 hours
**Description**: Enable SKU search in product search bar
**Acceptance Criteria**:
- [ ] Update search placeholder to include "SKU"
- [ ] Integrate with backend SKU search
- [ ] Highlight SKU matches in results
- [ ] Show exact matches first

#### T-SKU-F4: Add SKU Field to Product Forms
**Priority**: P1 (High)
**Estimated Time**: 2 hours
**Description**: Add SKU input to create/edit product forms
**Acceptance Criteria**:
- [ ] Add SKU field after title field
- [ ] Mark as required with validation
- [ ] Show uniqueness validation errors
- [ ] Add helpful placeholder and description

#### T-SKU-F5: Implement SKU Copy Feature
**Priority**: P2 (Medium)
**Estimated Time**: 1 hour
**Description**: Allow users to copy SKU to clipboard
**Acceptance Criteria**:
- [ ] Add copy icon on SKU hover
- [ ] Copy SKU on click
- [ ] Show success toast message
- [ ] Add keyboard shortcut (Ctrl+Shift+C)

### Quality Agent Tasks (quality-agent)

#### T-SKU-Q1: Create SKU Feature Tests
**Priority**: P1 (High)
**Estimated Time**: 3 hours
**Description**: Comprehensive test suite for SKU functionality
**Test Coverage**:
- [ ] Schema validation tests
- [ ] Import process tests with SKUs
- [ ] Search functionality tests
- [ ] Uniqueness validation tests
- [ ] UI component tests
- [ ] E2E user journey tests

#### T-SKU-Q2: Performance Testing for SKU Search
**Priority**: P2 (Medium)
**Estimated Time**: 2 hours
**Description**: Ensure SKU search performs well at scale
**Acceptance Criteria**:
- [ ] Test with 10,000+ products
- [ ] Search response time < 100ms
- [ ] Index usage verification
- [ ] Load testing documentation

### Infrastructure Agent Tasks (infra-agent)

#### T-SKU-I1: Update Import Templates
**Priority**: P1 (High)
**Estimated Time**: 1 hour
**Description**: Ensure CSV templates highlight SKU importance
**Acceptance Criteria**:
- [ ] Mark SKU as required in template
- [ ] Add SKU format examples
- [ ] Update import documentation
- [ ] Add validation rules to template

## Implementation Order

### Phase 1: Core Backend (Day 1)
1. T-SKU-B1: Add SKU field to schema
2. T-SKU-B3: Update import process
3. T-SKU-B2: Create migration script

### Phase 2: Core Frontend (Day 2)
1. T-SKU-F1: Add SKU to table
2. T-SKU-F2: Add SKU to cards
3. T-SKU-F3: Add search functionality

### Phase 3: Enhanced Features (Day 3)
1. T-SKU-B4: Implement SKU search
2. T-SKU-B5: Add uniqueness validation
3. T-SKU-F4: Add to product forms
4. T-SKU-F5: Copy feature

### Phase 4: Quality & Polish (Day 4)
1. T-SKU-Q1: Create tests
2. T-SKU-Q2: Performance testing
3. T-SKU-I1: Update templates

## Success Criteria

1. **Data Integrity**
   - All imported products have SKUs preserved
   - Existing products migrated successfully
   - No duplicate SKUs within organization

2. **User Experience**
   - SKU visible in all product views
   - SKU search returns instant results
   - Clear validation messages

3. **Performance**
   - SKU search < 100ms
   - No degradation in product list load time
   - Efficient index usage

4. **Testing**
   - 90%+ code coverage for new features
   - All E2E tests passing
   - Performance benchmarks met

## Rollback Plan

1. **Schema Rollback**: Remove SKU field and index
2. **Code Rollback**: Revert UI and API changes
3. **Data Preservation**: Keep SKUs in variants table
4. **Communication**: Notify users of temporary removal

## Communication Plan

1. **Pre-Launch**: Announce upcoming SKU features
2. **Launch**: Highlight SKU preservation benefits
3. **Training**: Update documentation with SKU usage
4. **Support**: FAQ for common SKU questions