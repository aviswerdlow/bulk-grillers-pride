import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProductCardSkeletonProps {
  className?: string;
}

export function ProductCardSkeleton({ className }: ProductCardSkeletonProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        {/* Product Image Skeleton */}
        <Skeleton className="w-full aspect-square rounded-lg mb-4" />

        {/* Title & Handle Skeletons */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Vendor & Type Skeletons */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>

        {/* Categories Skeleton */}
        <div className="mt-3 flex gap-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>

      <CardFooter className="pt-3 pb-4">
        <Skeleton className="h-3 w-24" />
      </CardFooter>
    </Card>
  );
}
