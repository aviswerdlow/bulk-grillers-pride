/**
 * Mobile-specific optimizations for progressive deletion flow
 * Ensures 60fps performance on mid-range devices
 */

interface NavigatorWithBattery extends Navigator {
  getBattery(): Promise<{
    level: number;
    charging: boolean;
  }>;
}

interface WindowWithGtag extends Window {
  gtag: (...args: unknown[]) => void;
}

/**
 * Touch gesture utilities
 */
export class TouchGestureHandler {
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private isScrolling = false;
  
  constructor(
    private onSwipeLeft?: () => void,
    private onSwipeRight?: () => void,
    private threshold = 50,
    private maxTime = 300
  ) {}
  
  handleTouchStart = (e: TouchEvent) => {
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.startTime = Date.now();
    this.isScrolling = false;
  };
  
  handleTouchMove = (e: TouchEvent) => {
    if (!this.startX || !this.startY) return;
    
    const deltaX = e.touches[0].clientX - this.startX;
    const deltaY = e.touches[0].clientY - this.startY;
    
    // Detect if user is scrolling vertically
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      this.isScrolling = true;
    }
  };
  
  handleTouchEnd = (e: TouchEvent) => {
    if (!this.startX || !this.startY || this.isScrolling) return;
    
    const deltaX = e.changedTouches[0].clientX - this.startX;
    const deltaTime = Date.now() - this.startTime;
    
    // Check if swipe is valid
    if (Math.abs(deltaX) > this.threshold && deltaTime < this.maxTime) {
      if (deltaX > 0) {
        this.onSwipeRight?.();
      } else {
        this.onSwipeLeft?.();
      }
    }
    
    // Reset
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
  };
}

/**
 * Momentum scrolling for smooth 60fps performance
 */
export function enableMomentumScrolling(element: HTMLElement) {
  element.style.overflowY = 'auto';
  element.style.webkitOverflowScrolling = 'touch';
  element.style.overscrollBehavior = 'contain';
}

/**
 * Optimize animations for 60fps
 */
export function optimizeForGPU(element: HTMLElement) {
  // Force GPU acceleration
  element.style.transform = 'translateZ(0)';
  element.style.willChange = 'transform';
  
  // Clean up after animation
  const cleanup = () => {
    element.style.willChange = 'auto';
  };
  
  return cleanup;
}

/**
 * Debounced resize handler for responsive updates
 */
export function createResponsiveHandler(
  callback: () => void,
  delay = 150
) {
  let timeoutId: NodeJS.Timeout;
  
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
}

/**
 * Touch-friendly button styles
 */
export const touchButtonStyles = {
  minHeight: '44px',
  minWidth: '44px',
  padding: '12px 16px',
  WebkitTapHighlightColor: 'rgba(0, 0, 0, 0.1)',
  touchAction: 'manipulation',
  userSelect: 'none' as const
};

/**
 * Prevent scroll during touch interactions
 */
export function preventScrollDuringTouch(element: HTMLElement) {
  let touchStartY = 0;
  
  element.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  element.addEventListener('touchmove', (e) => {
    const touchY = e.touches[0].clientY;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const height = element.clientHeight;
    
    const isScrollingUp = touchY > touchStartY && scrollTop === 0;
    const isScrollingDown = touchY < touchStartY && 
      scrollTop + height >= scrollHeight;
    
    if (isScrollingUp || isScrollingDown) {
      e.preventDefault();
    }
  }, { passive: false });
}

/**
 * Intersection Observer for lazy loading
 */
export function createLazyLoader(
  onIntersect: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        onIntersect(entry);
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '50px',
    ...options
  });
  
  return observer;
}

/**
 * Battery-aware feature toggling
 */
export async function getBatteryStatus() {
  if ('getBattery' in navigator) {
    try {
      const battery = await (navigator as NavigatorWithBattery).getBattery();
      return {
        level: battery.level,
        charging: battery.charging
      };
    } catch {
      // Battery API not supported
    }
  }
  
  return { level: 1, charging: true };
}

/**
 * Reduce motion for accessibility
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Haptic feedback for supported devices
 */
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 30;
    navigator.vibrate(duration);
  }
}

/**
 * Mobile-optimized image loading
 */
export function getOptimizedImageSrc(
  baseSrc: string,
  width: number,
  devicePixelRatio = window.devicePixelRatio || 1
) {
  const actualWidth = Math.round(width * devicePixelRatio);
  
  // Round to nearest 100px for better caching
  const optimizedWidth = Math.ceil(actualWidth / 100) * 100;
  
  // Assuming image service that supports width parameter
  return `${baseSrc}?w=${optimizedWidth}&q=85`;
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private marks = new Map<string, number>();
  
  mark(name: string) {
    this.marks.set(name, performance.now());
  }
  
  measure(startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark) || 0;
    const end = endMark ? (this.marks.get(endMark) || performance.now()) : performance.now();
    return end - start;
  }
  
  logMetrics(operation: string) {
    const duration = this.measure(operation);
    
    // Log to analytics if available
    if (typeof window !== 'undefined' && 'gtag' in window && (window as WindowWithGtag).gtag) {
      (window as WindowWithGtag).gtag('event', 'performance', {
        event_category: 'deletion_flow',
        event_label: operation,
        value: Math.round(duration)
      });
    }
    
    return duration;
  }
}