# Accessibility Deletion Flow - Developer Handoff

## Overview
This document provides implementation guidance for developers to build the accessible deletion flow components based on the design specifications.

## Quick Start Checklist

- [ ] Import pattern SVG definitions from `accessibility-patterns.svg`
- [ ] Set up CSS custom properties from `accessibility-color-palette.md`
- [ ] Review component mockups in `accessibility-confirmation-components.tsx`
- [ ] Implement semantic HTML structure from `accessibility-wizard-design.md`
- [ ] Configure screen reader announcements
- [ ] Test with keyboard navigation
- [ ] Validate color contrast ratios
- [ ] Test in high contrast mode

## Implementation Order

1. **Base Infrastructure** (2-3 days)
   - Pattern system setup
   - Color palette configuration
   - Focus management utilities
   - Screen reader announcement system

2. **Core Components** (3-4 days)
   - Severity indicators with patterns
   - Hold-to-confirm button
   - Type-to-confirm input
   - Confirmation method selector

3. **Wizard Enhancement** (2-3 days)
   - Step indicators with patterns
   - Progress bar with announcements
   - Keyboard navigation
   - Error/success states

4. **Testing & Refinement** (2 days)
   - Accessibility testing
   - Cross-browser validation
   - Performance optimization
   - Documentation

## Core Implementation Details

### 1. Pattern System Setup

```tsx
// utils/accessibility-patterns.tsx
export const loadPatternDefinitions = () => {
  // Inject SVG pattern definitions into DOM
  const patternSVG = document.createElement('div');
  patternSVG.innerHTML = `
    <svg width="0" height="0" style="position: absolute;">
      <defs>
        <!-- Pattern definitions from accessibility-patterns.svg -->
      </defs>
    </svg>
  `;
  document.body.appendChild(patternSVG);
};

// Call on app initialization
loadPatternDefinitions();
```

### 2. Severity Indicator Component

```tsx
// components/ui/severity-indicator.tsx
import { cn } from '@/lib/utils';

interface SeverityIndicatorProps {
  severity: 'info' | 'warning' | 'danger' | 'critical';
  label: string;
  message: string;
  pattern?: boolean;
}

export function SeverityIndicator({ 
  severity, 
  label, 
  message, 
  pattern = true 
}: SeverityIndicatorProps) {
  const patternId = pattern ? `${severity}-pattern` : undefined;
  const highContrastPatternId = pattern ? `${severity}-pattern-hc` : undefined;
  
  return (
    <div 
      className={cn(
        "severity-indicator",
        `severity-${severity}`,
        "relative p-4 rounded-lg border-2"
      )}
      role="img"
      aria-label={`${severity} severity: ${label}`}
    >
      {pattern && (
        <div 
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            backgroundImage: `url(#${patternId})`,
            opacity: 0.3
          }}
          aria-hidden="true"
        />
      )}
      <div className="relative z-10">
        <h4 className="font-semibold">{label}</h4>
        <p className="text-sm mt-1">{message}</p>
      </div>
    </div>
  );
}
```

### 3. Hold-to-Confirm Button Implementation

```tsx
// components/ui/hold-to-confirm-button.tsx
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  duration?: number; // milliseconds
  children: React.ReactNode;
  className?: string;
}

export function HoldToConfirmButton({
  onConfirm,
  duration = 3000,
  children,
  className
}: HoldToConfirmButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'holding' | 'complete' | 'cancelled'>('idle');
  const intervalRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  const startHolding = () => {
    setIsHolding(true);
    setStatus('holding');
    startTimeRef.current = Date.now();
    
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current!;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      
      setProgress(newProgress);
      
      // Announce progress at key points
      if (newProgress === 25 || newProgress === 50 || newProgress === 75) {
        announceProgress(newProgress);
      }
      
      if (newProgress >= 100) {
        completeHold();
      }
    }, 50);
  };

  const stopHolding = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (progress < 100) {
      setStatus('cancelled');
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 500);
    }
    
    setIsHolding(false);
  };

  const completeHold = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setStatus('complete');
    setProgress(100);
    onConfirm();
    
    // Reset after animation
    setTimeout(() => {
      setStatus('idle');
      setProgress(0);
    }, 1000);
  };

  const announceProgress = (percent: number) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = `Hold progress: ${percent}%`;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 100);
  };

  return (
    <button
      className={cn(
        "hold-to-confirm-button",
        "relative overflow-hidden",
        status === 'holding' && "ring-2 ring-blue-500",
        status === 'complete' && "bg-green-50 border-green-500",
        status === 'cancelled' && "bg-red-50 border-red-500",
        className
      )}
      onMouseDown={startHolding}
      onMouseUp={stopHolding}
      onMouseLeave={stopHolding}
      onTouchStart={startHolding}
      onTouchEnd={stopHolding}
      onTouchCancel={stopHolding}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          startHolding();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          stopHolding();
        }
      }}
      aria-label={`Hold to confirm. Hold for ${duration / 1000} seconds.`}
      role="button"
    >
      <span className="relative z-10">{children}</span>
      
      <div 
        className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div 
          className={cn(
            "h-full transition-all duration-100",
            status === 'holding' && "bg-blue-500",
            status === 'complete' && "bg-green-500",
            status === 'cancelled' && "bg-red-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <span className="text-xs text-gray-500 mt-1">
        {status === 'idle' && `Hold for ${duration / 1000} seconds`}
        {status === 'holding' && `${((duration - (progress * duration / 100)) / 1000).toFixed(1)}s remaining`}
        {status === 'complete' && 'Confirmed!'}
        {status === 'cancelled' && 'Cancelled'}
      </span>
    </button>
  );
}
```

### 4. Type-to-Confirm Input Implementation

```tsx
// components/ui/type-to-confirm-input.tsx
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TypeToConfirmInputProps {
  confirmText: string;
  onConfirm: (confirmed: boolean) => void;
  className?: string;
}

export function TypeToConfirmInput({
  confirmText,
  onConfirm,
  className
}: TypeToConfirmInputProps) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'empty' | 'partial' | 'complete' | 'mismatch'>('empty');

  useEffect(() => {
    if (value === '') {
      setStatus('empty');
      onConfirm(false);
    } else if (value === confirmText) {
      setStatus('complete');
      onConfirm(true);
    } else if (confirmText.startsWith(value)) {
      setStatus('partial');
      onConfirm(false);
    } else {
      setStatus('mismatch');
      onConfirm(false);
    }
  }, [value, confirmText, onConfirm]);

  const remainingChars = confirmText.length - value.length;

  return (
    <div className="type-to-confirm-container">
      <label htmlFor="confirm-input" className="block text-sm font-medium mb-2">
        Type <code className="px-2 py-1 bg-gray-100 rounded">{confirmText}</code> to confirm:
      </label>
      
      <input
        id="confirm-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        className={cn(
          "w-full px-4 py-2 border-2 rounded-lg font-mono",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          status === 'empty' && "border-gray-300",
          status === 'partial' && "border-yellow-500 bg-yellow-50",
          status === 'complete' && "border-green-500 bg-green-50",
          status === 'mismatch' && "border-red-500 bg-red-50",
          className
        )}
        placeholder={confirmText}
        aria-describedby="confirm-status"
        aria-invalid={status === 'mismatch'}
      />
      
      <div 
        id="confirm-status" 
        className={cn(
          "mt-2 text-sm flex items-center gap-2",
          status === 'empty' && "text-gray-500",
          status === 'partial' && "text-yellow-600",
          status === 'complete' && "text-green-600",
          status === 'mismatch' && "text-red-600"
        )}
        role="status"
        aria-live="polite"
      >
        {status === 'empty' && (
          <>
            <span>ℹ️</span>
            <span>This action cannot be undone</span>
          </>
        )}
        {status === 'partial' && (
          <>
            <span>⚠️</span>
            <span>{remainingChars} more character{remainingChars !== 1 ? 's' : ''} needed</span>
          </>
        )}
        {status === 'complete' && (
          <>
            <span>✓</span>
            <span>Ready to proceed</span>
          </>
        )}
        {status === 'mismatch' && (
          <>
            <span>✗</span>
            <span>Text doesn't match. Please try again.</span>
          </>
        )}
      </div>
    </div>
  );
}
```

### 5. Focus Management Utilities

```tsx
// utils/focus-management.ts
export class FocusManager {
  private focusHistory: HTMLElement[] = [];
  private trapContainer: HTMLElement | null = null;
  
  // Create focus trap within container
  createTrap(container: HTMLElement) {
    this.trapContainer = container;
    
    // Get all focusable elements
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), ' +
      'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // Trap focus on tab
    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    });
    
    // Focus first element
    firstFocusable?.focus();
  }
  
  // Save current focus
  saveFocus() {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      this.focusHistory.push(activeElement);
    }
  }
  
  // Restore previous focus
  restoreFocus() {
    const previousElement = this.focusHistory.pop();
    if (previousElement && document.body.contains(previousElement)) {
      previousElement.focus();
    }
  }
  
  // Clear focus history
  clearHistory() {
    this.focusHistory = [];
  }
}
```

### 6. Screen Reader Announcement System

```tsx
// utils/screen-reader-announcer.ts
export class ScreenReaderAnnouncer {
  private container: HTMLDivElement;
  private queue: string[] = [];
  private isProcessing = false;
  
  constructor() {
    // Create live region container
    this.container = document.createElement('div');
    this.container.className = 'sr-only';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(this.container);
  }
  
  // Announce message
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (priority === 'assertive') {
      // Immediate announcement
      this.container.setAttribute('aria-live', 'assertive');
      this.container.textContent = message;
      
      setTimeout(() => {
        this.container.setAttribute('aria-live', 'polite');
      }, 100);
    } else {
      // Queue polite announcements
      this.queue.push(message);
      this.processQueue();
    }
  }
  
  // Process announcement queue
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const message = this.queue.shift()!;
      this.container.textContent = message;
      
      // Wait for announcement to be read
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.isProcessing = false;
  }
  
  // Clear announcements
  clear() {
    this.queue = [];
    this.container.textContent = '';
  }
  
  // Cleanup
  destroy() {
    this.container.remove();
  }
}

// Global instance
export const announcer = new ScreenReaderAnnouncer();
```

## Testing Guidelines

### Automated Testing
```tsx
// __tests__/accessibility.test.tsx
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<DeleteWizard />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('should announce step changes', () => {
    // Test screen reader announcements
  });
  
  it('should maintain focus on navigation', () => {
    // Test focus management
  });
});
```

### Manual Testing Checklist

#### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Shift+Tab navigates backwards
- [ ] Enter/Space activates buttons
- [ ] Escape closes dialogs
- [ ] Arrow keys navigate radio/checkbox groups

#### Screen Readers
- [ ] Test with NVDA (Windows)
- [ ] Test with JAWS (Windows)
- [ ] Test with VoiceOver (macOS/iOS)
- [ ] Test with TalkBack (Android)

#### Visual Testing
- [ ] Zoom to 200% - no horizontal scroll
- [ ] High contrast mode - all elements visible
- [ ] Grayscale mode - patterns distinguishable
- [ ] Focus indicators visible on all backgrounds

#### Mobile Testing
- [ ] Touch targets minimum 48x48px
- [ ] Swipe gestures have button alternatives
- [ ] Pinch-to-zoom not blocked
- [ ] Orientation changes handled gracefully

## Browser Support

### Required Features
- CSS Custom Properties
- SVG Pattern Support
- ARIA 1.2 Support
- Touch Events API
- Intersection Observer (for lazy loading)

### Polyfills Needed
```html
<!-- For older browsers -->
<script src="https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver"></script>
```

## Performance Considerations

### Optimization Tips
1. Lazy load pattern SVGs
2. Use CSS containment for pattern overlays
3. Debounce progress updates in hold-to-confirm
4. Virtualize long product lists
5. Preload critical fonts

### Bundle Size Impact
- Pattern system: ~2KB (gzipped)
- Accessibility utilities: ~5KB (gzipped)
- Component library: ~15KB (gzipped)
- Total impact: ~22KB (gzipped)

## Common Pitfalls to Avoid

1. **Don't remove focus outlines** - Style them instead
2. **Don't auto-focus without user action** - Except for modals
3. **Don't use color alone** - Always provide patterns/text
4. **Don't ignore reduced motion** - Respect user preferences
5. **Don't skip semantic HTML** - Use proper heading hierarchy

## Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [React Accessibility](https://react.dev/reference/react-dom/components/common#accessibility-attributes)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Screen Reader Testing Guide](https://webaim.org/articles/screenreader_testing/)

## Support

For questions about implementation:
1. Check the design mockups in `/design-system/`
2. Review the architecture document at `/docs/architecture/accessibility-deletion-flow.md`
3. Test with the provided utilities
4. Create an issue with the `accessibility` label

Remember: Accessibility is not a feature, it's a requirement. Every user deserves equal access to functionality.