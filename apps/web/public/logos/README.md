# Logos Folder

Brand assets and company logos

## Recommended files:
- `bulk-logo.svg` - Main logo (vector)
- `bulk-logo-dark.svg` - Dark version for light backgrounds
- `bulk-logo-light.svg` - Light version for dark backgrounds
- `bulk-icon.svg` - Just the icon without text
- `bulk-wordmark.svg` - Just the text without icon

## Usage:
```tsx
import Image from 'next/image';

<Image 
  src="/logos/bulk-logo.svg" 
  alt="Bulk Logo"
  width={120}
  height={40}
/>
```

## Guidelines:
- Use SVG format when possible for crisp scaling
- Provide both dark and light variants
- Keep original files and export optimized versions 