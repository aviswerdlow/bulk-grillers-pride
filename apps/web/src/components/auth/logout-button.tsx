"use client";

import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function LogoutButton({ 
  variant = "ghost", 
  size = "default", 
  showIcon = false,
  children,
  className
}: LogoutButtonProps) {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut({
        redirectUrl: '/'
      });
      router.refresh();
    } catch {
      // Logout errors are handled by Clerk
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleLogout}
      className={`flex items-center gap-2 ${className || ''}`}
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      {children || "Sign Out"}
    </Button>
  );
} 