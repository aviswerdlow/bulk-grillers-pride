'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/loading';
import { Plus, Settings, Package, Clock, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function ProjectsPage() {
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

  // Get dashboard stats for each project
  const projectStats = useQuery(
    api.functions.dashboard.getDashboardStats,
    organization ? { organizationId: organization._id } : 'skip'
  );

  // Loading state
  if (organization === undefined || projects === undefined) {
    return <PageLoading text="Loading projects..." />;
  }

  // Not found state
  if (!organization) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Organization not found</h1>
          <p className="text-gray-600 mt-2">The organization you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage your e-commerce projects and product catalogs</p>
        </div>
        <Button asChild>
          <Link href={`/${orgSlug}/projects/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Projects Grid */}
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <Card key={project._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/${orgSlug}/projects/${project.slug}/settings`}>
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <CardTitle className="text-xl">{project.name}</CardTitle>
                {project.description && (
                  <CardDescription className="mt-2">{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Project Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {projectStats?.productsCount || 0} products
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {projectStats?.categorizedProducts || 0} categorized
                      </span>
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Created{' '}
                      {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/${orgSlug}/products`}>View Products</Link>
                    </Button>
                    <Button size="sm" className="flex-1" asChild>
                      <Link href={`/${orgSlug}/dashboard`}>Dashboard</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-16 pb-16">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <Package className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Create your first project to start managing your e-commerce products and categories.
              </p>
              <Button asChild>
                <Link href={`/${orgSlug}/projects/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
