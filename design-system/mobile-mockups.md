# Mobile UI Mockups and Specifications

## Mobile Navigation States

### Closed State (Default)
```
┌─────────────────────────────┐
│ [Logo]              [☰]     │ <- Header (56px)
├─────────────────────────────┤
│                             │
│        Main Content         │
│                             │
└─────────────────────────────┘
```

### Open State (Drawer Active)
```
┌─────────────────┬───────────┐
│ Menu        [X] │░░░░░░░░░░░│
├─────────────────┼░░░░░░░░░░░│
│ 🏠 Dashboard    │░░░░░░░░░░░│
│ 📦 Products     │░░░░░░░░░░░│
│ 📊 Analytics    │░░░░░░░░░░░│
│ ⚙️ Settings     │░░░░░░░░░░░│
├─────────────────┼░░░░░░░░░░░│
│ [Avatar]        │░░░░░░░░░░░│
│ User Name       │░░░░░░░░░░░│
│ user@email.com  │░░░░░░░░░░░│
└─────────────────┴───────────┘
   280px         Overlay (50%)
```

## Product List - Mobile View

### Default List View
```
┌─────────────────────────────┐
│ Products         [+] Add    │
├─────────────────────────────┤
│ ┌─────┬──────────────┬───┐ │
│ │ IMG │ Product Name │ ⋮ │ │
│ │ 64px│ $19.99       │   │ │
│ │     │ SKU: ABC123  │   │ │
│ └─────┴──────────────┴───┘ │
├─────────────────────────────┤
│ ┌─────┬──────────────┬───┐ │
│ │ IMG │ Product Two  │ ⋮ │ │
│ │     │ $29.99       │   │ │
│ │     │ SKU: DEF456  │   │ │
│ └─────┴──────────────┴───┘ │
└─────────────────────────────┘
```

### Swipe to Delete Action
```
┌─────────────────────────────┐
│ Products         [+] Add    │
├─────────────────────────────┤
│ ┌─────┬──────────────┬───┐ │
│ │ IMG │ Product Name │ ⋮ │ │
│ │     │ $19.99       │   │ │
│ │     │ SKU: ABC123  │   │ │
│ └─────┴──────────────┴───┘ │
├─────────────────────────────┤
│     ←── Swipe Left          │
│ ┌───────────┬─────────────┐ │
│ │ Product   │   🗑️ DELETE │ │
│ │ Two       │   (Red BG)  │ │
│ └───────────┴─────────────┘ │
└─────────────────────────────┘
```

## Bottom Sheet States

### 50% Height (Default)
```
┌─────────────────────────────┐
│        Main Content         │
│                             │
├─────────────────────────────┤
│          ━━━━━              │ <- Drag Handle
│      Product Details        │
│                             │
│  [Large Product Image]      │
│                             │
│  Product Name               │
│  $29.99                     │
│  SKU: ABC123               │
│                             │
│  [Edit]     [View Details] │
└─────────────────────────────┘
```

### 90% Height (Expanded)
```
┌─────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ <- Backdrop
├─────────────────────────────┤
│          ━━━━━              │
│      Product Details    [X] │
├─────────────────────────────┤
│  [Large Product Image]      │
│                             │
│  Product Name               │
│  $29.99                     │
│  SKU: ABC123               │
│                             │
│  Description:               │
│  Lorem ipsum dolor sit      │
│  amet, consectetur...       │
│                             │
│  Category: Grills           │
│  Stock: 45 units           │
│                             │
│  [Edit]     [View Details] │
└─────────────────────────────┘
```

## Form Components - Mobile

### Text Input States
```
Normal State:
┌─────────────────────────────┐
│ Label                       │
│ ┌─────────────────────┬───┐│
│ │ Input text          │ X ││
│ └─────────────────────┴───┘│
└─────────────────────────────┘
   Height: 48px

Focused State:
┌─────────────────────────────┐
│ Label                       │
│ ┌═════════════════════┬═══┐│
│ ║ Input text          ║ X ║│ <- Primary color border
│ └═════════════════════┴═══┘│
└─────────────────────────────┘

Error State:
┌─────────────────────────────┐
│ Label                       │
│ ┌─────────────────────┬───┐│
│ │ Input text          │ X ││ <- Red border
│ └─────────────────────┴───┘│
│ Error message text          │
└─────────────────────────────┘
```

### Select/Dropdown - Mobile
```
Closed:
┌─────────────────────────────┐
│ Category                    │
│ ┌─────────────────────┬───┐│
│ │ Select category     │ ▼ ││
│ └─────────────────────┴───┘│
└─────────────────────────────┘

Open (Bottom Sheet):
┌─────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
├─────────────────────────────┤
│          ━━━━━              │
│    Select Category      [X] │
├─────────────────────────────┤
│ 🔍 Search...                │
├─────────────────────────────┤
│ ○ Grills                    │
│ ○ Accessories               │
│ ● Cleaning Supplies         │ <- Selected
│ ○ Parts & Hardware          │
│ ○ Outdoor Furniture         │
└─────────────────────────────┘
```

## Mobile Tables → Cards Transformation

### Desktop Table View
```
┌─────────────────────────────────────────┐
│ Name     │ Price  │ Stock │ Actions    │
├─────────┼────────┼───────┼────────────┤
│ Product1 │ $19.99 │ 45    │ Edit|Delete│
│ Product2 │ $29.99 │ 12    │ Edit|Delete│
└─────────┴────────┴───────┴────────────┘
```

### Mobile Card View
```
┌─────────────────────────────┐
│ Product Name 1              │
│ Price: $19.99               │
│ Stock: 45 units             │
│                             │
│ [▼ More details]            │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Product Name 2              │
│ Price: $29.99               │
│ Stock: 12 units             │
│                             │
│ [▼ More details]            │
│ ├─ Category: Grills         │
│ ├─ SKU: ABC123             │
│ └─ [Edit] [Delete]         │
└─────────────────────────────┘
```

## Pull to Refresh States

### Idle
```
┌─────────────────────────────┐
│ Product List                │
├─────────────────────────────┤
│ Item 1                      │
│ Item 2                      │
│ Item 3                      │
└─────────────────────────────┘
```

### Pulling Down
```
┌─────────────────────────────┐
│        ↻ Pull down          │ <- Rotation based on pull distance
├─────────────────────────────┤
│                             │
│ Product List                │
├─────────────────────────────┤
│ Item 1                      │
│ Item 2                      │
└─────────────────────────────┘
```

### Refreshing
```
┌─────────────────────────────┐
│      ⟳ Refreshing...        │ <- Spinning animation
├─────────────────────────────┤
│                             │
│ Product List                │
├─────────────────────────────┤
│ [Loading skeleton]          │
│ [Loading skeleton]          │
└─────────────────────────────┘
```

## Touch Gesture Indicators

### Swipe Gestures
```
Horizontal Swipe (Delete):
├──────────────────┤
│     ← ← ← ←      │ 
├──────────────────┤

Vertical Swipe (Dismiss):
┌─────────────────┐
│        ↓        │
│        ↓        │
│        ↓        │
└─────────────────┘
```

### Tap Targets
```
Minimum Touch Target:
┌────────────┐
│            │ 48px
│   Button   │  ↕
│            │ 48px
└────────────┘
    48px ↔

With Padding for Error Prevention:
┌──────────────────┐
│   ┌────────┐     │
│   │ Button │     │ 8px padding
│   └────────┘     │
└──────────────────┘
```

## Loading States

### Skeleton Loaders
```
Product Card Skeleton:
┌─────────────────────────────┐
│ ┌─────┬──────────────┬───┐ │
│ │░░░░░│░░░░░░░░░░░░░░│░░░│ │
│ │░░░░░│░░░░░░░░░     │   │ │
│ │░░░░░│░░░░░         │   │ │
│ └─────┴──────────────┴───┘ │
└─────────────────────────────┘

List Skeleton:
┌─────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░              │
├─────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░              │
├─────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░              │
└─────────────────────────────┘
```

## Responsive Breakpoints Visual Guide

### Phone (< 640px)
```
┌─────────┐
│         │
│  Phone  │
│ Layout  │
│         │
└─────────┘
  ~375px
```

### Tablet (640px - 1024px)
```
┌───────────────┐
│               │
│    Tablet     │
│    Layout     │
│               │
└───────────────┘
    ~768px
```

### Desktop (> 1024px)
```
┌─────────────────────────┐
│                         │
│    Desktop Layout       │
│                         │
└─────────────────────────┘
        ~1280px
```

## Interaction Feedback

### Touch States
```
Default:          Pressed:         Active:
┌──────────┐     ┌──────────┐     ┌══════════┐
│  Button  │ →   │  Button  │ →   ║  Button  ║
└──────────┘     └──────────┘     ╚══════════╝
                 Scale: 0.95      Scale: 0.98
                 Opacity: 0.9     + Shadow
```

### Loading Button States
```
Default:          Loading:         Success:
┌──────────┐     ┌──────────┐     ┌──────────┐
│   Save   │ →   │    ⟳     │ →   │    ✓     │
└──────────┘     └──────────┘     └──────────┘
```

## Color Specifications

### Touch Feedback Colors
- Default: `bg-white`
- Hover: `bg-gray-50`
- Active: `bg-gray-100`
- Focus: `ring-2 ring-primary/20`

### Action Colors
- Primary Action: `bg-primary text-white`
- Secondary Action: `bg-gray-100 text-gray-900`
- Danger Action: `bg-red-500 text-white`
- Success Feedback: `bg-green-500 text-white`

### Swipe Action Colors
- Delete Background: `bg-red-500`
- Archive Background: `bg-blue-500`
- Complete Background: `bg-green-500`

## Animation Timings

### Navigation Drawer
- Open: `300ms ease-out`
- Close: `200ms ease-in`

### Bottom Sheet
- Open: `spring(damping: 30, stiffness: 300)`
- Close: `spring(damping: 30, stiffness: 300)`
- Snap: `spring(damping: 30, stiffness: 300)`

### Touch Feedback
- Press: `100ms ease-out`
- Release: `200ms ease-out`

### Swipe Actions
- Swipe: `follow finger`
- Snap: `200ms ease-out`
- Delete: `300ms ease-out`

## Accessibility Specifications

### Focus Indicators
```
Keyboard Focus:
┌═══════════════┐
║               ║ 2px solid ring
║    Focused    ║ ring-primary
║    Element    ║ ring-offset-2
║               ║
╚═══════════════╝
```

### Screen Reader Labels
- Hamburger Menu: "Toggle navigation menu"
- Swipe Actions: "Swipe left to delete"
- Bottom Sheet Handle: "Drag to resize, double tap to close"
- Clear Input: "Clear input field"

## Implementation Notes

1. **Performance**: Use `transform` and `opacity` for animations
2. **Scroll**: Use `-webkit-overflow-scrolling: touch` for smooth iOS scrolling
3. **Safe Areas**: Account for device safe areas (notches, home indicators)
4. **Viewport**: Ensure proper viewport meta tag configuration
5. **Touch Delay**: Use `touch-action: manipulation` to eliminate tap delay

These mockups serve as a visual guide for implementing the mobile interactions defined in the design system. Each component should be tested on actual devices to ensure the best user experience.