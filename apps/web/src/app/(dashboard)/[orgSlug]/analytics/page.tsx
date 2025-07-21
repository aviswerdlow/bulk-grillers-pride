'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { ActivityLogVisualization } from '@/components/activity/activity-log-visualization';
import { Loading } from '@/components/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

export default function AnalyticsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  // Get organization
  const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  // Get projects for this organization
  const projects = useQuery(
    api.functions.projects.projects.getOrganizationProjects,
    organization ? { organizationId: organization._id } : 'skip'
  );

  const currentProject = projects?.[0];

  if (organization === undefined || projects === undefined) {
    return <Loading size="lg" text="Loading analytics..." />;
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Insights and activity tracking for {organization.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Activity Log Visualization */}
      <ActivityLogVisualization
        organizationId={organization._id}
        projectId={currentProject?._id}
        timeRange={30}
      />
    </div>
  );
}