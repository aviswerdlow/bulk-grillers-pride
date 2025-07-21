import { useEffect, useRef, useCallback, useState } from 'react';
import { useFocusManagement } from '@/contexts/accessibility';

export interface UseFocusTrapOptions {
  active?: boolean;
  initialFocus?: string | HTMLElement | (() => HTMLElement);
  restoreFocus?: boolean;
  onEscape?: () => void;
  allowOutsideClick?: boolean;
}

// Hook for managing focus trap
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  options: UseFocusTrapOptions = {}
) {
  const {
    active = true,
    initialFocus,
    restoreFocus = true,
    onEscape,
    allowOutsideClick = false,
  } = options;

  const { pushFocus, popFocus } = useFocusManagement();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [isTrapped, setIsTrapped] = useState(false);

  // Get all focusable elements within container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];
  }, [containerRef]);

  // Trap focus within container
  const trapFocus = useCallback((e: FocusEvent) => {
    if (!active || !containerRef.current) return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const target = e.target as HTMLElement;

    // Check if focus is outside container
    if (!containerRef.current.contains(target) && firstElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, [active, containerRef, getFocusableElements]);

  // Handle tab navigation
  const handleTabKey = useCallback((e: KeyboardEvent) => {
    if (!active || e.key !== 'Tab' || !containerRef.current) return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (e.shiftKey) {
      // Shift + Tab
      if (activeElement === firstElement && lastElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (activeElement === lastElement && firstElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [active, containerRef, getFocusableElements]);

  // Handle escape key
  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && onEscape) {
      e.preventDefault();
      onEscape();
    }
  }, [onEscape]);

  // Handle clicks outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (!active || allowOutsideClick || !containerRef.current) return;

    const target = e.target as HTMLElement;
    if (!containerRef.current.contains(target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [active, allowOutsideClick, containerRef]);

  // Setup focus trap
  useEffect(() => {
    if (!active) {
      setIsTrapped(false);
      return;
    }

    // Save current focus
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      pushFocus({
        elementId: previousFocusRef.current?.id || 'unknown',
        context: 'modal',
      });
    }

    // Set initial focus
    setTimeout(() => {
      if (initialFocus) {
        let elementToFocus: HTMLElement | null = null;

        if (typeof initialFocus === 'string') {
          elementToFocus = containerRef.current?.querySelector(initialFocus) as HTMLElement;
        } else if (typeof initialFocus === 'function') {
          elementToFocus = initialFocus();
        } else {
          elementToFocus = initialFocus;
        }

        elementToFocus?.focus();
      } else {
        // Focus first focusable element
        const focusableElements = getFocusableElements();
        focusableElements[0]?.focus();
      }
    }, 0);

    setIsTrapped(true);

    // Add event listeners
    document.addEventListener('focusin', trapFocus);
    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('click', handleClickOutside, true);

    return () => {
      document.removeEventListener('focusin', trapFocus);
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('click', handleClickOutside, true);

      // Restore focus
      if (restoreFocus && previousFocusRef.current) {
        const focusState = popFocus();
        
        setTimeout(() => {
          if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
            previousFocusRef.current.focus();
          }
        }, 0);
      }
    };
  }, [
    active,
    restoreFocus,
    initialFocus,
    containerRef,
    getFocusableElements,
    trapFocus,
    handleTabKey,
    handleEscapeKey,
    handleClickOutside,
    pushFocus,
    popFocus,
  ]);

  return {
    isTrapped,
    focusableElements: getFocusableElements(),
  };
}

// Hook for managing focus restoration
export function useFocusRestore() {
  const { focusHistory, popFocus } = useFocusManagement();
  const [lastFocusedElement, setLastFocusedElement] = useState<string | null>(null);

  const restoreFocus = useCallback(() => {
    const lastFocus = popFocus();
    if (lastFocus) {
      const element = document.getElementById(lastFocus.elementId);
      if (element) {
        element.focus();
        
        // Restore scroll position if available
        if (lastFocus.scrollPosition) {
          window.scrollTo(lastFocus.scrollPosition.x, lastFocus.scrollPosition.y);
        }
        
        setLastFocusedElement(lastFocus.elementId);
        return true;
      }
    }
    return false;
  }, [popFocus]);

  const getFocusHistoryLength = () => focusHistory.length;

  const clearFocusHistory = useCallback(() => {
    // Clear by popping all items
    while (focusHistory.length > 0) {
      popFocus();
    }
  }, [focusHistory, popFocus]);

  return {
    restoreFocus,
    lastFocusedElement,
    focusHistoryLength: getFocusHistoryLength(),
    clearFocusHistory,
  };
}

// Hook for roving tabindex (for toolbars, menus, etc.)
export function useRovingTabIndex(
  itemsRef: React.RefObject<HTMLElement[]>,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
    onSelect?: (index: number) => void;
  } = {}
) {
  const { orientation = 'both', loop = true, onSelect } = options;
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyNavigation = useCallback((e: KeyboardEvent) => {
    if (!itemsRef.current) return;

    const items = itemsRef.current;
    const count = items.length;
    if (count === 0) return;

    let nextIndex = activeIndex;
    let handled = false;

    switch (e.key) {
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          nextIndex = loop ? (activeIndex + 1) % count : Math.min(activeIndex + 1, count - 1);
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          nextIndex = loop
            ? activeIndex === 0 ? count - 1 : activeIndex - 1
            : Math.max(activeIndex - 1, 0);
          handled = true;
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          nextIndex = loop ? (activeIndex + 1) % count : Math.min(activeIndex + 1, count - 1);
          handled = true;
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          nextIndex = loop
            ? activeIndex === 0 ? count - 1 : activeIndex - 1
            : Math.max(activeIndex - 1, 0);
          handled = true;
        }
        break;
      case 'Home':
        nextIndex = 0;
        handled = true;
        break;
      case 'End':
        nextIndex = count - 1;
        handled = true;
        break;
      case 'Enter':
      case ' ':
        if (onSelect) {
          e.preventDefault();
          onSelect(activeIndex);
          handled = true;
        }
        break;
    }

    if (handled) {
      e.preventDefault();
      setActiveIndex(nextIndex);
      items[nextIndex]?.focus();
    }
  }, [itemsRef, activeIndex, orientation, loop, onSelect]);

  useEffect(() => {
    const items = itemsRef.current;
    if (!items) return;

    // Set tabindex based on active index
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === activeIndex ? '0' : '-1');
    });

    // Add event listener to active item
    const activeItem = items[activeIndex];
    if (activeItem) {
      activeItem.addEventListener('keydown', handleKeyNavigation);
      return () => activeItem.removeEventListener('keydown', handleKeyNavigation);
    }
    return undefined;
  }, [itemsRef, activeIndex, handleKeyNavigation]);

  return {
    activeIndex,
    setActiveIndex,
    handleFocus: (index: number) => {
      setActiveIndex(index);
      itemsRef.current?.[index]?.focus();
    },
  };
}