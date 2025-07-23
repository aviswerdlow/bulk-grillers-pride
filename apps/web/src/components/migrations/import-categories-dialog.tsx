"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, AlertTriangle } from "lucide-react";

interface ImportCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organizations">;
  projectId: Id<"projects">;
}

export function ImportCategoriesDialog({
  open,
  onOpenChange,
  organizationId,
  projectId,
}: ImportCategoriesDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jsonData, setJsonData] = useState("");
  const [previewData, setPreviewData] = useState<Array<{ category_id: string; name: string; level: number }>>([]);

  const importCategories = useMutation((api as any).functions.migrations.importCategories.importLegacyCategories);
  const categoryLevels = useQuery(
    (api as any).functions.categories.categoryLevels.getCategoryLevels,
    { organizationId, projectId }
  );

  const handleJsonChange = (value: string) => {
    setJsonData(value);
    
    try {
      if (value.trim()) {
        const parsed = JSON.parse(value) as unknown;
        const categories = Array.isArray(parsed) ? parsed : [parsed];
        setPreviewData(categories.slice(0, 5)); // Show first 5 for preview
      } else {
        setPreviewData([]);
      }
    } catch {
      setPreviewData([]);
    }
  };

  const onSubmit = async () => {
    if (!jsonData.trim()) {
      toast.error("Please enter category data");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const result = await importCategories({
        organizationId,
        projectId,
        categoriesData: jsonData,
      });

      toast.success(`Successfully imported ${result.importedCount} out of ${result.totalCount} categories`);
      setJsonData("");
      setPreviewData([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to import categories:", error);
      toast.error("Failed to import categories. Please check your data format.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setJsonData("");
      setPreviewData([]);
    }
    onOpenChange(open);
  };

  const sampleData = `[
  {
    "category_id": "ab7f0d3c-2228-46be-899b-2995303accb8",
    "name": "75/25",
    "level": 4,
    "created_at": "2025-05-03T17:51:12.779947+00:00",
    "updated_at": "2025-05-03T17:51:12.779947+00:00"
  },
  {
    "category_id": "e7403fc4-14ea-4242-8796-f9cab1e05bc1",
    "name": "Beef",
    "level": 2,
    "created_at": "2025-05-03T17:51:12.779947+00:00",
    "updated_at": "2025-05-03T17:51:12.779947+00:00"
  }
]`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Legacy Categories
          </DialogTitle>
          <DialogDescription>
            Import your existing category hierarchy from your legacy system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Data Format
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Paste your category data as JSON. Each category should have:
              </div>
              <ul className="text-xs space-y-1 text-muted-foreground ml-4">
                <li>• <code>category_id</code> - Unique identifier</li>
                <li>• <code>name</code> - Category name</li>
                <li>• <code>level</code> - Hierarchy level (1 = top level)</li>
              </ul>
              
              {categoryLevels && categoryLevels.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Your Level Definitions:</div>
                  <div className="space-y-1">
                    {categoryLevels.map((levelDef: any) => (
                      <div key={levelDef._id} className="text-xs flex items-center gap-2">
                        <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                          {levelDef.level + 1}
                        </span>
                        <span className="font-medium">{levelDef.friendlyName}</span>
                        {levelDef.description && (
                          <span className="text-muted-foreground">- {levelDef.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Show example format
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
{sampleData}
                </pre>
              </details>
            </CardContent>
          </Card>

          {/* JSON Input */}
          <div className="space-y-3">
            <Label htmlFor="json-data">Category Data (JSON)</Label>
            <Textarea
              id="json-data"
              value={jsonData}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder="Paste your category JSON data here..."
              rows={12}
              className="font-mono text-xs"
            />
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview (first 5 categories)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {previewData.map((cat, index) => {
                    const levelDef = categoryLevels?.find((l: any) => l.level === (cat.level - 1));
                    const levelName = levelDef?.friendlyName || `Level ${cat.level}`;
                    
                    return (
                      <div key={index} className="flex items-center gap-3 text-sm p-2 bg-muted rounded">
                        <div className="flex flex-col items-center text-xs text-muted-foreground min-w-16">
                          <span>L{cat.level}</span>
                          <span className="text-xs font-medium">{levelName}</span>
                        </div>
                        <div className="font-medium">{cat.name}</div>
                        <div className="text-xs text-muted-foreground ml-auto">
                          ID: {cat.category_id?.slice(0, 8)}...
                        </div>
                      </div>
                    );
                  })}
                  {JSON.parse(jsonData || "[]").length > 5 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      ... and {JSON.parse(jsonData).length - 5} more categories
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-medium text-orange-800">Important Notes</div>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• This will create new categories using your project&apos;s level definitions</li>
                    <li>• Parent-child relationships will be inferred based on naming patterns</li>
                    <li>• Categories with duplicate names will get unique handles</li>
                    <li>• Default level definitions will be created if none exist</li>
                    <li>• This process cannot be easily undone</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
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
          <Button 
            onClick={onSubmit}
            disabled={isSubmitting || !jsonData.trim()}
          >
            {isSubmitting ? "Importing..." : `Import Categories`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}