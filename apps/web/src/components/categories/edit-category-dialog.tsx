"use client";

import React, { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { createLogger } from '@/utils/error-monitoring';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Category edit form schema
const _editCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  handle: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  isVisible: z.boolean().optional(),
});

type EditCategoryForm = z.infer<typeof _editCategorySchema>;

const logger = createLogger('EditCategoryDialog');

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: {
    _id: string;
    name: string;
    description?: string;
    handle: string;
    color?: string;
    icon?: string;
    seoTitle?: string;
    seoDescription?: string;
    isVisible: boolean;
  };
}

export function EditCategoryDialog({
  open,
  onOpenChange,
  category,
}: EditCategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateCategory = useMutation((api as any).functions.categories.categories.updateCategory);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    // setValue is available but not used directly in form submission
  } = useForm<EditCategoryForm>({
    defaultValues: {
      name: category.name,
      description: category.description || "",
      handle: category.handle,
      color: category.color || "",
      icon: category.icon || "",
      seoTitle: category.seoTitle || "",
      seoDescription: category.seoDescription || "",
      isVisible: category.isVisible,
    },
  });

  // Reset form when category changes
  useEffect(() => {
    reset({
      name: category.name,
      description: category.description || "",
      handle: category.handle,
      color: category.color || "",
      icon: category.icon || "",
      seoTitle: category.seoTitle || "",
      seoDescription: category.seoDescription || "",
      isVisible: category.isVisible,
    });
  }, [category, reset]);

  const onSubmit = async (data: EditCategoryForm) => {
    try {
      setIsSubmitting(true);

      // Only send fields that have changed
      const updates: Partial<EditCategoryForm> = {};
      
      if (data.name !== category.name) updates.name = data.name;
      if (data.description !== category.description) updates.description = data.description || undefined;
      if (data.handle !== category.handle) updates.handle = data.handle;
      if (data.color !== category.color) updates.color = data.color || undefined;
      if (data.icon !== category.icon) updates.icon = data.icon || undefined;
      if (data.seoTitle !== category.seoTitle) updates.seoTitle = data.seoTitle || undefined;
      if (data.seoDescription !== category.seoDescription) updates.seoDescription = data.seoDescription || undefined;
      if (data.isVisible !== category.isVisible) updates.isVisible = data.isVisible;

      // Only update if there are changes
      if (Object.keys(updates).length === 0) {
        toast.info("No changes to save");
        onOpenChange(false);
        return;
      }

      await updateCategory({
        categoryId: category._id,
        ...updates,
      });

      toast.success("Category updated successfully");
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to update category:", error);
      toast.error("Failed to update category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update your category information. Changes will be saved to your catalog.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter category name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                {...register("handle")}
                placeholder="category-handle"
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier for this category
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Describe this category..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  {...register("color")}
                  placeholder="#3B82F6"
                  type="color"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Input
                  id="icon"
                  {...register("icon")}
                  placeholder="lucide icon name"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isVisible"
                {...register("isVisible")}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isVisible">Visible in storefront</Label>
            </div>
          </div>

          {/* SEO */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">SEO (Optional)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="seoTitle">SEO Title</Label>
              <Input
                id="seoTitle"
                {...register("seoTitle")}
                placeholder="SEO-optimized title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoDescription">SEO Description</Label>
              <Textarea
                id="seoDescription"
                {...register("seoDescription")}
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
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}