# AI Categorization System

This directory contains the complete LangChain-powered AI categorization system for intelligent product categorization after CSV uploads.

## Features

### 🤖 Multi-Provider Support

- **OpenAI** (GPT-4, GPT-3.5-turbo)
- **Anthropic** (Claude 3 Opus, Sonnet, Haiku)
- **Google Gemini** (Coming soon)

### 🎯 Intelligent Categorization

- **Product Analysis**: Extracts key features from title, description, and product type
- **Category Matching**: Matches products to existing categories with confidence scores
- **New Category Suggestions**: Proposes new categories when existing ones don't fit
- **Structured Output**: Uses Zod schemas for reliable, type-safe responses

### ⚡ Performance Optimization

- **Batch Processing**: Processes products in configurable batches
- **Retry Logic**: Automatic retries with exponential backoff
- **Rate Limiting**: Prevents API throttling with built-in delays
- **Caching**: In-memory cache for similar products to reduce API calls
- **Cost Tracking**: Real-time token usage and cost estimation

### 📊 Feedback & Learning

- **User Feedback**: Track accepted/rejected/corrected categorizations
- **Analytics**: Identify problematic categories and accuracy trends
- **Training Data Export**: Generate training datasets from feedback

## Setup

### 1. Configure API Keys

In your organization settings, add API keys for your chosen provider:

```typescript
// Organization settings structure
{
  settings: {
    aiProvider: "openai", // or "anthropic", "gemini"
    aiModel: "gpt-4", // or "gpt-3.5-turbo", "claude-3-sonnet", etc.
    apiKeys: {
      openai: "sk-...",
      anthropic: "sk-ant-...",
      gemini: "..." // Coming soon
    },
    categorization: {
      batchSize: 10, // Products per batch
      prompt: "Focus on accuracy and provide detailed rationale",
      autoApprove: false, // Auto-approve high confidence suggestions
      confidenceThreshold: 0.9 // Minimum confidence for auto-approval
    }
  }
}
```

### 2. Create Categories

Before categorizing, create your category hierarchy:

```typescript
// Example category structure
- Outdoor Cooking Equipment
  - Gas Grills
    - Premium Models
    - Portable Grills
  - Charcoal Grills
  - Electric Grills
- Grill Accessories
  - Cleaning & Maintenance
  - Cooking Tools
  - Covers & Storage
- Food & Seasonings
  - Spice Rubs & Blends
  - BBQ Sauces
  - Wood Chips & Pellets
```

### 3. Start Categorization Job

```typescript
// Create a categorization job
const jobId = await createCategorizationJob({
  organizationId: 'org123',
  projectId: 'proj456',
  jobType: 'bulk_categorization',
  productIds: ['prod1', 'prod2', 'prod3'],
  aiProvider: 'openai',
  aiModel: 'gpt-4',
  prompt: 'Categorize these grilling products accurately',
  batchSize: 10,
  notifications: {
    email: true,
    dashboard: true,
    recipients: ['admin@example.com'],
  },
});
```

## How It Works

### 1. Job Creation

When a categorization job is created:

- Validates user permissions and AI provider settings
- Loads available categories as context
- Creates job record with pending status
- Schedules processing via Convex scheduler

### 2. Processing Pipeline

The `processCategorizationJob` action:

1. **Initialization**: Updates job status to "running"
2. **API Key Retrieval**: Gets decrypted API key for provider
3. **Product Loading**: Fetches products to categorize
4. **Batch Processing**:
   - Checks cache for similar products
   - Processes uncached products with LangChain
   - Caches successful results
   - Updates progress after each batch
5. **Cost Tracking**: Estimates tokens and costs
6. **Completion**: Updates job with results and metrics

### 3. LangChain Integration

The categorization chain:

1. **Prompt Template**: Provider-specific prompts for optimal results
2. **LLM Invocation**: Calls AI provider with structured prompts
3. **Output Parsing**: Validates response with Zod schemas
4. **Error Handling**: Retries with adjusted parameters on failure

### 4. Caching Strategy

- **Cache Key**: Generated from vendor:type:title (normalized)
- **TTL**: 1 hour default (configurable)
- **Hit Rate**: Tracked in job metadata
- **Memory-based**: Consider Redis for production

## Response Format

### Successful Categorization

```typescript
{
  productId: "prod123",
  suggestions: [
    {
      categoryId: "cat456",
      confidence: 0.92,
      rationale: "Based on 'gas grill' in title and 3-burner feature, this is a gas grill"
    },
    {
      categoryId: "cat789",
      confidence: 0.75,
      rationale: "Could also fit in outdoor cooking equipment category"
    }
  ],
  newCategorySuggestions: [
    {
      name: "Premium Gas Grills",
      parentCategoryId: "cat456",
      rationale: "Many high-end gas grills could benefit from this subcategory"
    }
  ],
  keyFeatures: ["gas", "3-burner", "premium", "stainless-steel"],
  productType: "Gas Grills",
  status: "success"
}
```

### Error Response

```typescript
{
  productId: "prod123",
  suggestions: [],
  newCategorySuggestions: [],
  status: "error",
  error: "Failed to categorize: API rate limit exceeded"
}
```

## Monitoring & Debugging

### Log Format

All logs use the `[AI-CAT]` prefix for easy filtering:

```bash
npx convex logs --follow | grep AI-CAT
```

Example logs:

```
[AI-CAT] Starting job job123 with 50 products
[AI-CAT] Processing 10 uncached products with openai
[AI-CAT] Using cached result for product: Weber Grill
[AI-CAT] Batch 1 completed: 8 success, 2 errors
[AI-CAT] Job job123 completed in 12500ms. Cost: $0.0234
[AI-CAT] Final stats: 45 successful, 3 failed, 2 cached
```

### Performance Metrics

Each completed job includes:

- **Execution Time**: Total processing time
- **Token Usage**: Input/output token counts
- **Cost Estimation**: Estimated API costs
- **Cache Hit Rate**: Percentage of cached results
- **Success Rate**: Successful vs failed categorizations

## Best Practices

### 1. Category Design

- Create clear, hierarchical categories
- Include descriptions for better AI understanding
- Avoid overlapping category definitions
- Start broad, add specificity as needed

### 2. Prompt Engineering

- Be specific about your domain (e.g., "grilling products")
- Mention important attributes to consider
- Set expectations for confidence thresholds
- Include examples for edge cases

### 3. Batch Size Optimization

- Larger batches (10-20): More efficient, higher latency
- Smaller batches (3-5): Lower latency, more API calls
- Consider your use case and user experience

### 4. Cost Management

- Monitor token usage and costs regularly
- Use caching aggressively for similar products
- Choose appropriate models (GPT-3.5 vs GPT-4)
- Set spending limits in provider dashboards

### 5. Feedback Integration

- Review rejected categorizations regularly
- Update prompts based on common mistakes
- Export training data for fine-tuning
- Consider creating new categories based on suggestions

## Troubleshooting

### Common Issues

1. **"No API key configured"**

   - Check organization settings
   - Ensure API key is set for selected provider
   - Verify key permissions (write access needed)

2. **"Rate limit exceeded"**

   - Reduce batch size
   - Increase delay between batches
   - Check provider dashboard for limits

3. **Low Accuracy**

   - Review and improve prompt
   - Ensure categories have clear descriptions
   - Check if products have sufficient information
   - Consider using a more capable model

4. **High Costs**
   - Enable caching for similar products
   - Use GPT-3.5 instead of GPT-4 for simple cases
   - Reduce prompt verbosity
   - Process in larger batches

## Future Enhancements

### Planned Features

- [ ] Google Gemini support
- [ ] Redis caching for production scale
- [ ] Fine-tuned models for specific domains
- [ ] Streaming responses for real-time UI
- [ ] Multi-language categorization
- [ ] Image-based categorization
- [ ] Automated category hierarchy suggestions
- [ ] A/B testing for prompts
- [ ] Webhook notifications
- [ ] Bulk feedback application

### Integration Ideas

- Connect to product import pipeline
- Auto-categorize on product creation
- Scheduled re-categorization jobs
- Category quality scoring
- Competitive category analysis
