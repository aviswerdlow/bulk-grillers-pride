'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, User, Loader2 } from 'lucide-react';
import { LogoutButton } from '@/components/auth/logout-button';
import { useUser } from '@clerk/nextjs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { isSignedIn, user, isLoaded } = useUser();

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">Bulk</span>
          <Badge variant="outline" className="text-xs">
            BETA
          </Badge>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          <Link href="#features" className="text-muted-foreground hover:text-foreground">
            Features
          </Link>
          <Link href="#pricing" className="text-muted-foreground hover:text-foreground">
            Pricing
          </Link>
          <Link href="#docs" className="text-muted-foreground hover:text-foreground">
            Docs
          </Link>
        </nav>

        <div className="flex items-center space-x-3">
          {!isLoaded ? (
            // Loading state
            <Button variant="ghost" disabled className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Loading...</span>
            </Button>
          ) : isSignedIn ? (
            // Authenticated user menu - Note: Dashboard navigation is handled by organization layout
            <div className="flex items-center space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <LogoutButton variant="ghost" className="w-full justify-start">
                      Sign Out
                    </LogoutButton>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            // Unauthenticated user buttons
            <>
              <Link href="/sign-in">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
