# Warning Level Visual System - Integration Guide

## Quick Start

To integrate the new warning level visual system into your components:

1. **Import the styles**:
```css
@import './design-system/warning-animations.css';
```

2. **Add color variables to your CSS**:
```css
/* Add to your app.css or globals.css */
@import './design-system/warning-levels.design.md#color-palette';
```

3. **Import and use components**:
```tsx
import { WarningAlert, MobileWarningSheet } from '@/design-system/warning-components';

// Basic usage
<WarningAlert 
  level="warning"
  title="Approaching limit"
  message="You have used 90% of your storage quota."
/>
```

## Integration with Existing Alert System

### Extending Current Alert Component

Update your existing Alert component to support the new warning levels:

```tsx
// components/ui/alert.tsx
import { WarningAlert } from '@/design-system/warning-components';

export function Alert({ variant, ...props }) {
  // Map existing variants to new warning levels
  const warningLevel = {
    default: 'info',
    destructive: 'error',
    // Add new mappings
    warning: 'warning',
    success: 'success',
    critical: 'critical',
  }[variant] || 'info';

  return <WarningAlert level={warningLevel} {...props} />;
}
```

### Usage in AI Categorization Components

For the AI categorization error handling:

```tsx
// components/ai/job-error-alert.tsx
import { WarningAlert } from '@/design-system/warning-components';

export function JobErrorAlert({ error, onRetry }) {
  const severity = getErrorSeverity(error);
  
  return (
    <WarningAlert
      level={severity}
      title={error.title}
      message={error.message}
      actions={
        severity !== 'info' && (
          <Button onClick={onRetry} size="sm">
            Retry Operation
          </Button>
        )
      }
    />
  );
}

function getErrorSeverity(error) {
  if (error.code === 'RATE_LIMIT') return 'warning';
  if (error.code === 'API_KEY_INVALID') return 'error';
  if (error.code === 'DATA_LOSS_RISK') return 'critical';
  return 'info';
}
```

### Mobile Responsiveness

For mobile-optimized warnings, use the `MobileWarningSheet` component:

```tsx
// Automatically adapts to mobile bottom sheet for critical alerts
<MobileWarningSheet
  level="critical"
  title="Delete All Products?"
  message="This will permanently delete all 150 products."
  actions={
    <>
      <Button variant="destructive">Delete All</Button>
      <Button variant="outline">Cancel</Button>
    </>
  }
/>
```

## Accessibility Checklist

- [ ] All warnings have appropriate ARIA roles
- [ ] Critical warnings receive focus automatically
- [ ] Dismissible warnings can be closed with Escape key
- [ ] Screen readers announce severity level
- [ ] Color is not the only indicator of severity
- [ ] All interactive elements meet 44x44px touch target

## Performance Considerations

1. **Lazy Loading**: Import warning components only when needed
2. **Animation Performance**: CSS animations use GPU-accelerated properties
3. **Auto-dismiss Timers**: Automatically cleaned up to prevent memory leaks

## Migration from Existing Alerts

### Step 1: Audit Current Usage
```bash
# Find all Alert component usage
grep -r "Alert" --include="*.tsx" --include="*.jsx" ./src
```

### Step 2: Map Severity Levels
- Current `variant="default"` → `level="info"`
- Current `variant="destructive"` → `level="error"` or `level="critical"`
- Add appropriate levels for warnings and success states

### Step 3: Test Mobile Experience
- Verify bottom sheet behavior on mobile devices
- Test swipe-to-dismiss gestures
- Confirm haptic feedback (where supported)

## Common Patterns

### Form Validation
```tsx
{errors.length > 0 && (
  <WarningAlert
    level="error"
    title="Please fix the following errors"
    message={
      <ul className="list-disc pl-4 mt-2">
        {errors.map(error => <li key={error}>{error}</li>)}
      </ul>
    }
  />
)}
```

### API Response Handling
```tsx
const handleApiResponse = (response) => {
  if (response.warning) {
    showWarning({
      level: 'warning',
      title: 'Operation completed with warnings',
      message: response.warning,
    });
  }
};
```

### Destructive Actions
```tsx
const confirmDelete = () => {
  showWarning({
    level: 'critical',
    title: 'Confirm Deletion',
    message: `Delete ${selectedItems.length} items permanently?`,
    actions: (
      <>
        <Button variant="destructive" onClick={performDelete}>
          Delete Forever
        </Button>
        <Button variant="outline" onClick={cancel}>
          Cancel
        </Button>
      </>
    ),
    autoFocus: true,
  });
};
```

## Testing

### Unit Tests
```tsx
describe('WarningAlert', () => {
  it('should auto-dismiss info alerts after 5 seconds', () => {
    const onDismiss = jest.fn();
    render(<WarningAlert level="info" title="Test" onDismiss={onDismiss} />);
    
    jest.advanceTimersByTime(5000);
    expect(onDismiss).toHaveBeenCalled();
  });
  
  it('should not auto-dismiss critical alerts', () => {
    const onDismiss = jest.fn();
    render(<WarningAlert level="critical" title="Test" onDismiss={onDismiss} />);
    
    jest.advanceTimersByTime(10000);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
```

### Visual Regression Tests
Use Playwright for visual regression testing of warning states:

```ts
test('warning levels visual test', async ({ page }) => {
  await page.goto('/design-system/warnings');
  
  for (const level of ['info', 'success', 'warning', 'error', 'critical']) {
    await expect(page.locator(`[data-warning-level="${level}"]`)).toHaveScreenshot();
  }
});
```

## Support

For questions or issues with the warning system:
1. Check the design specifications in `/design-system/warning-levels.design.md`
2. Review component examples in `/design-system/warning-components.tsx`
3. Contact the design team for clarification on usage patterns