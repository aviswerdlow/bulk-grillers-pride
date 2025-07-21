# Color System Implementation Guide

## Overview

Our accessible color system is implemented using CSS custom properties (CSS variables) that automatically adapt to user preferences for dark mode, high contrast mode, and reduced motion. All colors meet WCAG 2.1 AA standards with many achieving AAA compliance.

## File Structure

```
src/styles/
├── colors.css                 # Core color definitions and CSS custom properties
├── tailwind-accessibility-plugin.js  # Tailwind utilities for semantic colors
└── color-system-guide.md      # This documentation
```

## Color System Architecture

### CSS Custom Properties

All colors are defined as CSS custom properties in `colors.css` and are automatically imported through `globals.css`. The system follows a hierarchical structure:

1. **Base Colors**: Raw color values (e.g., `--color-info: #2563EB`)
2. **Semantic Colors**: Purpose-driven colors (e.g., `--text-info: var(--color-info-dark)`)
3. **Component Colors**: Specific use-case colors (e.g., `--focus-default: var(--color-info)`)

### Automatic Theme Support

The color system automatically adapts to:
- **Dark Mode**: `@media (prefers-color-scheme: dark)`
- **High Contrast Mode**: `@media (prefers-contrast: high)`
- **Forced Colors Mode**: `@media (forced-colors: active)` (Windows High Contrast)
- **Print Mode**: `@media print`

## Usage Guide

### Using Semantic Colors in Components

#### 1. Background Colors

```tsx
// Using Tailwind utilities
<div className="bg-semantic-info">Info background</div>
<div className="bg-semantic-warning">Warning background</div>
<div className="bg-semantic-danger">Danger background</div>
<div className="bg-semantic-critical">Critical background</div>
<div className="bg-semantic-success">Success background</div>

// Using CSS variables directly
<div style={{ backgroundColor: 'var(--bg-info)' }}>Info background</div>
```

#### 2. Text Colors

```tsx
// Using Tailwind utilities
<p className="text-semantic-info">Info text</p>
<p className="text-semantic-warning">Warning text</p>
<p className="text-semantic-danger">Danger text</p>
<p className="text-semantic-critical">Critical text</p>
<p className="text-semantic-success">Success text</p>

// Using CSS variables directly
<p style={{ color: 'var(--text-info)' }}>Info text</p>
```

#### 3. Border Colors

```tsx
// Using Tailwind utilities
<div className="border-2 border-semantic-info">Info border</div>
<div className="border-2 border-semantic-warning">Warning border</div>
<div className="border-2 border-semantic-danger">Danger border</div>
<div className="border-2 border-semantic-critical">Critical border</div>
<div className="border-2 border-semantic-success">Success border</div>

// Using CSS variables directly
<div style={{ borderColor: 'var(--border-info)' }}>Info border</div>
```

### Pattern Overlays

Pattern overlays provide additional visual distinction beyond color alone, ensuring accessibility for colorblind users.

```tsx
// Info pattern (dots)
<div className="bg-semantic-info pattern-info">
  <p className="relative z-10">Info content with dot pattern</p>
</div>

// Warning pattern (diagonal stripes)
<div className="bg-semantic-warning pattern-warning">
  <p className="relative z-10">Warning content with stripe pattern</p>
</div>

// Danger pattern (crosshatch)
<div className="bg-semantic-danger pattern-danger">
  <p className="relative z-10">Danger content with crosshatch pattern</p>
</div>

// Critical pattern (checkerboard)
<div className="bg-semantic-critical pattern-critical text-white">
  <p className="relative z-10">Critical content with checkerboard pattern</p>
</div>
```

### Focus Styles

Accessible focus indicators that automatically adapt to color mode:

```tsx
// Default focus (blue)
<button className="focus-default">Default Focus</button>

// Danger focus (red)
<button className="focus-danger">Danger Focus</button>

// Warning focus (yellow/amber)
<button className="focus-warning">Warning Focus</button>

// Success focus (green)
<button className="focus-success">Success Focus</button>

// Custom focus width and offset
<button style={{
  '--focus-width': '4px',
  '--focus-offset': '4px'
}} className="focus-default">
  Custom Focus Width
</button>
```

### High Contrast Mode Support

Special utilities that only apply in high contrast mode:

```tsx
<div className="border hc:border-4">
  Border becomes thicker in high contrast mode
</div>

<p className="hc:font-bold hc:underline">
  Text becomes bold and underlined in high contrast mode
</p>

<div className="pattern-info hc:pattern-opacity-full">
  Pattern becomes fully opaque in high contrast mode
</div>
```

### Dark Mode Support

Colors automatically adjust for dark mode, but you can also use specific utilities:

```tsx
<div className="pattern-warning dark:pattern-opacity-high">
  Pattern opacity increases in dark mode
</div>
```

## Color Combinations Guide

### ✅ Approved Combinations (WCAG AA+)

#### Light Backgrounds
- **Info**: `bg-semantic-info` + `text-semantic-info`
- **Warning**: `bg-semantic-warning` + `text-semantic-warning`
- **Danger**: `bg-semantic-danger` + `text-semantic-danger`
- **Success**: `bg-semantic-success` + `text-semantic-success`

#### Dark Backgrounds
- **Critical**: `bg-semantic-critical` + `text-semantic-critical` (white text)
- **Dark Gray**: `bg-gray-800` + `text-gray-100`

### ❌ Forbidden Combinations (Fail WCAG)

Never use these color combinations:
- Base warning color (#F59E0B) as text on white
- Base success color (#10B981) as text on white
- Light colors as text on light backgrounds
- Dark colors as text on dark backgrounds

## Pattern Opacity Control

Control pattern visibility for different contexts:

```tsx
// Low opacity (default - 30%)
<div className="pattern-info">Subtle pattern</div>

// Medium opacity (60%)
<div className="pattern-warning" style={{'--pattern-opacity': '0.6'}}>
  More visible pattern
</div>

// High opacity (100%)
<div className="pattern-danger" style={{'--pattern-opacity': '1'}}>
  Fully visible pattern
</div>

// Automatic high contrast
// Pattern automatically becomes 100% opacity in high contrast mode
```

## Component Examples

### Alert Component

```tsx
function Alert({ severity, title, message }) {
  return (
    <div className={`
      rounded-lg p-4 border-2
      ${severity === 'info' && 'bg-semantic-info border-semantic-info pattern-info'}
      ${severity === 'warning' && 'bg-semantic-warning border-semantic-warning pattern-warning'}
      ${severity === 'danger' && 'bg-semantic-danger border-semantic-danger pattern-danger'}
      ${severity === 'critical' && 'bg-semantic-critical border-semantic-critical pattern-critical'}
    `}>
      <h3 className={`
        font-semibold mb-2 relative z-10
        ${severity === 'info' && 'text-semantic-info'}
        ${severity === 'warning' && 'text-semantic-warning'}
        ${severity === 'danger' && 'text-semantic-danger'}
        ${severity === 'critical' && 'text-semantic-critical'}
      `}>
        {title}
      </h3>
      <p className={`
        text-sm relative z-10
        ${severity === 'critical' ? 'text-white' : 'text-gray-700'}
      `}>
        {message}
      </p>
    </div>
  );
}
```

### Status Badge Component

```tsx
function StatusBadge({ status, children }) {
  return (
    <span className={`
      inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
      ${status === 'active' && 'bg-semantic-success text-semantic-success'}
      ${status === 'pending' && 'bg-semantic-warning text-semantic-warning'}
      ${status === 'error' && 'bg-semantic-danger text-semantic-danger'}
      ${status === 'critical' && 'bg-semantic-critical text-semantic-critical'}
    `}>
      {children}
    </span>
  );
}
```

### Accessible Button Component

```tsx
function AccessibleButton({ variant = 'default', danger = false, children, ...props }) {
  return (
    <button
      className={`
        px-4 py-2 rounded-lg font-medium transition-colors
        ${variant === 'default' && 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-default'}
        ${variant === 'primary' && 'bg-semantic-info text-white hover:opacity-90 focus-default'}
        ${danger && 'bg-semantic-danger text-white hover:opacity-90 focus-danger'}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
```

## Testing Your Implementation

### 1. Automated Testing

Run the color contrast tests:
```bash
npm test -- color-contrast.test.ts
```

### 2. Browser Testing

Test in multiple browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers

### 3. Accessibility Testing

Use these tools:
- **axe DevTools**: Browser extension for accessibility testing
- **WAVE**: Web Accessibility Evaluation Tool
- **Chrome DevTools**: Emulate vision deficiencies

### 4. Manual Testing Checklist

- [ ] Toggle system dark mode - colors should adapt
- [ ] Enable Windows High Contrast mode - patterns should be visible
- [ ] Test with grayscale filter - patterns should differentiate elements
- [ ] Zoom to 200% - no horizontal scrolling
- [ ] Tab through interface - focus indicators visible
- [ ] Test with screen reader - announcements work correctly

## Common Pitfalls and Solutions

### 1. Forgetting Relative Positioning

**Problem**: Pattern overlays cover interactive content
```tsx
// ❌ Wrong
<div className="pattern-danger">
  <button>Click me</button> {/* Button might not be clickable */}
</div>
```

**Solution**: Add relative positioning and z-index
```tsx
// ✅ Correct
<div className="pattern-danger">
  <button className="relative z-10">Click me</button>
</div>
```

### 2. Using Wrong Color Combinations

**Problem**: Using base colors that don't meet contrast requirements
```tsx
// ❌ Wrong
<p className="text-yellow-500">Warning text</p> {/* Fails WCAG */}
```

**Solution**: Use semantic color utilities
```tsx
// ✅ Correct
<p className="text-semantic-warning">Warning text</p>
```

### 3. Hardcoding Colors

**Problem**: Using hex values directly
```tsx
// ❌ Wrong
<div style={{ backgroundColor: '#2563EB' }}>Info box</div>
```

**Solution**: Use CSS custom properties
```tsx
// ✅ Correct
<div className="bg-semantic-info">Info box</div>
// or
<div style={{ backgroundColor: 'var(--bg-info)' }}>Info box</div>
```

## Migration Guide

If you're updating existing components to use the new color system:

1. **Replace hardcoded colors** with CSS variables
2. **Update Tailwind classes** to use semantic utilities
3. **Add patterns** to severity indicators
4. **Test contrast ratios** with automated tests
5. **Verify theme switching** works correctly

## Browser Support

The color system requires:
- CSS Custom Properties (CSS Variables)
- CSS media queries for prefers-color-scheme
- CSS media queries for prefers-contrast
- SVG pattern support (for pattern overlays)

All modern browsers support these features. For older browsers, provide fallback colors:

```css
.alert-info {
  background-color: #DBEAFE; /* Fallback */
  background-color: var(--bg-info); /* Modern browsers */
}
```

## Resources

- [WCAG 2.1 Color Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessible Colors Tool](https://accessible-colors.com/)
- [Color Oracle - Color Blindness Simulator](https://colororacle.org/)

## Questions?

For questions about the color system:
1. Check this documentation
2. Review the design files in `/design-system/`
3. Run the contrast tests to verify combinations
4. Create an issue with the `accessibility` label

Remember: Never rely on color alone to convey information. Always provide additional visual cues (patterns, icons, text) to ensure accessibility for all users.