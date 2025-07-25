import React from 'react';

// Mock loading components
export const PageLoading = ({ text }: { text?: string }) => (
  <div data-testid="page-loading" data-text={text}>
    {text || 'Loading...'}
  </div>
);

export const Loading = ({ className }: { className?: string }) => (
  <div data-testid="loading" className={className}>
    Loading...
  </div>
);

export const LoadingSpinner = ({ className }: { className?: string }) => (
  <div data-testid="loading-spinner" className={className}>
    <span>Loading spinner</span>
  </div>
);

export const SkeletonCard = ({ className }: { className?: string }) => (
  <div data-testid="skeleton-card" className={className}>
    Skeleton Card
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div data-testid="skeleton-table" data-rows={rows}>
    Skeleton Table
  </div>
);