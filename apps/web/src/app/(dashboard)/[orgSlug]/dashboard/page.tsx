'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Doc } from '@convex/_generated/dataModel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ShoppingCart,
  Layers,
  Upload,
  Brain,
  Plus,
  TrendingUp,
  Clock,
  Users,
  Activity,
  Package,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { PageLoading } from '@/components/loading';
import { formatDistanceToNow } from 'date-fns';

export default function OrganizationDashboard() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  const projects = useQuery(
    api.functions.projects.projects.getOrganizationProjects,
    organization ? { organizationId: organization._id } : 'skip'
  );

  const dashboardStats = useQuery(
    api.functions.dashboard.getDashboardStats,
    organization ? { organizationId: organization._id } : 'skip'
  );

  const recentActivity = useQuery(
    api.functions.dashboard.getRecentActivity,
    organization ? { organizationId: organization._id, limit: 5 } : 'skip'
  );

  // Loading state
  if (organization === undefined) {
    return <PageLoading text="Loading organization..." />;
  }

  // Not found state
  if (!organization) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Organization not found</h1>
          <p className="text-muted-foreground mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome to {organization.name} - manage your e-commerce product catalog
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button asChild>
              <Link href={`/${orgSlug}/projects/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.projectsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Active projects in your organization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.productsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.productsByStatus?.active || 0} active,{' '}
              {dashboardStats?.productsByStatus?.draft || 0} draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Jobs</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.activeAiJobsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Active categorization jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.teamMembersCount || 0}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects Section */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Projects</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${orgSlug}/projects`}>View All</Link>
            </Button>
          </div>

          {projects && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.slice(0, 3).map((project: Doc<'projects'>) => (
                <Card key={project._id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        {project.description && (
                          <CardDescription>{project.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${orgSlug}/${project.slug}`}>Open</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Layers className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first project to start managing products.
                  </p>
                  <Button asChild>
                    <Link href={`/${orgSlug}/projects/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Product Categorization Progress */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Categorization Progress</h2>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Product Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Categorized</span>
                    <span className="font-medium">{dashboardStats?.categorizedProducts || 0}</span>
                  </div>
                  <Progress
                    value={
                      dashboardStats
                        ? (dashboardStats.categorizedProducts / dashboardStats.productsCount) * 100
                        : 0
                    }
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uncategorized</span>
                    <span className="font-medium">
                      {dashboardStats?.uncategorizedProducts || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/${orgSlug}/imports`}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Products
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/${orgSlug}/ai/categorization`}>
                  <Brain className="h-4 w-4 mr-2" />
                  AI Categorization
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/${orgSlug}/analytics`}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/activity`}>View All</Link>
          </Button>
        </div>

        {recentActivity && recentActivity.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentActivity.map((activity: {
                  _id: string;
                  timestamp: number;
                  eventType: string;
                  entityType: string;
                  entityId: string;
                  action: string;
                  performedBy: {
                    type: string;
                    name: string;
                  };
                }) => (
                  <div key={activity._id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            activity.eventType === 'CREATE'
                              ? 'bg-success/10'
                              : activity.eventType === 'UPDATE'
                                ? 'bg-primary/10'
                                : activity.eventType === 'DELETE'
                                  ? 'bg-destructive/10'
                                  : 'bg-muted'
                          }`}
                        >
                          {activity.eventType === 'CREATE' && (
                            <Plus className="h-4 w-4 text-success" />
                          )}
                          {activity.eventType === 'UPDATE' && (
                            <Activity className="h-4 w-4 text-primary" />
                          )}
                          {activity.eventType === 'DELETE' && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {activity.performedBy.name} {activity.eventType.toLowerCase()}d a{' '}
                            {activity.entityType.slice(0, -1)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {activity.entityType === 'products' && (
                        <Package className="h-4 w-4 text-muted-foreground/50" />
                      )}
                      {activity.entityType === 'categories' && (
                        <Layers className="h-4 w-4 text-muted-foreground/50" />
                      )}
                      {activity.entityType === 'importJobs' && (
                        <FileText className="h-4 w-4 text-muted-foreground/50" />
                      )}
                      {activity.entityType === 'aiCategorizationJobs' && (
                        <Brain className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No recent activity</h3>
                <p className="text-muted-foreground">Activity will appear here as you use the platform.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Imports Section */}
      {dashboardStats?.recentImports && dashboardStats.recentImports.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Imports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardStats.recentImports.map((importJob: {
              _id: string;
              filename: string;
              status: string;
              createdAt: number;
              stats: {
                successful: number;
                failed: number;
                skipped: number;
              } | null;
            }) => (
              <Card key={importJob._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium truncate">
                      {importJob.filename}
                    </CardTitle>
                    <Badge
                      variant={
                        importJob.status === 'completed'
                          ? 'default'
                          : importJob.status === 'failed'
                            ? 'destructive'
                            : importJob.status === 'importing'
                              ? 'secondary'
                              : 'outline'
                      }
                      className="ml-2"
                    >
                      {importJob.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(importJob.createdAt), { addSuffix: true })}
                  </div>
                  {importJob.stats && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">{importJob.stats.successful}</span> products
                      imported
                      {importJob.stats.failed > 0 && (
                        <span className="text-destructive ml-2">{importJob.stats.failed} failed</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
