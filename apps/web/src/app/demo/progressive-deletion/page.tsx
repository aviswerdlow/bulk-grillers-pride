/**
 * Progressive Deletion Demo Page
 * Demonstrates the three-layer progressive enhancement architecture
 */

'use client';

import { useState } from 'react';
import { ProgressiveDeletion } from '@/components/deletion/progressive/ProgressiveDeletion';
import { PerformanceMonitor } from '@/components/deletion/progressive/PerformanceMonitor';
import { Product } from '@/types/models';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Smartphone, Zap, Sparkles } from 'lucide-react';

// Mock products for demo
const mockProducts: Product[] = [
  {
    _id: 'prod1',
    title: 'Grilled Burger Deluxe',
    handle: 'grilled-burger-deluxe',
    description: 'Premium beef burger with special sauce',
    vendor: 'Bulk Grillers',
    productType: 'Burgers',
    status: 'active',
    image: '',
    tags: ['beef', 'premium'],
    categories: [],
    sku: 'BGR-001',
    price: 12.99,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'prod2',
    title: 'BBQ Chicken Wings',
    handle: 'bbq-chicken-wings',
    description: 'Smoky BBQ glazed chicken wings',
    vendor: 'Bulk Grillers',
    productType: 'Wings',
    status: 'active',
    image: '',
    tags: ['chicken', 'bbq'],
    categories: [],
    sku: 'WNG-002',
    price: 9.99,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'prod3',
    title: 'Veggie Skewers',
    handle: 'veggie-skewers',
    description: 'Grilled vegetable skewers',
    vendor: 'Bulk Grillers',
    productType: 'Vegetarian',
    status: 'active',
    image: '',
    tags: ['vegetarian', 'healthy'],
    categories: [],
    sku: 'VEG-003',
    price: 7.99,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export default function ProgressiveDeletionDemo() {
  const [deletedItems, setDeletedItems] = useState<string[]>([]);
  
  const handleDelete = async (itemIds: string[], reason?: string) => {
    // Simulate deletion
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setDeletedItems(prev => [...prev, ...itemIds]);
    toast.success(
      `Successfully deleted ${itemIds.length} items${reason ? ` (Reason: ${reason})` : ''}`
    );
  };
  
  const handleCancel = () => {
    toast.info('Deletion cancelled');
  };
  
  const availableProducts = mockProducts.filter(
    p => !deletedItems.includes(p._id)
  );
  
  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Progressive Deletion Demo</h1>
        <p className="text-muted-foreground">
          Experience our three-layer progressive enhancement architecture
        </p>
      </div>
      
      {/* Performance Budget Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Core Layer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary">&lt; 50KB</Badge>
              <p className="text-sm text-muted-foreground">
                Works without JavaScript. Basic HTML forms with server-side processing.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Enhanced Layer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary">&lt; 100KB total</Badge>
              <p className="text-sm text-muted-foreground">
                Progressive form enhancement with touch support and validation.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Optimal Layer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary">&lt; 150KB total</Badge>
              <p className="text-sm text-muted-foreground">
                Full wizard experience with visualizations and animations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          The appropriate layer is automatically selected based on your device capabilities,
          network conditions, and user preferences. You can manually switch layers for testing.
        </AlertDescription>
      </Alert>
      
      {/* Demo Tabs */}
      <Tabs defaultValue="auto" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-lg mx-auto">
          <TabsTrigger value="auto">Auto</TabsTrigger>
          <TabsTrigger value="core">Core</TabsTrigger>
          <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
          <TabsTrigger value="optimal">Optimal</TabsTrigger>
        </TabsList>
        
        <TabsContent value="auto" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Automatic Layer Selection</CardTitle>
              <CardDescription>
                Layer selected based on your device: memory, connection, and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableProducts.length > 0 ? (
                <ProgressiveDeletion
                  items={availableProducts}
                  onDelete={handleDelete}
                  onCancel={handleCancel}
                  showLayerSelector
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  All items have been deleted. Refresh the page to reset.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="core" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Layer Demo</CardTitle>
              <CardDescription>
                No JavaScript required - works on any device
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableProducts.length > 0 ? (
                <ProgressiveDeletion
                  items={availableProducts}
                  onDelete={handleDelete}
                  onCancel={handleCancel}
                  forceLayer="core"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  All items have been deleted. Refresh the page to reset.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="enhanced" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Layer Demo</CardTitle>
              <CardDescription>
                Progressive enhancement with touch support
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableProducts.length > 0 ? (
                <ProgressiveDeletion
                  items={availableProducts}
                  onDelete={handleDelete}
                  onCancel={handleCancel}
                  forceLayer="enhanced"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  All items have been deleted. Refresh the page to reset.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="optimal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimal Layer Demo</CardTitle>
              <CardDescription>
                Full experience with wizard and visualizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableProducts.length > 0 ? (
                <ProgressiveDeletion
                  items={availableProducts}
                  onDelete={handleDelete}
                  onCancel={handleCancel}
                  forceLayer="optimal"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  All items have been deleted. Refresh the page to reset.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Performance Metrics */}
      <PerformanceMonitor />
    </div>
  );
}