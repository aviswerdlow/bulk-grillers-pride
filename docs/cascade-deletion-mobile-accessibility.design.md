# Mobile Design & Accessibility Guide for Cascade Deletion

**Agent**: design-agent  
**Task**: #59 - Mobile & Accessibility Design  
**Date**: 2025-07-19

## Mobile-First Design Approach

### Design Philosophy
- **Touch-first**: All interactions optimized for touch
- **Progressive disclosure**: Show essential info first
- **Gesture-based**: Support native mobile gestures
- **Performance**: Minimize resource usage on mobile devices

## Mobile UI Patterns

### 1. Compact Impact Summary
```
+------------------------+
| 🗑️ 25 items affected  |
| ├─ Delete: 15         |
| ├─ Orphan: 8          |
| └─ Update: 2          |
| 💾 1.2GB freed    [▼] |
+------------------------+
```

### 2. Mobile Navigation Pattern
```
+------------------------+
| ← Deletion Impact      |
|------------------------|
| [Tree] [List]     [⋮] |
+------------------------+

// Swipe between views
[Tree View] ← swipe → [List View]
```

### 3. Bottom Action Sheet
```
+------------------------+
|                        |
|    [Content Area]      |
|                        |
|------------------------|
| 3 selected  1.2MB  [↑]|
|========================|
| [Cancel] [Delete (3)] |
+------------------------+
```

### 4. Mobile Tree View (Collapsible)
```
+------------------------+
| ▼ Premium Grill Set    |
|   Delete • 2.5MB       |
|   [Tap to expand]      |
+------------------------+
| ▶ Deluxe Smoker       |
|   Delete • 1.8MB       |
+------------------------+
| ▶ BBQ Accessories     |
|   Update • 3 items     |
+------------------------+
```

### 5. Swipe Actions
```
+------------------------+
| Product Name      |←──→|
| ← [Keep] [Delete] →   |
+------------------------+

// Swipe right: Keep/Exclude
// Swipe left: Delete/Include
```

## Touch Interaction Specifications

### Touch Targets
```scss
// Minimum touch target sizes
$touch-target-min: 44px;
$touch-target-comfortable: 48px;
$touch-target-spacing: 8px;

.touch-target {
  min-height: $touch-target-min;
  min-width: $touch-target-min;
  
  // Add invisible padding for smaller visual elements
  &::before {
    content: '';
    position: absolute;
    inset: -8px;
  }
}
```

### Gesture Support
```tsx
interface GestureHandlers {
  onSwipeLeft: () => void   // Delete/Include item
  onSwipeRight: () => void  // Keep/Exclude item
  onLongPress: () => void   // Multi-select mode
  onPinch: () => void      // Zoom (graph view)
  onDoubleTap: () => void  // Expand/collapse all
}
```

### Mobile-Specific Interactions
1. **Pull to Refresh**: Recalculate impacts
2. **Rubber Band Scrolling**: iOS bounce effect
3. **Momentum Scrolling**: Smooth scroll physics
4. **Haptic Feedback**: On selection changes

## Responsive Component Behaviors

### 1. Adaptive Layouts
```tsx
// Desktop: Side-by-side
<div className="flex flex-row">
  <ImpactSummary />
  <VisualizationArea />
</div>

// Mobile: Stacked
<div className="flex flex-col">
  <ImpactSummary compact />
  <VisualizationArea fullWidth />
</div>
```

### 2. Progressive Enhancement
```tsx
// Base: Works without JavaScript
<details>
  <summary>25 items affected</summary>
  <ul>
    <li>15 will be deleted</li>
    <li>8 will be orphaned</li>
  </ul>
</details>

// Enhanced: Interactive visualization
if (supportsTouch && hasJavaScript) {
  renderInteractiveTree()
}
```

### 3. Context-Aware UI
```tsx
// Show different UI based on device capabilities
const MobileTreeNode = () => {
  if (supportsHaptics) {
    return <HapticTreeNode />
  }
  if (supportsGestures) {
    return <GestureTreeNode />
  }
  return <BasicTreeNode />
}
```

## Accessibility Implementation

### 1. ARIA Patterns

#### Tree View ARIA
```html
<div role="tree" 
     aria-label="Deletion impact hierarchy"
     aria-multiselectable="true">
  <div role="treeitem"
       aria-expanded="true"
       aria-selected="false"
       aria-level="1"
       tabindex="0">
    <span>Premium Grill Set</span>
    <div role="group">
      <div role="treeitem"
           aria-level="2"
           tabindex="-1">
        Images (5 items)
      </div>
    </div>
  </div>
</div>
```

#### Live Regions
```html
<!-- Selection changes -->
<div aria-live="polite" 
     aria-atomic="true"
     className="sr-only">
  3 items selected for deletion
</div>

<!-- Loading states -->
<div aria-live="assertive"
     role="status">
  <span className="sr-only">
    Calculating deletion impact...
  </span>
</div>
```

### 2. Keyboard Navigation

#### Key Mappings
```tsx
const keyHandlers = {
  'ArrowUp': () => focusPreviousItem(),
  'ArrowDown': () => focusNextItem(),
  'ArrowLeft': () => collapseItem(),
  'ArrowRight': () => expandItem(),
  'Space': () => toggleSelection(),
  'Enter': () => activateItem(),
  'Home': () => focusFirstItem(),
  'End': () => focusLastItem(),
  'PageUp': () => scrollUpOnePage(),
  'PageDown': () => scrollDownOnePage(),
  'Ctrl+A': () => selectAll(),
  'Escape': () => clearSelection(),
}
```

#### Focus Management
```tsx
// Trap focus within dialog
useFocusTrap(dialogRef, {
  initialFocus: '.impact-summary',
  returnFocus: triggerButtonRef,
  allowOutsideClick: false
})

// Roving tabindex for tree
useRovingTabIndex(treeRef, {
  orientation: 'vertical',
  loop: false
})
```

### 3. Screen Reader Optimization

#### Descriptive Labels
```tsx
// Instead of: "Delete"
// Use: "Delete Premium Grill Set and 5 child items"

<button aria-label={`Delete ${item.name} and ${item.childCount} child items`}>
  Delete
</button>
```

#### Context Announcements
```tsx
// Announce context changes
const announceContext = (message: string) => {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  
  setTimeout(() => announcement.remove(), 1000)
}
```

### 4. Visual Accessibility

#### High Contrast Support
```scss
@media (prefers-contrast: high) {
  .impact-severity {
    // Use borders instead of colors
    &.critical {
      border: 3px solid;
      border-style: double;
    }
    &.warning {
      border: 2px dashed;
    }
  }
  
  // Increase all borders
  * {
    border-width: max(2px, 1em * 0.1);
  }
}
```

#### Color Independence
```tsx
// Always pair color with icon/pattern
const SeverityIndicator = ({ level }) => (
  <span className={`severity-${level}`}>
    <Icon name={severityIcons[level]} />
    <Pattern type={severityPatterns[level]} />
    <span className="sr-only">{level} severity</span>
  </span>
)
```

#### Focus Indicators
```scss
// Visible focus for all interactive elements
:focus-visible {
  outline: 3px solid var(--focus-color);
  outline-offset: 2px;
  
  @media (prefers-contrast: high) {
    outline-width: 4px;
  }
}

// Custom focus for specific elements
.tree-node:focus-visible {
  box-shadow: 
    inset 0 0 0 2px var(--background),
    inset 0 0 0 4px var(--focus-color);
}
```

### 5. Motion Accessibility

#### Reduced Motion Support
```scss
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  // Keep essential motion indicators
  .loading-spinner {
    animation-duration: 2s !important;
  }
}
```

#### Motion Alternatives
```tsx
// Provide non-animated feedback
const showFeedback = (type: string) => {
  if (prefersReducedMotion) {
    // Show static indicator
    showStaticFeedback(type)
  } else {
    // Show animated feedback
    showAnimatedFeedback(type)
  }
}
```

## Mobile Performance Optimizations

### 1. Lazy Loading
```tsx
// Load tree nodes on demand
const TreeNode = ({ node }) => {
  const [children, setChildren] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const loadChildren = async () => {
    if (!children && node.hasChildren) {
      const data = await fetchChildren(node.id)
      setChildren(data)
    }
    setIsExpanded(!isExpanded)
  }
  
  return (
    <div>
      <button onClick={loadChildren}>
        {node.name}
      </button>
      {isExpanded && children && (
        <TreeNodeList nodes={children} />
      )}
    </div>
  )
}
```

### 2. Virtual Scrolling
```tsx
// Only render visible items
import { FixedSizeList } from 'react-window'

const VirtualTree = ({ items }) => (
  <FixedSizeList
    height={window.innerHeight - 200} // Account for header/footer
    itemCount={items.length}
    itemSize={56} // Height of each item
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <TreeNode node={items[index]} />
      </div>
    )}
  </FixedSizeList>
)
```

### 3. Touch-Optimized Rendering
```tsx
// Debounce touch events
const useDebouncedTouch = (handler: Function, delay = 100) => {
  const timeoutRef = useRef<number>()
  
  return useCallback((...args) => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => handler(...args), delay)
  }, [handler, delay])
}
```

## Testing Guidelines

### Mobile Testing Checklist
- [ ] Test on real devices (iOS/Android)
- [ ] Test different screen sizes
- [ ] Test landscape/portrait orientation
- [ ] Test with screen readers (VoiceOver/TalkBack)
- [ ] Test with keyboard only
- [ ] Test with slow network (3G)
- [ ] Test touch targets (44px minimum)
- [ ] Test gesture conflicts
- [ ] Test with one hand operation
- [ ] Test with stylus input

### Accessibility Testing Tools
```bash
# Automated testing
- axe-core
- pa11y
- Lighthouse

# Manual testing
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

# Browser extensions
- axe DevTools
- WAVE
- Accessibility Insights
```

### Performance Metrics
```tsx
// Target metrics for mobile
const performanceTargets = {
  firstContentfulPaint: 1500, // ms
  timeToInteractive: 3500,     // ms
  totalBlockingTime: 300,      // ms
  cumulativeLayoutShift: 0.1,
  largestContentfulPaint: 2500 // ms
}
```

## Implementation Checklist

### Mobile Features
- [ ] Touch-optimized interactions
- [ ] Gesture support
- [ ] Bottom sheet pattern
- [ ] Pull to refresh
- [ ] Swipe actions
- [ ] Haptic feedback
- [ ] Offline support
- [ ] Progressive web app

### Accessibility Features
- [ ] ARIA labels and roles
- [ ] Keyboard navigation
- [ ] Focus management
- [ ] Screen reader support
- [ ] High contrast mode
- [ ] Reduced motion
- [ ] Color independence
- [ ] Text scaling support

### Performance Features
- [ ] Lazy loading
- [ ] Virtual scrolling
- [ ] Image optimization
- [ ] Code splitting
- [ ] Service worker
- [ ] Request batching
- [ ] Debounced updates
- [ ] Progressive enhancement

## Conclusion

This mobile and accessibility design ensures the cascade deletion feature works seamlessly across all devices and for all users, regardless of their abilities or device constraints. The implementation prioritizes performance, usability, and inclusivity while maintaining the visual design integrity established in the main design document.