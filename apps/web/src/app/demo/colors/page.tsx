import { ColorSystemDemo } from '@/components/demo/color-system-demo';

export default function ColorsPage() {
  return (
    <div className="min-h-screen">
      <ColorSystemDemo />
    </div>
  );
}

export const metadata = {
  title: 'Color System Demo',
  description: 'Visual guide and examples for the accessible color system',
};