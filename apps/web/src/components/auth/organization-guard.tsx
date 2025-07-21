"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Loader2 } from "lucide-react";

interface OrganizationGuardProps {
  children: React.ReactNode;
  orgSlug: string;
}

export function OrganizationGuard({ children, orgSlug }: OrganizationGuardProps) {
  const router = useRouter();
  const userWithOrgs = useQuery(api.functions.auth.users.currentWithOrganizations);
  const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  useEffect(() => {
    if (userWithOrgs === undefined || organization === undefined) return; // Still loading

    if (userWithOrgs === null) {
      // User not authenticated
      router.push('/sign-in');
      return;
    }

    if (organization === null) {
      // Organization doesn't exist
      router.push('/onboarding');
      return;
    }

    // Check if user has access to this organization
    const hasAccess = userWithOrgs.organizations?.some(
      (org) => org._id === organization._id
    );

    if (!hasAccess) {
      // User doesn't have access to this organization
      if (userWithOrgs.organizations && userWithOrgs.organizations.length > 0) {
        // Redirect to their first organization
        const firstOrg = userWithOrgs.organizations[0];
        router.push(`/${firstOrg.slug}/dashboard`);
      } else {
        // No organizations, redirect to onboarding
        router.push('/onboarding');
      }
      return;
    }
  }, [userWithOrgs, organization, router, orgSlug]);

  // Show loading while checking
  if (userWithOrgs === undefined || organization === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  // User has access, show content
  return <>{children}</>;
} 