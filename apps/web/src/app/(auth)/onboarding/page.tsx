'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeSlug, isValidSlug, getSlugValidationError } from '@/utils/slugValidation';
import { createLogger } from '@/utils/error-monitoring';

const logger = createLogger('OnboardingPage');

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  const storeUser = useMutation(api.functions.auth.users.store);
  const createOrganization = useMutation(api.functions.organizations.organizations.create);

  // Check if user already has organizations - moved to top level
  const userWithOrgs = useQuery(api.functions.auth.users.currentWithOrganizations);

  logger.debug('userWithOrgs query result:', userWithOrgs);

  // If user has organizations, redirect to their first organization's dashboard
  useEffect(() => {
    logger.debug('Checking redirect:', {
      hasUserWithOrgs: !!userWithOrgs,
      hasOrganizations: userWithOrgs?.organizations?.length || 0,
    });

    if (userWithOrgs && userWithOrgs.organizations && userWithOrgs.organizations.length > 0) {
      const firstOrg = userWithOrgs.organizations[0];
      if (firstOrg) {
        logger.info('Redirecting to:', `/${firstOrg.slug}/dashboard`);
        router.push(`/${firstOrg.slug}/dashboard`);
      }
    }
  }, [userWithOrgs, router]);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setOrganizationName(name);
    const slug = sanitizeSlug(name);
    setOrganizationSlug(slug);

    // Validate the generated slug
    if (slug) {
      const error = getSlugValidationError(slug);
      setSlugError(error);
    } else {
      setSlugError(null);
    }
  };

  // Handle manual slug changes
  const handleSlugChange = (slug: string) => {
    // Only allow lowercase and hyphens while typing
    const cleanedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setOrganizationSlug(cleanedSlug);

    // Validate the slug
    if (cleanedSlug) {
      const error = getSlugValidationError(cleanedSlug);
      setSlugError(error);
    } else {
      setSlugError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !organizationName || !organizationSlug) return;

    // Final validation before submission
    if (!isValidSlug(organizationSlug)) {
      const error = getSlugValidationError(organizationSlug);
      setSlugError(error || 'Invalid organization URL');
      return;
    }

    setIsCreating(true);
    try {
      // First ensure user exists in our database
      await storeUser();

      // Create the organization
      await createOrganization({
        name: organizationName,
        slug: organizationSlug,
      });

      toast.success('Organization created successfully!');
      router.push(`/${organizationSlug}/dashboard`);
    } catch (error) {
      // Check if it's a slug conflict error
      if (error instanceof Error && error.message?.includes('slug already exists')) {
        setSlugError('This organization URL is already taken. Please choose another.');
        toast.error('Organization URL already taken');
      } else {
        toast.error('Failed to create organization. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show loading while checking user organizations
  if (userWithOrgs === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <ShoppingCart className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">Bulk</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Bulk!</h1>
          <p className="text-muted-foreground mt-2">Let&apos;s create your organization to get started</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Create Your Organization</CardTitle>
            <CardDescription>
              Your organization will contain all your projects and team members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="e.g., Acme Store"
                  value={organizationName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  disabled={isCreating}
                />
              </div>

              <div>
                <Label htmlFor="orgSlug">URL Slug</Label>
                <Input
                  id="orgSlug"
                  type="text"
                  placeholder="e.g., acme-store"
                  value={organizationSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                  disabled={isCreating}
                  className={slugError ? 'border-destructive' : ''}
                />
                {slugError ? (
                  <p className="text-xs text-destructive mt-1">{slugError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be your organization&apos;s URL: /{organizationSlug}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!organizationName || !organizationSlug || isCreating || !!slugError}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Organization...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          You can create additional organizations later in your dashboard.
        </div>
      </div>
    </div>
  );
}
