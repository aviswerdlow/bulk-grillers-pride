'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap } from 'lucide-react';

// Categorization job form schema
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createJobSchema = z.object({
  jobType: z.enum(['bulk_categorization', 'single_product', 'validation']),
  prompt: z.string().min(1, 'Prompt is required'),
  batchSize: z.number().min(1).max(50).optional(),
  aiProvider: z.enum(['openai', 'anthropic', 'gemini']),
  aiModel: z.string().min(1, 'AI model is required'),
});

type CreateJobForm = z.infer<typeof createJobSchema>;

interface CreateCategorizationJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<'organizations'>;
  projectId: Id<'projects'>;
}

export function CreateCategorizationJobDialog({
  open,
  onOpenChange,
  organizationId,
  projectId,
}: CreateCategorizationJobDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Get organization to access AI settings
  // const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
  //   slug: "placeholder", // This would need to be passed in properly
  // });

  // Get products for selection
  // Note: Using (api as any) as a workaround until Convex dev server regenerates the API types
  const productsResult = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).functions.products.products.getProjectProducts,
    {
      organizationId,
      projectId,
      // Removed status filter to show all products (active, draft, archived)
      limit: 1000, // Increased limit to show more products
    }
  );

  // Note: Using (api as any) as a workaround until Convex dev server regenerates the API types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createJob = useMutation((api as any).functions.ai.categorization.createCategorizationJob);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateJobForm>({
    defaultValues: {
      jobType: 'bulk_categorization',
      prompt: `Analyze the following product and suggest the most appropriate categories based on:
- Product title and description
- Product type and vendor
- Key features and characteristics

Please provide categories with confidence scores and rationale for each suggestion.`,
      batchSize: 10,
      aiProvider: 'openai',
      aiModel: 'o3-mini',
    },
  });

  const jobType = watch('jobType');
  const aiProvider = watch('aiProvider');
  const products = productsResult?.page || [];

  // AI model options based on provider
  const aiModelOptions = {
    openai: [
      { value: 'o3', label: 'O3 (Advanced Reasoning - $2/$8)', disabled: false },
      { value: 'o3-mini', label: 'O3 Mini (Fast Reasoning - $1.10/$4.40)', disabled: false },
      { value: 'o4-mini', label: 'O4 Mini (Efficient - $1.10/$4.40)', disabled: false },
      { value: 'o1', label: 'O1 (Premium - $15/$60)', disabled: false },
      { value: 'gpt-4o', label: 'GPT-4o (Multimodal - $2.50/$10)', disabled: false },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Budget - $0.15/$0.60)', disabled: false },
    ],
    anthropic: [
      { value: 'claude-opus-4', label: 'Claude Opus 4 (Most Powerful)', disabled: false },
      { value: 'claude-sonnet-4', label: 'Claude Sonnet 4 (High Performance)', disabled: false },
    ],
    gemini: [
      { value: 'gemini-pro', label: 'Gemini Pro (Coming Soon)', disabled: true },
    ],
  };

  const onSubmit = async (data: CreateJobForm) => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    try {
      setIsSubmitting(true);

      await createJob({
        organizationId,
        projectId,
        jobType: data.jobType,
        productIds: selectedProducts as Id<'products'>[],
        aiProvider: data.aiProvider,
        aiModel: data.aiModel,
        prompt: data.prompt,
        batchSize: data.batchSize,
        notifications: {
          email: true,
          dashboard: true,
          recipients: [], // Would get from user settings
        },
      });

      toast.success('Categorization job created successfully');
      reset();
      setSelectedProducts([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create job:', error);
      toast.error('Failed to create categorization job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
      setSelectedProducts([]);
    }
    onOpenChange(open);
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const selectAllProducts = () => {
    setSelectedProducts(products.map((p: { _id: string }) => p._id));
  };

  const clearSelection = () => {
    setSelectedProducts([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Start AI Categorization
          </DialogTitle>
          <DialogDescription>
            Use AI to automatically categorize your products and improve organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Job Type */}
          <div className="space-y-3">
            <Label>Categorization Type</Label>
            <Select
              value={jobType}
              onValueChange={(value) =>
                setValue(
                  'jobType',
                  value as 'bulk_categorization' | 'single_product' | 'validation'
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bulk_categorization">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Bulk Categorization</div>
                      <div className="text-sm text-muted-foreground">
                        Process multiple products at once
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="validation">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Category Validation</div>
                      <div className="text-sm text-muted-foreground">
                        Review and improve existing categories
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Product Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Products ({selectedProducts.length} selected)</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllProducts}>
                  Select All
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>

            <Card className="max-h-48 overflow-y-auto">
              <CardContent className="p-3 space-y-2">
                {products.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No products found. Please import products first.
                  </p>
                ) : (
                  products.map(
                    (product: {
                      _id: string;
                      title: string;
                      vendor?: string;
                      productType?: string;
                      categories: string[];
                      status?: string;
                    }) => (
                      <div key={product._id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={product._id}
                          checked={selectedProducts.includes(product._id)}
                          onChange={() => toggleProductSelection(product._id)}
                          className="rounded border-border"
                        />
                        <label htmlFor={product._id} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{product.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {product.vendor && `${product.vendor} • `}
                                {product.productType || 'No type'}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {product.status === 'draft' && (
                                <Badge variant="outline" className="text-xs">
                                  Draft
                                </Badge>
                              )}
                              {product.categories.length > 0 ? (
                                <Badge variant="outline" className="text-xs">
                                  {product.categories.length} categories
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Uncategorized
                                </Badge>
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                    )
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Provider Selection */}
          <div className="space-y-3">
            <Label>AI Provider</Label>
            <Select
              value={aiProvider}
              onValueChange={(value) => {
                setValue('aiProvider', value as 'openai' | 'anthropic' | 'gemini');
                // Reset model when provider changes
                const firstModel = aiModelOptions[value as keyof typeof aiModelOptions][0];
                if (firstModel && !firstModel.disabled) {
                  setValue('aiModel', firstModel.value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <div>
                      <div className="font-medium">OpenAI</div>
                      <div className="text-sm text-muted-foreground">O3 & O1 Reasoning Models</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="anthropic">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Anthropic</div>
                      <div className="text-sm text-muted-foreground">Claude Opus 4 & Sonnet 4</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="gemini" disabled>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Google Gemini</div>
                      <div className="text-sm text-muted-foreground">Coming Soon</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.aiProvider && <p className="text-sm text-destructive">{errors.aiProvider.message}</p>}
          </div>

          {/* AI Model Selection */}
          <div className="space-y-3">
            <Label>AI Model</Label>
            <Select
              value={watch('aiModel')}
              onValueChange={(value) => setValue('aiModel', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aiModelOptions[aiProvider as keyof typeof aiModelOptions].map((model) => (
                  <SelectItem key={model.value} value={model.value} disabled={model.disabled}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.aiModel && <p className="text-sm text-destructive">{errors.aiModel.message}</p>}
          </div>

          {/* AI Prompt */}
          <div className="space-y-3">
            <Label htmlFor="prompt">AI Prompt</Label>
            <Textarea
              id="prompt"
              {...register('prompt')}
              placeholder="Describe how the AI should categorize your products..."
              rows={4}
            />
            {errors.prompt && <p className="text-sm text-destructive">{errors.prompt.message}</p>}
          </div>

          {/* Batch Size */}
          <div className="space-y-3">
            <Label htmlFor="batchSize">Batch Size (products per request)</Label>
            <Select
              value={watch('batchSize')?.toString() || '10'}
              onValueChange={(value) => setValue('batchSize', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 products</SelectItem>
                <SelectItem value="10">10 products</SelectItem>
                <SelectItem value="20">20 products</SelectItem>
                <SelectItem value="50">50 products</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          {selectedProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Job Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Products to process:</span>
                  <span className="font-medium">{selectedProducts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Estimated batches:</span>
                  <span className="font-medium">
                    {Math.ceil(selectedProducts.length / (watch('batchSize') || 10))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>AI Provider:</span>
                  <span className="font-medium">
                    {aiProvider === 'openai' && 'OpenAI'}
                    {aiProvider === 'anthropic' && 'Anthropic'}
                    {aiProvider === 'gemini' && 'Google Gemini'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>AI Model:</span>
                  <span className="font-medium">{watch('aiModel')}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || selectedProducts.length === 0}>
              {isSubmitting
                ? 'Starting...'
                : `Start Categorization (${selectedProducts.length} products)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
