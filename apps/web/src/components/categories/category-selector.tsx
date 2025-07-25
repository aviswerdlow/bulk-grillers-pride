'use client';

import * as React from 'react';
import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown, FolderTree, Plus, Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Category } from '@/types/models';

interface CategorySelectorProps {
  organizationId: Id<'organizations'>;
  projectId: Id<'projects'>;
  selectedCategories: Id<'categories'>[];
  onChange: (categories: Id<'categories'>[]) => void;
  multiple?: boolean;
  placeholder?: string;
  className?: string;
}

export function CategorySelector({
  organizationId,
  projectId,
  selectedCategories,
  onChange,
  multiple = true,
  placeholder = 'Select categories...',
  className,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);

  // Get category tree
  const categoryTree = useQuery((api as any).functions.categories.categories.getCategoryTree, {
    organizationId,
    projectId,
  });

  // Get level definitions for friendly names
  const levelDefinitions = useQuery((api as any).functions.categories.categoryLevels.getCategoryLevels, {
    organizationId,
    projectId,
  });

  const flattenCategories = React.useCallback((categories: Category[]): Category[] => {
    const flattened: Category[] = [];

    const flatten = (cats: Category[], parentPath = '') => {
      cats.forEach((category) => {
        flattened.push(category);
        if (category.children) {
          flatten(category.children, `${parentPath}${category.name} > `);
        }
      });
    };

    flatten(categories);
    return flattened;
  }, []);

  // Get selected category details from the tree
  const selectedCategoryDetails = React.useMemo(() => {
    if (!categoryTree || selectedCategories.length === 0) return [];
    const allCats = flattenCategories(categoryTree);
    return allCats.filter((cat) => selectedCategories.includes(cat._id));
  }, [categoryTree, selectedCategories, flattenCategories]);

  if (!categoryTree || !levelDefinitions) {
    return (
      <div className={cn('flex items-center justify-center p-4 border rounded-md', className)}>
        <div className="text-muted-foreground">Loading categories...</div>
      </div>
    );
  }

  const allCategories = flattenCategories(categoryTree || []);

  const filteredCategories = allCategories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLevelName = (level: number) => {
    const levelDef = levelDefinitions?.find((l: any) => l.level === level);
    return levelDef?.name || `Level ${level}`;
  };

  const handleSelect = (categoryId: Id<'categories'>) => {
    if (multiple) {
      const newSelection = selectedCategories.includes(categoryId)
        ? selectedCategories.filter((id) => id !== categoryId)
        : [...selectedCategories, categoryId];
      onChange(newSelection);
    } else {
      onChange([categoryId]);
      setOpen(false);
    }
  };

  const removeCategory = (categoryId: Id<'categories'>) => {
    onChange(selectedCategories.filter((id) => id !== categoryId));
  };

  const getCategoryPath = (category: Category) => {
    return category.path.split('/').filter(Boolean).join(' > ');
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        <Label>Categories</Label>

        {/* Selected Categories Display */}
        {selectedCategories.length > 0 && selectedCategoryDetails.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20">
            {selectedCategoryDetails.map((category) => (
              <Badge key={category._id} variant="secondary" className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {getLevelName(category.level)}:
                </span>
                {category.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeCategory(category._id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Category Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                {selectedCategories.length === 0
                  ? placeholder
                  : `${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'} selected`}
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput
                placeholder="Search categories..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>No categories found.</CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-[300px]">
                    {filteredCategories.map((category) => (
                      <CommandItem
                        key={category._id}
                        value={category.name}
                        onSelect={() => handleSelect(category._id)}
                        className="flex items-center gap-2 p-2"
                      >
                        <Check
                          className={cn(
                            'h-4 w-4',
                            selectedCategories.includes(category._id) ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {getLevelName(category.level)}
                            </Badge>
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {getCategoryPath(category)}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
            <div className="border-t p-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAssignmentDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Advanced Assignment
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick Actions */}
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>
            {allCategories.length} categories available across{' '}
            {new Set(allCategories.map((c) => c.level)).size} levels
          </span>
        </div>
      </div>

      {/* Advanced Assignment Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Advanced Category Assignment
            </DialogTitle>
            <DialogDescription>
              Assign categories across different hierarchy levels for precise categorization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {levelDefinitions.map((levelDef: any) => {
              const levelCategories = allCategories.filter((c) => c.level === levelDef.level);
              const selectedInLevel = selectedCategories.filter(
                (id) => allCategories.find((c) => c._id === id)?.level === levelDef.level
              );

              return (
                <div key={levelDef.level} className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Badge variant="outline">{levelDef.friendlyName}</Badge>
                    <span className="text-xs text-muted-foreground">
                      ({levelCategories.length} available)
                    </span>
                  </Label>

                  <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                    {levelCategories.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        No categories at this level
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {levelCategories.map((category) => (
                          <div
                            key={category._id}
                            className="flex items-center gap-2 p-1 hover:bg-muted rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(category._id)}
                              onChange={() => handleSelect(category._id)}
                              className="rounded"
                            />
                            <span className="text-sm flex-1">{category.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {getCategoryPath(category)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedInLevel.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {selectedInLevel.length} selected in {levelDef.friendlyName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAssignmentDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
