"use client";

import { useParams } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Settings, Users, BarChart3 } from "lucide-react";
import { OrganizationGuard } from "@/components/auth/organization-guard";

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const { user } = useUser();
  const orgSlug = params.orgSlug as string;

  const organization = useQuery(
    api.functions.organizations.organizations.getOrganizationBySlug,
    { slug: orgSlug }
  );



  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <OrganizationGuard orgSlug={orgSlug}>
      <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Organization Selector */}
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Bulk</span>
              </Link>
              
              {organization && (
                <>
                  <div className="h-6 w-px bg-gray-300" />
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold text-gray-900">
                      {organization.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {organization.status}
                    </Badge>
                  </div>
                </>
              )}
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
              
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8"
                  }
                }}
                afterSignOutUrl="/"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-4">
            <div className="space-y-1">
              <Link
                href={`/${orgSlug}/dashboard`}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-50"
              >
                <BarChart3 className="h-5 w-5 mr-3 text-gray-400" />
                Dashboard
              </Link>
              
              <div className="pt-4">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Management
                </p>
                <div className="mt-2 space-y-1">
                  <Link
                    href={`/${orgSlug}/products`}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Products
                  </Link>
                  <Link
                    href={`/${orgSlug}/categories`}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Categories
                  </Link>
                  <Link
                    href={`/${orgSlug}/imports`}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Import/Export
                  </Link>
                </div>
              </div>

              <div className="pt-4">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Organization
                </p>
                <div className="mt-2 space-y-1">
                  <Link
                    href={`/${orgSlug}/team`}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    <Users className="h-4 w-4 mr-3 text-gray-400" />
                    Team
                  </Link>
                  <Link
                    href={`/${orgSlug}/settings`}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4 mr-3 text-gray-400" />
                    Settings
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
    </OrganizationGuard>
  );
} 