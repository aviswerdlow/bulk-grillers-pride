'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import Link from 'next/link';

import {
  Plus,
  Settings,
  Users,
  BarChart3,
  Package,
  FolderTree,
  Bot,
  Upload,
  Layers,
  Trash2,
  TrendingUp,
  Menu,
} from 'lucide-react';
import { OrganizationGuard } from '@/components/auth/organization-guard';
import { Tooltip } from '@/components/ui/tooltip';
import { Sheet, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SwipeableSheetContent } from '@/components/ui/sheet-swipeable';
import { MobileNav } from '@/components/navigation/mobile-nav';
import Image from 'next/image';
import { useEnsureUser } from '@/hooks/use-ensure-user';
import { AccessibilityProvider } from '@/contexts/accessibility';

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const { user } = useUser();
  const orgSlug = params.orgSlug as string;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Ensure user record exists in Convex
  useEnsureUser();

  // Prevent body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const organization = useQuery((api as any).functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-semantic-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="w-8 h-8 border-4 border-semantic-light border-t-semantic-info rounded-full animate-spin"></div>
            <span className="text-semantic-tertiary">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OrganizationGuard orgSlug={orgSlug}>
      <AccessibilityProvider>
        <div className="min-h-screen bg-semantic-secondary">
          {/* Floating Dark Sidebar */}
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="fixed left-4 top-4 z-50 p-3 bg-semantic-primary rounded-xl shadow-lg md:hidden hover:bg-semantic-primary/90 focus:outline-none focus:ring-2 focus:ring-semantic-info focus:ring-offset-2 transition-colors"
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
        >
          <Menu className="h-6 w-6 text-white" strokeWidth={1.5} />
        </button>

        {/* Mobile Navigation Sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SwipeableSheetContent 
            side="left" 
            className="w-80 p-0 bg-semantic-light"
            onSwipeClose={() => setMobileMenuOpen(false)}
            id="mobile-navigation"
          >
            <SheetHeader className="px-6 py-4 border-b border-semantic-secondary">
              <div className="flex items-center gap-3">
                <Image src="/images/logo.png" alt="Logo" width={40} height={40} />
                <SheetTitle className="text-lg font-semibold">
                  {organization?.name || 'Menu'}
                </SheetTitle>
              </div>
            </SheetHeader>
            <div className="px-4">
              <MobileNav orgSlug={orgSlug} onClose={() => setMobileMenuOpen(false)} />
            </div>
          </SwipeableSheetContent>
        </Sheet>

        {/* Desktop Floating Dark Sidebar */}
        <nav className="fixed left-4 top-4 bottom-4 w-20 bg-semantic-primary rounded-2xl shadow-2xl z-50 flex-col hidden md:flex">
          {/* Logo */}
          <div className="pt-6 pb-6 px-4 border-b border-semantic-dark relative">
            <Link href="/" className="flex justify-center">
              <Image src="/images/logo.png" alt="Logo" width={48} height={48} />
            </Link>
          </div>

          {/* Navigation Icons */}
          <div className="flex-1 py-6 space-y-4 px-4">
            <Tooltip content="Dashboard">
              <Link
                href={`/${orgSlug}/dashboard`}
                className="w-full flex justify-center items-center p-3 rounded-xl hover:bg-semantic-secondary transition-colors group"
              >
                <BarChart3
                  className="h-6 w-6 text-semantic-secondary group-hover:text-white"
                  strokeWidth={1.5}
                />
              </Link>
            </Tooltip>

            <Tooltip content="Projects">
              <Link href={`/${orgSlug}/projects`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-semantic-secondary transition-colors">
                  <Layers
                    className="h-6 w-6 text-semantic-secondary group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>

            <Tooltip content="Products">
              <Link href={`/${orgSlug}/products`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-semantic-secondary transition-colors">
                  <Package
                    className="h-6 w-6 text-semantic-secondary group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>

            <Tooltip content="Categories">
              <Link href={`/${orgSlug}/categories`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-semantic-secondary transition-colors">
                  <FolderTree
                    className="h-6 w-6 text-semantic-secondary group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>

            <Tooltip content="AI Categorization">
              <Link
                href={`/${orgSlug}/ai-categorization`}
                className="w-full flex justify-center group"
              >
                <div className="p-3 rounded-xl hover:bg-semantic-secondary transition-colors">
                  <Bot className="h-6 w-6 text-gray-300 group-hover:text-white" strokeWidth={1.5} />
                </div>
              </Link>
            </Tooltip>

            <Tooltip content="Import Data">
              <Link href={`/${orgSlug}/imports`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-semantic-secondary transition-colors">
                  <Upload
                    className="h-6 w-6 text-semantic-secondary group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>

            <Tooltip content="Analytics">
              <Link href={`/${orgSlug}/analytics`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-semantic-secondary transition-colors">
                  <TrendingUp
                    className="h-6 w-6 text-semantic-secondary group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>

            <Tooltip content="Team">
              <Link href={`/${orgSlug}/team`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-semantic-secondary transition-colors">
                  <Users
                    className="h-6 w-6 text-semantic-secondary group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>
            <Tooltip content="Trash">
              <Link href={`/${orgSlug}/trash`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-semantic-secondary transition-colors">
                  <Trash2
                    className="h-6 w-6 text-semantic-secondary group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>
          </div>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-semantic-dark space-y-3">
            <Link
              href={`/${orgSlug}/projects/new`}
              className="w-full p-2 rounded-lg bg-semantic-info hover:bg-semantic-info focus-default transition-colors group flex justify-center items-center"
              title="New Project"
            >
              <Plus className="h-5 w-5 text-white" strokeWidth={1.5} />
            </Link>

            <Tooltip content="Settings">
              <Link href={`/${orgSlug}/settings`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-semantic-secondary transition-colors">
                  <Settings
                    className="h-6 w-6 text-semantic-secondary group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>
          </div>
        </nav>

        {/* Main Content - with left margin to account for floating sidebar on desktop */}
        <main className="ml-0 md:ml-28 p-4 md:p-6 pt-20 md:pt-6">
          {/* Header with Welcome message and User */}
          <div className="flex items-center justify-end mb-6">
            <div className="flex items-center space-x-3">
              {organization && (
                <div className="font-mono text-sm text-semantic-primary">Welcome, {organization.name}</div>
              )}
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'h-8 w-8 rounded-lg',
                  },
                }}
                afterSignOutUrl="/"
              />
            </div>
          </div>

          {children}
        </main>
      </div>
      </AccessibilityProvider>
    </OrganizationGuard>
  );
}
