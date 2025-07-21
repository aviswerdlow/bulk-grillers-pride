# Accessibility Testing Manual

This document provides comprehensive manual testing scripts for accessibility validation across the Bulk Grillers Pride application.

## Table of Contents

1. [Testing Setup](#testing-setup)
2. [Screen Reader Testing](#screen-reader-testing)
3. [Keyboard Navigation Testing](#keyboard-navigation-testing)
4. [High Contrast Mode Testing](#high-contrast-mode-testing)
5. [Mobile Accessibility Testing](#mobile-accessibility-testing)
6. [Cognitive Load Assessment](#cognitive-load-assessment)
7. [Tools and Resources](#tools-and-resources)

## Testing Setup

### Prerequisites

1. **Screen Readers**:
   - Windows: NVDA (free) or JAWS (commercial)
   - macOS: VoiceOver (built-in)
   - Linux: Orca
   - Mobile: TalkBack (Android), VoiceOver (iOS)

2. **Browser Extensions**:
   - axe DevTools
   - WAVE (WebAIM)
   - Lighthouse (Chrome DevTools)
   - Color Contrast Analyzer

3. **Testing Accounts**:
   - Regular user account
   - Admin account
   - Test organization with sample data

### Environment Configuration

```bash
# Run the application locally
npm run dev

# Run accessibility tests
npm run test:a11y

# Run specific test suites
npm run test:a11y:unit
npm run test:a11y:e2e
```

## Screen Reader Testing

### Test Script 1: Product Deletion Flow

**Objective**: Verify that the deletion flow is fully accessible with screen readers.

**Setup**:
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Navigate to Products page
3. Have at least 3 test products

**Steps**:

1. **Navigate to Products Table**
   - [ ] Verify page title is announced
   - [ ] Verify main landmark is announced
   - [ ] Table structure is properly announced

2. **Select Products**
   - [ ] Tab to first product checkbox
   - [ ] Verify product name is announced with checkbox state
   - [ ] Select product using Space key
   - [ ] Verify selection change is announced

3. **Open Delete Dialog**
   - [ ] Tab to bulk actions menu
   - [ ] Open menu with Enter
   - [ ] Navigate to Delete option with arrow keys
   - [ ] Verify "Delete products dialog opened" is announced

4. **Navigate Dialog Steps**
   - [ ] Verify dialog title and description are announced
   - [ ] Tab through all focusable elements
   - [ ] Verify focus doesn't leave dialog
   - [ ] Check step progress announcements

5. **Confirm Deletion**
   - [ ] Navigate to confirmation method
   - [ ] Complete confirmation (type/hold/click)
   - [ ] Verify "Deletion in progress" announcement
   - [ ] Verify "Products successfully deleted" announcement

6. **Focus Restoration**
   - [ ] After dialog closes, verify focus returns to trigger element
   - [ ] Verify updated product count is announced

**Expected Results**:
- All interactive elements are reachable
- All state changes are announced
- Focus management works correctly
- No information is conveyed only through visual means

### Test Script 2: Form Validation

**Objective**: Ensure form errors are properly announced.

**Steps**:
1. Navigate to Product Create form
2. Submit empty form
3. Verify each error is announced
4. Navigate between error fields
5. Fix errors and verify announcements

**Success Criteria**:
- Errors announced immediately
- Fields marked as invalid
- Error count announced
- Success announced after correction

## Keyboard Navigation Testing

### Test Script 3: Complete Keyboard Navigation

**Objective**: Verify all functionality is accessible via keyboard.

**Test Areas**:

1. **Global Navigation**
   - [ ] Tab through header navigation
   - [ ] Use arrow keys in dropdown menus
   - [ ] Escape closes dropdowns
   - [ ] Enter activates links

2. **Data Tables**
   - [ ] Tab to sortable column headers
   - [ ] Sort with Enter/Space
   - [ ] Navigate table cells with arrow keys (if implemented)
   - [ ] Select rows with Space
   - [ ] Access row actions menu

3. **Modal Dialogs**
   - [ ] Tab cycles within dialog
   - [ ] Escape closes dialog
   - [ ] Tab order is logical
   - [ ] No hidden focus traps

4. **Forms**
   - [ ] Tab through all fields
   - [ ] Space/Enter in selects opens dropdown
   - [ ] Arrow keys navigate options
   - [ ] Tab doesn't skip disabled fields

**Keyboard Shortcuts to Test**:
- `Tab` / `Shift+Tab`: Forward/backward navigation
- `Enter`: Activate buttons/links
- `Space`: Toggle checkboxes, activate buttons
- `Arrow keys`: Navigate menus, radio groups
- `Escape`: Close modals, cancel operations
- `Home/End`: Jump to first/last item

### Test Script 4: Focus Management

**Steps**:
1. Open any modal dialog
2. Verify initial focus placement
3. Tab through all elements
4. Close dialog and verify focus restoration
5. Test with dynamic content updates

## High Contrast Mode Testing

### Test Script 5: Windows High Contrast

**Setup**: Enable Windows High Contrast mode

**Test Areas**:

1. **Color Independence**
   - [ ] All information visible without color
   - [ ] Severity indicators have patterns
   - [ ] Links are underlined
   - [ ] Focus indicators visible

2. **Borders and Boundaries**
   - [ ] All interactive elements have borders
   - [ ] Card boundaries visible
   - [ ] Table cells have borders
   - [ ] Form fields clearly delineated

3. **Icons and Images**
   - [ ] Icons have text alternatives
   - [ ] Decorative images hidden
   - [ ] Charts have data tables

### Test Script 6: Custom High Contrast

**Steps**:
1. Enable application's high contrast mode
2. Verify custom color schemes apply
3. Test pattern visibility for colorblind users
4. Verify no information lost

## Mobile Accessibility Testing

### Test Script 7: Touch Target Testing

**Device**: Mobile phone or tablet

**Requirements**:
- Minimum 44x44 pixel touch targets
- Adequate spacing between targets
- No precision gestures required

**Test Areas**:

1. **Navigation**
   - [ ] Hamburger menu accessible
   - [ ] All links tappable
   - [ ] No hover-only interactions

2. **Forms**
   - [ ] Input fields large enough
   - [ ] Labels tap to focus field
   - [ ] Error messages visible
   - [ ] Keyboard doesn't obscure fields

3. **Tables**
   - [ ] Horizontal scroll if needed
   - [ ] Row actions accessible
   - [ ] Sort controls tappable

### Test Script 8: Screen Reader on Mobile

**Setup**: Enable TalkBack (Android) or VoiceOver (iOS)

**Gestures to Test**:
- Swipe right/left: Next/previous element
- Double tap: Activate
- Two-finger scroll: Scroll content
- Three-finger swipe: Navigate by heading

**Test Flow**:
1. Navigate through main screens
2. Complete a product creation
3. Delete a product
4. Verify all announcements

## Cognitive Load Assessment

### Test Script 9: Task Complexity

**Objective**: Ensure tasks are not overly complex.

**Criteria**:
- Maximum 7±2 items in any list
- Clear task progression
- Reversible actions
- Confirmation for destructive actions
- Clear error recovery

**Test Scenarios**:

1. **Multi-Step Processes**
   - [ ] Progress indicators present
   - [ ] Can go back to previous steps
   - [ ] Current step clearly marked
   - [ ] Help available at each step

2. **Error Recovery**
   - [ ] Clear error messages
   - [ ] Actionable solutions provided
   - [ ] Can retry failed operations
   - [ ] Data preserved on error

3. **Memory Load**
   - [ ] No need to remember info across screens
   - [ ] Context provided when needed
   - [ ] Confirmations show what will happen
   - [ ] Recent actions visible

### Test Script 10: Language and Instructions

**Check for**:
- Plain language (8th grade level)
- Consistent terminology
- No jargon without explanation
- Clear calls-to-action
- Helpful placeholder text

## Tools and Resources

### Automated Testing Tools

```bash
# Run axe-core locally
npm run test:a11y:axe

# Generate accessibility report
npm run test:a11y -- --reporter=html
```

### Browser Testing

1. **Chrome DevTools**:
   - Lighthouse audit
   - Rendering tab > Emulate vision deficiencies
   - CSS Overview > Contrast issues

2. **Firefox Developer Tools**:
   - Accessibility Inspector
   - Contrast checker
   - Keyboard navigation visualization

### Manual Testing Checklist

- [ ] All images have appropriate alt text
- [ ] Form inputs have associated labels
- [ ] Page has proper heading hierarchy (h1-h6)
- [ ] Links have descriptive text (not "click here")
- [ ] Color is not sole conveyor of information
- [ ] Page is functional at 200% zoom
- [ ] Videos have captions/transcripts
- [ ] No flashing content >3 times per second
- [ ] Error messages are clear and helpful
- [ ] Skip links provided for navigation

## Reporting Issues

When reporting accessibility issues:

1. **Include**:
   - Browser and version
   - Assistive technology used
   - Steps to reproduce
   - Expected vs actual behavior
   - WCAG criterion violated

2. **Priority Levels**:
   - **P0**: Blocker - Feature unusable
   - **P1**: Critical - Major difficulty
   - **P2**: Major - Workaround exists
   - **P3**: Minor - Cosmetic issue

3. **Template**:
```markdown
### Accessibility Issue

**Component**: [Component name]
**WCAG Criterion**: [e.g., 1.4.3 Contrast]
**Severity**: [Blocker/Critical/Major/Minor]
**AT Used**: [Screen reader/keyboard/etc]

**Steps to Reproduce**:
1. ...
2. ...

**Expected**: ...
**Actual**: ...

**Screenshot/Recording**: [if applicable]
```

## Compliance Tracking

Track compliance with WCAG 2.1 Level AA:

| Principle | Guidelines | Status |
|-----------|------------|---------|
| Perceivable | 1.1-1.4 | ✅ Tested |
| Operable | 2.1-2.5 | ✅ Tested |
| Understandable | 3.1-3.3 | ✅ Tested |
| Robust | 4.1 | ✅ Tested |

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [Inclusive Design Principles](https://inclusivedesignprinciples.org/)

## Contact

For accessibility questions or concerns:
- Create an issue with `accessibility` label
- Tag `@quality-agent` for automated testing
- Review team: QA and Frontend teams