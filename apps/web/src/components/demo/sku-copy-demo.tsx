'use client';

import { SkuCopyButton } from '@/components/ui/sku-copy-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Demo component to showcase the SKU copy feature
export function SkuCopyDemo() {
  const demoProducts = [
    { id: 1, title: 'Premium Grill', sku: 'PRM-GRL-001' },
    { id: 2, title: 'BBQ Sauce Set', sku: 'BBQ-SAS-042' },
    { id: 3, title: 'Smoking Wood Chips', sku: 'WOD-CHP-789' },
  ];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>SKU Copy Feature Demo</CardTitle>
        <CardDescription>
          Click the copy icon next to any SKU to copy it to your clipboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            The SKU copy feature has been added to:
            <ul className="list-disc list-inside mt-2">
              <li>Product cards in grid view</li>
              <li>Product table in list view</li>
            </ul>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">Example SKUs:</h3>
            <div className="space-y-2">
              {demoProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{product.title}</span>
                    <span className="text-muted-foreground ml-2">
                      SKU: <span className="font-mono">{product.sku}</span>
                    </span>
                  </div>
                  <SkuCopyButton sku={product.sku} variant="icon" />
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">Button Variant:</h3>
            <div className="flex items-center gap-4">
              <SkuCopyButton sku="DEMO-SKU-123" variant="button" />
              <span className="text-sm text-muted-foreground">
                Alternative button style for more prominent display
              </span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <strong>Features:</strong>
            <ul className="list-disc list-inside mt-1">
              <li>Toast notification on successful copy</li>
              <li>Visual feedback with check icon</li>
              <li>Accessible with proper ARIA labels</li>
              <li>Handles clipboard API errors gracefully</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}