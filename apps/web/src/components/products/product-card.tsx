'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Package, MoreVertical, Edit, Eye, Archive, Tag, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Product } from '@/types/models';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onView?: (product: Product) => void;
  onArchive?: (product: Product) => void;
  className?: string;
}

export function ProductCard({ product, onEdit, onView, onArchive, className }: ProductCardProps) {
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

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-1',
        className
      )}
    >
      {/* Status Badge - Floating */}
      <div className="absolute top-3 right-3 z-10">
        <Badge variant={getStatusBadgeVariant(product.status)} className="shadow-sm">
          {product.status}
        </Badge>
      </div>

      <CardHeader className="pb-3">
        {/* Product Image Placeholder */}
        <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
          {product.image ? (
            <img src={product.image} alt={product.title} className="object-cover w-full h-full" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="w-16 h-16 text-gray-300" />
            </div>
          )}
        </div>

        {/* Product Title & Handle */}
        <div className="space-y-1">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
            {product.title}
          </h3>
          <p className="text-sm text-muted-foreground">{product.handle}</p>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Vendor & Type */}
        <div className="space-y-2">
          {product.vendor && (
            <div className="flex items-center gap-2 text-sm">
              <Store className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{product.vendor}</span>
            </div>
          )}

          {product.productType && (
            <div className="flex items-center gap-2 text-sm">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{product.productType}</span>
            </div>
          )}
        </div>

        {/* Categories */}
        {product.categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {product.categories.slice(0, 3).map((category, index) => (
              <Badge key={category} variant="outline" className="text-xs">
                Category {index + 1}
              </Badge>
            ))}
            {product.categories.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{product.categories.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 pb-4 flex items-center justify-between">
        {/* Last Updated */}
        <p className="text-xs text-muted-foreground">
          Updated {new Date(product.updatedAt).toLocaleDateString()}
        </p>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={() => onView(product)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
              </DropdownMenuItem>
            )}
            {onArchive && (
              <DropdownMenuItem onClick={() => onArchive(product)} className="text-destructive">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
