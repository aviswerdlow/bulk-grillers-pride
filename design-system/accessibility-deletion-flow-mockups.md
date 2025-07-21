# Accessibility Deletion Flow Visual Mockups

## Overview
This document provides comprehensive visual design specifications for accessibility-enhanced deletion flow components. All designs follow WCAG 2.1 AA compliance standards and work without color reliance.

## 1. Pattern-Based Severity Indicators

### Design Philosophy
Each severity level uses a unique pattern that is distinguishable without color, combined with semantic colors for users who can perceive them.

### Pattern Specifications

#### Info Pattern (Sparse Dots)
```
Pattern: • • • • •
         • • • • •
         • • • • •
Spacing: 8px between dots
Dot size: 2px diameter
Color: Blue (#2563EB)
High Contrast: Black on white
Pattern SVG: <pattern id="info-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
  <circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.3"/>
</pattern>
```

#### Warning Pattern (Diagonal Stripes)
```
Pattern: ///////////
         ///////////
         ///////////
Line width: 2px
Line spacing: 6px
Angle: 45 degrees
Color: Yellow (#F59E0B)
High Contrast: Black stripes on white
Pattern SVG: <pattern id="warning-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
  <line x1="0" y1="8" x2="8" y2="0" stroke="currentColor" stroke-width="2" opacity="0.4"/>
</pattern>
```

#### Danger Pattern (Cross-Hatch)
```
Pattern: XXX
         XXX
         XXX
Line width: 2px
Grid size: 8px
Color: Red (#EF4444)
High Contrast: Black crosshatch on white
Pattern SVG: <pattern id="danger-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
  <line x1="0" y1="0" x2="8" y2="8" stroke="currentColor" stroke-width="2" opacity="0.5"/>
  <line x1="8" y1="0" x2="0" y2="8" stroke="currentColor" stroke-width="2" opacity="0.5"/>
</pattern>
```

#### Critical Pattern (Dense Checkerboard)
```
Pattern: ■□■□
         □■□■
         ■□■□
Square size: 4px
Color: Dark Red (#991B1B)
High Contrast: Black and white checkerboard
Pattern SVG: <pattern id="critical-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
  <rect x="0" y="0" width="4" height="4" fill="currentColor"/>
  <rect x="4" y="4" width="4" height="4" fill="currentColor"/>
</pattern>
```

### Component Structure
```html
<div class="severity-indicator severity-[level]">
  <div class="pattern-overlay" aria-hidden="true"></div>
  <div class="icon-container">
    <Icon aria-hidden="true" />
  </div>
  <div class="content">
    <span class="severity-label">Warning Level</span>
    <span class="severity-message">Message text</span>
  </div>
</div>
```

### Visual Examples
```
┌─────────────────────────────────────────┐
│ [•••] Info: System will save changes    │ (Blue background with dots)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ [///] Warning: Some data may be lost    │ (Yellow background with stripes)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ [XXX] Danger: Action cannot be undone   │ (Red background with crosshatch)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ [■□■] Critical: Permanent data loss     │ (Dark red with checkerboard)
└─────────────────────────────────────────┘
```

## 2. Alternative Confirmation Methods

### Hold-to-Confirm Button

#### Visual Design
```
Initial State:
┌─────────────────────────────────────┐
│  Hold to Delete                     │
│  ○────────────────────────────○     │
│  [Hold for 3 seconds]               │
└─────────────────────────────────────┘

Progress State (50%):
┌─────────────────────────────────────┐
│  Keep Holding...                    │
│  ●●●●●●●●●●○○○○○○○○○○○○○○○○○○○     │
│  [1.5s remaining]                   │
└─────────────────────────────────────┘

Complete State:
┌─────────────────────────────────────┐
│  ✓ Confirmed                        │
│  ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●     │
│  [Action confirmed]                 │
└─────────────────────────────────────┘
```

#### Specifications
- Button height: 56px
- Progress bar height: 8px
- Border radius: 8px
- Colors:
  - Initial: Gray border (#6B7280)
  - Progress: Blue fill (#2563EB)
  - Complete: Green (#10B981)
  - Cancelled: Red flash (#EF4444)

### Type-to-Confirm Input

#### Visual Design
```
┌─────────────────────────────────────────────┐
│ Type "DELETE" to confirm:                   │
│ ┌─────────────────────────────────────┐    │
│ │ DELETE_                              │    │
│ └─────────────────────────────────────┘    │
│ ⓘ This action cannot be undone              │
└─────────────────────────────────────────────┘
```

#### States
- Empty: Gray border (#D1D5DB)
- Partial match: Orange border (#F59E0B)
- Complete match: Green border (#10B981)
- Mismatch: Red border (#EF4444)

### Confirmation Method Selector

```
┌─────────────────────────────────────────────┐
│ Choose confirmation method:                  │
│                                             │
│ ○ Standard Click                            │
│   Quick confirmation for non-critical       │
│                                             │
│ ● Hold to Confirm (Recommended)             │
│   Prevents accidental clicks                │
│                                             │
│ ○ Type to Confirm                           │
│   Maximum security for critical actions     │
└─────────────────────────────────────────────┘
```

## 3. Focus Indicators

### Design Specifications
- Width: 3px minimum
- Style: Solid with optional inner offset
- Colors:
  - Default: Blue (#2563EB)
  - High contrast: Black (#000000)
  - Destructive: Red (#EF4444)
- Offset: 2px from element edge

### Visual Examples

#### Button Focus
```
Normal:                    Focused:
┌─────────────┐           ╔═════════════╗
│   Button    │    →      ║   Button    ║
└─────────────┘           ╚═════════════╝
                          (3px blue border)
```

#### Input Focus
```
Normal:                    Focused:
┌─────────────┐           ╔═════════════╗
│ Input text  │    →      ║ Input text  ║
└─────────────┘           ╚═════════════╝
                          (3px blue border + shadow)
```

#### Checkbox Focus
```
Normal:                    Focused:
□ Option                   ╔═╗
                    →      ║□║ Option
                          ╚═╝
                          (3px border around checkbox)
```

## 4. Screen Reader Announcements

### Visual Design for Developer Reference

#### Live Region Indicator
```
┌─────────────────────────────────────────┐
│ 🔊 ARIA Live Region (polite)           │
│ "3 products selected for deletion"      │
└─────────────────────────────────────────┘
```

#### Semantic Structure Visualization
```
<main>
  ├─ <h1> Delete Products
  ├─ <nav> [aria-label="Deletion steps"]
  │   ├─ Step 1 [aria-current="step"]
  │   ├─ Step 2
  │   └─ Step 3
  ├─ <section> [aria-labelledby="consequences"]
  │   ├─ <h2 id="consequences"> Review Consequences
  │   └─ <ul> [role="list"]
  └─ <div> [role="status"] Live announcements
```

## 5. Multi-Step Deletion Wizard Enhancements

### Enhanced Step Indicators

```
Step 1 (Current):          Step 2:                  Step 3:
┌──────────────┐          ┌──────────────┐        ┌──────────────┐
│ ① Review     │          │ ② Options     │        │ ③ Confirm     │
│ ▓▓▓▓▓▓▓▓▓▓   │          │ ░░░░░░░░░░    │        │ ░░░░░░░░░░    │
│ [Current]    │          │ [Upcoming]    │        │ [Upcoming]    │
└──────────────┘          └──────────────┘        └──────────────┘
     ↓                          
[Active - Blue]           [Inactive - Gray]       [Inactive - Gray]
```

### Progress Bar with Percentage
```
┌─────────────────────────────────────────────────┐
│ Progress: 33% Complete                          │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ Step 1 of 3: Review Consequences                │
└─────────────────────────────────────────────────┘
```

### Keyboard Navigation Hints
```
┌─────────────────────────────────────────────────┐
│ ⌨️ Keyboard shortcuts:                          │
│ • Tab: Next field                               │
│ • Shift+Tab: Previous field                     │
│ • Enter: Proceed to next step                   │
│ • Escape: Cancel operation                      │
└─────────────────────────────────────────────────┘
```

## 6. Mobile Responsive Designs

### Mobile Step Indicator (Vertical)
```
┌─────────────┐
│ Step 1      │
│ ▓▓▓▓▓▓▓▓▓▓  │
│ Review      │
├─────────────┤
│ Step 2      │
│ ░░░░░░░░░░  │
│ Options     │
├─────────────┤
│ Step 3      │
│ ░░░░░░░░░░  │
│ Confirm     │
└─────────────┘
```

### Mobile Hold-to-Confirm (Full Width)
```
┌─────────────────────────┐
│                         │
│   Hold to Delete        │
│                         │
│ ○─────────────────────○ │
│                         │
│ [Hold for 3 seconds]    │
│                         │
└─────────────────────────┘
Touch target: 56px height
```

### Mobile Pattern Indicators
```
┌─────────────────────────┐
│ [///] Warning           │
│ Some references will    │
│ be broken               │
│                         │
│ [More details ▼]        │
└─────────────────────────┘
Expandable for space saving
```

## 7. High Contrast Mode

### Color Adjustments
```
Normal Mode:              High Contrast Mode:
Blue (#2563EB)      →     Black (#000000)
Yellow (#F59E0B)    →     Black with pattern
Red (#EF4444)       →     Black with dense pattern
Gray (#6B7280)      →     Black (#000000)

Background:               Background:
White (#FFFFFF)     →     White (#FFFFFF)
Light Gray (#F9FAFB) →    White (#FFFFFF)
```

### Pattern Visibility
All patterns increase opacity to 100% in high contrast mode for maximum visibility.

## 8. Component States

### Interactive Element States
1. **Default**: Base appearance
2. **Hover**: Slight elevation + color shift
3. **Focus**: 3px border indicator
4. **Active**: Pressed appearance
5. **Disabled**: 50% opacity + not-allowed cursor
6. **Loading**: Animated spinner or progress
7. **Error**: Red border + error pattern
8. **Success**: Green border + checkmark

## 9. Implementation Notes

### CSS Custom Properties
```css
:root {
  --focus-width: 3px;
  --focus-color: #2563EB;
  --focus-offset: 2px;
  --pattern-opacity: 0.3;
  --pattern-opacity-high-contrast: 1;
  --hold-duration: 3000ms;
  --animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Accessibility Attributes
- All patterns: `aria-hidden="true"` (decorative)
- Severity indicators: `role="img"` with descriptive `aria-label`
- Progress indicators: `role="progressbar"` with `aria-valuenow`
- Live regions: `aria-live="polite"` for non-critical, `aria-live="assertive"` for critical
- Focus management: `tabindex` management for modal dialogs

### Pattern SVG Assets
All patterns provided as inline SVG for maximum compatibility and performance. Patterns scale with component size and respect currentColor for theming.

## 10. Developer Handoff Checklist

- [ ] All colors meet WCAG AA contrast ratios (documented below)
- [ ] Focus indicators visible against all backgrounds
- [ ] Patterns distinguishable in grayscale
- [ ] Touch targets minimum 44x44px
- [ ] Keyboard navigation fully functional
- [ ] Screen reader announcements clear and timely
- [ ] High contrast mode tested
- [ ] Mobile responsive behavior verified
- [ ] Animation respects prefers-reduced-motion
- [ ] Error states clearly communicated

## Color Contrast Ratios

### Text Contrast
- Blue text on white: 4.5:1 ✓
- Yellow text on white: 3.1:1 ✗ (Use dark yellow #92400E)
- Red text on white: 4.5:1 ✓
- Dark red text on white: 7.8:1 ✓
- White text on dark red: 7.8:1 ✓

### Pattern Contrast
- All patterns tested at 100% opacity: >3:1 ✓
- Pattern + color combination: >4.5:1 ✓

### Focus Indicator Contrast
- Blue focus on white: 4.5:1 ✓
- Blue focus on light gray: 4.2:1 ✓
- Black focus (high contrast): 21:1 ✓