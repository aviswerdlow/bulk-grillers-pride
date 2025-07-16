'use client';

import { useParams } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
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
} from 'lucide-react';
import { OrganizationGuard } from '@/components/auth/organization-guard';
import { Tooltip } from '@/components/ui/tooltip';
import Image from 'next/image';
import { useEnsureUser } from '@/hooks/use-ensure-user';

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const { user } = useUser();
  const orgSlug = params.orgSlug as string;

  // Ensure user record exists in Convex
  useEnsureUser();

  const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-gray-600">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OrganizationGuard orgSlug={orgSlug}>
      <div className="min-h-screen bg-gray-50">
        {/* Floating Dark Sidebar */}
        <nav className="fixed left-4 top-4 bottom-4 w-20 bg-gray-900 rounded-2xl shadow-2xl z-50 flex flex-col">
          {/* Logo */}
          <div className="pt-6 pb-6 px-4 border-b border-gray-800 relative">
            <Link href="/" className="flex justify-center">
              <Image src="/images/logo.png" alt="Logo" width={48} height={48} />
            </Link>
          </div>

          {/* Navigation Icons */}
          <div className="flex-1 py-6 space-y-4 px-4">
            <Tooltip content="Dashboard">
              <Link
                href={`/${orgSlug}/dashboard`}
                className="w-full flex justify-center items-center p-3 rounded-xl hover:bg-gray-800 transition-colors group"
              >
                <BarChart3
                  className="h-6 w-6 text-gray-300 group-hover:text-white"
                  strokeWidth={1.5}
                />
              </Link>
            </Tooltip>

            <Tooltip content="Projects">
              <Link href={`/${orgSlug}/projects`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-gray-800 transition-colors">
                  <Layers
                    className="h-6 w-6 text-gray-300 group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>

            <Tooltip content="Products">
              <Link href={`/${orgSlug}/products`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-gray-800 transition-colors">
                  <Package
                    className="h-6 w-6 text-gray-300 group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>

            <Tooltip content="Categories">
              <Link href={`/${orgSlug}/categories`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-gray-800 transition-colors">
                  <FolderTree
                    className="h-6 w-6 text-gray-300 group-hover:text-white"
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
                <div className="p-3 rounded-xl hover:bg-gray-800 transition-colors">
                  <Bot className="h-6 w-6 text-gray-300 group-hover:text-white" strokeWidth={1.5} />
                </div>
              </Link>
            </Tooltip>

            <Tooltip content="Import Data">
              <Link href={`/${orgSlug}/imports`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-gray-800 transition-colors">
                  <Upload
                    className="h-6 w-6 text-gray-300 group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>

            <Tooltip content="Team">
              <Link href={`/${orgSlug}/team`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-gray-800 transition-colors">
                  <Users
                    className="h-6 w-6 text-gray-300 group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>
          </div>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-gray-800 space-y-3">
            <Link
              href={`/${orgSlug}/projects/new`}
              className="w-full p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors group flex justify-center items-center"
              title="New Project"
            >
              <Plus className="h-5 w-5 text-white" strokeWidth={1.5} />
            </Link>

            <Tooltip content="Settings">
              <Link href={`/${orgSlug}/settings`} className="w-full flex justify-center group">
                <div className="p-3 rounded-xl hover:bg-gray-800 transition-colors">
                  <Settings
                    className="h-6 w-6 text-gray-300 group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </Tooltip>
          </div>
        </nav>

        {/* Main Content - with left margin to account for floating sidebar */}
        <main className="ml-28 p-6">
          {/* Header with Welcome message and User */}
          <div className="flex items-center justify-end mb-6">
            <div className="flex items-center space-x-3">
              {organization && (
                <div className="font-mono text-sm text-gray-900">Welcome, {organization.name}</div>
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
    </OrganizationGuard>
  );
}
