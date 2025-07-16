import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductCardMiniProps {
  product: {
    _id: string;
    title: string;
    status: string;
    vendor?: string;
    updatedAt: number;
  };
  className?: string;
}

export function ProductCardMini({ product, className }: ProductCardMiniProps) {
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
    <Card className={cn('hover:shadow-md transition-shadow cursor-pointer', className)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Package className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium truncate">{product.title}</h4>
              <Badge variant={getStatusBadgeVariant(product.status)} className="text-xs shrink-0">
                {product.status}
              </Badge>
            </div>
            {product.vendor && (
              <p className="text-xs text-muted-foreground mt-1">{product.vendor}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(product.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
