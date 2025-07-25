# Warning Level Visual Design System

## Overview

This document defines the comprehensive warning level visual system for Bulk Grillers Pride, providing 5 distinct severity levels for user feedback and alerts.

## Severity Levels

### Level 1: Info (Informational)
- **Purpose**: General information, tips, or non-critical updates
- **Color**: Blue spectrum
- **Icon**: Info circle (ℹ️)
- **Use cases**: System updates, helpful tips, feature announcements

### Level 2: Success (Positive Confirmation)
- **Purpose**: Successful operations, positive feedback
- **Color**: Green spectrum
- **Icon**: Check circle (✓)
- **Use cases**: Successful saves, completed operations, achievements

### Level 3: Warning (Caution Required)
- **Purpose**: Important information requiring user attention
- **Color**: Yellow/Amber spectrum
- **Icon**: Alert triangle (⚠️)
- **Use cases**: Approaching limits, deprecation notices, mild errors

### Level 4: Error (Action Required)
- **Purpose**: Errors requiring immediate user action
- **Color**: Orange/Red spectrum
- **Icon**: X circle (✕)
- **Use cases**: Validation errors, failed operations, missing requirements

### Level 5: Critical (System Critical)
- **Purpose**: Critical system issues or destructive actions
- **Color**: Deep red spectrum
- **Icon**: Exclamation octagon (🛑)
- **Use cases**: Data loss warnings, security issues, system failures

## Visual Specifications

### Color Palette (OKLCH Color Space)

```css
:root {
  /* Level 1: Info */
  --warning-info-bg: oklch(96% 0.02 220);
  --warning-info-border: oklch(88% 0.06 220);
  --warning-info-text: oklch(25% 0.08 220);
  --warning-info-icon: oklch(60% 0.12 220);
  
  /* Level 2: Success */
  --warning-success-bg: oklch(95% 0.08 145);
  --warning-success-border: oklch(85% 0.12 145);
  --warning-success-text: oklch(25% 0.10 145);
  --warning-success-icon: oklch(55% 0.15 145);
  
  /* Level 3: Warning */
  --warning-caution-bg: oklch(95% 0.10 90);
  --warning-caution-border: oklch(85% 0.15 90);
  --warning-caution-text: oklch(25% 0.12 90);
  --warning-caution-icon: oklch(60% 0.18 90);
  
  /* Level 4: Error */
  --warning-error-bg: oklch(95% 0.08 25);
  --warning-error-border: oklch(85% 0.12 25);
  --warning-error-text: oklch(25% 0.10 25);
  --warning-error-icon: oklch(55% 0.15 25);
  
  /* Level 5: Critical */
  --warning-critical-bg: oklch(30% 0.15 25);
  --warning-critical-border: oklch(45% 0.20 25);
  --warning-critical-text: oklch(95% 0.02 25);
  --warning-critical-icon: oklch(95% 0.05 25);
  
  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    --warning-info-bg: oklch(25% 0.04 220);
    --warning-info-border: oklch(35% 0.08 220);
    --warning-info-text: oklch(85% 0.06 220);
    
    --warning-success-bg: oklch(25% 0.08 145);
    --warning-success-border: oklch(35% 0.12 145);
    --warning-success-text: oklch(85% 0.10 145);
    
    --warning-caution-bg: oklch(30% 0.10 90);
    --warning-caution-border: oklch(40% 0.15 90);
    --warning-caution-text: oklch(90% 0.12 90);
    
    --warning-error-bg: oklch(25% 0.08 25);
    --warning-error-border: oklch(35% 0.12 25);
    --warning-error-text: oklch(85% 0.10 25);
    
    --warning-critical-bg: oklch(20% 0.15 25);
    --warning-critical-border: oklch(30% 0.20 25);
    --warning-critical-text: oklch(90% 0.05 25);
  }
}
```

### Component Structure

```jsx
// Base warning component structure
<div className="warning-level-[1-5]">
  <div className="warning-icon">
    {/* Icon component */}
  </div>
  <div className="warning-content">
    <h4 className="warning-title">Title</h4>
    <p className="warning-message">Message</p>
  </div>
  <div className="warning-actions">
    {/* Action buttons */}
  </div>
</div>
```

### Animation Specifications

#### Level 1-2: Subtle animations
- Fade in: 200ms ease-out
- No pulsing or attention-grabbing animations

#### Level 3: Moderate attention
- Fade in: 150ms ease-out
- Subtle pulse on icon (1.5s duration, 0.05 scale)

#### Level 4: High attention
- Slide in from top: 150ms ease-out
- Icon pulse (1s duration, 0.1 scale)
- Border glow animation

#### Level 5: Maximum attention
- Shake animation on entry (100ms, 2px amplitude)
- Continuous pulse on entire component
- High contrast flash on entry

### Accessibility Requirements

1. **ARIA Roles**:
   - Level 1-2: `role="status"`
   - Level 3-4: `role="alert"`
   - Level 5: `role="alert" aria-live="assertive"`

2. **Focus Management**:
   - All warnings must be keyboard navigable
   - Level 4-5 should auto-focus on appearance
   - Clear focus indicators matching severity

3. **Screen Reader Announcements**:
   - Prefix with severity level
   - Clear, actionable messages
   - Announce available actions

### Mobile Adaptations

#### Touch Targets
- Minimum 44x44px for all interactive elements
- Increased padding on mobile (16px minimum)

#### Positioning
- Level 1-3: Top of screen with slide down
- Level 4-5: Full-width bottom sheet on mobile
- Swipe to dismiss for Level 1-3
- Explicit action required for Level 4-5

#### Haptic Feedback (when supported)
- Level 1-2: Light impact
- Level 3: Medium impact
- Level 4-5: Heavy impact

## Implementation Examples

### Info Alert (Level 1)
```jsx
<Alert variant="info" icon={InfoIcon}>
  <AlertTitle>System Update</AlertTitle>
  <AlertDescription>
    New features have been added to your dashboard.
  </AlertDescription>
</Alert>
```

### Critical Warning (Level 5)
```jsx
<Alert variant="critical" icon={AlertOctagonIcon} autoFocus>
  <AlertTitle>Destructive Action</AlertTitle>
  <AlertDescription>
    This will permanently delete all selected items. This action cannot be undone.
  </AlertDescription>
  <AlertActions>
    <Button variant="destructive">Delete Forever</Button>
    <Button variant="outline">Cancel</Button>
  </AlertActions>
</Alert>
```

## Usage Guidelines

1. **Frequency**: Avoid warning fatigue by using appropriate levels
2. **Clarity**: Messages should be clear and actionable
3. **Context**: Place warnings near relevant content
4. **Persistence**: 
   - Level 1-2: Auto-dismiss after 5 seconds
   - Level 3: Dismissible by user
   - Level 4-5: Require explicit action

## Integration with Existing System

This warning system extends the current Alert component architecture while maintaining consistency with:
- Existing color tokens
- Current spacing system
- Established animation patterns
- Accessibility standards