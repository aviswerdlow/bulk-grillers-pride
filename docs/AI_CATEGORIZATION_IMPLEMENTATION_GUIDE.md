# AI Categorization Implementation Guide

## Overview
This guide provides implementation details for the AI categorization job actions feature. The UI framework is in place with placeholder handlers that need to be connected to actual functionality.

## Current Implementation Status

### ✅ Completed
- **T97**: Job Actions Dropdown UI implemented
- UX Design specification created
- Placeholder handlers with toast notifications

### 🚧 Pending Implementation

#### Frontend Tasks

**T98 - Job Details Modal** (frontend-agent)
1. Create modal component at `/components/ai/job-details-modal.tsx`
2. Implement tabs: Overview, Results, Progress, Errors
3. Connect to `handleViewDetails` in AI categorization page
4. Use Sheet or Dialog component from shadcn/ui

**T101 - Product Results Table** (frontend-agent)
1. Create expandable table component for job results
2. Show product name, assigned category, confidence, reasoning
3. Implement row expansion to show AI reasoning details
4. Add filtering and search capabilities

#### Backend Tasks

**T99 - Job Details Queries** (backend-agent)
1. Create query: `getJobDetails(jobId)` in `/convex/functions/ai/categorization.ts`
2. Return comprehensive job data including:
   - Job metadata and status
   - Product results with categories assigned
   - AI reasoning for each product
   - Error details if any
3. Add proper authentication checks

**T100 - Real-time Progress Tracking** (backend-agent)
1. Modify `processCategorizationJob` to emit progress events
2. Create subscription: `subscribeToJobProgress(jobId)`
3. Return current product being processed and AI thoughts
4. Update job progress in real-time

**T102 - Export Results** (backend-agent)
1. Create action: `exportJobResults(jobId, format)`
2. Generate CSV with columns: Product, Category, Confidence, Reasoning
3. Return download URL or base64 data
4. Support both summary and detailed export formats

## Integration Points

### Handler Functions to Implement

```typescript
// In ai-categorization/page.tsx

const handleViewDetails = (jobId: string) => {
  // TODO: Open job details modal
  setSelectedJobId(jobId);
  setShowDetailsModal(true);
};

const handleViewProgress = (jobId: string) => {
  // TODO: Open progress tracking panel
  setSelectedJobId(jobId);
  setShowProgressPanel(true);
};

const handleDownloadResults = async (jobId: string) => {
  // TODO: Call export mutation and trigger download
  const result = await exportResults({ jobId, format: 'csv' });
  downloadFile(result.url, `categorization-${jobId}.csv`);
};

const handleRerunFailed = async (jobId: string) => {
  // TODO: Create new job with only failed products
  const failedProducts = await getFailedProducts({ jobId });
  await createCategorizationJob({ 
    productIds: failedProducts,
    parentJobId: jobId 
  });
};
```

## Data Structures

### Job Details Response
```typescript
interface JobDetailsResponse {
  job: {
    _id: string;
    status: string;
    createdBy: string;
    createdAt: number;
    completedAt?: number;
    config: {
      aiProvider: string;
      aiModel: string;
      temperature?: number;
    };
    metrics: {
      totalTokens: number;
      estimatedCost: number;
      avgTimePerProduct: number;
    };
  };
  results: Array<{
    productId: string;
    productName: string;
    productSku: string;
    assignedCategory: {
      id: string;
      name: string;
      path: string[];
    };
    confidence: number;
    reasoning: string;
    alternatives: Array<{
      categoryId: string;
      categoryName: string;
      confidence: number;
    }>;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    categoriesUsed: Array<{
      categoryId: string;
      categoryName: string;
      count: number;
    }>;
  };
}
```

### Progress Update Structure
```typescript
interface ProgressUpdate {
  jobId: string;
  currentIndex: number;
  totalProducts: number;
  currentProduct: {
    id: string;
    name: string;
    sku: string;
  };
  aiThoughts: string[]; // Real-time AI reasoning steps
  stage: 'analyzing' | 'categorizing' | 'validating' | 'saving';
  estimatedTimeRemaining: number; // seconds
}
```

## Testing Checklist

- [ ] Actions dropdown appears for all jobs
- [ ] Context-aware actions (only relevant options shown)
- [ ] Modal opens with job details when clicking "View Details"
- [ ] Real-time progress updates for running jobs
- [ ] CSV export generates and downloads properly
- [ ] Re-run failed creates new job with correct products
- [ ] Cancel job stops processing
- [ ] Delete job removes from database (with confirmation)
- [ ] All actions show appropriate loading states
- [ ] Error handling with user-friendly messages
- [ ] Keyboard navigation works properly
- [ ] Mobile responsive design

## Next Steps

1. Backend agent implements queries and mutations (T99, T100, T102)
2. Frontend agent creates modal and table components (T98, T101)
3. Integration testing of complete flow
4. Performance optimization for large job results
5. Add analytics tracking for user actions