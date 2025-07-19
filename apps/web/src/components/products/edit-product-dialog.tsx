'use client';

import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Doc } from '../../../../../convex/_generated/dataModel';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { BaseDialogProps } from '@/types/ui';

// Product edit form schema
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const editProductSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  handle: z.string().optional(),
  sku: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['active', 'draft', 'archived']),
});

type EditProductForm = z.infer<typeof editProductSchema>;

interface EditProductDialogProps extends BaseDialogProps {
  product: Doc<'products'>;
}

export function EditProductDialog({ open, onOpenChange, product }: EditProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTag, setCurrentTag] = useState('');
  const [tags, setTags] = useState<string[]>(product.tags || []);

  const updateProduct = useMutation(api.functions.products.products.updateProduct);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<EditProductForm>({
    defaultValues: {
      title: product.title,
      description: product.description || '',
      vendor: product.vendor || '',
      productType: product.productType || '',
      handle: product.handle,
      sku: product.sku || '',
      seoTitle: product.seoTitle || '',
      seoDescription: product.seoDescription || '',
      tags: product.tags || [],
      status: product.status,
    },
  });

  // Reset form when product changes
  useEffect(() => {
    reset({
      title: product.title,
      description: product.description || '',
      vendor: product.vendor || '',
      productType: product.productType || '',
      handle: product.handle,
      sku: product.sku || '',
      seoTitle: product.seoTitle || '',
      seoDescription: product.seoDescription || '',
      tags: product.tags || [],
      status: product.status,
    });
    setTags(product.tags || []);
  }, [product, reset]);

  // Helper functions for form handling
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateHandle = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      const newTags = [...tags, currentTag.trim()];
      setTags(newTags);
      setValue('tags', newTags);
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const onSubmit = async (data: EditProductForm) => {
    try {
      setIsSubmitting(true);

      // Only send fields that have changed
      const updates: Partial<EditProductForm> = {};

      if (data.title !== product.title) updates.title = data.title;
      if (data.description !== product.description)
        updates.description = data.description || undefined;
      if (data.vendor !== product.vendor) updates.vendor = data.vendor || undefined;
      if (data.productType !== product.productType)
        updates.productType = data.productType || undefined;
      if (data.handle !== product.handle) updates.handle = data.handle;
      if (data.sku !== product.sku) updates.sku = data.sku || undefined;
      if (data.seoTitle !== product.seoTitle) updates.seoTitle = data.seoTitle || undefined;
      if (data.seoDescription !== product.seoDescription)
        updates.seoDescription = data.seoDescription || undefined;
      if (JSON.stringify(tags) !== JSON.stringify(product.tags)) updates.tags = tags;
      if (data.status !== product.status) updates.status = data.status;

      // Only update if there are changes
      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save');
        onOpenChange(false);
        return;
      }

      await updateProduct({
        productId: product._id,
        ...updates,
      });

      toast.success('Product updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update product:', error);
      toast.error('Failed to update product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
      setTags(product.tags || []);
      setCurrentTag('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update your product information. Changes will be saved to your catalog.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register('title')} placeholder="Enter product title" />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="handle">Handle</Label>
              <Input id="handle" {...register('handle')} placeholder="product-handle" />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier for this product
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register('sku')} placeholder="SKU-123" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe your product..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input id="vendor" {...register('vendor')} placeholder="Brand or vendor name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productType">Product Type</Label>
                <Input
                  id="productType"
                  {...register('productType')}
                  placeholder="e.g., T-Shirt, Book, Electronics"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) =>
                  setValue('status', value as 'active' | 'draft' | 'archived')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Tags</h3>

            <div className="space-y-2">
              <Label htmlFor="tags">Add Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter tag and press Enter"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* SEO */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">SEO (Optional)</h3>

            <div className="space-y-2">
              <Label htmlFor="seoTitle">SEO Title</Label>
              <Input id="seoTitle" {...register('seoTitle')} placeholder="SEO-optimized title" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoDescription">SEO Description</Label>
              <Textarea
                id="seoDescription"
                {...register('seoDescription')}
                placeholder="SEO meta description"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
