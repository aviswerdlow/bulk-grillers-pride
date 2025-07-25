"use client";

import React, { useState } from 'react';
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

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

// Category creation form schema
const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  handle: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

type CreateCategoryForm = z.infer<typeof createCategorySchema>;

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organizations">;
  projectId: Id<"projects">;
  parentId?: string;
}

export function CreateCategoryDialog({
  open,
  onOpenChange,
  organizationId,
  projectId,
  parentId,
}: CreateCategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createCategory = useMutation((api as any).functions.categories.categories.createCategory);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    // watch,
  } = useForm<CreateCategoryForm>();

  // Auto-generate handle from name
  const generateHandle = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setValue("name", newName);
    
    // Auto-generate handle if it hasn't been manually set
    const handle = generateHandle(newName);
    setValue("handle", handle);
  };

  const onSubmit = async (data: CreateCategoryForm) => {
    try {
      setIsSubmitting(true);

      await createCategory({
        organizationId,
        projectId,
        name: data.name,
        description: data.description || undefined,
        handle: data.handle || generateHandle(data.name),
        parentId: parentId as Id<"categories"> | undefined,
        color: data.color || undefined,
        icon: data.icon || undefined,
        seoTitle: data.seoTitle || undefined,
        seoDescription: data.seoDescription || undefined,
        metadata: {},
      });

      toast.success("Category created successfully");
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create category:", error);
      toast.error("Failed to create category. Please try again.");
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
          <DialogTitle>
            {parentId ? "Create Subcategory" : "Create New Category"}
          </DialogTitle>
          <DialogDescription>
            {parentId 
              ? "Add a new subcategory to organize your products in more detail."
              : "Create a new top-level category to organize your products."
            }
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
                onChange={handleNameChange}
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
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}