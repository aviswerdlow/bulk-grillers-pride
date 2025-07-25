# Crew Management Dashboard Design

## Overview
Comprehensive dashboard for managing CrewAI crews - groups of agents working collaboratively on categorization tasks. Supports monitoring up to 10 concurrent crews with resource constraints.

## Design Principles
- **Resource Awareness**: Clear visibility of system limits and usage
- **Real-time Monitoring**: Live updates on crew status and performance
- **Scalability**: Handle 1-10 crews without UI degradation
- **Mobile-First**: Fully responsive for on-the-go monitoring

## Dashboard Layout

### Primary Grid Structure (Desktop)
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Crew Management Dashboard            [+ New Crew]    │
├─────────────────────────────────────────────────────────────┤
│ Resource Overview Widget    │ Active Crews Summary           │
├────────────────────────────┴────────────────────────────────┤
│                     Crew Cards Grid (2x5)                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Crew 1  │ │ Crew 2  │ │ Crew 3  │ │ Crew 4  │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Resource Overview Widget

### Visual Design
```
System Resources                [85% Healthy]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Crews:     ████████░░  8/10 active
Memory:    ██████░░░░  3.2/5.1 GB
CPU:       █████░░░░░  52% usage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Optimize] [History] [Settings]
```

### Resource Indicators
- **Green (0-70%)**: Healthy operation zone
- **Yellow (70-85%)**: Caution - monitor closely
- **Red (85-100%)**: Critical - action required

### Memory Calculation
- Base: 512MB per crew
- Visual: Stacked bar showing per-crew allocation
- Alert: When approaching 5.1GB limit (10 crews)

## Crew Card Design

### Card Structure
```
┌──────────────────────────────────┐
│ Crew Alpha          [Sequential] │
│ Status: ● Active                 │
├──────────────────────────────────┤
│ Agents: [A] [C] [Q]   3 working │
│ Progress: ████████░░ 82%         │
│ Started: 2 min ago              │
├──────────────────────────────────┤
│ 📊 245/300 tasks | ⚡ 1.2s avg  │
└──────────────────────────────────┘
```

### Process Type Indicators
1. **Sequential**: Linear arrow icon → 
2. **Hierarchical**: Tree structure icon 🌳

### Status States
- **Initializing**: Pulsing blue dot with loading spinner
- **Active**: Solid green dot with live indicator
- **Paused**: Yellow dot with pause icon
- **Completed**: Green checkmark
- **Failed**: Red X with error count

## Active Crews Summary

### Metrics Display
```
Active Crews Overview
────────────────────────
Total Active:        8
Avg Completion:     67%
Tasks/Second:      124
Success Rate:     98.5%
────────────────────────
Peak Time: 2:30 PM
```

### Visual Elements
- Donut chart for crew distribution by status
- Line graph for task throughput (last hour)
- Heat map for crew efficiency by time

## Initialization & Loading States

### New Crew Creation Flow
1. **Pre-check**: Resource availability animation
2. **Initializing**: Agent assembly visualization
3. **Ready**: Smooth transition to active state

### Loading Animation Sequence
```
Stage 1: Checking Resources...    ⟳
Stage 2: Assembling Agents...     ⟳⟳
Stage 3: Configuring Workflow...  ⟳⟳⟳
Stage 4: Ready to Process! ✓
```

## Real-time Updates

### WebSocket Integration
- Status changes: Instant visual feedback
- Progress updates: Smooth bar animations
- Resource changes: Animated transitions

### Update Frequency
- Crew status: Real-time (< 100ms)
- Progress bars: 500ms intervals
- Resource metrics: 1-second intervals
- Summary stats: 5-second intervals

## Mobile Responsive Design

### Breakpoint Strategy

#### Mobile (< 768px)
```
┌─────────────────┐
│ Crew Management │
├─────────────────┤
│ Resources: 8/10 │
│ ████████░░ 80%  │
├─────────────────┤
│ Crew Alpha      │
│ ● Active | 82%  │
├─────────────────┤
│ Crew Beta       │
│ ● Active | 45%  │
└─────────────────┘
```

#### Tablet (768px - 1200px)
- 2-column crew grid
- Collapsible resource panel
- Simplified metrics

#### Desktop (1200px+)
- Full dashboard view
- Expanded metrics
- Multi-crew comparison tools

## Interactive Features

### Crew Management Actions
1. **Click**: Expand for detailed view
2. **Long Press**: Quick actions menu
3. **Swipe**: Archive completed crews
4. **Drag**: Reorder crew priority

### Bulk Operations
- Select multiple crews for batch actions
- Pause/resume all crews
- Export performance data
- Clear completed crews

## Performance Optimizations

### Rendering Strategy
```typescript
// Virtual scrolling for large crew lists
const VisibleCrews = virtualizeList(allCrews, {
  itemHeight: 180,
  containerHeight: viewportHeight,
  overscan: 2
});

// Throttled updates for non-critical metrics
const throttledMetrics = throttle(updateMetrics, 1000);

// Memoized crew cards to prevent re-renders
const CrewCard = memo(({ crew }) => {
  // Component implementation
});
```

### Animation Performance
- Use CSS transforms only
- GPU-accelerated transitions
- Reduced motion mode support
- FPS monitoring for optimization

## Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Arrow keys for crew selection
- Space/Enter for actions
- Escape to close modals

### Screen Reader Support
```html
<div role="region" aria-label="Crew Management Dashboard">
  <h2 id="crew-summary">8 of 10 crews active</h2>
  <div role="list" aria-describedby="crew-summary">
    <article role="listitem" aria-label="Crew Alpha, Active, 82% complete">
      <!-- Crew details -->
    </article>
  </div>
</div>
```

### Visual Accessibility
- High contrast mode support
- Color-blind friendly palettes
- Text alternatives for all visuals
- Minimum touch target: 44x44px

## Design Tokens

```json
{
  "crew": {
    "card": {
      "width": "280px",
      "minHeight": "180px",
      "padding": "16px",
      "gap": "16px",
      "borderRadius": "12px"
    },
    "status": {
      "dotSize": "8px",
      "colors": {
        "initializing": "#3B82F6",
        "active": "#10B981",
        "paused": "#F59E0B",
        "completed": "#059669",
        "failed": "#EF4444"
      }
    },
    "resource": {
      "bars": {
        "height": "8px",
        "borderRadius": "4px",
        "background": "#E5E7EB"
      },
      "thresholds": {
        "safe": "#10B981",
        "warning": "#F59E0B",
        "critical": "#EF4444"
      }
    }
  }
}
```

## Error States & Edge Cases

### Resource Exhaustion
- Clear warning before limit
- Queuing system visualization
- Suggested optimization actions

### Connection Loss
- Offline indicator
- Cached data display
- Automatic reconnection status

### Empty States
- Friendly onboarding graphics
- Clear CTA to create first crew
- Tutorial hints for new users

## Implementation Guidelines

### Component Hierarchy
```
CrewDashboard/
├── ResourceOverview/
│   ├── ResourceBar
│   ├── ResourceMetrics
│   └── ResourceActions
├── CrewGrid/
│   ├── CrewCard/
│   │   ├── CrewHeader
│   │   ├── CrewStatus
│   │   ├── CrewProgress
│   │   └── CrewMetrics
│   └── CrewActions
└── CrewSummary/
    ├── SummaryStats
    └── SummaryCharts
```

### State Management
```typescript
interface CrewDashboardState {
  crews: Crew[];
  resources: SystemResources;
  activeCrewCount: number;
  isCreatingCrew: boolean;
  selectedCrews: string[];
}

interface Crew {
  id: string;
  name: string;
  status: CrewStatus;
  processType: 'sequential' | 'hierarchical';
  agents: Agent[];
  progress: number;
  startTime: Date;
  metrics: CrewMetrics;
}
```

## Next Steps
1. Create interactive Figma prototype
2. Conduct usability testing with ops team
3. Develop responsive component library
4. Implement real-time WebSocket handlers