# Enhanced Deletion Wizard with Accessibility Features

## Overview
This document details the accessible multi-step deletion wizard design, incorporating all WCAG 2.1 AA requirements and enhanced user experience features.

## Wizard Structure

### Step Navigation Design

#### Desktop Layout
```
┌──────────────────────────────────────────────────────────────────┐
│ Delete Products - Step 1 of 3                                    │
│                                                                  │
│ ┌────────────────┬────────────────┬────────────────┐           │
│ │ ① Review       │ ② Options      │ ③ Confirm      │           │
│ │ ■■■■■■■■■■■■■■ │ ░░░░░░░░░░░░░░ │ ░░░░░░░░░░░░░░ │           │
│ │ [Current Step] │ [Upcoming]     │ [Upcoming]     │           │
│ └────────────────┴────────────────┴────────────────┘           │
│                                                                  │
│ Progress: 33% Complete                                           │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Mobile Layout (Vertical)
```
┌─────────────────────┐
│ Delete Products     │
│                     │
│ Step 1 of 3        │
│ ┌─────────────────┐ │
│ │ ① Review       │ │
│ │ ■■■■■■■■■■■■■■ │ │
│ │ [Current Step] │ │
│ ├─────────────────┤ │
│ │ ② Options      │ │
│ │ ░░░░░░░░░░░░░░ │ │
│ │ [Upcoming]     │ │
│ ├─────────────────┤ │
│ │ ③ Confirm      │ │
│ │ ░░░░░░░░░░░░░░ │ │
│ │ [Upcoming]     │ │
│ └─────────────────┘ │
│                     │
│ 33% Complete       │
│ ▓▓▓▓▓░░░░░░░░░░░░  │
└─────────────────────┘
```

### Step 1: Review Consequences

#### Enhanced Consequence Display
```
┌──────────────────────────────────────────────────────────────┐
│ Review Deletion Consequences                                  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [•••] Info: Category Assignments                       │  │
│ │ □ 5 products will be removed from their categories    │  │
│ │   Impact: Low - Categories remain intact               │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [///] Warning: Product References                      │  │
│ │ □ External links to these products will break         │  │
│ │   Impact: Medium - May affect user experience          │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [XXX] Danger: Related Data                            │  │
│ │ □ Associated analytics data will be archived          │  │
│ │   Impact: High - Historical data becomes read-only     │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ☑ I understand and acknowledge all consequences             │
│                                                              │
│ [Previous] [Cancel]                    [Next: Options →]     │
└──────────────────────────────────────────────────────────────┘
```

### Step 2: Deletion Options

#### Options with Visual Indicators
```
┌──────────────────────────────────────────────────────────────┐
│ Choose Deletion Type                                         │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ◉ Move to Trash (Recommended)                          │  │
│ │   [•••] Info Pattern                                   │  │
│ │   • Products hidden immediately                        │  │
│ │   • Can be restored within 30 days                     │  │
│ │   • No data permanently lost                           │  │
│ │                                                         │  │
│ │   ✓ Safest option                                      │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ○ Delete Permanently                                   │  │
│ │   [■□■] Critical Pattern                               │  │
│ │   ⚠️ This action cannot be undone                      │  │
│ │   • All product data permanently removed               │  │
│ │   • Cannot be recovered                                │  │
│ │   • Immediate and irreversible                         │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [← Previous: Review] [Cancel]          [Next: Confirm →]     │
└──────────────────────────────────────────────────────────────┘
```

### Step 3: Confirmation

#### Enhanced Confirmation with Multiple Methods
```
┌──────────────────────────────────────────────────────────────┐
│ Confirm Deletion                                             │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Summary of Actions:                                     │  │
│ │ • Deleting: 5 products                                  │  │
│ │ • Method: Move to Trash                                 │  │
│ │ • Recovery: Available for 30 days                       │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Products to be deleted:                                 │  │
│ │ ┌──────────────────────────────────────────────────┐   │  │
│ │ │ 📦 Product 1 (SKU: ABC123)                       │   │  │
│ │ │ 📦 Product 2 (SKU: DEF456)                       │   │  │
│ │ │ 📦 Product 3 (SKU: GHI789)                       │   │  │
│ │ │ ... and 2 more                                   │   │  │
│ │ └──────────────────────────────────────────────────┘   │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Choose confirmation method:                                  │
│ ◉ Hold to Confirm (Recommended for bulk actions)           │
│ ○ Type to Confirm                                           │
│ ○ Standard Click                                            │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │          [Hold to Delete Products]                     │  │
│ │          ○────────────────────────○                    │  │
│ │          Hold for 3 seconds                            │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [← Previous: Options] [Cancel]                               │
└──────────────────────────────────────────────────────────────┘
```

## Screen Reader Announcements

### Announcement Structure
```
<!-- Live Region for Step Changes -->
<div role="status" aria-live="polite" aria-atomic="true">
  Step 1 of 3: Review Consequences. 
  Please review and acknowledge all deletion consequences.
</div>

<!-- Live Region for Actions -->
<div role="alert" aria-live="assertive">
  Warning: 2 consequences require acknowledgment before proceeding.
</div>

<!-- Progress Announcements -->
<div role="progressbar" 
     aria-valuenow="33" 
     aria-valuemin="0" 
     aria-valuemax="100"
     aria-label="Deletion wizard progress">
  33% complete
</div>
```

### Semantic HTML Structure
```html
<div role="dialog" aria-labelledby="wizard-title" aria-describedby="wizard-desc">
  <h1 id="wizard-title">Delete Products</h1>
  <p id="wizard-desc">Follow the steps to safely delete selected products</p>
  
  <nav aria-label="Deletion steps">
    <ol>
      <li aria-current="step">
        <span class="step-number">1</span>
        <span class="step-label">Review Consequences</span>
      </li>
      <!-- More steps -->
    </ol>
  </nav>
  
  <main>
    <section aria-labelledby="step-title">
      <h2 id="step-title">Review Consequences</h2>
      <!-- Step content -->
    </section>
  </main>
  
  <footer>
    <!-- Navigation buttons -->
  </footer>
</div>
```

## Keyboard Navigation

### Keyboard Shortcuts Display
```
┌─────────────────────────────────────────┐
│ ⌨️ Keyboard Navigation Available        │
│                                         │
│ Tab ........... Next element           │
│ Shift + Tab ... Previous element       │
│ Space ......... Toggle checkbox        │
│ Enter ......... Activate button        │
│ Escape ........ Cancel operation       │
│ Arrow Keys .... Navigate options       │
│                                         │
│ Press ? for full keyboard help         │
└─────────────────────────────────────────┘
```

### Focus Flow Diagram
```
Start → Step Indicator → Progress Bar → Content Area → 
        ↓                                      ↓
        Navigation ← Footer Buttons ← Checkbox/Radio Options
```

## Error States

### Validation Error Display
```
┌──────────────────────────────────────────────────────────────┐
│ ⚠️ Cannot Proceed - Issues Found                             │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [XXX] Error: Unacknowledged Consequences               │  │
│ │ You must acknowledge all consequences before            │  │
│ │ proceeding to the next step.                            │  │
│ │                                                         │  │
│ │ Missing acknowledgments:                                │  │
│ │ • Product References (Medium impact)                    │  │
│ │ • Related Data (High impact)                           │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [Review Missing Items]                                       │
└──────────────────────────────────────────────────────────────┘
```

## Success State

### Completion Screen
```
┌──────────────────────────────────────────────────────────────┐
│ ✅ Deletion Complete                                         │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Successfully moved 5 products to trash                  │  │
│ │                                                         │  │
│ │ What happens next:                                      │  │
│ │ • Products are now hidden from your catalog             │  │
│ │ • They can be restored from Trash within 30 days       │  │
│ │ • After 30 days, they will be permanently deleted      │  │
│ │                                                         │  │
│ │ Reference ID: DEL-2024-0123-4567                       │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [View Trash] [Return to Products]                            │
└──────────────────────────────────────────────────────────────┘
```

## Mobile Adaptations

### Touch-Optimized Controls
- Minimum touch target: 48x48px
- Increased spacing: 16px between interactive elements
- Swipe gestures: Left/right for step navigation (with button fallbacks)
- Bottom sheet for confirmations on mobile

### Responsive Breakpoints
- Mobile: < 640px (vertical layout)
- Tablet: 640px - 1024px (hybrid layout)
- Desktop: > 1024px (horizontal layout)

## CSS Implementation Guide

```css
/* Step Indicators */
.step-indicator {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.step-indicator[aria-current="step"] {
  border-color: var(--color-info);
  background: var(--color-info-light);
}

.step-indicator:focus {
  outline: 3px solid var(--focus-default);
  outline-offset: 2px;
}

/* Pattern Overlays */
.severity-indicator::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.3;
  pointer-events: none;
}

.severity-info::before {
  background-image: url(#info-pattern);
}

.severity-warning::before {
  background-image: url(#warning-pattern);
}

.severity-danger::before {
  background-image: url(#danger-pattern);
}

.severity-critical::before {
  background-image: url(#critical-pattern);
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .severity-indicator::before {
    opacity: 1;
  }
  
  .step-indicator:focus {
    outline-color: black;
    outline-width: 3px;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .wizard-steps {
    flex-direction: column;
  }
  
  .step-indicator {
    width: 100%;
    margin-bottom: 8px;
  }
  
  .wizard-footer {
    position: sticky;
    bottom: 0;
    background: white;
    border-top: 1px solid var(--color-gray-200);
    padding: 16px;
  }
}
```

## Testing Checklist

- [ ] All steps keyboard navigable
- [ ] Screen reader announces all state changes
- [ ] Focus never gets lost during navigation
- [ ] Error messages clearly associated with fields
- [ ] Progress indication works for all users
- [ ] Mobile touch targets meet 48x48px minimum
- [ ] Patterns visible without color
- [ ] High contrast mode fully functional
- [ ] Reduced motion preferences respected
- [ ] Session recovery after browser refresh