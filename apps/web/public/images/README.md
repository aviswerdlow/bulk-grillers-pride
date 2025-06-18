# Images Folder

Photos, illustrations, and graphics

## Recommended structure:
- `hero/` - Hero section images
- `products/` - Product photos and screenshots
- `ui/` - UI illustrations and graphics
- `team/` - Team member photos
- `backgrounds/` - Background images

## Usage:
```tsx
import Image from 'next/image';

<Image 
  src="/images/hero/dashboard-preview.png" 
  alt="Dashboard Preview"
  width={800}
  height={600}
/>
```

## File naming:
- Use descriptive names: `dashboard-hero.jpg` not `img1.jpg`
- Include dimensions when relevant: `logo-200x100.png` 