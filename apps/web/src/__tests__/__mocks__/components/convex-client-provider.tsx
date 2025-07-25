import React from 'react';

// Mock ConvexClientProvider that just renders children
export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}