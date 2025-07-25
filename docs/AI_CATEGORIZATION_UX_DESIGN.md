# AI Categorization Job Actions - UX Design Specification

## Overview
This document outlines the UX design for AI categorization job actions, providing users with detailed insights into job progress, results, and AI reasoning.

## Design Principles
1. **Progressive Disclosure**: Surface key information quickly, allow deep dives on demand
2. **Real-time Feedback**: Show live progress and AI thinking process
3. **Actionable Insights**: Enable users to understand and act on categorization results
4. **Export-First**: Make data extraction seamless for business workflows

## Component Architecture

### 1. Actions Dropdown Menu
Located in the rightmost column of the jobs table.

**Menu Items:**
- **View Details** - Opens comprehensive job modal
- **View Progress** - Opens real-time progress sidebar (for running jobs)
- **Download Results** - Exports categorization results as CSV
- **Re-run Failed** - Creates new job for failed items only
- **Cancel Job** - Stops actively running job

### 2. Job Details Modal

#### Header Section
```
┌──────────────────────────────────────────────────────────┐
│ Job Details - Bulk Categorization                    [X] │
├──────────────────────────────────────────────────────────┤
│ Status: ● Completed   Model: OpenAI o3   Duration: 6s   │
│ Products: 2/2         Success Rate: 100%                 │
└──────────────────────────────────────────────────────────┘
```

#### Content Tabs
1. **Overview Tab**
   - Job metadata (ID, created by, timestamp)
   - Summary statistics (products processed, categories assigned)
   - Cost breakdown (tokens used, API costs)
   - Performance metrics (avg time per product)

2. **Results Tab**
   - Searchable/filterable product table
   - Columns: Product, Category Assigned, Confidence, Status
   - Expandable rows showing AI reasoning
   - Bulk actions (approve/reject assignments)

3. **Progress Tab** (for running jobs)
   - Current product being processed
   - Real-time AI thinking process
   - Progress bar with ETA
   - Pause/Resume controls

4. **Errors Tab** (if any failures)
   - Failed products list
   - Error reasons
   - Retry options

### 3. Real-time Progress Panel

For actively running jobs, show a slide-out panel with:

```
┌─────────────────────────────────────────┐
│ Processing Product 15 of 200            │
├─────────────────────────────────────────┤
│ Product: "Weber Grill Brush"            │
│                                         │
│ AI Thinking...                          │
│ → Analyzing product title               │
│ → Identifying key features:             │
│   - Brand: Weber                        │
│   - Type: Cleaning tool                 │
│   - Purpose: Grill maintenance          │
│ → Matching to categories...             │
│ → Best match: Accessories > Cleaning    │
│   Confidence: 92%                       │
│                                         │
│ [=====>                    ] 7.5%       │
│ ETA: 3 min 45 sec                       │
└─────────────────────────────────────────┘
```

### 4. Product Details Expansion

When clicking on a product row in results:

```
┌────────────────────────────────────────────────────┐
│ ▼ Weber Grill Brush (#SKU-12345)                  │
├────────────────────────────────────────────────────┤
│ Assigned Category: Accessories > Cleaning Tools    │
│ Confidence: 92%                                    │
│                                                    │
│ AI Reasoning:                                      │
│ • Product type identified as cleaning accessory    │
│ • Brand "Weber" associated with grilling products  │
│ • Keywords "brush" and "grill" indicate           │
│   maintenance tool category                        │
│ • Similar products in database mostly categorized  │
│   under Accessories > Cleaning Tools               │
│                                                    │
│ Alternative Suggestions:                           │
│ • Tools > Maintenance (78% confidence)             │
│ • Accessories > Other (65% confidence)             │
│                                                    │
│ Actions: [Approve] [Change Category] [Flag Review] │
└────────────────────────────────────────────────────┘
```

## Implementation Requirements

### Backend Data Structure
```typescript
interface JobDetails {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    currentProduct?: {
      id: string;
      name: string;
      aiThoughts: string[];
    };
  };
  results: {
    productId: string;
    productName: string;
    assignedCategory: string;
    confidence: number;
    reasoning: string;
    alternatives: Array<{
      category: string;
      confidence: number;
    }>;
    status: 'success' | 'failed' | 'pending_review';
    error?: string;
  }[];
  metrics: {
    totalTokens: number;
    estimatedCost: number;
    avgTimePerProduct: number;
    successRate: number;
  };
}
```

### Real-time Updates
- Use Convex subscriptions for live progress updates
- Stream AI reasoning as it happens (if API supports)
- Update progress bar and ETA calculations in real-time

### Export Formats
1. **Summary CSV**: Product, Assigned Category, Confidence
2. **Detailed CSV**: Includes reasoning, alternatives, timestamps
3. **JSON Export**: Complete job data for integration

## Interaction Flows

### Viewing Completed Job
1. User clicks "..." → "View Details"
2. Modal opens on Overview tab
3. User navigates to Results tab
4. User can expand individual products for reasoning
5. User can export or take bulk actions

### Monitoring Running Job
1. User clicks "..." → "View Progress"
2. Progress panel slides in from right
3. Live updates show current product processing
4. User sees AI reasoning in real-time
5. User can pause/resume if needed

### Handling Failed Items
1. System automatically groups failed items
2. User can view all failures in Errors tab
3. One-click "Re-run Failed" creates new job
4. Original job ID linked for tracking

## Accessibility Considerations
- All modals keyboard navigable
- Progress updates announced to screen readers
- Color-blind safe status indicators
- Export functionality supports assistive tech

## Mobile Responsiveness
- Actions menu adapts to touch targets
- Modal becomes full-screen on mobile
- Progress panel becomes bottom sheet
- Tables use horizontal scroll with fixed columns