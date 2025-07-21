# Component Library Extensions for CrewAI UI Elements

## Overview
Comprehensive component library extensions specifically designed for the CrewAI multi-agent system, providing reusable, accessible, and responsive components that maintain consistency across all interfaces.

## Design Philosophy
- **Composability**: Build complex UIs from simple, reusable parts
- **Consistency**: Unified visual language across all CrewAI features
- **Accessibility**: WCAG 2.1 AA compliant by default
- **Performance**: Optimized for frequent updates and animations

## Component Inventory

### 1. AgentCard Component

#### Component Structure
```tsx
interface AgentCardProps {
  agent: {
    id: string;
    type: 'analyzer' | 'matcher' | 'qa';
    name: string;
    status: AgentStatus;
    metrics?: AgentMetrics;
  };
  variant?: 'compact' | 'default' | 'expanded';
  showMetrics?: boolean;
  onStatusChange?: (status: AgentStatus) => void;
}
```

#### Visual Variants
```
Default Variant:
┌─────────────────────────────┐
│ [Avatar] Product Analyzer   │
│          Extracting features│
│ Status: ● Working           │
│ Progress: ████████░░ 82%    │
│ Tasks: 45/60 | Accuracy: 98%│
└─────────────────────────────┘

Compact Variant:
┌─────────────────────┐
│ [A] Analyzer ● 82%  │
└─────────────────────┘

Expanded Variant:
┌─────────────────────────────────┐
│ [Avatar] Product Analyzer       │
│          Extracting features    │
├─────────────────────────────────┤
│ Status: ● Working               │
│ Progress: ████████░░ 82%        │
├─────────────────────────────────┤
│ Performance Metrics:            │
│ • Tasks/min: 12.4               │
│ • Avg time: 1.2s                │
│ • Error rate: 0.2%              │
│ • Token usage: 45K              │
└─────────────────────────────────┘
```

#### States & Interactions
```scss
.agent-card {
  // Base styles
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;

  // Status-based styling
  &--idle {
    opacity: 0.7;
    .agent-card__status { color: var(--gray-400); }
  }

  &--working {
    .agent-card__status { 
      color: var(--blue-500);
      animation: pulse 2s infinite;
    }
  }

  &--error {
    border-color: var(--red-500);
    .agent-card__status { color: var(--red-500); }
  }

  // Hover state
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
}
```

### 2. CrewStatus Component

#### Component Structure
```tsx
interface CrewStatusProps {
  crew: {
    id: string;
    name: string;
    agents: Agent[];
    processType: 'sequential' | 'hierarchical';
    status: CrewStatus;
    progress: number;
    resourceUsage: ResourceMetrics;
  };
  showDetails?: boolean;
  onManage?: (crewId: string) => void;
}
```

#### Visual Design
```
Default View:
┌───────────────────────────────────┐
│ Crew Alpha - Sequential           │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Agents: [A] [M] [Q] | Status: ●  │
│ Progress: ████████░░░░ 67%        │
│ Memory: 234MB/512MB | CPU: 45%    │
└───────────────────────────────────┘

Detailed View:
┌───────────────────────────────────────┐
│ Crew Alpha - Sequential Process       │
├───────────────────────────────────────┤
│ Agent Pipeline:                       │
│ [📊] ──→ [🔗] ──→ [✓]               │
│  ●82%     ●45%     ○0%               │
├───────────────────────────────────────┤
│ Resource Usage:                       │
│ Memory: ████████░░░░ 234MB/512MB     │
│ CPU:    █████░░░░░░ 45%              │
│ API:    ███░░░░░░░░ 1.2K/5K req     │
├───────────────────────────────────────┤
│ Started: 5 min ago | ETA: 3 min      │
│ [Pause] [Configure] [View Logs]       │
└───────────────────────────────────────┘
```

#### Process Type Indicators
```tsx
const ProcessTypeIcon: React.FC<{type: ProcessType}> = ({type}) => {
  if (type === 'sequential') {
    return <SequentialIcon />; // →→→
  }
  return <HierarchicalIcon />; // Tree structure
};
```

### 3. TaskFlow Component

#### Component Structure
```tsx
interface TaskFlowProps {
  stages: TaskStage[];
  currentStage: number;
  showDependencies?: boolean;
  orientation?: 'horizontal' | 'vertical';
  onStageClick?: (stageId: string) => void;
}

interface TaskStage {
  id: string;
  name: string;
  status: 'idle' | 'active' | 'completed' | 'error';
  progress: number;
  agent: AgentType;
  metrics?: StageMetrics;
}
```

#### Visual Layouts
```
Horizontal Layout:
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Extract │ ──→ │ Match   │ ──→ │ Validate│
│ ██████░ │     │ ███░░░░ │     │ ░░░░░░░ │
│   78%   │     │   34%   │     │    0%   │
└─────────┘     └─────────┘     └─────────┘

Vertical Layout:
┌─────────────┐
│ Extract     │
│ ██████████░ │
│    78%      │
└──────┬──────┘
       ↓
┌─────────────┐
│ Match       │
│ ████░░░░░░░ │
│    34%      │
└──────┬──────┘
       ↓
┌─────────────┐
│ Validate    │
│ ░░░░░░░░░░░ │
│     0%      │
└─────────────┘
```

#### Dependency Visualization
```
With Dependencies:
┌───────┐
│ SKU-1 │──┐
└───────┘  │    ┌─────────┐
           ├───→│ Extract │
┌───────┐  │    └────┬────┘
│ SKU-2 │──┘         │
└───────┘            ↓
                ┌─────────┐
                │ Match   │
                └─────────┘
```

### 4. MemoryIndicator Component

#### Component Structure
```tsx
interface MemoryIndicatorProps {
  usage: number;
  total: number;
  hitRate: number;
  variant?: 'compact' | 'detailed';
  showActivity?: boolean;
}
```

#### Visual Variants
```
Compact:
🧠 Memory: 84% | Hits: 92%

Detailed:
┌──────────────────────────┐
│ 🧠 Shared Memory         │
│ Usage: ████████░░ 127MB  │
│ Hit Rate: 92% ↑          │
│ Recent: +12 patterns     │
└──────────────────────────┘

With Activity:
┌────────────────────────────────┐
│ 🧠 Memory System              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Analyzer ──READ──→ [Cache Hit] │
│ Matcher ──WRITE──→ [Stored]    │
└────────────────────────────────┘
```

### 5. MultiStageProgress Component

#### Component Structure
```tsx
interface MultiStageProgressProps {
  stages: ProgressStage[];
  overall: number;
  showLabels?: boolean;
  showPercentages?: boolean;
  animate?: boolean;
}

interface ProgressStage {
  name: string;
  progress: number;
  color?: string;
  icon?: ReactNode;
}
```

#### Visual Design
```
Default:
Overall Progress: 45%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
████████████░░░░░░░░░░░░░░░░░░░░░░
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Extract: 78% | Match: 34% | Validate: 0%

Segmented:
┌─────────────────────────────────┐
│ ████████▓▓▓▓░░░░░░░░░░░░░░░░░░ │
│ └──────┘└──┘└─────────────────┘ │
│ Extract Match    Validate       │
│   78%    34%        0%          │
└─────────────────────────────────┘

With Icons:
📊 ████████ 78% → 🔗 ███░░░ 34% → ✓ ░░░░░░ 0%
```

## Design System Integration

### Extended Color Palette
```scss
// Agent-specific colors
$agent-analyzer: #3B82F6;
$agent-matcher: #8B5CF6;
$agent-qa: #10B981;

// Status colors
$status-idle: #9CA3AF;
$status-working: #3B82F6;
$status-completed: #10B981;
$status-error: #EF4444;

// Memory system
$memory-primary: #8B5CF6;
$memory-hit: #10B981;
$memory-miss: #EF4444;

// Process types
$process-sequential: #3B82F6;
$process-hierarchical: #F59E0B;
```

### Animation Library
```scss
// Pulse animation for active states
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

// Flow animation for task progression
@keyframes flow {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

// Memory access animation
@keyframes memory-access {
  0% { opacity: 0; transform: translateY(4px); }
  50% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-4px); }
}

// Loading states
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Icon System
```tsx
// Agent Icons
export const AgentIcons = {
  analyzer: <MagnifyingGlassIcon />,
  matcher: <LinkIcon />,
  qa: <CheckCircleIcon />,
};

// Status Icons
export const StatusIcons = {
  idle: <PauseIcon />,
  working: <SpinnerIcon className="animate-spin" />,
  completed: <CheckIcon />,
  error: <ExclamationIcon />,
};

// Process Icons
export const ProcessIcons = {
  sequential: <ArrowRightIcon />,
  hierarchical: <TreeIcon />,
};
```

## Responsive Behavior

### Breakpoint System
```scss
// Component-specific breakpoints
$component-breakpoints: (
  'compact': 480px,
  'default': 768px,
  'expanded': 1024px
);

// Responsive mixins
@mixin agent-card-responsive {
  @media (max-width: map-get($component-breakpoints, 'compact')) {
    .agent-card {
      padding: 12px;
      &__metrics { display: none; }
      &__name { font-size: 0.875rem; }
    }
  }
}
```

### Mobile Adaptations
```tsx
// Automatic variant selection based on viewport
const useResponsiveVariant = () => {
  const width = useViewportWidth();
  if (width < 480) return 'compact';
  if (width < 768) return 'default';
  return 'expanded';
};
```

## Loading States

### Skeleton Components
```tsx
const AgentCardSkeleton = () => (
  <div className="agent-card agent-card--skeleton">
    <div className="skeleton-avatar" />
    <div className="skeleton-text skeleton-text--title" />
    <div className="skeleton-text skeleton-text--subtitle" />
    <div className="skeleton-progress" />
  </div>
);
```

### Loading Animations
```scss
.skeleton {
  background: linear-gradient(
    90deg,
    $gray-200 0%,
    $gray-100 50%,
    $gray-200 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

## Accessibility Specifications

### ARIA Patterns
```tsx
// AgentCard accessibility
<article 
  role="article"
  aria-label={`${agent.name} agent, ${agent.status} status`}
  aria-busy={agent.status === 'working'}
>
  <div role="progressbar" 
       aria-valuenow={progress} 
       aria-valuemin={0} 
       aria-valuemax={100}>
    {/* Progress content */}
  </div>
</article>

// TaskFlow accessibility
<nav role="navigation" aria-label="Task workflow stages">
  <ol role="list">
    {stages.map(stage => (
      <li role="listitem" aria-current={stage.active ? 'step' : undefined}>
        {/* Stage content */}
      </li>
    ))}
  </ol>
</nav>
```

### Keyboard Navigation
```tsx
const KeyboardHandlers = {
  ArrowRight: () => focusNextStage(),
  ArrowLeft: () => focusPreviousStage(),
  Enter: () => activateCurrentStage(),
  Space: () => toggleStageDetails(),
  Escape: () => closeDetails(),
};
```

## Component Documentation

### Storybook Stories
```tsx
export default {
  title: 'CrewAI/AgentCard',
  component: AgentCard,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['compact', 'default', 'expanded'],
    },
    status: {
      control: { type: 'select' },
      options: ['idle', 'working', 'completed', 'error'],
    },
  },
};

export const Default = {
  args: {
    agent: {
      id: '1',
      type: 'analyzer',
      name: 'Product Analyzer',
      status: 'working',
      metrics: {
        tasksCompleted: 45,
        tasksTotal: 60,
        accuracy: 98.5,
      },
    },
  },
};
```

## Implementation Guidelines

### Performance Optimization
```tsx
// Memoize expensive renders
export const AgentCard = memo(({ agent, ...props }) => {
  // Component implementation
});

// Use virtualization for lists
const AgentList = ({ agents }) => (
  <VirtualList
    height={600}
    itemCount={agents.length}
    itemSize={120}
    renderItem={({ index }) => <AgentCard agent={agents[index]} />}
  />
);
```

### State Management
```tsx
// Component state interface
interface ComponentState {
  agents: Record<string, Agent>;
  crews: Record<string, Crew>;
  tasks: TaskFlow[];
  memory: MemoryState;
}

// Update patterns
const updateAgentStatus = (agentId: string, status: AgentStatus) => {
  dispatch({ type: 'UPDATE_AGENT_STATUS', payload: { agentId, status } });
};
```

## Next Steps
1. Build component library in Storybook
2. Create comprehensive test suite
3. Generate accessibility reports
4. Publish to internal npm registry