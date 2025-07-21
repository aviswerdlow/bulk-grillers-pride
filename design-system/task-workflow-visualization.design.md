# Task Workflow and Progress Visualization Design

## Overview
Comprehensive visualization system for the CrewAI multi-stage task workflow, replacing the single progress bar with a sophisticated pipeline view showing Feature Extraction → Category Matching → Validation stages.

## Design Philosophy
- **Progressive Disclosure**: Show complexity only when needed
- **Real-time Clarity**: Instant understanding of workflow state
- **Batch Awareness**: Handle single items to bulk operations elegantly
- **Performance Focus**: Optimize for high-frequency updates

## Task Pipeline View

### Visual Structure
```
┌─────────────────────────────────────────────────────────────────────┐
│                        Product Categorization Pipeline               │
├─────────────────────────────────────────────────────────────────────┤
│   Feature Extraction      Category Matching         Validation       │
│   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐   │
│   │    📊       │   →    │     🔗      │   →    │     ✓      │   │
│   │  Stage 1    │        │   Stage 2   │        │   Stage 3   │   │
│   └─────────────┘        └─────────────┘        └─────────────┘   │
│   Agent: Analyzer         Agent: Matcher         Agent: QA          │
│   Status: Active          Status: Waiting        Status: Idle       │
│   Progress: 78%           Progress: 0%            Progress: 0%       │
└─────────────────────────────────────────────────────────────────────┘
```

### Stage Components

#### Stage Card Design
```
┌───────────────────────┐
│ Icon   Stage Name     │
│ ████████░░ 80%        │
│ 45/56 items           │
│ ~2 min remaining      │
└───────────────────────┘
```

#### Stage States
1. **Idle**: Grayed out, waiting for input
2. **Active**: Highlighted border, animated progress
3. **Completed**: Green check, results summary
4. **Error**: Red border, retry option
5. **Blocked**: Orange border, dependency indicator

## Multi-Stage Progress System

### Progress Calculation
```typescript
interface StageProgress {
  stage1: { current: 45, total: 56, percentage: 80 },
  stage2: { current: 0, total: 45, percentage: 0 },
  stage3: { current: 0, total: 0, percentage: 0 },
  overall: 30 // (80 * 0.33) + (0 * 0.33) + (0 * 0.34)
}
```

### Visual Progress Indicators

#### Segmented Progress Bar
```
Overall Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
███████████░░░░░░░░░░░░░░░░░░░░░░░ 30%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Extract    Match    Validate
   26%       0%        0%
```

#### Stage Transition Animation
- Smooth fill animation as items complete
- Particle effect flowing to next stage
- Celebration animation on stage completion

## Task Dependencies Graph

### Visualization Approach
```
Product A ─┬─→ Feature Set A ─┬─→ Category Match A ─→ Validation A
           │                   │
Product B ─┴─→ Feature Set B ─┴─→ Category Match B ─→ Validation B
                                         ↓
                              [Shared Context Pool]
```

### Interactive Features
- Hover to highlight dependency chain
- Click to view task details
- Drag to reorder processing priority

## Task Queue Visualization

### Queue States Display
```
┌─────────────────────────────────────────┐
│ Task Queue Overview                     │
├─────────────────────────────────────────┤
│ 🔵 Pending    | ████████░░ | 156 tasks │
│ 🟢 Active     | ██░░░░░░░░ | 24 tasks  │
│ ✅ Completed  | ██████████ | 380 tasks │
│ ⚠️ Failed     | █░░░░░░░░░ | 12 tasks  │
└─────────────────────────────────────────┘
```

### Queue Item Design
```
┌─────────────────────────────┐
│ SKU-12345    [Pending]  3s │
│ Electronics > Laptops       │
└─────────────────────────────┘
```

## Real-time Update System

### WebSocket Event Handling
```typescript
interface WorkflowUpdate {
  type: 'task_progress' | 'stage_complete' | 'error' | 'queue_update';
  stageId: string;
  taskId?: string;
  progress?: number;
  timestamp: number;
}
```

### Animation Strategy
- Incremental progress updates (no jumps)
- Smooth transitions between states
- Debounced UI updates for performance
- Priority-based update batching

## Batch Processing Visualization

### Batch Overview
```
Batch: Holiday Sale Products (500 items)
┌─────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░ 40% (200/500)     │
├─────────────────────────────────────────┤
│ Stage 1: ████████░░ 80% | 160/200     │
│ Stage 2: ████░░░░░░ 40% | 32/80       │
│ Stage 3: ██░░░░░░░░ 20% | 8/40        │
└─────────────────────────────────────────┘
```

### Batch Controls
- Pause/Resume batch processing
- Skip failed items
- Retry errors in bulk
- Export batch results

## Individual Agent Progress

### Agent Activity Indicator
```
┌──────────────────────┐
│ 🤖 Product Analyzer  │
│ ┌──────────────────┐ │
│ │ Processing:      │ │
│ │ SKU-789         │ │
│ │ ████████░░ 82%  │ │
│ └──────────────────┘ │
│ Rate: 4.2 items/sec  │
└──────────────────────┘
```

### Performance Metrics
- Current item being processed
- Processing rate (items/second)
- Error rate with trend
- Resource utilization

## Mobile Responsive Design

### Mobile Layout (< 768px)
```
┌─────────────────┐
│ Pipeline Status │
├─────────────────┤
│ Overall: 30%    │
│ ███░░░░░░░░    │
├─────────────────┤
│ ▼ Extraction    │
│   80% • 45/56   │
├─────────────────┤
│ ▶ Matching      │
│   0% • Waiting  │
├─────────────────┤
│ ▶ Validation    │
│   0% • Idle     │
└─────────────────┘
```

### Tablet Layout (768px - 1200px)
- Vertical pipeline with side metrics
- Collapsible queue visualization
- Simplified dependency view

## Animation Patterns

### Progress Animations
```css
@keyframes flowAnimation {
  0% { transform: translateX(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}

.task-flow {
  position: relative;
  overflow: hidden;
}

.task-flow::after {
  content: '';
  position: absolute;
  width: 50px;
  height: 100%;
  background: linear-gradient(90deg, transparent, #3B82F6, transparent);
  animation: flowAnimation 2s ease-in-out infinite;
}
```

### State Transitions
- Fade and scale for stage activation
- Smooth progress bar fills
- Particle effects for completions
- Shake animation for errors

## Accessibility Features

### Semantic HTML Structure
```html
<div role="progressbar" 
     aria-valuenow="30" 
     aria-valuemin="0" 
     aria-valuemax="100"
     aria-label="Overall categorization progress">
  <div class="progress-stages" role="group">
    <div role="progressbar" 
         aria-valuenow="80" 
         aria-label="Feature extraction: 80% complete">
      <!-- Stage 1 content -->
    </div>
    <!-- Additional stages -->
  </div>
</div>
```

### Keyboard Controls
- Tab: Navigate between stages
- Space: Pause/resume processing
- Arrow keys: Navigate queue items
- Enter: View details

## Error Handling & Recovery

### Error Visualization
```
┌─────────────────────────────┐
│ ⚠️ Stage 2 Error           │
│ 3 items failed matching     │
│ ┌─────────────────────────┐ │
│ │ SKU-123: No categories  │ │
│ │ SKU-456: API timeout    │ │
│ │ SKU-789: Invalid data   │ │
│ └─────────────────────────┘ │
│ [Retry All] [Skip] [Debug]  │
└─────────────────────────────┘
```

### Recovery Options
- Automatic retry with backoff
- Manual intervention UI
- Batch error resolution
- Error pattern analysis

## Performance Optimization

### Rendering Strategy
```typescript
// Use React.memo for static stages
const StageCard = memo(({ stage, progress }) => {
  // Render logic
});

// Virtualize large queues
const QueueList = ({ items }) => {
  return (
    <VirtualList
      height={400}
      itemCount={items.length}
      itemSize={60}
      renderItem={({ index }) => <QueueItem item={items[index]} />}
    />
  );
};

// Throttle progress updates
const throttledProgress = useMemo(
  () => throttle(updateProgress, 100),
  []
);
```

### Data Management
- Aggregate updates before rendering
- Use requestAnimationFrame for animations
- Implement progressive loading for large batches
- Cache completed task results

## Design Tokens

```json
{
  "workflow": {
    "stage": {
      "width": "200px",
      "height": "160px",
      "padding": "20px",
      "borderRadius": "12px",
      "gap": "40px"
    },
    "progress": {
      "height": "8px",
      "borderRadius": "4px",
      "segmentGap": "2px",
      "animationDuration": "300ms"
    },
    "queue": {
      "itemHeight": "60px",
      "maxVisible": 10,
      "updateInterval": "500ms"
    },
    "colors": {
      "extraction": "#3B82F6",
      "matching": "#8B5CF6",
      "validation": "#10B981",
      "pending": "#9CA3AF",
      "active": "#3B82F6",
      "completed": "#10B981",
      "failed": "#EF4444"
    }
  }
}
```

## Implementation Architecture

### Component Structure
```
TaskWorkflow/
├── PipelineView/
│   ├── StageCard/
│   │   ├── StageIcon
│   │   ├── StageProgress
│   │   └── StageMetrics
│   ├── StageConnector
│   └── OverallProgress
├── QueueVisualization/
│   ├── QueueOverview
│   ├── QueueList
│   └── QueueItem
├── DependencyGraph/
│   ├── TaskNode
│   └── DependencyLine
└── BatchControls/
    ├── BatchProgress
    └── BatchActions
```

## Next Steps
1. Create animated Figma prototype
2. Build proof-of-concept with real-time updates
3. Performance test with 1000+ item batches
4. Conduct user testing with operations team