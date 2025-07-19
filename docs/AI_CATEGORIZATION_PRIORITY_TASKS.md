# AI Categorization Priority Implementation Tasks

## 🚨 IMMEDIATE ACTION REQUIRED

The user has confirmed the actions dropdown is working but needs the actual functionality implemented for:
1. **View Details** - Currently shows "coming soon" toast
2. **Download Results** - Currently shows "coming soon" toast

## Task Assignments

### Backend Agent - Start Immediately

#### T99: Add Job Details Backend Queries (P0, 4 hours)
**Location**: `/convex/functions/ai/categorization.ts`

```typescript
// Add this query function
export const getJobDetails = query({
  args: { jobId: v.id("aiCategorizationJobs") },
  handler: async (ctx, args) => {
    // 1. Get the job
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");
    
    // 2. Check permissions
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // 3. Get product details for each result
    const results = await Promise.all(
      (job.results || []).map(async (result) => {
        const product = await ctx.db.get(result.productId);
        const category = result.categoryId 
          ? await ctx.db.get(result.categoryId)
          : null;
        
        return {
          productId: result.productId,
          productName: product?.title || "Unknown",
          productSku: product?.sku || "",
          assignedCategory: category ? {
            id: category._id,
            name: category.name,
            path: await getCategoryPath(ctx, category._id)
          } : null,
          confidence: result.confidence || 0,
          reasoning: result.reasoning || "",
          alternatives: result.alternatives || [],
          status: result.status || "pending",
          error: result.error
        };
      })
    );
    
    // 4. Calculate summary statistics
    const summary = {
      total: job.productIds.length,
      successful: results.filter(r => r.status === "success").length,
      failed: results.filter(r => r.status === "failed").length,
      categoriesUsed: /* group by category */
    };
    
    return {
      job: {
        _id: job._id,
        status: job.status,
        createdBy: job.createdBy,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        config: {
          aiProvider: job.aiProvider,
          aiModel: job.aiModel,
          temperature: job.temperature
        },
        metrics: {
          totalTokens: job.totalTokens || 0,
          estimatedCost: job.estimatedCost || 0,
          avgTimePerProduct: job.executionTime 
            ? job.executionTime / job.productIds.length 
            : 0
        }
      },
      results,
      summary
    };
  }
});
```

#### T102: Add Export Job Results Feature (P0, 3 hours)
**Location**: `/convex/functions/ai/categorization.ts`

```typescript
// Add this action
export const exportJobResults = action({
  args: { 
    jobId: v.id("aiCategorizationJobs"),
    format: v.union(v.literal("csv"), v.literal("json")),
    detailed: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    // 1. Get job details using the query above
    const jobDetails = await ctx.runQuery(
      internal.functions.ai.categorization.getJobDetails,
      { jobId: args.jobId }
    );
    
    // 2. Format as CSV
    if (args.format === "csv") {
      const headers = args.detailed 
        ? ["Product Name", "SKU", "Category", "Confidence", "Reasoning", "Status"]
        : ["Product Name", "Category", "Confidence"];
      
      const rows = jobDetails.results.map(r => {
        if (args.detailed) {
          return [
            r.productName,
            r.productSku,
            r.assignedCategory?.name || "Uncategorized",
            `${Math.round(r.confidence * 100)}%`,
            r.reasoning.replace(/,/g, ";"), // Escape commas
            r.status
          ];
        }
        return [
          r.productName,
          r.assignedCategory?.name || "Uncategorized",
          `${Math.round(r.confidence * 100)}%`
        ];
      });
      
      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(","))
        .join("\n");
      
      // 3. Return base64 encoded CSV
      return {
        data: Buffer.from(csv).toString("base64"),
        filename: `categorization-${args.jobId}-${Date.now()}.csv`,
        mimeType: "text/csv"
      };
    }
    
    // JSON format
    return {
      data: JSON.stringify(jobDetails, null, 2),
      filename: `categorization-${args.jobId}-${Date.now()}.json`,
      mimeType: "application/json"
    };
  }
});
```

### Frontend Agent - Start After T99

#### T98: Create Job Details Modal (P0, 6 hours)
**Location**: `/apps/web/src/components/ai/job-details-modal.tsx`

Create a comprehensive modal component that:
1. Uses Sheet component from shadcn/ui for slide-out panel
2. Implements 4 tabs: Overview, Results, Progress, Errors
3. Fetches data using the `getJobDetails` query
4. Shows loading state while fetching
5. Displays all job information according to the UX design

**Key Features**:
- Overview tab: Job metadata, summary stats, cost breakdown
- Results tab: Product results table (use component from T101)
- Progress tab: Show progress for running jobs
- Errors tab: List failed products with error reasons

#### T101: Create Product Results Table (P1, 4 hours)
**Location**: `/apps/web/src/components/ai/product-results-table.tsx`

Build an expandable table that:
1. Shows products with their assigned categories
2. Displays confidence scores as percentages
3. Expandable rows to show AI reasoning
4. Search/filter functionality
5. Bulk actions (approve/reject assignments)

### Integration Steps

1. **Update page.tsx** to use real modal instead of toast:
```typescript
const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
const [showDetailsModal, setShowDetailsModal] = useState(false);

const handleViewDetails = (jobId: string) => {
  setSelectedJobId(jobId);
  setShowDetailsModal(true);
};

const handleDownloadResults = async (jobId: string) => {
  try {
    const result = await exportJobResults({ 
      jobId, 
      format: 'csv',
      detailed: true 
    });
    
    // Convert base64 to blob and download
    const blob = new Blob(
      [atob(result.data)], 
      { type: result.mimeType }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Results downloaded successfully');
  } catch (error) {
    toast.error('Failed to download results');
  }
};

// Add modal at the bottom
{selectedJobId && (
  <JobDetailsModal
    jobId={selectedJobId}
    open={showDetailsModal}
    onOpenChange={setShowDetailsModal}
  />
)}
```

## Testing Checklist

- [ ] View Details opens modal with job information
- [ ] Modal shows all 4 tabs with correct content
- [ ] Download Results generates and downloads CSV file
- [ ] CSV contains correct data in proper format
- [ ] Error handling works for failed requests
- [ ] Loading states display properly
- [ ] Modal is responsive on mobile
- [ ] Keyboard navigation works

## Priority Order

1. **Backend T99** - Must be done first for frontend to consume
2. **Backend T102** - Can be done in parallel with T99
3. **Frontend T98** - Start once T99 is complete
4. **Frontend T101** - Can start after T98 structure is in place
5. **Backend T100** - Future enhancement for real-time progress