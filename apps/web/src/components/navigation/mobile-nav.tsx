'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Package,
  FolderTree,
  Bot,
  Upload,
  Layers,
  Trash2,
  Users,
  Settings,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  orgSlug: string;
  onClose: () => void;
}

export function MobileNav({ orgSlug, onClose }: MobileNavProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Dashboard',
      href: `/${orgSlug}/dashboard`,
      icon: BarChart3,
    },
    {
      name: 'Projects',
      href: `/${orgSlug}/projects`,
      icon: Layers,
    },
    {
      name: 'Products',
      href: `/${orgSlug}/products`,
      icon: Package,
    },
    {
      name: 'Categories',
      href: `/${orgSlug}/categories`,
      icon: FolderTree,
    },
    {
      name: 'AI Categorization',
      href: `/${orgSlug}/ai-categorization`,
      icon: Bot,
    },
    {
      name: 'Import Data',
      href: `/${orgSlug}/imports`,
      icon: Upload,
    },
    {
      name: 'Analytics',
      href: `/${orgSlug}/analytics`,
      icon: TrendingUp,
    },
    {
      name: 'Team',
      href: `/${orgSlug}/team`,
      icon: Users,
    },
    {
      name: 'Trash',
      href: `/${orgSlug}/trash`,
      icon: Trash2,
    },
  ];

  return (
    <nav className="flex flex-col h-full">
      {/* Navigation Links */}
      <div className="flex-1 space-y-1 pt-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-semantic-info text-white'
                  : 'text-semantic-tertiary hover:text-semantic-primary hover:bg-semantic-secondary'
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={1.5} />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-semantic-secondary pt-4 pb-2 space-y-1">
        <Link
          href={`/${orgSlug}/projects/new`}
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg bg-semantic-info text-white hover:bg-semantic-info/90 transition-colors"
        >
          <Plus className="h-5 w-5" strokeWidth={1.5} />
          New Project
        </Link>
        
        <Link
          href={`/${orgSlug}/settings`}
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
            pathname === `/${orgSlug}/settings`
              ? 'bg-semantic-info text-white'
              : 'text-semantic-tertiary hover:text-semantic-primary hover:bg-semantic-secondary'
          )}
        >
          <Settings className="h-5 w-5" strokeWidth={1.5} />
          Settings
        </Link>
      </div>
    </nav>
  );
}