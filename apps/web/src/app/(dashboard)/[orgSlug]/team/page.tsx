'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../../../convex/_generated/api';
import { TeamMembersList } from '@/components/auth/team-members-list';
import { PendingInvitations } from '@/components/auth/pending-invitations';
import { OrganizationGuard } from '@/components/auth/organization-guard';
import { PageLoading } from '@/components/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield } from 'lucide-react';

export default function TeamPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  const currentUser = useQuery(api.functions.auth.users.currentWithOrganizations);

  const currentUserRole = currentUser?.organizations?.find((org: any) => org._id === organization?._id)
    ?.membership.role;

  if (!organization || !currentUser) {
    return <PageLoading text="Loading team..." />;
  }

  return (
    <OrganizationGuard orgSlug={orgSlug}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage your team members and their permissions</p>
        </div>

        {/* Pending Invitations */}
        <PendingInvitations />

        {/* Tabs */}
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList>
            <TabsTrigger value="members">Team Members</TabsTrigger>
            <TabsTrigger value="permissions">
              <Shield className="h-4 w-4 mr-2" />
              Permissions Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <TeamMembersList organizationId={organization._id} currentUserRole={currentUserRole} />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <PermissionsGuide />
          </TabsContent>
        </Tabs>
      </div>
    </OrganizationGuard>
  );
}

function PermissionsGuide() {
  const permissions = [
    {
      role: 'Owner',
      color: 'default',
      description: 'Full control over the organization',
      permissions: [
        'Manage organization settings',
        'Delete organization',
        'Transfer ownership',
        'All admin permissions',
      ],
    },
    {
      role: 'Admin',
      color: 'secondary',
      description: 'Manage team and resources',
      permissions: [
        'Invite and remove team members',
        'Change member roles (except owner)',
        'View active sessions',
        'All editor permissions',
      ],
    },
    {
      role: 'Editor',
      color: 'outline',
      description: 'Create and modify content',
      permissions: [
        'Create, edit, and delete products',
        'Manage categories',
        'Run AI categorization jobs',
        'Import data',
        'All viewer permissions',
      ],
    },
    {
      role: 'Viewer',
      color: 'outline',
      description: 'Read-only access',
      permissions: [
        'View all products',
        'View categories',
        'View team members',
        'Access reports and analytics',
      ],
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {permissions.map((perm) => (
        <div key={perm.role} className="rounded-lg border p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5" />
              <h3 className="font-semibold text-lg">{perm.role}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{perm.description}</p>
          </div>
          <ul className="space-y-2">
            {perm.permissions.map((permission, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>{permission}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
