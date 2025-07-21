'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Info,
  Link,
  Package,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/types/models';
import { Id } from '@convex/_generated/dataModel';

interface DeleteProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product | Product[];
  onDelete?: (productIds: string[], permanentDelete: boolean) => Promise<void>;
}

type DeletionStep = 'consequences' | 'options' | 'confirm';
type DeletionType = 'soft' | 'permanent';

interface ConsequenceCheck {
  id: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  icon: React.ReactNode;
}

export function DeleteProductDialog({
  open,
  onOpenChange,
  products,
  onDelete,
}: DeleteProductDialogProps) {
  const [currentStep, setCurrentStep] = useState<DeletionStep>('consequences');
  const [deletionType, setDeletionType] = useState<DeletionType>('soft');
  const [acknowledgedConsequences, setAcknowledgedConsequences] = useState<Set<string>>(new Set());
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const productArray = Array.isArray(products) ? products : [products];
  const isBulkDelete = productArray.length > 1;

  // Calculate consequences based on product data
  const consequences: ConsequenceCheck[] = [
    {
      id: 'categories',
      label: 'Category Assignments',
      severity: 'low',
      description: `${productArray.length} product(s) will be removed from their categories`,
      icon: <Info className="h-4 w-4" />,
    },
    {
      id: 'references',
      label: 'Product References',
      severity: 'medium',
      description: 'Any links or references to these products will become broken',
      icon: <Link className="h-4 w-4" />,
    },
    {
      id: 'analytics',
      label: 'Analytics Data',
      severity: 'low',
      description: 'Historical analytics data will be retained but marked as deleted',
      icon: <CheckCircle className="h-4 w-4" />,
    },
  ];

  if (deletionType === 'permanent') {
    consequences.push({
      id: 'permanent',
      label: 'Permanent Deletion',
      severity: 'high',
      description: 'This action cannot be undone. All data will be permanently removed.',
      icon: <ShieldAlert className="h-4 w-4" />,
    });
  }

  const allConsequencesAcknowledged = consequences.every((c) =>
    acknowledgedConsequences.has(c.id)
  );

  const confirmationRequired = isBulkDelete || deletionType === 'permanent';
  const expectedConfirmation = deletionType === 'permanent' ? 'DELETE PERMANENTLY' : 'DELETE';
  const isConfirmationValid = confirmationText === expectedConfirmation;

  const canProceed = () => {
    switch (currentStep) {
      case 'consequences':
        return allConsequencesAcknowledged;
      case 'options':
        return true;
      case 'confirm':
        return !confirmationRequired || isConfirmationValid;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 'consequences') {
      setCurrentStep('options');
    } else if (currentStep === 'options') {
      setCurrentStep('confirm');
    }
  };

  const handleBack = () => {
    if (currentStep === 'options') {
      setCurrentStep('consequences');
    } else if (currentStep === 'confirm') {
      setCurrentStep('options');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const productIds = productArray.map((p) => p._id);
      
      if (onDelete) {
        await onDelete(productIds, deletionType === 'permanent');
      } else {
        // Simulate deletion
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      toast.success(
        `Successfully ${deletionType === 'permanent' ? 'permanently deleted' : 'deleted'} ${
          productArray.length
        } product(s)`
      );
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to delete products. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'consequences':
        return 33;
      case 'options':
        return 66;
      case 'confirm':
        return 100;
      default:
        return 0;
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return 'text-blue-500';
      case 'medium':
        return 'text-yellow-500';
      case 'high':
        return 'text-red-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete {isBulkDelete ? `${productArray.length} Products` : 'Product'}
          </DialogTitle>
          <DialogDescription>
            Follow the steps below to delete {isBulkDelete ? 'these products' : 'this product'}.
          </DialogDescription>
        </DialogHeader>

        <Progress value={getStepProgress()} className="mb-6" />

        <Tabs value={currentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="consequences" disabled>
              1. Review Consequences
            </TabsTrigger>
            <TabsTrigger value="options" disabled>
              2. Deletion Options
            </TabsTrigger>
            <TabsTrigger value="confirm" disabled>
              3. Confirm
            </TabsTrigger>
          </TabsList>

          <TabsContent value="consequences" className="space-y-4 mt-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important Consequences</AlertTitle>
              <AlertDescription>
                Please review and acknowledge all consequences before proceeding.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {consequences.map((consequence) => (
                <div
                  key={consequence.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <Checkbox
                    id={consequence.id}
                    checked={acknowledgedConsequences.has(consequence.id)}
                    onCheckedChange={(checked) => {
                      const newAcknowledged = new Set(acknowledgedConsequences);
                      if (checked) {
                        newAcknowledged.add(consequence.id);
                      } else {
                        newAcknowledged.delete(consequence.id);
                      }
                      setAcknowledgedConsequences(newAcknowledged);
                    }}
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={consequence.id}
                      className="flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <span className={getSeverityColor(consequence.severity)}>
                        {consequence.icon}
                      </span>
                      {consequence.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{consequence.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="options" className="space-y-4 mt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Choose Deletion Type</AlertTitle>
              <AlertDescription>
                Select how you want to handle the deletion of{' '}
                {isBulkDelete ? 'these products' : 'this product'}.
              </AlertDescription>
            </Alert>

            <RadioGroup value={deletionType} onValueChange={(value) => setDeletionType(value as DeletionType)}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <RadioGroupItem value="soft" id="soft-delete" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="soft-delete" className="flex items-center gap-2 cursor-pointer">
                      <Package className="h-4 w-4 text-blue-500" />
                      Move to Trash (Recommended)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Products will be moved to trash and can be restored within 30 days.
                      They will be hidden from your catalog immediately.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg border-destructive/50">
                  <RadioGroupItem value="permanent" id="permanent-delete" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="permanent-delete" className="flex items-center gap-2 cursor-pointer">
                      <Ban className="h-4 w-4 text-destructive" />
                      Delete Permanently
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Products will be permanently deleted immediately. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </TabsContent>

          <TabsContent value="confirm" className="space-y-4 mt-6">
            {deletionType === 'permanent' ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Permanent Deletion Warning</AlertTitle>
                <AlertDescription>
                  You are about to permanently delete {productArray.length} product(s).
                  This action cannot be undone.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Moving to Trash</AlertTitle>
                <AlertDescription>
                  {productArray.length} product(s) will be moved to trash and can be restored
                  within 30 days.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Products to Delete:</h4>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {productArray.map((product) => (
                    <li key={product._id} className="text-sm flex items-center gap-2">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      {product.title} ({product.sku || 'No SKU'})
                    </li>
                  ))}
                </ul>
              </div>

              {confirmationRequired && (
                <div className="space-y-2">
                  <Label htmlFor="confirmation">
                    Type <span className="font-mono font-bold">{expectedConfirmation}</span> to confirm:
                  </Label>
                  <input
                    id="confirmation"
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder={expectedConfirmation}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {currentStep !== 'consequences' && (
              <Button variant="outline" onClick={handleBack} disabled={isDeleting}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
              Cancel
            </Button>
            {currentStep === 'confirm' ? (
              <Button
                variant={deletionType === 'permanent' ? 'destructive' : 'default'}
                onClick={handleDelete}
                disabled={!canProceed() || isDeleting}
              >
                {isDeleting ? 'Deleting...' : `${deletionType === 'permanent' ? 'Delete Permanently' : 'Move to Trash'}`}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}