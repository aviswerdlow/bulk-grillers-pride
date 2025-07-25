# Progressive Enhancement Implementation Guide for Deletion Dialog

**Author**: systems-design-agent  
**Date**: 2025-07-20  
**Related**: #58 - Mobile-First Performance Architecture

## Executive Summary

This guide provides a comprehensive progressive enhancement strategy for the deletion dialog, ensuring functionality across all devices while delivering optimal experiences based on device capabilities. The implementation follows a three-layer approach: foundation (works everywhere), enhancement (better experience), and optimization (peak performance).

## 1. Progressive Enhancement Layers

### 1.1 Layer Architecture

```typescript
// Progressive enhancement layer definitions
enum EnhancementLevel {
  FOUNDATION = 'foundation',    // HTML + Basic CSS
  ENHANCED = 'enhanced',        // + JavaScript + Animations
  OPTIMAL = 'optimal'          // + Advanced Features
}

interface EnhancementLayer {
  level: EnhancementLevel;
  requirements: {
    javascript: boolean;
    css: boolean;
    features: string[];
  };
  capabilities: string[];
  fallbacks: string[];
}

const enhancementLayers: EnhancementLayer[] = [
  {
    level: EnhancementLevel.FOUNDATION,
    requirements: {
      javascript: false,
      css: true,
      features: []
    },
    capabilities: [
      'form-submission',
      'basic-selection',
      'server-validation'
    ],
    fallbacks: []
  },
  {
    level: EnhancementLevel.ENHANCED,
    requirements: {
      javascript: true,
      css: true,
      features: ['fetch', 'promise', 'es6']
    },
    capabilities: [
      'client-validation',
      'multi-step-wizard',
      'real-time-feedback',
      'animations'
    ],
    fallbacks: ['foundation']
  },
  {
    level: EnhancementLevel.OPTIMAL,
    requirements: {
      javascript: true,
      css: true,
      features: [
        'intersectionobserver',
        'requestidlecallback',
        'webworker',
        'indexeddb'
      ]
    },
    capabilities: [
      'virtual-scrolling',
      'gesture-navigation',
      'offline-support',
      'biometric-auth',
      'haptic-feedback'
    ],
    fallbacks: ['enhanced', 'foundation']
  }
];
```

## 2. Foundation Layer Implementation

### 2.1 HTML-First Deletion Form

```html
<!-- Foundation layer - works without JavaScript -->
<form 
  method="POST" 
  action="/api/products/delete" 
  class="deletion-form"
  data-enhance="deletion-dialog"
>
  <!-- CSRF Protection -->
  <input type="hidden" name="_csrf" value="{{ csrfToken }}" />
  <input type="hidden" name="_method" value="DELETE" />
  
  <!-- Progressive Enhancement Hook -->
  <input type="hidden" name="_enhancement" value="foundation" />
  
  <!-- Step 1: Selection (always visible) -->
  <fieldset class="deletion-step" data-step="selection">
    <legend>Select items to delete</legend>
    
    <!-- Accessible checkbox list -->
    <div class="deletion-items" role="group" aria-labelledby="deletion-heading">
      <div class="deletion-items__controls">
        <label class="select-all">
          <input type="checkbox" name="_select_all" />
          <span>Select all</span>
        </label>
      </div>
      
      <ul class="deletion-items__list" role="list">
        {% for product in products %}
        <li class="deletion-item" role="listitem">
          <label class="deletion-item__label">
            <input 
              type="checkbox" 
              name="product_ids[]" 
              value="{{ product.id }}"
              aria-describedby="product-{{ product.id }}-desc"
            />
            <span class="deletion-item__content">
              <strong>{{ product.title }}</strong>
              <span id="product-{{ product.id }}-desc" class="deletion-item__meta">
                SKU: {{ product.sku }} • 
                {{ product.variantCount }} variants
              </span>
            </span>
          </label>
        </li>
        {% endfor %}
      </ul>
    </div>
    
    <!-- Fallback pagination for large lists -->
    {% if pagination %}
    <nav class="deletion-pagination" aria-label="Product pages">
      <a href="?page={{ pagination.prev }}" {% if not pagination.prev %}disabled{% endif %}>
        Previous
      </a>
      <span>Page {{ pagination.current }} of {{ pagination.total }}</span>
      <a href="?page={{ pagination.next }}" {% if not pagination.next %}disabled{% endif %}>
        Next
      </a>
    </nav>
    {% endif %}
  </fieldset>
  
  <!-- Step 2: Consequences (hidden by default, shown via CSS when items selected) -->
  <fieldset class="deletion-step" data-step="consequences" disabled>
    <legend>Review deletion consequences</legend>
    
    <div class="consequences-list" role="alert">
      <h3>This action will:</h3>
      <ul>
        <li>Move selected items to trash (recoverable for 30 days)</li>
        <li>Remove items from active inventory</li>
        <li>Archive associated data</li>
      </ul>
    </div>
    
    <!-- Confirmation method selection -->
    <div class="confirmation-method">
      <label>
        <input type="radio" name="confirmation_method" value="standard" checked />
        Standard confirmation
      </label>
      <label>
        <input type="radio" name="confirmation_method" value="type" />
        Type to confirm
      </label>
    </div>
  </fieldset>
  
  <!-- Step 3: Confirmation -->
  <fieldset class="deletion-step" data-step="confirmation" disabled>
    <legend>Confirm deletion</legend>
    
    <!-- Progressive confirmation options -->
    <div class="confirmation-options">
      <!-- Standard confirmation -->
      <div class="confirmation-standard" data-method="standard">
        <p>Click the button below to confirm deletion of <strong class="selected-count">0</strong> items.</p>
      </div>
      
      <!-- Type to confirm -->
      <div class="confirmation-type" data-method="type" hidden>
        <label for="confirmation-text">
          Type <strong>"DELETE <span class="selected-count">0</span>"</strong> to confirm:
        </label>
        <input 
          type="text" 
          id="confirmation-text" 
          name="confirmation_text" 
          pattern="DELETE \d+"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </div>
  </fieldset>
  
  <!-- Action buttons -->
  <div class="deletion-actions">
    <button type="button" class="btn-secondary" data-action="cancel">
      Cancel
    </button>
    <button type="submit" class="btn-danger" data-action="delete" disabled>
      Delete Selected
    </button>
  </div>
  
  <!-- Loading state (hidden, shown during submission) -->
  <div class="deletion-loading" hidden aria-live="polite">
    <span class="spinner"></span>
    Processing deletion...
  </div>
</form>

<!-- CSS for foundation layer -->
<style>
/* Foundation styles - work without JavaScript */
.deletion-form {
  --spacing: 1rem;
  --radius: 0.5rem;
  --danger: #dc2626;
  --danger-hover: #b91c1c;
}

/* Hide steps by default */
.deletion-step[data-step="consequences"],
.deletion-step[data-step="confirmation"] {
  display: none;
}

/* Show steps when items selected (CSS-only logic) */
.deletion-form:has(input[name="product_ids[]"]:checked) {
  .deletion-step[data-step="consequences"] {
    display: block;
  }
  
  .deletion-actions button[data-action="delete"] {
    opacity: 1;
    pointer-events: auto;
  }
}

/* Mobile-first responsive design */
.deletion-item__label {
  display: flex;
  align-items: flex-start;
  padding: var(--spacing);
  gap: var(--spacing);
  
  /* Touch-friendly sizing */
  min-height: 48px;
  cursor: pointer;
  
  /* Prevent text selection on touch */
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Loading state */
.deletion-form[data-loading] {
  .deletion-actions,
  .deletion-step {
    opacity: 0.5;
    pointer-events: none;
  }
  
  .deletion-loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}

/* Responsive layout */
@media (max-width: 640px) {
  .deletion-actions {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.5rem;
    
    button {
      width: 100%;
      padding: 1rem;
    }
  }
}
</style>
```

### 2.2 Server-Side Implementation

```typescript
// Server-side deletion handler for foundation layer
export async function handleFoundationDeletion(req: Request): Promise<Response> {
  const formData = await req.formData();
  const enhancement = formData.get('_enhancement');
  
  // CSRF validation
  const csrfToken = formData.get('_csrf');
  if (!validateCSRF(csrfToken)) {
    return new Response('Invalid CSRF token', { status: 403 });
  }
  
  // Extract product IDs
  const productIds = formData.getAll('product_ids[]') as string[];
  if (productIds.length === 0) {
    return redirectWithError('/products', 'No items selected');
  }
  
  // Validate confirmation
  const confirmationMethod = formData.get('confirmation_method');
  if (confirmationMethod === 'type') {
    const confirmationText = formData.get('confirmation_text');
    const expectedText = `DELETE ${productIds.length}`;
    
    if (confirmationText !== expectedText) {
      return redirectWithError('/products', 'Invalid confirmation');
    }
  }
  
  try {
    // Perform deletion
    const result = await deleteProducts(productIds);
    
    // Return appropriate response based on enhancement level
    if (enhancement === 'foundation') {
      // Redirect with success message
      return redirectWithSuccess(
        '/products',
        `Successfully deleted ${result.deleted} items`
      );
    } else {
      // Return JSON for enhanced layers
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    if (enhancement === 'foundation') {
      return redirectWithError('/products', 'Deletion failed');
    } else {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}
```

## 3. Enhanced Layer Implementation

### 3.1 JavaScript Enhancement

```typescript
// Progressive enhancement initialization
class DeletionDialogEnhancer {
  private form: HTMLFormElement;
  private level: EnhancementLevel;
  private features: Set<string>;
  
  constructor(form: HTMLFormElement) {
    this.form = form;
    this.level = this.detectEnhancementLevel();
    this.features = new Set(this.detectFeatures());
    
    // Apply appropriate enhancements
    this.enhance();
  }
  
  private detectEnhancementLevel(): EnhancementLevel {
    // Check for required features
    if (this.hasOptimalFeatures()) {
      return EnhancementLevel.OPTIMAL;
    } else if (this.hasEnhancedFeatures()) {
      return EnhancementLevel.ENHANCED;
    }
    return EnhancementLevel.FOUNDATION;
  }
  
  private hasEnhancedFeatures(): boolean {
    return (
      'fetch' in window &&
      'Promise' in window &&
      'IntersectionObserver' in window &&
      CSS.supports('display', 'grid')
    );
  }
  
  private hasOptimalFeatures(): boolean {
    return (
      this.hasEnhancedFeatures() &&
      'requestIdleCallback' in window &&
      'IntersectionObserver' in window &&
      'serviceWorker' in navigator &&
      'storage' in navigator &&
      'estimate' in navigator.storage
    );
  }
  
  private enhance() {
    // Update enhancement level
    const input = this.form.querySelector('input[name="_enhancement"]');
    if (input) input.value = this.level;
    
    // Apply enhancements based on level
    switch (this.level) {
      case EnhancementLevel.OPTIMAL:
        this.applyOptimalEnhancements();
        // Fall through to apply all lower enhancements
      case EnhancementLevel.ENHANCED:
        this.applyEnhancedEnhancements();
        break;
    }
  }
  
  private applyEnhancedEnhancements() {
    // Convert to AJAX submission
    this.form.addEventListener('submit', this.handleAjaxSubmit.bind(this));
    
    // Add client-side validation
    this.addValidation();
    
    // Enable multi-step wizard
    this.enableWizard();
    
    // Add animations
    if (CSS.supports('animation', 'fade-in 0.3s')) {
      this.addAnimations();
    }
    
    // Real-time consequence calculation
    this.enableConsequenceCalculation();
  }
  
  private applyOptimalEnhancements() {
    // Virtual scrolling for large lists
    if (this.features.has('IntersectionObserver')) {
      this.enableVirtualScrolling();
    }
    
    // Gesture navigation
    if ('TouchEvent' in window) {
      this.enableGestureNavigation();
    }
    
    // Offline support
    if ('serviceWorker' in navigator) {
      this.enableOfflineSupport();
    }
    
    // Biometric authentication
    if ('credentials' in navigator) {
      this.checkBiometricSupport();
    }
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      this.enableHapticFeedback();
    }
  }
  
  private async handleAjaxSubmit(event: Event) {
    event.preventDefault();
    
    // Show loading state
    this.setLoadingState(true);
    
    try {
      const formData = new FormData(this.form);
      const response = await fetch(this.form.action, {
        method: this.form.method,
        body: formData,
        headers: {
          'X-Enhancement-Level': this.level,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Deletion failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      this.handleSuccess(result);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.setLoadingState(false);
    }
  }
}

// Initialize enhancement
document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('[data-enhance="deletion-dialog"]');
  forms.forEach(form => {
    if (form instanceof HTMLFormElement) {
      new DeletionDialogEnhancer(form);
    }
  });
});
```

### 3.2 Multi-Step Wizard Enhancement

```typescript
// Enhanced multi-step wizard functionality
class DeletionWizard {
  private form: HTMLFormElement;
  private steps: HTMLElement[];
  private currentStep: number = 0;
  private selectedItems: Set<string> = new Set();
  
  constructor(form: HTMLFormElement) {
    this.form = form;
    this.steps = Array.from(form.querySelectorAll('.deletion-step'));
    this.init();
  }
  
  private init() {
    // Enable all steps (they were disabled for foundation layer)
    this.steps.forEach(step => {
      (step as HTMLFieldSetElement).disabled = false;
    });
    
    // Add step navigation
    this.addStepNavigation();
    
    // Track selections
    this.trackSelections();
    
    // Add keyboard navigation
    this.addKeyboardNavigation();
    
    // Initialize first step
    this.showStep(0);
  }
  
  private addStepNavigation() {
    // Create navigation UI
    const nav = document.createElement('nav');
    nav.className = 'wizard-nav';
    nav.setAttribute('aria-label', 'Deletion wizard steps');
    
    const prevBtn = this.createButton('Previous', () => this.previousStep());
    const nextBtn = this.createButton('Next', () => this.nextStep());
    
    nav.appendChild(prevBtn);
    nav.appendChild(this.createStepIndicators());
    nav.appendChild(nextBtn);
    
    this.form.insertBefore(nav, this.form.querySelector('.deletion-actions'));
  }
  
  private createStepIndicators(): HTMLElement {
    const indicators = document.createElement('div');
    indicators.className = 'step-indicators';
    indicators.setAttribute('role', 'tablist');
    
    this.steps.forEach((step, index) => {
      const indicator = document.createElement('button');
      indicator.className = 'step-indicator';
      indicator.setAttribute('role', 'tab');
      indicator.setAttribute('aria-label', `Step ${index + 1}: ${step.querySelector('legend')?.textContent}`);
      indicator.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      
      indicator.addEventListener('click', () => this.showStep(index));
      indicators.appendChild(indicator);
    });
    
    return indicators;
  }
  
  private showStep(index: number) {
    // Validate before moving forward
    if (index > this.currentStep && !this.validateCurrentStep()) {
      this.showValidationErrors();
      return;
    }
    
    // Hide all steps
    this.steps.forEach((step, i) => {
      step.hidden = i !== index;
      step.setAttribute('aria-hidden', i !== index ? 'true' : 'false');
    });
    
    // Update indicators
    const indicators = this.form.querySelectorAll('.step-indicator');
    indicators.forEach((indicator, i) => {
      indicator.setAttribute('aria-selected', i === index ? 'true' : 'false');
      indicator.classList.toggle('active', i === index);
      indicator.classList.toggle('completed', i < index);
    });
    
    // Update navigation buttons
    this.updateNavigationState(index);
    
    // Focus management
    this.focusFirstInput(this.steps[index]);
    
    // Announce step change
    this.announceStepChange(index);
    
    this.currentStep = index;
  }
  
  private validateCurrentStep(): boolean {
    const step = this.steps[this.currentStep];
    const stepName = step.dataset.step;
    
    switch (stepName) {
      case 'selection':
        return this.selectedItems.size > 0;
      case 'consequences':
        return true; // Always valid
      case 'confirmation':
        return this.validateConfirmation();
      default:
        return true;
    }
  }
  
  private addKeyboardNavigation() {
    this.form.addEventListener('keydown', (event) => {
      // Don't interfere with form inputs
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          this.previousStep();
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.nextStep();
          break;
        case 'Home':
          event.preventDefault();
          this.showStep(0);
          break;
        case 'End':
          event.preventDefault();
          this.showStep(this.steps.length - 1);
          break;
      }
    });
  }
}
```

## 4. Optimal Layer Implementation

### 4.1 Virtual Scrolling

```typescript
// Virtual scrolling for large product lists
class VirtualProductList {
  private container: HTMLElement;
  private items: ProductItem[];
  private itemHeight: number = 64;
  private visibleRange: { start: number; end: number } = { start: 0, end: 0 };
  private scrollTop: number = 0;
  private observer: IntersectionObserver;
  
  constructor(container: HTMLElement, items: ProductItem[]) {
    this.container = container;
    this.items = items;
    this.init();
  }
  
  private init() {
    // Set up container
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    this.container.style.height = '400px';
    
    // Create virtual space
    const spacer = document.createElement('div');
    spacer.style.height = `${this.items.length * this.itemHeight}px`;
    this.container.appendChild(spacer);
    
    // Create item container
    const itemContainer = document.createElement('div');
    itemContainer.className = 'virtual-items';
    itemContainer.style.position = 'absolute';
    itemContainer.style.top = '0';
    itemContainer.style.left = '0';
    itemContainer.style.right = '0';
    this.container.appendChild(itemContainer);
    
    // Set up scroll listener with RAF
    let rafId: number;
    this.container.addEventListener('scroll', () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => this.handleScroll());
    });
    
    // Set up intersection observer for lazy loading
    this.setupIntersectionObserver();
    
    // Initial render
    this.handleScroll();
  }
  
  private handleScroll() {
    this.scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;
    
    // Calculate visible range with overscan
    const overscan = 3;
    const start = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - overscan);
    const end = Math.min(
      this.items.length,
      Math.ceil((this.scrollTop + containerHeight) / this.itemHeight) + overscan
    );
    
    // Only update if range changed
    if (start !== this.visibleRange.start || end !== this.visibleRange.end) {
      this.visibleRange = { start, end };
      this.renderVisibleItems();
    }
  }
  
  private renderVisibleItems() {
    const itemContainer = this.container.querySelector('.virtual-items') as HTMLElement;
    const fragment = document.createDocumentFragment();
    
    // Clear existing items
    itemContainer.innerHTML = '';
    
    // Render visible items
    for (let i = this.visibleRange.start; i < this.visibleRange.end; i++) {
      const item = this.items[i];
      const element = this.createItemElement(item, i);
      fragment.appendChild(element);
    }
    
    itemContainer.appendChild(fragment);
  }
  
  private createItemElement(item: ProductItem, index: number): HTMLElement {
    const element = document.createElement('div');
    element.className = 'virtual-item';
    element.style.position = 'absolute';
    element.style.top = `${index * this.itemHeight}px`;
    element.style.height = `${this.itemHeight}px`;
    element.style.left = '0';
    element.style.right = '0';
    element.dataset.index = index.toString();
    
    // Create checkbox and label
    const label = document.createElement('label');
    label.className = 'deletion-item__label';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'product_ids[]';
    checkbox.value = item.id;
    checkbox.checked = item.selected || false;
    
    const content = document.createElement('span');
    content.className = 'deletion-item__content';
    content.innerHTML = `
      <strong>${item.title}</strong>
      <span class="deletion-item__meta">
        SKU: ${item.sku} • ${item.variantCount} variants
      </span>
    `;
    
    label.appendChild(checkbox);
    label.appendChild(content);
    element.appendChild(label);
    
    // Lazy load images if needed
    if (item.imageUrl) {
      this.observer.observe(element);
    }
    
    return element;
  }
  
  private setupIntersectionObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const index = parseInt(element.dataset.index || '0');
            const item = this.items[index];
            
            if (item.imageUrl && !element.querySelector('img')) {
              this.loadItemImage(element, item);
            }
          }
        });
      },
      {
        root: this.container,
        rootMargin: '100px'
      }
    );
  }
  
  private loadItemImage(element: HTMLElement, item: ProductItem) {
    const img = new Image();
    img.className = 'deletion-item__image';
    img.loading = 'lazy';
    img.decoding = 'async';
    
    img.onload = () => {
      const content = element.querySelector('.deletion-item__content');
      if (content) {
        content.insertBefore(img, content.firstChild);
      }
    };
    
    img.src = item.imageUrl!;
  }
}
```

### 4.2 Gesture Navigation

```typescript
// Touch gesture support for mobile navigation
class GestureNavigator {
  private element: HTMLElement;
  private touchStart: Touch | null = null;
  private touchEnd: Touch | null = null;
  private onSwipeLeft?: () => void;
  private onSwipeRight?: () => void;
  private onLongPress?: (target: HTMLElement) => void;
  
  constructor(element: HTMLElement, options: GestureOptions) {
    this.element = element;
    this.onSwipeLeft = options.onSwipeLeft;
    this.onSwipeRight = options.onSwipeRight;
    this.onLongPress = options.onLongPress;
    this.init();
  }
  
  private init() {
    // Touch event listeners with passive flag for better performance
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    
    // Prevent default touch behaviors
    this.element.style.touchAction = 'pan-y';
    this.element.style.webkitUserSelect = 'none';
    this.element.style.userSelect = 'none';
  }
  
  private handleTouchStart(event: TouchEvent) {
    this.touchStart = event.touches[0];
    this.touchEnd = null;
    
    // Long press detection
    const target = event.target as HTMLElement;
    const longPressTimer = setTimeout(() => {
      if (this.touchStart && !this.touchEnd) {
        this.onLongPress?.(target);
        
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
    }, 500);
    
    // Store timer for cleanup
    (event.target as any)._longPressTimer = longPressTimer;
  }
  
  private handleTouchMove(event: TouchEvent) {
    if (!this.touchStart) return;
    
    this.touchEnd = event.touches[0];
    
    // Cancel long press if moved too much
    const deltaX = Math.abs(this.touchEnd.clientX - this.touchStart.clientX);
    const deltaY = Math.abs(this.touchEnd.clientY - this.touchStart.clientY);
    
    if (deltaX > 10 || deltaY > 10) {
      const target = event.target as any;
      if (target._longPressTimer) {
        clearTimeout(target._longPressTimer);
        delete target._longPressTimer;
      }
    }
    
    // Prevent scrolling during horizontal swipe
    if (deltaX > deltaY && deltaX > 30) {
      event.preventDefault();
    }
  }
  
  private handleTouchEnd(event: TouchEvent) {
    // Clear long press timer
    const target = event.target as any;
    if (target._longPressTimer) {
      clearTimeout(target._longPressTimer);
      delete target._longPressTimer;
    }
    
    if (!this.touchStart) return;
    
    this.touchEnd = event.changedTouches[0];
    this.handleGesture();
  }
  
  private handleGesture() {
    if (!this.touchStart || !this.touchEnd) return;
    
    const deltaX = this.touchEnd.clientX - this.touchStart.clientX;
    const deltaY = this.touchEnd.clientY - this.touchStart.clientY;
    const deltaTime = Date.now() - this.touchStart.timeStamp;
    
    // Swipe detection thresholds
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;
    const maxVerticalDistance = 100;
    
    // Check if it's a horizontal swipe
    if (
      Math.abs(deltaX) > minSwipeDistance &&
      Math.abs(deltaY) < maxVerticalDistance &&
      deltaTime < maxSwipeTime
    ) {
      if (deltaX > 0) {
        this.onSwipeRight?.();
      } else {
        this.onSwipeLeft?.();
      }
      
      // Light haptic feedback for swipe
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
    
    // Reset
    this.touchStart = null;
    this.touchEnd = null;
  }
}
```

### 4.3 Offline Support

```typescript
// Offline queue management for deletion operations
class OfflineDeletionManager {
  private queue: DeletionQueue;
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  
  constructor() {
    this.queue = new DeletionQueue();
    this.init();
  }
  
  private async init() {
    // Initialize IndexedDB
    await this.initDB();
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      await this.registerServiceWorker();
    }
    
    // Set up online/offline listeners
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Check for pending operations
    if (navigator.onLine) {
      this.syncPendingOperations();
    }
  }
  
  private async initDB() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('deletion-queue', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('operations')) {
          const store = db.createObjectStore('operations', {
            keyPath: 'id',
            autoIncrement: true
          });
          
          store.createIndex('status', 'status');
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('type', 'type');
        }
      };
    });
  }
  
  async queueDeletion(operation: DeletionOperation): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['operations'], 'readwrite');
    const store = transaction.objectStore('operations');
    
    const queuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      status: 'pending',
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(queuedOperation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncPendingOperations();
    } else {
      this.showOfflineNotification();
    }
  }
  
  private async syncPendingOperations() {
    if (this.syncInProgress || !navigator.onLine) return;
    
    this.syncInProgress = true;
    
    try {
      const operations = await this.getPendingOperations();
      
      for (const operation of operations) {
        try {
          await this.processOperation(operation);
          await this.markOperationComplete(operation.id);
        } catch (error) {
          await this.handleOperationError(operation, error);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }
  
  private async processOperation(operation: QueuedOperation) {
    const response = await fetch('/api/products/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Operation': 'true',
        'X-Operation-Id': operation.id
      },
      body: JSON.stringify(operation.data)
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    return response.json();
  }
  
  private async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              this.showUpdateNotification();
            }
          });
        }
      });
      
      // Register background sync
      if ('sync' in registration) {
        await registration.sync.register('deletion-queue');
      }
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }
  
  private showOfflineNotification() {
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.setAttribute('role', 'alert');
    notification.innerHTML = `
      <span class="offline-notification__icon">📶</span>
      <span class="offline-notification__text">
        You're offline. Deletions will be processed when connection is restored.
      </span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}
```

## 5. Mobile-Specific Enhancements

### 5.1 Touch-Optimized Components

```typescript
// Touch-optimized checkbox component
class TouchCheckbox extends HTMLElement {
  private checkbox: HTMLInputElement;
  private isPressed = false;
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }
  
  private render() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-block;
        --size: 48px;
        --check-size: 24px;
      }
      
      .checkbox-container {
        position: relative;
        width: var(--size);
        height: var(--size);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
      }
      
      input[type="checkbox"] {
        position: absolute;
        opacity: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        cursor: pointer;
      }
      
      .checkbox-visual {
        width: var(--check-size);
        height: var(--check-size);
        border: 2px solid #6b7280;
        border-radius: 4px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      input:checked ~ .checkbox-visual {
        background-color: #3b82f6;
        border-color: #3b82f6;
      }
      
      .checkbox-visual::after {
        content: '';
        width: 6px;
        height: 10px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg) scale(0);
        transition: transform 0.2s ease;
      }
      
      input:checked ~ .checkbox-visual::after {
        transform: rotate(45deg) scale(1);
      }
      
      .ripple {
        position: absolute;
        border-radius: 50%;
        background-color: rgba(59, 130, 246, 0.3);
        transform: scale(0);
        animation: ripple 0.6s ease-out;
      }
      
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      :host([pressed]) .checkbox-visual {
        transform: scale(0.9);
      }
    `;
    
    this.checkbox = document.createElement('input');
    this.checkbox.type = 'checkbox';
    this.checkbox.checked = this.hasAttribute('checked');
    
    const container = document.createElement('div');
    container.className = 'checkbox-container';
    
    const visual = document.createElement('div');
    visual.className = 'checkbox-visual';
    
    container.appendChild(this.checkbox);
    container.appendChild(visual);
    
    this.shadowRoot!.appendChild(style);
    this.shadowRoot!.appendChild(container);
  }
  
  private setupEventListeners() {
    const container = this.shadowRoot!.querySelector('.checkbox-container')!;
    
    // Touch events
    container.addEventListener('touchstart', (e) => {
      this.isPressed = true;
      this.setAttribute('pressed', '');
      this.createRipple(e as TouchEvent);
    }, { passive: true });
    
    container.addEventListener('touchend', () => {
      this.isPressed = false;
      this.removeAttribute('pressed');
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }, { passive: true });
    
    // Mouse events for desktop
    container.addEventListener('mousedown', () => {
      this.setAttribute('pressed', '');
    });
    
    container.addEventListener('mouseup', () => {
      this.removeAttribute('pressed');
    });
    
    // Change event
    this.checkbox.addEventListener('change', () => {
      this.dispatchEvent(new CustomEvent('change', {
        detail: { checked: this.checkbox.checked }
      }));
    });
  }
  
  private createRipple(event: TouchEvent) {
    const container = this.shadowRoot!.querySelector('.checkbox-container')!;
    const rect = container.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    
    const size = Math.max(rect.width, rect.height);
    const x = event.touches[0].clientX - rect.left - size / 2;
    const y = event.touches[0].clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    container.appendChild(ripple);
    
    ripple.addEventListener('animationend', () => ripple.remove());
  }
  
  get checked(): boolean {
    return this.checkbox?.checked || false;
  }
  
  set checked(value: boolean) {
    if (this.checkbox) {
      this.checkbox.checked = value;
    }
  }
}

// Register custom element
customElements.define('touch-checkbox', TouchCheckbox);
```

## 6. Performance Monitoring

### 6.1 Progressive Enhancement Metrics

```typescript
// Monitor enhancement performance
class EnhancementMonitor {
  private metrics: EnhancementMetrics = {
    detectionTime: 0,
    enhancementTime: 0,
    interactionDelay: 0,
    errorRate: 0,
    fallbackRate: 0
  };
  
  private startTime = performance.now();
  
  measureDetection() {
    this.metrics.detectionTime = performance.now() - this.startTime;
  }
  
  measureEnhancement(level: EnhancementLevel) {
    this.metrics.enhancementTime = performance.now() - this.startTime;
    
    // Track which level was applied
    this.trackEnhancementLevel(level);
  }
  
  measureInteraction(eventType: string, delay: number) {
    // Track first input delay
    if (this.metrics.interactionDelay === 0) {
      this.metrics.interactionDelay = delay;
    }
    
    // Track interaction patterns
    this.trackInteraction(eventType, delay);
  }
  
  trackError(error: Error, context: string) {
    this.metrics.errorRate++;
    
    // Log error details
    console.error(`Enhancement error in ${context}:`, error);
    
    // Send to monitoring service
    if ('sendBeacon' in navigator) {
      const data = JSON.stringify({
        error: error.message,
        context,
        level: this.getCurrentLevel(),
        timestamp: Date.now()
      });
      
      navigator.sendBeacon('/api/errors', data);
    }
  }
  
  trackFallback(from: EnhancementLevel, to: EnhancementLevel) {
    this.metrics.fallbackRate++;
    
    console.warn(`Falling back from ${from} to ${to}`);
  }
  
  reportMetrics() {
    const report = {
      ...this.metrics,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: (navigator as any).connection?.effectiveType || 'unknown',
      deviceMemory: (navigator as any).deviceMemory || 'unknown'
    };
    
    // Send metrics
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        fetch('/api/metrics/enhancement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
      });
    }
  }
}
```

## 7. Testing Strategy

### 7.1 Progressive Enhancement Tests

```typescript
// Test progressive enhancement layers
describe('Progressive Enhancement', () => {
  describe('Foundation Layer', () => {
    beforeEach(() => {
      // Disable JavaScript
      (window as any).JavaScript = undefined;
    });
    
    it('should submit form without JavaScript', async () => {
      const form = document.querySelector('.deletion-form');
      const submitEvent = new Event('submit');
      
      form?.dispatchEvent(submitEvent);
      
      // Verify form would submit to server
      expect(form?.getAttribute('method')).toBe('POST');
      expect(form?.getAttribute('action')).toBe('/api/products/delete');
    });
    
    it('should show/hide steps with CSS only', () => {
      const checkbox = document.querySelector('input[name="product_ids[]"]');
      const consequencesStep = document.querySelector('[data-step="consequences"]');
      
      // Initially hidden
      expect(consequencesStep?.computedStyleMap().get('display')).toBe('none');
      
      // Show when item selected
      checkbox?.setAttribute('checked', 'checked');
      expect(consequencesStep?.computedStyleMap().get('display')).toBe('block');
    });
  });
  
  describe('Enhanced Layer', () => {
    it('should convert to AJAX submission', () => {
      const form = document.querySelector('.deletion-form');
      const enhancer = new DeletionDialogEnhancer(form as HTMLFormElement);
      
      const submitSpy = jest.spyOn(window, 'fetch');
      form?.dispatchEvent(new Event('submit'));
      
      expect(submitSpy).toHaveBeenCalledWith(
        '/api/products/delete',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Enhancement-Level': 'enhanced'
          })
        })
      );
    });
  });
  
  describe('Optimal Layer', () => {
    it('should enable virtual scrolling for large lists', () => {
      const container = document.querySelector('.deletion-items__list');
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: `product-${i}`,
        title: `Product ${i}`,
        sku: `SKU-${i}`,
        variantCount: 1
      }));
      
      const virtualList = new VirtualProductList(
        container as HTMLElement,
        items
      );
      
      // Should only render visible items
      const renderedItems = container?.querySelectorAll('.virtual-item');
      expect(renderedItems?.length).toBeLessThan(50); // With overscan
    });
  });
});
```

## Conclusion

This progressive enhancement implementation guide ensures the deletion dialog works for all users while providing optimal experiences based on device capabilities. The three-layer approach guarantees functionality without JavaScript (foundation), enhances the experience with modern features (enhanced), and delivers peak performance for capable devices (optimal). Through careful feature detection, graceful degradation, and performance monitoring, the implementation maintains accessibility and usability across all platforms while achieving the mobile performance targets.