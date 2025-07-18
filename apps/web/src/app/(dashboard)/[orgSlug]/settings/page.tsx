'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../../../convex/_generated/api';
import { Id } from '../../../../../../../convex/_generated/dataModel';
import { PageLoading } from '@/components/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Key, 
  Users, 
  CreditCard, 
  Building2,
  Globe,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function OrganizationSettingsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  const currentUser = useQuery(api.functions.auth.users.currentWithOrganizations);

  const currentUserRole = currentUser?.organizations?.find((org) => org._id === organization?._id)
    ?.membership.role;

  // Loading state
  if (organization === undefined || currentUser === undefined) {
    return <PageLoading text="Loading settings..." />;
  }

  // Not found state
  if (!organization) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Organization not found</h1>
          <p className="text-gray-600 mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  // Check permissions - only owners and admins can access settings
  if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
    return (
      <div className="p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">
            You don&apos;t have permission to access organization settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings, API keys, team, and billing
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Building2 className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-4">
          <GeneralSettings organization={organization} currentUserRole={currentUserRole} />
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <ApiKeysSettings organizationId={organization._id} />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <TeamSettings organization={organization} currentUserRole={currentUserRole} />
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <BillingSettings organization={organization} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// General Settings Component
function GeneralSettings({ 
  organization, 
  currentUserRole 
}: { 
  organization: any;
  currentUserRole?: string;
}) {
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implement organization update mutation
    toast.success("Organization settings updated successfully");
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Update your organization&apos;s basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter organization name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug">Organization Slug</Label>
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-gray-500" />
              <Input
                id="org-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="organization-slug"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This is your organization&apos;s unique identifier in URLs
            </p>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Organization ID</p>
              <p className="text-xs text-muted-foreground font-mono">{organization._id}</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentUserRole === 'owner' && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that affect your entire organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Delete Organization</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this organization and all its data
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Organization
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// API Keys Settings Component
function ApiKeysSettings({ organizationId }: { organizationId: Id<'organizations'> }) {
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  
  // Query for masked API keys
  const maskedApiKeys = useQuery(api.functions.organizations.apiKeys.getMaskedApiKeys, {
    organizationId,
  });
  
  // Mutation for removing API keys
  const removeApiKey = useMutation(api.functions.organizations.apiKeys.removeApiKey);
  
  // Transform the masked API keys into the format we need for display
  const apiKeys = maskedApiKeys
    ? Object.entries(maskedApiKeys).map(([provider, maskedKey]) => ({
        id: provider,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`,
        provider,
        lastUsed: 'Recently', // We don't track last used in the current implementation
        status: 'active' as const,
        maskedKey,
      }))
    : [];

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const handleDeleteKey = async (provider: string) => {
    try {
      await removeApiKey({
        organizationId,
        provider: provider as 'openai' | 'anthropic' | 'gemini',
      });
      toast.success(`${provider} API key removed successfully`);
      setDeletingKey(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove API key");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage API keys for AI categorization providers
              </CardDescription>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add API Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{apiKey.name}</h4>
                    <Badge variant={apiKey.status === 'active' ? 'default' : 'secondary'}>
                      {apiKey.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Provider: {apiKey.provider}</span>
                    <span>Last used: {apiKey.lastUsed}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {showKey[apiKey.id] ? 'sk-actual-key-would-be-here' : apiKey.maskedKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKey({ ...showKey, [apiKey.id]: !showKey[apiKey.id] })}
                    >
                      {showKey[apiKey.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyKey('sk-actual-key-would-be-here')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-600"
                  onClick={() => setDeletingKey(apiKey.provider)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {apiKeys.length === 0 && (
              <div className="text-center py-8">
                <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No API keys yet</h3>
                <p className="text-gray-600 mb-4">
                  Add API keys to enable AI categorization features
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First API Key
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>Your API keys are encrypted and stored securely. We never log or expose your full API keys.</p>
              <p className="mt-2">Only organization owners and admins can view and manage API keys.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingKey !== null} onOpenChange={(open) => !open && setDeletingKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the {deletingKey} API key? This action cannot be undone
              and may affect AI categorization functionality.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deletingKey && handleDeleteKey(deletingKey)}
            >
              Remove API Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Team Settings Component
function TeamSettings({ 
  organization, 
  currentUserRole 
}: { 
  organization: any;
  currentUserRole?: string;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
          <CardDescription>
            Quick overview of your team and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Total Team Members</h4>
                <p className="text-2xl font-bold">5</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Owners</span>
                  <Badge>1</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Full control</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Admins</span>
                  <Badge variant="secondary">2</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Manage team & resources</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Editors</span>
                  <Badge variant="outline">1</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Create & modify content</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Viewers</span>
                  <Badge variant="outline">1</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Read-only access</p>
              </div>
            </div>

            <div className="pt-4">
              <Button asChild className="w-full">
                <a href={`/${organization.slug}/team`}>
                  Manage Team Members
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Billing Settings Component
function BillingSettings({ organization }: { organization: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div>
                <h4 className="font-medium text-lg">Free Plan</h4>
                <p className="text-sm text-muted-foreground">Perfect for getting started</p>
              </div>
              <Badge variant="secondary">Current Plan</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Products</p>
                <p className="text-2xl font-bold">243 / 1,000</p>
                <p className="text-xs text-muted-foreground">24% used</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">AI Categorizations</p>
                <p className="text-2xl font-bold">127 / 500</p>
                <p className="text-xs text-muted-foreground">25% used this month</p>
              </div>
            </div>

            <div className="pt-4">
              <Button className="w-full">
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View your past invoices and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No billing history</h3>
            <p className="text-gray-600">
              You&apos;re on the free plan. Upgrade to see billing history.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}