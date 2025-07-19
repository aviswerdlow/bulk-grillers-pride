'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../../../convex/_generated/api';
import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
  CheckSquare,
  Square,
  Package,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import { SkuCopyButton } from '@/components/ui/sku-copy-button';
import { CreateProductDialog } from '@/components/products/create-product-dialog';
import { EditProductDialog } from '@/components/products/edit-product-dialog';
import { DeleteProductDialog } from '@/components/products/delete-product-dialog';
import { Loading } from '@/components/loading';
import { Product } from '@/types/models';
import { toast } from 'sonner';
import Link from 'next/link';
import { Id } from '../../../../../../../convex/_generated/dataModel';

type BulkAction = 'archive' | 'delete' | 'activate' | 'deactivate' | 'export';

export default function ManageProductsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [bulkAction, setBulkAction] = useState<BulkAction | ''>('');
  const [productsToDelete, setProductsToDelete] = useState<Product[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  // Get products for the current project
  const productsResult = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).functions.products.products.getProjectProducts,
    currentProject
      ? {
          organizationId: organization!._id,
          projectId: currentProject._id,
          status:
            statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'draft' | 'archived'),
        }
      : 'skip'
  );

  // TODO: Replace with actual mutations when backend implements them
  const archiveProducts = useMutation(api.functions.products.products.createProduct);
  const deleteProducts = useMutation(api.functions.products.products.createProduct);

  if (organization === undefined || projects === undefined) {
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

  const products = (productsResult?.page as Product[]) || [];
  const isLoading = productsResult === undefined;

  // Filter products based on search term
  const filteredProducts = products.filter(
    (product: Product) =>
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
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p._id)));
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
    if (!bulkAction || selectedProducts.size === 0) return;

    switch (bulkAction) {
      case 'archive':
        // TODO: Implement bulk archive
        toast.success(`Archived ${selectedProducts.size} products`);
        setSelectedProducts(new Set());
        setBulkAction('');
        break;
      case 'delete':
        // Show delete dialog for selected products
        const selectedProductsList = filteredProducts.filter(p => selectedProducts.has(p._id));
        setProductsToDelete(selectedProductsList);
        setShowDeleteDialog(true);
        break;
      case 'activate':
        // TODO: Implement bulk activate
        toast.success(`Activated ${selectedProducts.size} products`);
        setSelectedProducts(new Set());
        setBulkAction('');
        break;
      case 'deactivate':
        // TODO: Implement bulk deactivate
        toast.success(`Deactivated ${selectedProducts.size} products`);
        setSelectedProducts(new Set());
        setBulkAction('');
        break;
      case 'export':
        // TODO: Implement export functionality
        toast.info('Export functionality coming soon');
        setSelectedProducts(new Set());
        setBulkAction('');
        break;
    }
  };

  const handleDeleteProducts = async (productIds: string[], permanentDelete: boolean) => {
    // TODO: Implement actual delete mutation when backend is ready
    console.log('Deleting products:', productIds, 'Permanent:', permanentDelete);
    
    // Clear selection after deletion
    setSelectedProducts(new Set());
    setBulkAction('');
    setShowDeleteDialog(false);
    setProductsToDelete([]);
  };

  const selectedCount = selectedProducts.size;
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProducts(new Set())}
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
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              {products.filter((p) => p.status === 'active').length} active
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
              {products.filter((p) => p.status === 'draft').length}
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
              {products.filter((p) => p.status === 'archived').length}
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Vendor</TableHead>
                  <TableHead className="hidden lg:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Price</TableHead>
                  <TableHead className="hidden md:table-cell">Updated</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product: Product) => (
                  <TableRow key={product._id} className={selectedProducts.has(product._id) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(product._id)}
                        onCheckedChange={() => handleSelectProduct(product._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="h-10 w-10 rounded object-cover"
                          />
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
                      {product.price ? `$${product.price}` : '—'}
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