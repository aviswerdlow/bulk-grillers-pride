# Bundle Size Optimization Guide

## Current Setup

We've configured Next.js with bundle analyzer to monitor bundle sizes:

- Installed `@next/bundle-analyzer` 
- Added analyze scripts to package.json
- Configured bundle analyzer in next.config.ts

## Bundle Analysis

Run bundle analysis with:
```bash
npm run --workspace=web analyze
```

This generates three reports in `apps/web/.next/analyze/`:
- `client.html` - Client-side JavaScript bundles
- `nodejs.html` - Server-side bundles
- `edge.html` - Edge runtime bundles

## Optimization Strategies

### 1. Code Splitting & Dynamic Imports

```typescript
// Instead of static imports
import HeavyComponent from './HeavyComponent';

// Use dynamic imports
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false // If not needed server-side
});
```

### 2. Tree Shaking Optimizations

```typescript
// Bad - imports entire library
import * as Icons from 'lucide-react';

// Good - imports only what's needed
import { Home, User, Settings } from 'lucide-react';
```

### 3. Optimize Dependencies

Common heavy dependencies to watch:
- `moment.js` → Use `date-fns` or native `Intl.DateTimeFormat`
- `lodash` → Use `lodash-es` or native methods
- Large icon libraries → Import individually

### 4. Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // For above-the-fold images
  placeholder="blur" // For better UX
/>
```

### 5. Font Optimization

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
```

### 6. Bundle Size Monitoring

Add to CI/CD pipeline:
```json
{
  "scripts": {
    "analyze:ci": "ANALYZE=true next build && node scripts/check-bundle-size.js"
  }
}
```

### 7. Lazy Load Routes

Next.js automatically code-splits at the route level, but you can optimize further:

```typescript
// For large route components
const DashboardPage = dynamic(() => import('./dashboard-page'), {
  loading: () => <DashboardSkeleton />
});
```

### 8. Optimize Convex Client

```typescript
// Only import what you need from Convex
import { useQuery } from "convex/react";
// Instead of importing all generated functions
```

## Performance Budgets

Recommended targets:
- First Load JS: < 200KB (compressed)
- Route-specific JS: < 100KB per route
- Total bundle size: < 500KB
- Time to Interactive: < 3s on 3G

## Monitoring

1. Regular bundle analysis (weekly)
2. Performance monitoring with Core Web Vitals
3. Set up alerts for bundle size regression
4. Use Lighthouse CI in PR checks

## Next Steps

1. Run initial bundle analysis to establish baseline
2. Identify largest dependencies using bundle analyzer
3. Implement code splitting for heavy components
4. Set up bundle size tracking in CI/CD
5. Create performance budget alerts