# Accessible Color System Documentation

## Overview

This color system provides a comprehensive, WCAG 2.1 AA/AAA compliant color palette with automatic support for:
- Dark mode
- High contrast mode
- Reduced motion preferences
- Forced color mode (Windows High Contrast)
- Print media

## CSS Custom Properties

### Color Tokens

The color system is built on CSS custom properties that automatically adapt to user preferences.

#### Primary Color Families

```css
/* Info Colors */
--color-info: #2563EB;
--color-info-light: #DBEAFE;
--color-info-dark: #1E40AF;

/* Warning Colors */
--color-warning: #F59E0B;
--color-warning-light: #FEF3C7;
--color-warning-dark: #92400E;

/* Danger/Error Colors */
--color-danger: #EF4444;
--color-danger-light: #FEE2E2;
--color-danger-dark: #B91C1C;

/* Critical Colors */
--color-critical: #991B1B;
--color-critical-light: #FCA5A5;
--color-critical-dark: #450A0A;

/* Success Colors */
--color-success: #10B981;
--color-success-light: #D1FAE5;
--color-success-dark: #065F46;
```

#### Semantic Tokens

```css
/* Text Colors */
--text-primary: /* Adapts to theme */
--text-secondary: /* Adapts to theme */
--text-info: /* Always meets contrast requirements */
--text-warning: /* Always meets contrast requirements */
--text-danger: /* Always meets contrast requirements */
--text-success: /* Always meets contrast requirements */

/* Background Colors */
--bg-primary: /* Adapts to theme */
--bg-info: /* Light background for info alerts */
--bg-warning: /* Light background for warnings */
--bg-danger: /* Light background for errors */
--bg-success: /* Light background for success */

/* Focus Colors */
--focus-default: /* Meets 3:1 contrast ratio */
--focus-width: 3px;
--focus-offset: 2px;
```

## Usage in Components

### Basic Usage

```tsx
// Using semantic classes
<div className="bg-semantic-info text-semantic-info">
  Info message
</div>

// Using CSS variables directly
<div style={{ 
  backgroundColor: 'var(--bg-warning)',
  color: 'var(--text-warning)'
}}>
  Warning message
</div>
```

### Pattern Overlays

Add visual patterns to reinforce severity levels:

```tsx
<div className="pattern-info">Info with dot pattern</div>
<div className="pattern-warning">Warning with stripes</div>
<div className="pattern-danger">Danger with crosshatch</div>
<div className="pattern-critical">Critical with checkerboard</div>
```

### Focus States

Use semantic focus utilities for consistent focus indicators:

```tsx
<button className="focus-default">Default focus</button>
<button className="focus-danger">Danger action focus</button>
<button className="focus-warning">Warning action focus</button>
<button className="focus-success">Success action focus</button>
```

## Tailwind Integration

The color system extends Tailwind with semantic color utilities:

```tsx
// Text colors
<p className="text-semantic-primary">Primary text</p>
<p className="text-semantic-info">Info text</p>

// Background colors
<div className="bg-semantic-warning">Warning background</div>
<div className="bg-semantic-danger">Danger background</div>

// Border colors
<div className="border-semantic-default">Default border</div>
<div className="border-semantic-info">Info border</div>
```

## High Contrast Mode

The system automatically adapts to high contrast preferences:

```css
/* Normal mode */
--color-info: #2563EB;
--pattern-opacity: 0.3;

/* High contrast mode (automatic) */
--color-info: #000000;
--pattern-opacity: 1;
```

### Testing High Contrast

```tsx
// Force high contrast for testing
<div className="hc:border-4 hc:font-bold hc:pattern-opacity-full">
  High contrast optimized
</div>
```

## Dark Mode Support

Colors automatically adjust for dark mode while maintaining contrast ratios:

```css
/* Light mode */
--text-info: #1E40AF; /* Dark blue */
--bg-info: #DBEAFE; /* Light blue */

/* Dark mode (automatic) */
--text-info: #60A5FA; /* Lighter blue */
--bg-info: #1E3A8A; /* Darker blue */
```

## Accessibility Checklist

When using the color system:

- [ ] Always use semantic color tokens instead of hardcoded values
- [ ] Test all color combinations for 4.5:1 contrast ratio
- [ ] Provide patterns or icons in addition to color
- [ ] Ensure focus indicators meet 3:1 contrast ratio
- [ ] Test in high contrast mode
- [ ] Test in dark mode
- [ ] Verify colors work for common color blindness types

## Examples

### Alert Component

```tsx
function Alert({ severity, children }) {
  return (
    <div className={cn(
      "p-4 rounded-lg border-2",
      {
        'bg-semantic-info border-semantic-info text-semantic-info pattern-info': 
          severity === 'info',
        'bg-semantic-warning border-semantic-warning text-semantic-warning pattern-warning': 
          severity === 'warning',
        'bg-semantic-danger border-semantic-danger text-semantic-danger pattern-danger': 
          severity === 'danger',
        'bg-semantic-critical text-white pattern-critical': 
          severity === 'critical',
      }
    )}>
      {children}
    </div>
  );
}
```

### Button with Severity

```tsx
function Button({ variant = 'default', children, ...props }) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-colors",
        {
          'bg-semantic-info text-white focus-default': variant === 'info',
          'bg-semantic-warning-dark text-white focus-warning': variant === 'warning',
          'bg-semantic-danger text-white focus-danger': variant === 'danger',
          'bg-semantic-success-dark text-white focus-success': variant === 'success',
        }
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

## Browser Support

The color system uses modern CSS features with fallbacks:

- CSS Custom Properties: All modern browsers
- `prefers-color-scheme`: Chrome 76+, Firefox 67+, Safari 12.1+
- `prefers-contrast`: Chrome 96+, Safari 14.1+
- `forced-colors`: Edge 79+, Chrome 89+

## Testing Tools

1. **Chrome DevTools**: Rendering tab → Emulate CSS media features
2. **axe DevTools**: Automated accessibility testing
3. **WAVE**: Web Accessibility Evaluation Tool
4. **Stark**: Figma plugin for contrast checking

## Migration Guide

To migrate existing components:

1. Replace hardcoded colors with semantic tokens
2. Add pattern classes for severity indicators
3. Update focus styles to use focus utilities
4. Test in all color modes

```tsx
// Before
<div className="bg-blue-100 text-blue-900 border-blue-500">

// After
<div className="bg-semantic-info text-semantic-info border-semantic-info pattern-info">
```