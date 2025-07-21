'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Package,
  Clock,
  AlertTriangle,
  Info,
  MoreHorizontal,
  CheckSquare,
  Square,
  Archive,
  UserX,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SkuCopyButton } from '@/components/ui/sku-copy-button';
import { Loading } from '@/components/loading';
import { Product } from '@/types/models';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface TrashItem extends Product {
  deletedAt: number;
  deletedBy: string;
  deleteReason?: string;
  permanentDeleteAt: number;
}

export default function TrashPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'products' | 'all'>('products');

  // Get organization
  const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  // Mock data for trash items - will be replaced with actual query
  const trashItems: TrashItem[] = [
    {
      _id: 'trash1' as Id<'products'>,
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now() - 86400000 * 5,
      title: 'Deleted Product 1',
      handle: 'deleted-product-1',
      description: 'This product was deleted',
      vendor: 'Test Vendor',
      productType: 'Test Type',
      status: 'archived',
      image: '',
      tags: [],
      categories: [],
      sku: 'DEL-001',
      price: 29.99,
      deletedAt: Date.now() - 86400000 * 2,
      deletedBy: 'user@example.com',
      deleteReason: 'Product discontinued',
      permanentDeleteAt: Date.now() + 86400000 * 28,
    },
    {
      _id: 'trash2' as Id<'products'>,
      createdAt: Date.now() - 86400000 * 10,
      updatedAt: Date.now() - 86400000 * 10,
      title: 'Deleted Product 2',
      handle: 'deleted-product-2',
      description: 'Another deleted product',
      vendor: 'Another Vendor',
      productType: 'Another Type',
      status: 'archived',
      image: '',
      tags: [],
      categories: [],
      sku: 'DEL-002',
      price: 49.99,
      deletedAt: Date.now() - 86400000 * 7,
      deletedBy: 'admin@example.com',
      permanentDeleteAt: Date.now() + 86400000 * 23,
    },
  ];

  // TODO: Replace with actual mutations when backend implements them
  const restoreProducts = useMutation(api.functions.products.products.createProduct);
  const permanentlyDeleteProducts = useMutation(api.functions.products.products.createProduct);

  if (organization === undefined) {
    return <Loading size="lg" text="Loading trash..." />;
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    );
  }

  // Filter items based on search term
  const filteredItems = trashItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.vendor && item.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item._id)));
    }
  };

  const handleSelectItem = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleBulkRestore = async () => {
    // TODO: Implement bulk restore
    toast.success(`Restored ${selectedItems.size} items`);
    setSelectedItems(new Set());
  };

  const handleBulkDelete = async () => {
    // TODO: Implement bulk permanent delete
    toast.error('Permanent delete functionality not yet implemented');
    setSelectedItems(new Set());
  };

  const getDaysUntilDeletion = (permanentDeleteAt: number) => {
    const daysRemaining = Math.ceil((permanentDeleteAt - Date.now()) / (1000 * 60 * 60 * 24));
    return daysRemaining;
  };

  const selectedCount = selectedItems.size;
  const hasSelection = selectedCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Trash</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage deleted items and restore them within 30 days
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Automatic Deletion</AlertTitle>
        <AlertDescription>
          Items in trash are permanently deleted after 30 days. You can restore them before this time.
        </AlertDescription>
      </Alert>

      {/* Selection Bar */}
      {hasSelection && (
        <Card className="border-primary">
          <CardHeader className="py-3 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-4">
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  {selectedCount} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItems(new Set())}
                  className="text-xs sm:text-sm"
                >
                  Clear selection
                </Button>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button onClick={handleBulkRestore} variant="default" size="sm" className="flex-1 sm:flex-none">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Restore</span>
                  <span className="sm:hidden">Restore</span>
                </Button>
                <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="flex-1 sm:flex-none">
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Delete Permanently</span>
                  <span className="sm:hidden">Delete</span>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trashItems.length}</div>
            <p className="text-xs text-muted-foreground">
              In trash
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trashItems.filter(item => getDaysUntilDeletion(item.permanentDeleteAt) < 7).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Within 7 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trashItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Deleted products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.1 GB</div>
            <p className="text-xs text-muted-foreground">
              Recoverable space
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'products' | 'all')}>
        <TabsList className="mb-4">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="all">All Items</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader className="px-3 sm:px-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search deleted items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="products">Products</SelectItem>
                    <SelectItem value="categories">Categories</SelectItem>
                    <SelectItem value="images">Images</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchTerm ? 'No items found' : 'Trash is empty'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? 'Try adjusting your search'
                      : 'Deleted items will appear here'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead className="hidden md:table-cell">Deleted By</TableHead>
                      <TableHead className="hidden sm:table-cell">Deleted</TableHead>
                      <TableHead>Auto-Delete In</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const daysRemaining = getDaysUntilDeletion(item.permanentDeleteAt);
                      const isExpiringSoon = daysRemaining < 7;
                      
                      return (
                        <TableRow key={item._id} className={selectedItems.has(item._id) ? 'bg-muted/50' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.has(item._id)}
                              onCheckedChange={() => handleSelectItem(item._id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Package className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{item.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {item.sku && (
                                    <span className="font-mono">{item.sku}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline">Product</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <UserX className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{item.deletedBy}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {formatDistanceToNow(item.deletedAt, { addSuffix: true })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={isExpiringSoon ? 'destructive' : 'secondary'}
                              className="gap-1"
                            >
                              {isExpiringSoon && <AlertTriangle className="h-3 w-3" />}
                              {daysRemaining} days
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  // TODO: Implement restore
                                  toast.success(`Restored "${item.title}"`);
                                }}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Restore
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Info className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    // TODO: Implement permanent delete
                                    toast.error('Permanent delete not yet implemented');
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}