'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SkuCopyButtonProps {
  sku: string;
  variant?: 'icon' | 'button';
  className?: string;
}

export function SkuCopyButton({ sku, variant = 'icon', className }: SkuCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sku);
      setCopied(true);
      toast.success('SKU copied to clipboard');
      
      // Reset icon after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy SKU');
      console.error('Failed to copy:', error);
    }
  };

  if (variant === 'icon') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('h-6 w-6 hover:bg-muted', className)}
        onClick={handleCopy}
        aria-label={`Copy SKU ${sku}`}
        title="Copy SKU to clipboard"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('gap-2', className)}
      onClick={handleCopy}
      aria-label={`Copy SKU ${sku}`}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy SKU
        </>
      )}
    </Button>
  );
}