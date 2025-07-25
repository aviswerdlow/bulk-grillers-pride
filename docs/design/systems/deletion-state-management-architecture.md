# Multi-Step Deletion State Management Architecture

**Author**: systems-design-agent  
**Date**: 2025-07-20  
**Issue**: #56  
**Priority**: P1  
**Estimated Effort**: 3-4 hours design, 2 hours documentation

## Executive Summary

This document presents a comprehensive state management architecture for the multi-step deletion wizard, addressing critical requirements for state persistence, error recovery, mobile optimization, and real-time synchronization. The architecture leverages Domain-Driven Design (DDD) principles, implements the Command Query Responsibility Segregation (CQRS) pattern, and utilizes finite state machines for predictable state transitions. The design builds upon existing Convex infrastructure while introducing new patterns for offline support, optimistic updates, and progressive enhancement for mobile devices.

## 1. System Architecture Overview

### 1.1 Layered Architecture (DDD + Clean Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (React)                          │
│  ┌─────────────────┬────────────────┬────────────────────┐    │
│  │  Components     │  Hooks         │  Context Providers  │    │
│  │  - DeleteWizard │  - useDeletion │  - DeletionProvider│    │
│  │  - TrashTable   │  - useTrash    │  - TrashProvider   │    │
│  │  - ConfirmModal │  - useUndo     │  - UndoProvider    │    │
│  └─────────────────┴────────────────┴────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                   Application Layer                              │
│  ┌─────────────────┬────────────────┬────────────────────┐    │
│  │  Use Cases      │  State Machine  │  Command/Query     │    │
│  │  - DeleteItems  │  - DeletionFSM  │  - Commands        │    │
│  │  - RestoreItems │  - TrashFSM     │  - Queries         │    │
│  │  - UndoDelete   │  - SyncFSM      │  - Events          │    │
│  └─────────────────┴────────────────┴────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                     Domain Layer                                 │
│  ┌─────────────────┬────────────────┬────────────────────┐    │
│  │  Entities       │  Value Objects  │  Domain Services   │    │
│  │  - DeletionSess │  - DeletionType │  - DeletionPolicy  │    │
│  │  - TrashItem    │  - ConfirmMethod│  - RetentionPolicy │    │
│  │  - DeletionLog  │  - ItemStatus   │  - ValidationRules │    │
│  └─────────────────┴────────────────┴────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                             │
│  ┌─────────────────┬────────────────┬────────────────────┐    │
│  │  Repositories   │  External APIs  │  Persistence       │    │
│  │  - ConvexRepo   │  - ConvexClient │  - LocalStorage    │    │
│  │  - CacheRepo    │  - Analytics    │  - IndexedDB       │    │
│  │  - QueueRepo    │  - Monitoring   │  - OfflineQueue    │    │
│  └─────────────────┴────────────────┴────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Architecture

```
User Action → UI Component → Hook → Use Case → Domain Logic
     ↓                                              ↓
State Update ← State Machine ← Event ← Domain Event
     ↓
UI Re-render → Optimistic Update → Background Sync → Convex
                                         ↓
                              Success/Failure → Rollback/Commit
```

### 1.3 Key Architectural Decisions

1. **React Context for State Management**: Follows established patterns in the codebase (e.g., AccessibilityContext)
2. **CQRS Pattern**: Separates read and write operations for optimal performance
3. **Event Sourcing**: Enables undo/redo functionality and audit trails
4. **Offline-First Design**: Critical for mobile reliability
5. **State Machine Pattern**: Ensures predictable state transitions and error recovery

## 2. State Machine Design

### 2.1 Primary Deletion Flow State Machine

```
                    ┌─────────────┐
                    │    IDLE     │
                    └──────┬──────┘
                           │ START_DELETION
                    ┌──────▼──────┐
                    │  SELECTING  │◄────────┐
                    └──────┬──────┘         │
                           │ ITEMS_SELECTED │
                    ┌──────▼──────┐         │
                    │  REVIEWING  │─────────┘
                    └──────┬──────┘  MODIFY_SELECTION
                           │ CONFIRM_METHOD_SELECTED
                    ┌──────▼──────┐
                    │ CONFIRMING  │◄────────┐
                    └──────┬──────┘         │
                           │ CONFIRMED      │ RETRY
                    ┌──────▼──────┐         │
                    │ PROCESSING  │─────────┘
                    └──────┬──────┘  FAILED
                           │ SUCCESS
                    ┌──────▼──────┐
                    │  COMPLETED  │
                    └──────┬──────┘
                           │ RESET
                    ┌──────▼──────┐
                    │    IDLE     │
                    └─────────────┘

Error States (accessible from any state):
┌─────────────┐  ┌──────────────┐  ┌───────────────┐
│   ERROR     │  │  CANCELLED   │  │   TIMEOUT     │
└─────────────┘  └──────────────┘  └───────────────┘
```

### 2.2 State Transition Rules

| Current State | Event | Next State | Guards | Actions |
|--------------|-------|------------|---------|---------|
| IDLE | START_DELETION | SELECTING | - | initializeSession |
| SELECTING | ITEMS_SELECTED | REVIEWING | hasSelectedItems | calculateConsequences |
| REVIEWING | MODIFY_SELECTION | SELECTING | - | preserveSelection |
| REVIEWING | CONFIRM_METHOD_SELECTED | CONFIRMING | - | setConfirmationMethod |
| CONFIRMING | CONFIRMED | PROCESSING | isValidConfirmation | executeDeletion |
| PROCESSING | SUCCESS | COMPLETED | - | logSuccess, queueUndo |
| PROCESSING | FAILED | ERROR | - | logError, prepareRetry |
| ERROR | RETRY | PROCESSING | retryLimitNotExceeded | incrementRetryCount |
| ANY | CANCEL | CANCELLED | - | cleanupResources |
| ANY | TIMEOUT | TIMEOUT | - | saveState |

### 2.3 State Persistence Strategy

```typescript
interface PersistedState {
  sessionId: string;
  currentState: StateValue;
  selectedItems: string[];
  confirmationMethod: ConfirmationMethod;
  acknowledgedConsequences: string[];
  retryCount: number;
  lastActivityAt: number;
  metadata: {
    userAgent: string;
    deviceType: 'mobile' | 'desktop';
    connectionQuality: 'offline' | 'slow' | 'fast';
  };
}
```

## 3. Data Model Specifications

### 3.1 Core Domain Entities

```typescript
// Aggregate Root
export class DeletionSession {
  private constructor(
    public readonly id: DeletionSessionId,
    public readonly userId: UserId,
    public readonly organizationId: OrganizationId,
    private state: DeletionState,
    private items: Map<ProductId, DeletionItem>,
    private confirmationMethod: ConfirmationMethod,
    private events: DomainEvent[]
  ) {}

  // Business logic methods
  selectItems(productIds: ProductId[]): void;
  setConfirmationMethod(method: ConfirmationMethod): void;
  confirm(confirmationData: ConfirmationData): ConfirmationResult;
  cancel(): void;
  timeout(): void;
  resume(): void;
}

// Entity
export class DeletionItem {
  constructor(
    public readonly productId: ProductId,
    public readonly dependencies: DependencyInfo[],
    public readonly consequences: ConsequenceInfo[],
    public status: DeletionItemStatus = DeletionItemStatus.PENDING
  ) {}
}

// Value Objects
export class ConfirmationMethod {
  static STANDARD = new ConfirmationMethod('standard_click', {...});
  static HOLD_TO_CONFIRM = new ConfirmationMethod('hold_to_confirm', {...});
  static TYPE_TO_CONFIRM = new ConfirmationMethod('type_to_confirm', {...});
  static BIOMETRIC = new ConfirmationMethod('biometric', {...});
}
```

### 3.2 Convex Schema Integration

The existing `deletionSessions` table in Convex schema already provides comprehensive support:

```typescript
deletionSessions: defineTable({
  sessionId: v.string(),
  userId: v.string(), 
  organizationId: v.id('organizations'),
  state: v.union(
    v.literal('idle'),
    v.literal('selecting'),
    v.literal('reviewing'),
    v.literal('confirming'),
    v.literal('processing'),
    v.literal('completed'),
    v.literal('error'),
    v.literal('cancelled'),
    v.literal('timeout')
  ),
  selectedProducts: v.array(v.id('products')),
  confirmationType: v.union(
    v.literal('none'),
    v.literal('standard'),
    v.literal('hold_to_confirm'),
    v.literal('type_to_confirm'),
    v.literal('biometric')
  ),
  // ... additional fields for security, progress tracking, etc.
})
```

## 4. API Contracts

### 4.1 Command API

```typescript
// Start deletion session
POST /api/deletion/session
Request: {
  organizationId: string;
}
Response: {
  sessionId: string;
  expiresAt: number;
}

// Select items for deletion
POST /api/deletion/session/:sessionId/items
Request: {
  productIds: string[];
}
Response: {
  consequences: ConsequenceInfo[];
  dependencies: DependencyInfo[];
}

// Confirm deletion
POST /api/deletion/session/:sessionId/confirm
Request: {
  confirmationData: {
    method: ConfirmationMethod;
    value?: string; // For type-to-confirm
    nonce?: string; // For security
  };
}
Response: {
  status: 'processing' | 'error';
  jobId?: string;
}
```

### 4.2 Query API

```typescript
// Get session state
GET /api/deletion/session/:sessionId
Response: {
  state: StateValue;
  selectedItems: ItemInfo[];
  progress?: {
    completed: number;
    total: number;
    failed: number;
  };
}

// Get trash items
GET /api/trash?page=1&limit=50&sort=deletedAt&filter[expiringSoon]=true
Response: {
  items: TrashItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 4.3 Real-time Subscriptions

```typescript
// Subscribe to deletion progress
subscription onDeletionProgress(sessionId: String!) {
  deletionProgress(sessionId: $sessionId) {
    completed
    total
    failed
    currentItem {
      id
      title
      status
    }
  }
}

// Subscribe to trash updates
subscription onTrashUpdates(organizationId: ID!) {
  trashUpdates(organizationId: $organizationId) {
    type // 'added' | 'removed' | 'updated'
    item {
      id
      expiresAt
      canRestore
    }
  }
}
```

## 5. User Flows (Sequence Diagrams)

### 5.1 Standard Deletion Flow

```
User          UI            Context      StateMachine    Convex
 |             |              |             |              |
 |--Delete---->|              |             |              |
 |             |--Start------>|             |              |
 |             |              |--START----->|              |
 |             |              |             |--Create----->|
 |             |              |<---Session--|              |
 |             |<--Ready------|             |              |
 |--Select---->|              |             |              |
 |             |--Items------>|             |              |
 |             |              |--ITEMS---->|              |
 |             |              |            |--Validate--->|
 |             |              |<--Consequences------------|
 |             |<--Show-------|             |              |
 |--Confirm--->|              |             |              |
 |             |--Method----->|             |              |
 |             |              |--CONFIRM--->|              |
 |             |              |             |--Execute---->|
 |             |              |<--Progress--|--Updates-----|
 |             |<--Update-----|             |              |
 |             |              |<--Complete--|              |
 |<--Success---|              |             |              |
```

### 5.2 Error Recovery Flow

```
User          UI            Context      StateMachine    Convex
 |             |              |             |              |
 |             |              |             |--Execute---->|
 |             |              |             |<---Error-----|
 |             |              |<--FAILED----|              |
 |             |<--Error------|             |              |
 |<--Options---|              |             |              |
 |--Retry----->|              |             |              |
 |             |--Retry------>|             |              |
 |             |              |--RETRY----->|              |
 |             |              |             |--Execute---->|
 |             |              |             | (with backoff)
 |             |              |<--Progress--|              |
 |             |<--Update-----|             |              |
```

### 5.3 Mobile Interruption Recovery

```
User          UI            Context      StateMachine    Local
 |             |              |             |              |
 |--App Background----------->|             |              |
 |             |              |--PAUSE----->|              |
 |             |              |             |--Save------->|
 |             |              |             |              |
 |         (Time passes...)   |             |              |
 |             |              |             |              |
 |--App Foreground----------->|             |              |
 |             |              |--RESUME---->|              |
 |             |              |             |<--Load-------|
 |             |              |<--Restored--|              |
 |             |<--State------|             |              |
 |<--Continue--|              |             |              |
```

## 6. Technical Considerations

### 6.1 Performance Requirements

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| State Update Latency | <16ms | React DevTools Profiler |
| State Serialization | <50ms | Performance.now() |
| Memory Footprint | <1MB for 1000 items | Chrome Memory Profiler |
| Recovery Time | <2s | User timing API |
| Sync Latency | <500ms | Network timing |
| Offline Queue Size | <10MB | IndexedDB quota |

### 6.2 Scalability Considerations

1. **Virtual Scrolling**: Required for lists >100 items
2. **Batch Processing**: Process deletions in chunks of 50
3. **Progressive Loading**: Load consequences on demand
4. **State Compression**: Use MessagePack for serialization
5. **Cache Strategy**: LRU cache with 5-minute TTL

### 6.3 Security Considerations

1. **Session Security**:
   - CSRF tokens for all mutations
   - Session timeout after 30 minutes
   - Nonce validation for confirmations
   - Rate limiting (10 deletions/minute)

2. **Data Protection**:
   - Encrypt sensitive data in local storage
   - Clear session data on logout
   - Validate all state transitions server-side
   - Audit log all deletion operations

## 7. Edge Cases and Failure Modes

### 7.1 Identified Edge Cases

1. **Multi-Tab Synchronization**:
   - Conflict resolution via last-write-wins
   - Broadcast channel for cross-tab communication
   - Session locking to prevent concurrent modifications

2. **Network Failures**:
   - Offline queue with IndexedDB persistence
   - Exponential backoff (1s, 2s, 4s, 8s, max 30s)
   - User notification of offline status

3. **Browser Crashes**:
   - Auto-save state every 30 seconds
   - Session recovery on next load
   - Incomplete deletion rollback

4. **Partial Failures**:
   - Track individual item status
   - Allow retry of failed items only
   - Provide detailed error information

### 7.2 Failure Recovery Matrix

| Failure Type | Detection | Recovery Strategy | User Impact |
|-------------|-----------|-------------------|-------------|
| Network Loss | Navigator.onLine | Queue operations | Minimal - can continue |
| Session Timeout | 401 response | Re-authenticate | Must restart flow |
| Server Error | 5xx response | Exponential retry | Delayed completion |
| Client Crash | Page reload | Restore from storage | Resume from last step |
| Quota Exceeded | Storage API | Clear old data | May lose old sessions |

## 8. Implementation Tasks

### 8.1 Task Breakdown

```yaml
tasks:
  - id: T1
    title: "Implement DeletionContext and Provider"
    description: "Create React Context with state management"
    effort: "4 hours"
    assigned_to: frontend-agent
    dependencies: []
    
  - id: T2
    title: "Implement State Machine with XState"
    description: "Create deletion flow state machine"
    effort: "6 hours"
    assigned_to: frontend-agent
    dependencies: []
    
  - id: T3
    title: "Create Convex mutations for session management"
    description: "Backend API for deletion sessions"
    effort: "4 hours"
    assigned_to: backend-agent
    dependencies: []
    
  - id: T4
    title: "Implement offline queue with IndexedDB"
    description: "Offline support for mobile"
    effort: "6 hours"
    assigned_to: frontend-agent
    dependencies: [T1]
    
  - id: T5
    title: "Add optimistic updates and rollback"
    description: "UI responsiveness improvements"
    effort: "4 hours"
    assigned_to: frontend-agent
    dependencies: [T1, T3]
    
  - id: T6
    title: "Implement virtual scrolling for large lists"
    description: "Performance optimization"
    effort: "3 hours"
    assigned_to: frontend-agent
    dependencies: [T1]
    
  - id: T7
    title: "Add comprehensive error handling"
    description: "Error states and recovery flows"
    effort: "4 hours"
    assigned_to: frontend-agent
    dependencies: [T2]
    
  - id: T8
    title: "Create mobile-specific optimizations"
    description: "Touch gestures, background sync"
    effort: "5 hours"
    assigned_to: frontend-agent
    dependencies: [T1, T4]
    
  - id: T9
    title: "Add analytics and monitoring"
    description: "Track success rates and performance"
    effort: "3 hours"
    assigned_to: backend-agent
    dependencies: [T3]
    
  - id: T10
    title: "Write comprehensive tests"
    description: "Unit and integration tests"
    effort: "6 hours"
    assigned_to: quality-agent
    dependencies: [T1, T2, T3]
```

### 8.2 Implementation Phases

**Phase 1 (Core State Management)**: Tasks T1, T2, T3
**Phase 2 (Optimizations)**: Tasks T5, T6, T7
**Phase 3 (Mobile)**: Tasks T4, T8
**Phase 4 (Polish)**: Tasks T9, T10

## 9. Success Metrics

### 9.1 Functional Metrics

- ✅ Zero data loss during deletion process
- ✅ 100% recovery rate from interruptions
- ✅ <2s session recovery time
- ✅ Support for 1000+ item bulk deletions

### 9.2 Performance Metrics

- ✅ <100ms state update latency
- ✅ <500ms initial load time
- ✅ 60fps scrolling performance
- ✅ <1MB memory footprint

### 9.3 User Experience Metrics

- ✅ WCAG AA compliance for all states
- ✅ Mobile gesture support
- ✅ Offline capability
- ✅ Real-time progress updates

## 10. Implementation Recommendations

### 10.1 Technology Stack

1. **State Management**: React Context + useReducer
2. **State Machine**: XState for predictable transitions
3. **Persistence**: IndexedDB via Dexie.js
4. **Real-time**: Convex subscriptions
5. **Performance**: React.memo, useMemo, useCallback
6. **Testing**: Jest + React Testing Library

### 10.2 Best Practices

1. **Incremental Migration**: Start with React Context, add features progressively
2. **Feature Flags**: Roll out to subset of users first
3. **Monitoring**: Track error rates and performance metrics
4. **Documentation**: Maintain state diagram documentation
5. **Testing**: 80% unit test coverage minimum

### 10.3 Risk Mitigation

1. **Performance Risk**: Mitigate with virtual scrolling and memoization
2. **Complexity Risk**: Use established patterns (Context, XState)
3. **Mobile Risk**: Progressive enhancement approach
4. **Data Loss Risk**: Multiple persistence layers

## Conclusion

This architecture provides a robust, scalable solution for multi-step deletion state management. It addresses all identified requirements while maintaining performance and user experience across platforms. The modular design allows for incremental implementation and future enhancements.

The use of established patterns (DDD, CQRS, State Machines) ensures maintainability, while the focus on mobile optimization and offline support provides excellent user experience across all devices.

---

**Next Steps**:
1. Review with frontend-agent for implementation feasibility
2. Coordinate with backend-agent on Convex integration
3. Create detailed component specifications
4. Begin Phase 1 implementation