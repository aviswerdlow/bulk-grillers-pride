'use client';

import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Search,
  Filter,
  Download,
  Upload,
  Archive,
  Trash2,
  Edit,
  Eye,
  MoreHorizontal,
//   CheckSquare,
//   Square,
  Package,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import { SkuCopyButton } from '@/components/ui/sku-copy-button';
import { CreateProductDialog } from '@/components/products/create-product-dialog';
import { EditProductDialog } from '@/components/products/edit-product-dialog';
import { DeleteProductDialog } from '@/components/products/delete-product-dialog';
import { Loading } from '@/components/loading';
import { toast } from 'sonner';
import Link from 'next/link';
import { Doc } from '@convex/_generated/dataModel';

type BulkAction = 'archive' | 'delete' | 'activate' | 'deactivate' | 'export';

export default function ManageProductsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Doc<'products'> | null>(null);
  const [bulkAction, setBulkAction] = useState<BulkAction | ''>('');
  const [productsToDelete, setProductsToDelete] = useState<Doc<'products'>[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const [selectAllMode, setSelectAllMode] = useState(false); // Track if all products are selected

  // Get organization
  const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  // Get projects for this organization
  const projects = useQuery(
    api.functions.projects.projects.getOrganizationProjects,
    organization ? { organizationId: organization._id } : 'skip'
  );

  // Use first project for now
  const currentProject = projects?.[0];

  // Get dashboard stats for total counts
  const dashboardStats = useQuery(
    api.functions.dashboard.dashboard.getDashboardStats,
    organization ? { organizationId: organization._id } : 'skip'
  );

  // Get products for the current project with pagination
  const productsResult = useQuery(
    api.functions.products.products.getProjectProducts,
    currentProject
      ? {
          organizationId: organization._id,
          projectId: currentProject._id,
          status:
            statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'draft' | 'archived'),
          limit: 50,
          cursor: currentCursor,
        }
      : 'skip'
  );

  // TODO: Replace with actual mutations when backend implements them
  // const _archiveProducts = useMutation((api as any).functions.products.products.createProduct);
  // const _deleteProducts = useMutation((api as any).functions.products.products.createProduct);

  if (organization === undefined || projects === undefined || dashboardStats === undefined) {
    return <Loading size="lg" text="Loading products..." />;
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] flex-col gap-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Projects Found</h3>
          <p className="text-muted-foreground">Create a project first to manage products</p>
        </div>
      </div>
    );
  }

  const products = productsResult?.page || [];
  const isLoading = productsResult === undefined;
  const hasNextPage = productsResult?.continueCursor !== null;
  const hasPreviousPage = pageHistory.length > 0;

  // Pagination handlers
  const goToNextPage = () => {
    if (productsResult?.continueCursor) {
      setPageHistory([...pageHistory, currentCursor || '']);
      setCurrentCursor(productsResult.continueCursor);
      setSelectedProducts(new Set()); // Clear selection when changing pages
      setSelectAllMode(false); // Reset select all mode
    }
  };

  const goToPreviousPage = () => {
    if (pageHistory.length > 0) {
      const newHistory = [...pageHistory];
      const previousCursor = newHistory.pop();
      setPageHistory(newHistory);
      setCurrentCursor(previousCursor || undefined);
      setSelectedProducts(new Set()); // Clear selection when changing pages
      setSelectAllMode(false); // Reset select all mode
    }
  };

  const goToFirstPage = () => {
    setCurrentCursor(undefined);
    setPageHistory([]);
    setSelectedProducts(new Set()); // Clear selection when changing pages
    setSelectAllMode(false); // Reset select all mode
  };

  // Filter products based on search term
  const filteredProducts = products.filter(
    (product: Doc<'products'>) =>
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.vendor && product.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.productType && product.productType.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleSelectAll = () => {
    if (selectAllMode) {
      // If all products were selected, deselect all
      setSelectAllMode(false);
      setSelectedProducts(new Set());
    } else if (selectedProducts.size === filteredProducts.length && filteredProducts.length > 0) {
      // If all products on current page are selected, deselect all
      setSelectedProducts(new Set());
    } else {
      // Select all products on current page
      setSelectedProducts(new Set(filteredProducts.map((p: Doc<'products'>) => p._id)));
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || (!selectAllMode && selectedProducts.size === 0)) return;

    const count = selectAllMode ? totalProducts : selectedProducts.size;

    switch (bulkAction) {
      case 'archive':
        // TODO: Implement bulk archive
        if (selectAllMode) {
          toast.success(`Archiving all ${count} products...`);
          // Would need to implement backend mutation for all products
        } else {
          toast.success(`Archived ${count} products`);
        }
        setSelectedProducts(new Set());
        setSelectAllMode(false);
        setBulkAction('');
        break;
      case 'delete':
        if (selectAllMode) {
          // For select all mode, we'd need to implement a different flow
          toast.warning('Delete all products requires additional confirmation. Please use the filter and delete in batches.');
          setBulkAction('');
        } else {
          // Show delete dialog for selected products
          const selectedProductsList = filteredProducts.filter((p: Doc<'products'>) => selectedProducts.has(p._id));
          setProductsToDelete(selectedProductsList);
          setShowDeleteDialog(true);
        }
        break;
      case 'activate':
        // TODO: Implement bulk activate
        if (selectAllMode) {
          toast.success(`Activating all ${count} products...`);
        } else {
          toast.success(`Activated ${count} products`);
        }
        setSelectedProducts(new Set());
        setSelectAllMode(false);
        setBulkAction('');
        break;
      case 'deactivate':
        // TODO: Implement bulk deactivate  
        if (selectAllMode) {
          toast.success(`Deactivating all ${count} products...`);
        } else {
          toast.success(`Deactivated ${count} products`);
        }
        setSelectedProducts(new Set());
        setSelectAllMode(false);
        setBulkAction('');
        break;
      case 'export':
        // TODO: Implement export functionality
        if (selectAllMode) {
          toast.info(`Exporting all ${count} products...`);
        } else {
          toast.info('Export functionality coming soon');
        }
        setSelectedProducts(new Set());
        setSelectAllMode(false);
        setBulkAction('');
        break;
    }
  };

  const handleDeleteProducts = async (productIds: string[], permanentDelete: boolean) => {
    // TODO: Implement actual delete mutation when backend is ready
    // For now, just acknowledge the parameters
    void productIds;
    void permanentDelete;
    
    // Clear selection after deletion
    setSelectedProducts(new Set());
    setBulkAction('');
    setShowDeleteDialog(false);
    setProductsToDelete([]);
  };

  const totalProducts = dashboardStats?.productsCount || 0;
  const selectedCount = selectAllMode ? totalProducts : selectedProducts.size;
  const hasSelection = selectedCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link href={`/${orgSlug}/products`}>
            <Button variant="ghost" size="sm" className="mb-2 sm:mb-0">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Products</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Manage Products</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Bulk actions and advanced product management
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
          <Upload className="h-4 w-4 mr-2" />
          Import Products
        </Button>
      </div>

      {/* Selection Bar */}
      {hasSelection && (
        <Card className="border-primary">
          <CardHeader className="py-3 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-4">
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  {selectedCount} selected
                </Badge>
                {!selectAllMode && selectedProducts.size === filteredProducts.length && totalProducts > 50 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSelectAllMode(true)}
                    className="text-xs sm:text-sm text-primary"
                  >
                    Select all {totalProducts} products
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedProducts(new Set());
                    setSelectAllMode(false);
                  }}
                  className="text-xs sm:text-sm"
                >
                  Clear selection
                </Button>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={bulkAction} onValueChange={(value) => setBulkAction(value as BulkAction)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Choose action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activate">Activate</SelectItem>
                    <SelectItem value="deactivate">Deactivate</SelectItem>
                    <SelectItem value="archive">Archive</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                    <SelectItem value="delete" className="text-destructive">
                      <span className="flex items-center">
                        <ShieldAlert className="h-4 w-4 mr-2" />
                        Delete
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  variant={bulkAction === 'delete' ? 'destructive' : 'default'}
                  size="sm"
                  className="min-w-[80px]"
                >
                  Apply
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
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats?.productsCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.productsByStatus?.active || 0} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Badge variant="secondary" className="h-4 text-xs">
              ●
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats?.productsByStatus?.draft || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(dashboardStats?.productsCount || 0) - 
               (dashboardStats?.productsByStatus?.active || 0) - 
               (dashboardStats?.productsByStatus?.draft || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Hidden from catalog
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 GB</div>
            <p className="text-xs text-muted-foreground">
              Used of 10 GB
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader className="px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // Reset pagination and selection when searching
                  setCurrentCursor(undefined);
                  setPageHistory([]);
                  setSelectedProducts(new Set());
                  setSelectAllMode(false);
                }}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                // Reset pagination and selection when changing filter
                setCurrentCursor(undefined);
                setPageHistory([]);
                setSelectedProducts(new Set());
                setSelectAllMode(false);
              }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="hidden sm:flex">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
              <Button variant="outline" size="icon" className="sm:hidden">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loading size="md" text="Loading products..." />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No products found' : 'No products yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Import products to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectAllMode || (selectedProducts.size === filteredProducts.length && filteredProducts.length > 0)}
                      indeterminate={!selectAllMode && selectedProducts.size > 0 && selectedProducts.size < filteredProducts.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Vendor</TableHead>
                  <TableHead className="hidden lg:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Stock</TableHead>
                  <TableHead className="hidden md:table-cell">Updated</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product: Doc<'products'>) => (
                  <TableRow key={product._id} className={selectedProducts.has(product._id) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(product._id)}
                        onCheckedChange={() => handleSelectProduct(product._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.images?.[0] && (
                          <div className="relative h-10 w-10">
                            <Image
                              src={product.images[0].url}
                              alt={product.images[0].alt || product.title}
                              fill
                              className="rounded object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{product.title}</div>
                          <div className="text-sm text-muted-foreground">{product.handle}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {product.sku ? (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-mono text-sm">{product.sku}</span>
                          <SkuCopyButton sku={product.sku} variant="icon" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(product.status)}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{product.vendor || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {product.productType || '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      —
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {new Date(product.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setProductsToDelete([product]);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {(dashboardStats?.productsCount || 0) > 50 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t gap-4">
              <div className="text-sm text-muted-foreground order-2 sm:order-1">
                Showing {Math.min(products.length, 50)} of {dashboardStats?.productsCount || 0} products
              </div>
              
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToFirstPage}
                  disabled={!hasPreviousPage}
                  className="hidden sm:flex"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={!hasPreviousPage}
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                
                <div className="px-3 py-1 text-sm font-medium bg-muted rounded-md">
                  Page {pageHistory.length + 1} of {Math.ceil((dashboardStats?.productsCount || 0) / 50)}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={!hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {currentProject && (
        <CreateProductDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          organizationId={organization._id}
          projectId={currentProject._id}
        />
      )}

      {editingProduct && (
        <EditProductDialog
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          product={editingProduct}
        />
      )}

      {showDeleteDialog && productsToDelete.length > 0 && (
        <DeleteProductDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          products={productsToDelete}
          onDelete={handleDeleteProducts}
        />
      )}
    </div>
  );
}