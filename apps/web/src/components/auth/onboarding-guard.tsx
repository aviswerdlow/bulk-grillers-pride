"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Loader2 } from "lucide-react";

interface OnboardingGuardProps {
  children: React.ReactNode;
  requiresOnboarding?: boolean; // If true, redirects completed users to dashboard
}

export function OnboardingGuard({ 
  children, 
  requiresOnboarding = false 
}: OnboardingGuardProps) {
  const router = useRouter();
  const userWithOrgs = useQuery(api.functions.auth.users.currentWithOrganizations);

  useEffect(() => {
    if (userWithOrgs === undefined) return; // Still loading

    if (userWithOrgs === null) {
      // User not authenticated - redirect to sign in
      router.push('/sign-in');
      return;
    }

    const hasOrganizations = userWithOrgs.organizations && userWithOrgs.organizations.length > 0;

    if (requiresOnboarding && hasOrganizations) {
      // User has organizations but is on onboarding page - redirect to their first org
      const firstOrg = userWithOrgs.organizations[0];
      router.push(`/${firstOrg.slug}/dashboard`);
      return;
    }

    if (!requiresOnboarding && !hasOrganizations) {
      // User doesn't have organizations but trying to access protected content
      router.push('/onboarding');
      return;
    }
  }, [userWithOrgs, requiresOnboarding, router]);

  // Show loading while checking
  if (userWithOrgs === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show content
  return <>{children}</>;
} 