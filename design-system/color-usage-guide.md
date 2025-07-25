# Color Usage Guide

## Overview

This guide provides practical examples and best practices for using the accessible color system in the Bulk Grillers Pride application. All colors meet WCAG 2.1 AA standards and support dark mode and high contrast preferences.

## Quick Reference

### Tailwind Utility Classes

#### Text Colors
```jsx
// Primary text colors
<p className="text-semantic-primary">Primary text (highest emphasis)</p>
<p className="text-semantic-secondary">Secondary text (medium emphasis)</p>
<p className="text-semantic-tertiary">Tertiary text (low emphasis)</p>

// Semantic text colors
<p className="text-semantic-info">Informational message</p>
<p className="text-semantic-warning">Warning message</p>
<p className="text-semantic-danger">Error or danger message</p>
<p className="text-semantic-critical">Critical alert message</p>
<p className="text-semantic-success">Success message</p>
```

#### Background Colors
```jsx
// Base backgrounds
<div className="bg-semantic-primary">Primary background (default)</div>
<div className="bg-semantic-secondary">Secondary background</div>
<div className="bg-semantic-tertiary">Tertiary background</div>

// Alert backgrounds
<div className="bg-semantic-info text-semantic-info">Info alert</div>
<div className="bg-semantic-warning text-semantic-warning">Warning alert</div>
<div className="bg-semantic-danger text-semantic-danger">Danger alert</div>
<div className="bg-semantic-critical text-semantic-critical">Critical alert</div>
<div className="bg-semantic-success text-semantic-success">Success alert</div>
```

#### Border Colors
```jsx
// Border utilities
<div className="border border-semantic-default">Default border</div>
<div className="border-2 border-semantic-info">Info border</div>
<div className="border-2 border-semantic-warning">Warning border</div>
<div className="border-2 border-semantic-danger">Danger border</div>
<div className="border-2 border-semantic-success">Success border</div>
```

#### Focus Styles
```jsx
// Apply focus styles to interactive elements
<button className="focus-default">Default focus style</button>
<button className="focus-danger">Danger action focus</button>
<button className="focus-warning">Warning action focus</button>
<button className="focus-success">Success action focus</button>
```

#### Pattern Overlays
```jsx
// Pattern indicators for severity levels
<div className="pattern-info bg-semantic-info">
  Info level with dot pattern
</div>
<div className="pattern-warning bg-semantic-warning">
  Warning level with stripe pattern
</div>
<div className="pattern-danger bg-semantic-danger">
  Danger level with crosshatch pattern
</div>
<div className="pattern-critical bg-semantic-critical">
  Critical level with checkerboard pattern
</div>
```

## Component Examples

### Alert Component
```jsx
// Info Alert
<div className="bg-semantic-info border border-semantic-info rounded-lg p-4 pattern-info">
  <div className="flex items-start">
    <InfoIcon className="w-5 h-5 text-semantic-info mr-3" aria-hidden="true" />
    <div>
      <h3 className="text-semantic-info font-semibold">Information</h3>
      <p className="text-semantic-secondary mt-1">This is an informational message.</p>
    </div>
  </div>
</div>

// Warning Alert
<div className="bg-semantic-warning border border-semantic-warning rounded-lg p-4 pattern-warning">
  <div className="flex items-start">
    <WarningIcon className="w-5 h-5 text-semantic-warning mr-3" aria-hidden="true" />
    <div>
      <h3 className="text-semantic-warning font-semibold">Warning</h3>
      <p className="text-semantic-secondary mt-1">Please review before proceeding.</p>
    </div>
  </div>
</div>

// Danger Alert
<div className="bg-semantic-danger border border-semantic-danger rounded-lg p-4 pattern-danger">
  <div className="flex items-start">
    <DangerIcon className="w-5 h-5 text-semantic-danger mr-3" aria-hidden="true" />
    <div>
      <h3 className="text-semantic-danger font-semibold">Error</h3>
      <p className="text-semantic-secondary mt-1">This action cannot be undone.</p>
    </div>
  </div>
</div>

// Critical Alert
<div className="bg-semantic-critical border border-semantic-critical rounded-lg p-4 pattern-critical">
  <div className="flex items-start">
    <CriticalIcon className="w-5 h-5 text-white mr-3" aria-hidden="true" />
    <div>
      <h3 className="text-white font-semibold">Critical</h3>
      <p className="text-gray-200 mt-1">Immediate action required.</p>
    </div>
  </div>
</div>
```

### Button States
```jsx
// Primary button with focus state
<button className="bg-semantic-info text-white px-4 py-2 rounded focus-default hover:opacity-90 transition-opacity">
  Primary Action
</button>

// Danger button with focus state
<button className="bg-semantic-danger text-white px-4 py-2 rounded focus-danger hover:opacity-90 transition-opacity">
  Delete Item
</button>

// Success button with focus state
<button className="bg-semantic-success text-white px-4 py-2 rounded focus-success hover:opacity-90 transition-opacity">
  Confirm
</button>

// Disabled state
<button className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed opacity-50" disabled>
  Disabled
</button>
```

### Form Fields
```jsx
// Input with validation states
<div className="space-y-4">
  {/* Default input */}
  <div>
    <label className="text-semantic-primary font-medium">Email</label>
    <input 
      type="email" 
      className="w-full border border-semantic-default rounded px-3 py-2 focus-default"
      placeholder="user@example.com"
    />
  </div>

  {/* Error state */}
  <div>
    <label className="text-semantic-primary font-medium">Password</label>
    <input 
      type="password" 
      className="w-full border-2 border-semantic-danger rounded px-3 py-2 focus-danger"
      aria-invalid="true"
      aria-describedby="password-error"
    />
    <p id="password-error" className="text-semantic-danger text-sm mt-1">
      Password must be at least 8 characters
    </p>
  </div>

  {/* Success state */}
  <div>
    <label className="text-semantic-primary font-medium">Username</label>
    <input 
      type="text" 
      className="w-full border-2 border-semantic-success rounded px-3 py-2 focus-success"
      value="johndoe"
      readOnly
    />
    <p className="text-semantic-success text-sm mt-1">
      Username is available
    </p>
  </div>
</div>
```

### Deletion Flow Example
```jsx
// Multi-severity deletion warning
<div className="space-y-4">
  {/* Info level */}
  <div className="bg-semantic-info border border-semantic-info rounded-lg p-4 pattern-info">
    <h4 className="text-semantic-info font-semibold">
      3 related items will be updated
    </h4>
    <p className="text-semantic-secondary text-sm mt-1">
      References will be removed from these items.
    </p>
  </div>

  {/* Warning level */}
  <div className="bg-semantic-warning border border-semantic-warning rounded-lg p-4 pattern-warning">
    <h4 className="text-semantic-warning font-semibold">
      5 automated workflows will be affected
    </h4>
    <p className="text-semantic-secondary text-sm mt-1">
      These workflows may need manual adjustment.
    </p>
  </div>

  {/* Critical level */}
  <div className="bg-semantic-critical border border-semantic-critical rounded-lg p-4 pattern-critical">
    <h4 className="text-white font-semibold">
      This action is permanent
    </h4>
    <p className="text-gray-200 text-sm mt-1">
      All data will be permanently deleted and cannot be recovered.
    </p>
  </div>
</div>
```

## Responsive Considerations

### Mobile Adjustments
```jsx
// Responsive text sizes with color
<h1 className="text-semantic-primary text-2xl md:text-4xl font-bold">
  Page Title
</h1>
<p className="text-semantic-secondary text-sm md:text-base">
  Supporting description text
</p>

// Touch-friendly interactive elements
<button className="bg-semantic-info text-white px-6 py-3 md:px-4 md:py-2 rounded-lg focus-default min-h-[44px] md:min-h-0">
  Mobile Friendly Button
</button>
```

## Dark Mode Support

All semantic color utilities automatically adjust for dark mode:

```jsx
// These colors automatically adapt to dark mode
<div className="bg-semantic-primary text-semantic-primary">
  <h2 className="text-semantic-primary">Adapts to dark mode</h2>
  <p className="text-semantic-secondary">Secondary text also adapts</p>
  <button className="bg-semantic-info text-white px-4 py-2 rounded focus-default">
    Button colors adjust too
  </button>
</div>
```

## High Contrast Mode

High contrast mode automatically enhances visibility:

```jsx
// Pattern opacity increases in high contrast mode
<div className="pattern-warning bg-semantic-warning hc:pattern-opacity-full">
  Pattern becomes fully opaque in high contrast mode
</div>

// Additional high contrast utilities
<button className="border border-semantic-default hc:border-4 hc:font-bold">
  Enhanced in high contrast
</button>
```

## Best Practices

### Do's ✅

1. **Use semantic color names** instead of raw color values
   ```jsx
   // Good
   <p className="text-semantic-danger">Error message</p>
   
   // Avoid
   <p className="text-red-600">Error message</p>
   ```

2. **Combine patterns with colors** for accessibility
   ```jsx
   // Good - color + pattern
   <div className="bg-semantic-warning pattern-warning">
     Warning with visual pattern
   </div>
   ```

3. **Use appropriate text colors** on colored backgrounds
   ```jsx
   // Good - proper contrast
   <div className="bg-semantic-info">
     <p className="text-semantic-info">Dark text on light background</p>
   </div>
   ```

4. **Apply focus styles** to all interactive elements
   ```jsx
   // Good
   <button className="focus-default">Accessible button</button>
   ```

### Don'ts ❌

1. **Don't use color alone** to convey meaning
   ```jsx
   // Bad - relies only on color
   <div className="bg-red-500">Error</div>
   
   // Good - includes text and pattern
   <div className="bg-semantic-danger pattern-danger">
     <span>Error:</span> Invalid input
   </div>
   ```

2. **Don't use low contrast combinations**
   ```jsx
   // Bad - yellow on white
   <div className="bg-white">
     <p className="text-yellow-500">Hard to read</p>
   </div>
   
   // Good - use dark variant
   <div className="bg-white">
     <p className="text-semantic-warning">Readable warning text</p>
   </div>
   ```

3. **Don't override system preferences**
   ```jsx
   // Bad - forces light mode
   <div className="bg-white text-black">
   
   // Good - respects preferences
   <div className="bg-semantic-primary text-semantic-primary">
   ```

## Testing Checklist

- [ ] All text meets 4.5:1 contrast ratio (use browser DevTools)
- [ ] Focus indicators visible on all interactive elements
- [ ] Patterns visible without color (test in grayscale)
- [ ] Dark mode maintains proper contrast
- [ ] High contrast mode enhances visibility
- [ ] Mobile touch targets are at least 44x44px
- [ ] No information conveyed by color alone

## CSS Variables Reference

For advanced use cases, you can access the CSS custom properties directly:

```css
/* In your CSS */
.custom-element {
  color: var(--text-primary);
  background-color: var(--bg-secondary);
  border-color: var(--border-default);
}

/* Focus customization */
.custom-focus:focus {
  outline: var(--focus-width) solid var(--focus-default);
  outline-offset: var(--focus-offset);
}

/* Pattern opacity control */
.custom-pattern {
  --pattern-opacity: 0.5; /* Override default */
}
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessibility Color Palette Documentation](/design-system/accessibility-color-palette.md)
- [Deletion Flow Mockups](/design-system/accessibility-deletion-flow-mockups.md)