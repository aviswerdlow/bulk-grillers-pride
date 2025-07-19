# AI Categorization Error Handling Implementation Guide

## Problem Summary

AI categorization jobs are failing silently when API keys are not configured or invalid. The system completes jobs but marks all products as failed without clear error messages.

## Root Causes

1. **Missing API Keys**: Organizations may not have configured API keys for OpenAI/Anthropic
2. **No Pre-validation**: Jobs are created without checking if API keys exist
3. **Silent Failures**: Errors are not properly surfaced to users
4. **Model Access**: Some models (like o3) may require specific API key tiers

## Implementation Tasks

### Backend Tasks (T103 & T104)

#### T103: Add API Key Validation & Error Handling

**Location**: `/convex/functions/ai/categorization.ts`

1. **Pre-job Validation** in `createCategorizationJob`:
```typescript
// Add before creating the job
const apiKey = organization.settings.apiKeys[args.aiProvider];
if (!apiKey) {
  throw new Error(
    `No API key configured for ${args.aiProvider}. Please configure your API key in organization settings.`
  );
}

// Basic format validation
if (args.aiProvider === 'openai' && !apiKey.startsWith('sk-')) {
  throw new Error('Invalid OpenAI API key format. Keys should start with "sk-"');
}
```

2. **Enhanced Error Handling** in `processCategorizationJob`:
```typescript
try {
  const apiKey = organization.settings.apiKeys[job.aiProvider];
  if (!apiKey) {
    // Update job with specific error
    await ctx.runMutation(internal.functions.ai.categorization.updateJobStatusInternal, {
      jobId: job._id,
      status: 'failed',
      error: {
        type: 'configuration_error',
        message: `No ${job.aiProvider} API key configured. Please add your API key in organization settings.`,
        timestamp: Date.now()
      }
    });
    return;
  }
} catch (error) {
  // Capture specific API errors
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorType = errorMessage.includes('API key') ? 'auth_error' : 
                   errorMessage.includes('model') ? 'model_error' : 
                   'api_error';
  
  await ctx.runMutation(internal.functions.ai.categorization.updateJobStatusInternal, {
    jobId: job._id,
    status: 'failed',
    error: {
      type: errorType,
      message: errorMessage,
      timestamp: Date.now(),
      details: error instanceof Error ? error.stack : undefined
    }
  });
}
```

#### T104: Add Model Availability Check

**Location**: `/convex/functions/ai/langchain.ts`

1. **Model Validation Function**:
```typescript
export async function validateModelAccess(
  provider: AIProvider,
  model: string,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (provider === 'openai') {
      // Test with a minimal completion
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        if (error.error?.code === 'model_not_found') {
          return { 
            valid: false, 
            error: `Model "${model}" not available. Your API key may not have access to this model.` 
          };
        }
        return { valid: false, error: error.error?.message || 'API validation failed' };
      }
      return { valid: true };
    }
    
    // Add similar validation for Anthropic
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Failed to validate API access: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
```

2. **Use in Job Creation**:
```typescript
// In createCategorizationJob
const validation = await validateModelAccess(args.aiProvider, args.aiModel, apiKey);
if (!validation.valid) {
  throw new Error(validation.error);
}
```

### Frontend Tasks (T105 & T106)

#### T105: Display API Configuration Status

**Location**: `/apps/web/src/app/(dashboard)/[orgSlug]/ai-categorization/page.tsx`

1. **Add API Status Check**:
```typescript
// Add to the page component
const apiKeyStatus = useQuery(
  api.functions.organizations.organizations.getApiKeyStatus,
  organization ? { organizationId: organization._id } : "skip"
);

// Display warning banner if no API keys
{!apiKeyStatus?.hasOpenAI && !apiKeyStatus?.hasAnthropic && (
  <Alert className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>API Keys Required</AlertTitle>
    <AlertDescription>
      You need to configure API keys to use AI categorization.{" "}
      <Link href={`/${orgSlug}/settings?tab=api-keys`} className="underline">
        Configure API Keys
      </Link>
    </AlertDescription>
  </Alert>
)}
```

2. **Add Status Indicator to Start Button**:
```typescript
<Button 
  onClick={() => setShowCreateDialog(true)}
  disabled={!apiKeyStatus?.hasOpenAI && !apiKeyStatus?.hasAnthropic}
>
  <Play className="h-4 w-4 mr-2" />
  Start Categorization
</Button>
```

#### T106: Add Job Error Details Display

**Location**: Update job table to show error details

1. **Enhance Job Type**:
```typescript
interface CategorizationJob {
  // ... existing fields
  error?: {
    type: string;
    message: string;
    timestamp: number;
    productErrors?: Array<{
      productId: string;
      error: string;
    }>;
  };
}
```

2. **Display Errors in Table**:
```typescript
// In the status cell
<TableCell>
  <div className="flex items-center gap-2">
    {getStatusIcon(job.status)}
    <Badge variant={getStatusBadgeVariant(job.status)}>
      {job.status}
    </Badge>
    {job.status === 'failed' && job.error && (
      <Tooltip>
        <TooltipTrigger>
          <InfoIcon className="h-3 w-3 text-destructive" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{job.error.message}</p>
        </TooltipContent>
      </Tooltip>
    )}
  </div>
</TableCell>
```

3. **Add Retry with Context**:
```typescript
// In actions dropdown
{job.status === 'failed' && job.error?.type === 'configuration_error' && (
  <DropdownMenuItem
    onClick={() => router.push(`/${orgSlug}/settings?tab=api-keys`)}
  >
    <Settings className="mr-2 h-4 w-4" />
    Configure API Keys
  </DropdownMenuItem>
)}
```

## Testing Checklist

- [ ] Create job without API key → Clear error message
- [ ] Create job with invalid API key → Validation error
- [ ] Create job with valid key but no model access → Model error
- [ ] Failed job shows specific error in UI
- [ ] Warning banner appears when no API keys configured
- [ ] Retry options appropriate to error type
- [ ] Error details preserved in job history

## Success Criteria

1. Users immediately understand why jobs fail
2. Clear path to fix configuration issues
3. No silent failures - all errors are visible
4. Graceful handling of API limitations