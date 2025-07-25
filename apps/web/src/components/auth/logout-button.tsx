'use client';

import { useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

interface LogoutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function LogoutButton({
  variant = 'ghost',
  size = 'default',
  showIcon = false,
  children,
  className,
}: LogoutButtonProps) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut({
        redirectUrl: '/',
      });
      router.refresh();
    } catch {
      // Logout errors are handled by Clerk
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isLoading}
      className={`flex items-center gap-2 ${className || ''}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        showIcon && <LogOut className="h-4 w-4" />
      )}
      {children || (isLoading ? 'Signing out...' : 'Sign Out')}
    </Button>
  );
}
