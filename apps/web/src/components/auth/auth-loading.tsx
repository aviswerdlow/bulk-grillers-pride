import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthLoadingProps {
  text?: string;
  className?: string;
  inline?: boolean;
}

export function AuthLoading({ text = 'Loading...', className, inline = false }: AuthLoadingProps) {
  if (inline) {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{text}</span>
      </span>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 min-h-[200px]', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function AuthButtonLoading({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}
