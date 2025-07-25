# CrewAI Design System Overview

## Introduction
This design system provides comprehensive visual guidelines for the CrewAI migration, ensuring consistent and intuitive interfaces for multi-agent system management, crew orchestration, and task workflow visualization.

## Design Principles

### Core Values
1. **Clarity Over Complexity**: Make AI agent operations understandable at a glance
2. **Real-time Responsiveness**: Reflect system state changes instantly
3. **Progressive Information**: Show details only when needed
4. **Accessibility First**: WCAG 2.1 AA compliance throughout

### Visual Language
- **Modern & Professional**: Clean interfaces with subtle depth
- **Data-Driven**: Metrics and visualizations drive understanding  
- **Color with Purpose**: Each color conveys specific meaning
- **Motion with Intent**: Animations guide attention and show relationships

## Color System

### Primary Palette
```scss
// Agent Identity Colors
$agent-analyzer: #3B82F6;    // Blue - Analysis & extraction
$agent-matcher: #8B5CF6;     // Purple - Matching & connections
$agent-qa: #10B981;          // Green - Validation & quality

// System Status Colors
$status-idle: #9CA3AF;       // Gray - Waiting/inactive
$status-active: #3B82F6;     // Blue - Processing
$status-success: #10B981;    // Green - Completed
$status-warning: #F59E0B;    // Amber - Caution
$status-error: #EF4444;      // Red - Failed/critical

// UI Foundation Colors
$gray-50: #F9FAFB;
$gray-100: #F3F4F6;
$gray-200: #E5E7EB;
$gray-300: #D1D5DB;
$gray-400: #9CA3AF;
$gray-500: #6B7280;
$gray-600: #4B5563;
$gray-700: #374151;
$gray-800: #1F2937;
$gray-900: #111827;
```

### Semantic Colors
```scss
// Background
$bg-primary: #FFFFFF;
$bg-secondary: #F9FAFB;
$bg-tertiary: #F3F4F6;

// Text
$text-primary: #111827;
$text-secondary: #6B7280;
$text-tertiary: #9CA3AF;

// Borders
$border-default: #E5E7EB;
$border-focus: #3B82F6;
$border-error: #EF4444;
```

## Typography

### Font Stack
```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Arial, sans-serif;
--font-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", 
             Consolas, "Courier New", monospace;
```

### Type Scale
```scss
$text-xs: 0.75rem;      // 12px - Metadata, labels
$text-sm: 0.875rem;     // 14px - Secondary text
$text-base: 1rem;       // 16px - Body text
$text-lg: 1.125rem;     // 18px - Subheadings
$text-xl: 1.25rem;      // 20px - Section headers
$text-2xl: 1.5rem;      // 24px - Page titles
$text-3xl: 1.875rem;    // 30px - Dashboard headers
```

### Font Weights
```scss
$font-normal: 400;      // Body text
$font-medium: 500;      // Emphasis
$font-semibold: 600;    // Headings
$font-bold: 700;        // Strong emphasis
```

## Spacing System

### Base Unit: 4px
```scss
$space-1: 0.25rem;  // 4px
$space-2: 0.5rem;   // 8px
$space-3: 0.75rem;  // 12px
$space-4: 1rem;     // 16px
$space-5: 1.25rem;  // 20px
$space-6: 1.5rem;   // 24px
$space-8: 2rem;     // 32px
$space-10: 2.5rem;  // 40px
$space-12: 3rem;    // 48px
$space-16: 4rem;    // 64px
```

## Component Library

### Cards
```scss
.card {
  background: $bg-primary;
  border: 1px solid $border-default;
  border-radius: 12px;
  padding: $space-4;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
}
```

### Buttons
```scss
.button {
  padding: $space-2 $space-4;
  border-radius: 6px;
  font-weight: $font-medium;
  transition: all 0.15s ease;
  
  &--primary {
    background: $agent-analyzer;
    color: white;
    
    &:hover {
      background: darken($agent-analyzer, 10%);
    }
  }
  
  &--secondary {
    background: $gray-100;
    color: $text-primary;
    border: 1px solid $border-default;
  }
}
```

### Progress Indicators
```scss
.progress {
  height: 8px;
  background: $gray-200;
  border-radius: 4px;
  overflow: hidden;
  
  &__fill {
    height: 100%;
    background: $agent-analyzer;
    transition: width 0.3s ease;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 100px;
      background: linear-gradient(
        90deg, 
        transparent, 
        rgba(255, 255, 255, 0.3), 
        transparent
      );
      animation: shimmer 2s infinite;
    }
  }
}
```

## Animation Guidelines

### Timing Functions
```scss
$ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
$ease-out: cubic-bezier(0.0, 0, 0.2, 1);
$ease-in: cubic-bezier(0.4, 0, 1, 1);
```

### Duration Scale
```scss
$duration-fast: 150ms;      // Micro-interactions
$duration-normal: 300ms;    // State changes
$duration-slow: 500ms;      // Complex transitions
$duration-slower: 1000ms;   // Page transitions
```

### Common Animations
```scss
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(10px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## Icons & Illustrations

### Icon Guidelines
- Size: 16px, 20px, 24px, 32px
- Stroke: 1.5px or 2px
- Style: Outlined, consistent weight
- Color: Inherit from parent

### Agent Avatars
- Size: 48px default, 32px compact
- Shape: Circular with 2px border
- Background: Agent identity color
- Icon: White, centered, 60% of avatar size

## Responsive Breakpoints

```scss
$breakpoint-mobile: 640px;
$breakpoint-tablet: 768px;
$breakpoint-desktop: 1024px;
$breakpoint-wide: 1280px;

// Media query mixins
@mixin mobile {
  @media (max-width: $breakpoint-mobile) { @content; }
}

@mixin tablet {
  @media (min-width: $breakpoint-tablet) { @content; }
}

@mixin desktop {
  @media (min-width: $breakpoint-desktop) { @content; }
}
```

## Grid System

### Container Widths
```scss
.container {
  width: 100%;
  margin: 0 auto;
  padding: 0 $space-4;
  
  @include tablet {
    max-width: $breakpoint-tablet;
  }
  
  @include desktop {
    max-width: $breakpoint-desktop;
  }
  
  @include wide {
    max-width: $breakpoint-wide;
  }
}
```

### Grid Configuration
```scss
.grid {
  display: grid;
  gap: $space-4;
  
  &--cols-1 { grid-template-columns: 1fr; }
  &--cols-2 { grid-template-columns: repeat(2, 1fr); }
  &--cols-3 { grid-template-columns: repeat(3, 1fr); }
  &--cols-4 { grid-template-columns: repeat(4, 1fr); }
}
```

## Accessibility Standards

### Focus States
```scss
.focusable {
  &:focus {
    outline: 2px solid $border-focus;
    outline-offset: 2px;
  }
  
  &:focus:not(:focus-visible) {
    outline: none;
  }
}
```

### Color Contrast
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum
- Disabled states: No requirement but maintain readability

### Motion Preferences
```scss
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Implementation Checklist

### Phase 1: Foundation
- [ ] Set up design tokens
- [ ] Create base component library
- [ ] Implement responsive grid
- [ ] Add accessibility utilities

### Phase 2: Core Components
- [ ] Agent cards with status system
- [ ] Crew management cards
- [ ] Pipeline visualization
- [ ] Progress indicators

### Phase 3: Interactive Features
- [ ] Real-time WebSocket updates
- [ ] Drag and drop functionality
- [ ] Keyboard navigation
- [ ] Animation system

### Phase 4: Polish
- [ ] Dark mode support
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Documentation site

## Design Token Export

```javascript
// design-tokens.js
export const tokens = {
  colors: {
    agent: {
      analyzer: '#3B82F6',
      matcher: '#8B5CF6',
      qa: '#10B981'
    },
    status: {
      idle: '#9CA3AF',
      active: '#3B82F6',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"SF Mono", Monaco, Consolas, monospace'
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem'
    }
  }
};
```

## Version History
- v1.0.0 - Initial CrewAI design system
- Last updated: 2025-01-20