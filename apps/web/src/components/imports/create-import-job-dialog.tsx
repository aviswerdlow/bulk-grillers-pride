'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Package, FolderTree, Tag } from 'lucide-react';
import { BaseDialogProps } from '@/types/ui';

// Import job form schema
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createImportJobSchema = z.object({
  importType: z.enum(['products', 'categories', 'variants']),
  duplicateHandling: z.enum(['skip', 'update', 'create']),
  hasHeaders: z.boolean(),
  delimiter: z.string(),
});

type CreateImportJobForm = z.infer<typeof createImportJobSchema>;

interface CreateImportJobDialogProps extends BaseDialogProps {
  organizationId: Id<'organizations'>;
  projectId: Id<'projects'>;
}

export function CreateImportJobDialog({
  open,
  onOpenChange,
  organizationId,
  projectId,
}: CreateImportJobDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Note: Using (api as any) as a workaround until Convex dev server regenerates the API types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createImportJob = useMutation((api as any).functions.imports.imports.createImportJob);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startProductImport = useMutation(
    (api as any).functions.imports.productImport.startProductImport
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateUploadUrl = useMutation((api as any).functions.imports.imports.generateUploadUrl);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completeFileUpload = useMutation((api as any).functions.imports.imports.completeFileUpload);

  const {
    register,
    handleSubmit,
    // formState: { errors }, // errors is available but not used in this form
    reset,
    setValue,
    watch,
  } = useForm<CreateImportJobForm>({
    defaultValues: {
      importType: 'products',
      duplicateHandling: 'skip',
      hasHeaders: true,
      delimiter: ',',
    },
  });

  const importType = watch('importType');

  const onSubmit = async (data: CreateImportJobForm) => {
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }

    try {
      setIsSubmitting(true);

      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': selectedFile.type },
        body: selectedFile,
      });

      const { storageId } = await result.json();

      // Step 3: Complete the upload and create file entry
      const uploadResult = await completeFileUpload({
        organizationId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        storageId,
      });

      // Step 4: Create import job
      if (data.importType === 'products') {
        // Use the product-specific import that has working scheduler
        await startProductImport({
          organizationId,
          projectId,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileStorageId: uploadResult.storageId,
          fieldMapping: {
            mappings: getDefaultFieldMapping(data.importType),
            options: {
              hasHeaders: data.hasHeaders,
              delimiter: data.delimiter,
              skipEmptyRows: true,
              duplicateHandling: data.duplicateHandling,
              createMissingCategories: false,
              defaultStatus: 'draft' as const,
            },
          },
        });
      } else {
        // Use generic import for other types
        await createImportJob({
          organizationId,
          projectId,
          importType: data.importType,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileStorageId: uploadResult.storageId,
          fieldMapping: {
            mappings: getDefaultFieldMapping(data.importType),
            options: {
              hasHeaders: data.hasHeaders,
              delimiter: data.delimiter,
              skipEmptyRows: true,
              duplicateHandling: data.duplicateHandling,
            },
          },
          validationRules: getDefaultValidationRules(data.importType),
        });
      }

      toast.success('Import job created successfully');
      reset();
      setSelectedFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create import job:', error);
      toast.error('Failed to create import job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
      setSelectedFile(null);
    }
    onOpenChange(open);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json',
      ];

      if (
        !allowedTypes.includes(file.type) &&
        !file.name.endsWith('.csv') &&
        !file.name.endsWith('.json')
      ) {
        toast.error('Please select a CSV, Excel, or JSON file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const getImportTypeIcon = (type: string) => {
    switch (type) {
      case 'products':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'categories':
        return <FolderTree className="h-5 w-5 text-green-600" />;
      case 'variants':
        return <Tag className="h-5 w-5 text-purple-600" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getImportTypeDescription = (type: string) => {
    switch (type) {
      case 'products':
        return 'Import product catalog with titles, descriptions, pricing, and basic information';
      case 'categories':
        return 'Import category hierarchy from JSON with level-based organization (Aisle → Product Type → Master Category → Category → Sub Category)';
      case 'variants':
        return 'Import product variants with SKUs, options, pricing, and inventory data';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </DialogTitle>
          <DialogDescription>
            Import products, categories, or variants from a CSV or Excel file.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Import Type Selection */}
          <div className="space-y-3">
            <Label>What would you like to import?</Label>
            <div className="grid grid-cols-1 gap-3">
              {['products', 'categories', 'variants'].map((type) => (
                <Card
                  key={type}
                  className={`cursor-pointer transition-colors ${
                    importType === type ? 'ring-2 ring-primary' : 'hover:bg-gray-50'
                  }`}
                  onClick={() =>
                    setValue('importType', type as 'products' | 'categories' | 'variants')
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {getImportTypeIcon(type)}
                      <div className="flex-1">
                        <div className="font-medium capitalize">{type}</div>
                        <div className="text-sm text-muted-foreground">
                          {getImportTypeDescription(type)}
                        </div>
                      </div>
                      <input
                        type="radio"
                        {...register('importType')}
                        value={type}
                        className="ml-auto"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <Label>Select File</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                {selectedFile ? (
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">
                      CSV, Excel, or JSON files up to 10MB
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Import Options */}
          <div className="space-y-4">
            <h3 className="font-medium">Import Options</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duplicate Handling</Label>
                <Select
                  value={watch('duplicateHandling')}
                  onValueChange={(value) =>
                    setValue('duplicateHandling', value as 'skip' | 'update' | 'create')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip duplicates</SelectItem>
                    <SelectItem value="update">Update existing</SelectItem>
                    <SelectItem value="create">Create new records</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>CSV Delimiter</Label>
                <Select
                  value={watch('delimiter')}
                  onValueChange={(value) => setValue('delimiter', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">, (Comma)</SelectItem>
                    <SelectItem value=";">; (Semicolon)</SelectItem>
                    <SelectItem value="\t">Tab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasHeaders"
                {...register('hasHeaders')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="hasHeaders">First row contains headers</Label>
            </div>
          </div>

          {/* Preview Info */}
          {selectedFile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Import Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>File:</span>
                  <span className="font-medium">{selectedFile.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Type:</span>
                  <span className="font-medium capitalize">{importType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Duplicate handling:</span>
                  <span className="font-medium">{watch('duplicateHandling')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Headers:</span>
                  <span className="font-medium">{watch('hasHeaders') ? 'Yes' : 'No'}</span>
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
            <Button type="submit" disabled={isSubmitting || !selectedFile}>
              {isSubmitting ? 'Starting Import...' : 'Start Import'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions for default mappings and validation rules
function getDefaultFieldMapping(importType: string) {
  switch (importType) {
    case 'products':
      // For products, map column names to product fields
      // This assumes the CSV has headers matching these column names
      return {
        Title: 'title',
        Description: 'description',
        Vendor: 'vendor',
        'Product Type': 'productType',
        Handle: 'handle',
        Tags: 'tags',
        Status: 'status',
        SKU: 'sku',
        Barcode: 'barcode',
        Price: 'price',
        'Compare At Price': 'compareAtPrice',
        Cost: 'cost',
        'Inventory Quantity': 'inventoryQuantity',
        Weight: 'weight',
        'Weight Unit': 'weightUnit',
        'Image URL': 'imageUrl',
      };
    case 'categories':
      return {
        category_id: 'category_id',
        name: 'name',
        level: 'level',
        created_at: 'created_at',
        updated_at: 'updated_at',
        levelNames: {
          1: 'Aisle',
          2: 'Product Type',
          3: 'Master Category',
          4: 'Category',
          5: 'Sub Category',
        },
      };
    case 'variants':
      return {
        sku: 0,
        productHandle: 1,
        price: 2,
        compareAtPrice: 3,
        inventoryQuantity: 4,
        options: 5,
      };
    default:
      return {};
  }
}

function getDefaultValidationRules(importType: string) {
  switch (importType) {
    case 'products':
      return [
        { field: 'title', type: 'string', required: true, minLength: 1, maxLength: 255 },
        { field: 'handle', type: 'string', required: false, pattern: '^[a-z0-9-]+$' },
        { field: 'vendor', type: 'string', required: false, maxLength: 100 },
      ];
    case 'categories':
      return [
        { field: 'category_id', type: 'string', required: true, minLength: 1 },
        { field: 'name', type: 'string', required: true, minLength: 1, maxLength: 100 },
        { field: 'level', type: 'number', required: true },
      ];
    case 'variants':
      return [
        { field: 'sku', type: 'string', required: true, minLength: 1 },
        { field: 'price', type: 'number', required: true },
        { field: 'inventoryQuantity', type: 'number', required: false },
      ];
    default:
      return [];
  }
}
