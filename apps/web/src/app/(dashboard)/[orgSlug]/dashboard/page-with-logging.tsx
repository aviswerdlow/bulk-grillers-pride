'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../../../convex/_generated/api';
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
import { useEffect, useRef } from 'react';

// Enhanced logging utility
const logger = {
  info: (component: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DASHBOARD-UI] [INFO] [${component}] ${message}`, data || '');
  },
  warn: (component: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [DASHBOARD-UI] [WARN] [${component}] ${message}`, data || '');
  },
  error: (component: string, message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [DASHBOARD-UI] [ERROR] [${component}] ${message}`, {
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    });
  },
};

export default function OrganizationDashboard() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const renderCount = useRef(0);
  const queryAttempts = useRef({
    organization: 0,
    projects: 0,
    dashboardStats: 0,
    recentActivity: 0,
  });

  // Log component mount and renders
  useEffect(() => {
    renderCount.current++;
    logger.info('Component', `Dashboard component rendered (render #${renderCount.current})`, {
      orgSlug,
      pathname: window.location.pathname,
    });
  }, [orgSlug]);

  // Organization query with logging
  let organization;
  let orgError;
  try {
    queryAttempts.current.organization++;
    organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
      slug: orgSlug,
    });

    if (organization !== undefined) {
      logger.info('Query', 'Organization query successful', {
        attempt: queryAttempts.current.organization,
        orgId: organization?._id,
        orgName: organization?.name,
      });
    }
  } catch (error) {
    orgError = error;
    logger.error('Query', 'Organization query failed', error);
  }

  // Projects query with logging
  let projects;
  let projectsError;
  try {
    if (organization) {
      queryAttempts.current.projects++;
      projects = useQuery(api.functions.projects.projects.getOrganizationProjects, {
        organizationId: organization._id,
      });

      if (projects !== undefined) {
        logger.info('Query', 'Projects query successful', {
          attempt: queryAttempts.current.projects,
          projectCount: projects?.length,
        });
      }
    } else {
      projects = 'skip';
    }
  } catch (error) {
    projectsError = error;
    logger.error('Query', 'Projects query failed', error);
  }

  // Dashboard stats query with enhanced error handling
  let dashboardStats;
  let dashboardStatsError;
  try {
    if (organization) {
      queryAttempts.current.dashboardStats++;
      logger.info('Query', 'Attempting dashboard stats query', {
        attempt: queryAttempts.current.dashboardStats,
        organizationId: organization._id,
      });

      // Check if the function exists in the API
      if (!api.functions.dashboard?.getDashboardStats) {
        logger.error('Query', 'getDashboardStats function not found in API', {
          availableFunctions: Object.keys(api.functions.dashboard || {}),
        });
      } else {
        dashboardStats = useQuery(api.functions.dashboard.getDashboardStats, {
          organizationId: organization._id,
        });

        if (dashboardStats !== undefined) {
          logger.info('Query', 'Dashboard stats query successful', {
            attempt: queryAttempts.current.dashboardStats,
            stats: {
              projects: dashboardStats?.projectsCount,
              products: dashboardStats?.productsCount,
              aiJobs: dashboardStats?.activeAiJobsCount,
              teamMembers: dashboardStats?.teamMembersCount,
            },
          });
        }
      }
    } else {
      dashboardStats = 'skip';
    }
  } catch (error) {
    dashboardStatsError = error;
    logger.error('Query', 'Dashboard stats query failed', error);
  }

  // Recent activity query with logging
  let recentActivity;
  let recentActivityError;
  try {
    if (organization) {
      queryAttempts.current.recentActivity++;
      recentActivity = useQuery(api.functions.dashboard.getRecentActivity, {
        organizationId: organization._id,
        limit: 5,
      });

      if (recentActivity !== undefined) {
        logger.info('Query', 'Recent activity query successful', {
          attempt: queryAttempts.current.recentActivity,
          activityCount: recentActivity?.length,
        });
      }
    } else {
      recentActivity = 'skip';
    }
  } catch (error) {
    recentActivityError = error;
    logger.error('Query', 'Recent activity query failed', error);
  }

  // Log any Sentry-related errors in the console
  useEffect(() => {
    const checkForSentryErrors = () => {
      const performanceEntries = performance.getEntriesByType('resource');
      const sentryRequests = performanceEntries.filter(
        (entry) => entry.name.includes('sentry') || entry.name.includes('ingest')
      );

      if (sentryRequests.length > 0) {
        logger.warn('Network', 'Detected Sentry-related network requests', {
          requests: sentryRequests.map((req) => ({
            url: req.name,
            duration: req.duration,
            transferSize: (req as any).transferSize,
            responseStatus: (req as any).responseStatus,
          })),
        });
      }
    };

    // Check on mount and after a delay
    checkForSentryErrors();
    const timer = setTimeout(checkForSentryErrors, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Loading state
  if (organization === undefined) {
    logger.info('Component', 'Showing loading state');
    return <PageLoading text="Loading organization..." />;
  }

  // Error state
  if (orgError) {
    logger.error('Component', 'Showing error state', orgError);
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Error loading organization</h1>
          <p className="text-gray-600 mt-2">
            {orgError instanceof Error ? orgError.message : 'An unexpected error occurred'}
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!organization) {
    logger.warn('Component', 'Organization not found', { orgSlug });
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

  // Log successful render with data
  logger.info('Component', 'Rendering dashboard with data', {
    hasOrganization: !!organization,
    hasProjects: projects !== 'skip' && projects !== undefined,
    hasDashboardStats: dashboardStats !== 'skip' && dashboardStats !== undefined,
    hasRecentActivity: recentActivity !== 'skip' && recentActivity !== undefined,
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
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

      {/* Show warning if dashboard stats failed */}
      {dashboardStatsError && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Dashboard statistics unavailable
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Some statistics may not be displayed correctly. Error:{' '}
                {dashboardStatsError instanceof Error
                  ? dashboardStatsError.message
                  : 'Unknown error'}
              </p>
            </div>
          </div>
        </div>
      )}

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
            <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${orgSlug}/projects`}>View All</Link>
            </Button>
          </div>

          {projects && projects !== 'skip' && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.slice(0, 3).map((project) => (
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
                    <div className="flex items-center justify-between text-sm text-gray-600">
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
                  <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                  <p className="text-gray-600 mb-4">
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Categorization Progress</h2>
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
                      dashboardStats && dashboardStats.productsCount > 0
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
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
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/activity`}>View All</Link>
          </Button>
        </div>

        {recentActivity && recentActivity !== 'skip' && recentActivity.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {recentActivity.map((activity) => (
                  <div key={activity._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            activity.eventType === 'CREATE'
                              ? 'bg-green-100'
                              : activity.eventType === 'UPDATE'
                                ? 'bg-blue-100'
                                : activity.eventType === 'DELETE'
                                  ? 'bg-red-100'
                                  : 'bg-gray-100'
                          }`}
                        >
                          {activity.eventType === 'CREATE' && (
                            <Plus className="h-4 w-4 text-green-600" />
                          )}
                          {activity.eventType === 'UPDATE' && (
                            <Activity className="h-4 w-4 text-blue-600" />
                          )}
                          {activity.eventType === 'DELETE' && (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {activity.performedBy.name} {activity.eventType.toLowerCase()}d a{' '}
                            {activity.entityType.slice(0, -1)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {activity.entityType === 'products' && (
                        <Package className="h-4 w-4 text-gray-400" />
                      )}
                      {activity.entityType === 'categories' && (
                        <Layers className="h-4 w-4 text-gray-400" />
                      )}
                      {activity.entityType === 'importJobs' && (
                        <FileText className="h-4 w-4 text-gray-400" />
                      )}
                      {activity.entityType === 'aiCategorizationJobs' && (
                        <Brain className="h-4 w-4 text-gray-400" />
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
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                <p className="text-gray-600">Activity will appear here as you use the platform.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Imports Section */}
      {dashboardStats?.recentImports && dashboardStats.recentImports.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Imports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardStats.recentImports.map((importJob) => (
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
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(importJob.createdAt), { addSuffix: true })}
                  </div>
                  {importJob.stats && (
                    <div className="mt-2 text-xs text-gray-600">
                      <span className="font-medium">{importJob.stats.successful}</span> products
                      imported
                      {importJob.stats.failed > 0 && (
                        <span className="text-red-600 ml-2">{importJob.stats.failed} failed</span>
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
