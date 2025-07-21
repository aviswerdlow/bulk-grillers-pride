'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoading } from '@/components/loading';
import { ArrowLeft, Loader2, Settings, DollarSign, Upload, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Project settings form schema
const projectSettingsSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  status: z.enum(['active', 'draft', 'archived']),
  defaultCurrency: z.string().min(3).max(3),
  defaultTaxRate: z.number().min(0).max(100),
});

type ProjectSettingsData = z.infer<typeof projectSettingsSchema>;

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const projectSlug = params.projectSlug as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // Get organization
  const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  // Get project
  const project = useQuery(
    api.functions.projects.projects.getProjectBySlug,
    organization ? { organizationId: organization._id, slug: projectSlug } : 'skip'
  );

  // Update project mutation
  const updateProject = useMutation(api.functions.projects.projects.updateProject);
  const deleteProject = useMutation(api.functions.projects.projects.deleteProject);

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<ProjectSettingsData>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
      status: project?.status || 'active',
      defaultCurrency: project?.settings.defaultCurrency || 'USD',
      defaultTaxRate: project?.settings.defaultTaxRate || 0,
    },
  });

  // Update form when project loads
  if (project && !isDirty) {
    reset({
      name: project.name,
      description: project.description || '',
      status: project.status,
      defaultCurrency: project.settings.defaultCurrency,
      defaultTaxRate: project.settings.defaultTaxRate || 0,
    });
  }

  // Submit handler
  const onSubmit = async (data: ProjectSettingsData) => {
    if (!project) return;

    try {
      setIsSubmitting(true);

      await updateProject({
        projectId: project._id,
        name: data.name,
        description: data.description,
        status: data.status,
        settings: {
          defaultCurrency: data.defaultCurrency,
          defaultTaxRate: data.defaultTaxRate,
          importSettings: project.settings.importSettings,
        },
      });

      toast.success('Project settings updated successfully!');
      reset(data);
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error('Failed to update project settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handler
  const handleDeleteProject = async () => {
    if (!project) return;

    try {
      setIsDeletingProject(true);
      await deleteProject({ projectId: project._id });
      toast.success('Project deleted successfully!');
      router.push(`/${orgSlug}/projects`);
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project. Please try again.');
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Loading state
  if (organization === undefined || project === undefined) {
    return <PageLoading text="Loading project settings..." />;
  }

  // Not found state
  if (!organization || !project) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Project not found</h1>
          <p className="text-gray-600 mt-2">The project you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/${orgSlug}/projects`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Project Settings</h1>
        <p className="text-gray-600 mt-1">Manage settings for {project.name}</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="commerce">
            <DollarSign className="h-4 w-4 mr-2" />
            Commerce
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="h-4 w-4 mr-2" />
            Import Settings
          </TabsTrigger>
          <TabsTrigger value="danger">
            <Trash2 className="h-4 w-4 mr-2" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Information</CardTitle>
                <CardDescription>Basic information about your project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Project Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={4}
                    {...register('description')}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message}</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Project Status</Label>
                  <Select
                    value={watch('status')}
                    onValueChange={(value) => setValue('status', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commerce" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Commerce Settings</CardTitle>
                <CardDescription>Default settings for products and pricing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Default Currency */}
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Select
                    value={watch('defaultCurrency')}
                    onValueChange={(value) => setValue('defaultCurrency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Default Tax Rate */}
                <div className="space-y-2">
                  <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                  <Input
                    id="defaultTaxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...register('defaultTaxRate', { valueAsNumber: true })}
                    className={errors.defaultTaxRate ? 'border-red-500' : ''}
                  />
                  {errors.defaultTaxRate && (
                    <p className="text-sm text-red-500">{errors.defaultTaxRate.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Settings</CardTitle>
                <CardDescription>Configure how data imports are handled</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-validate imports</p>
                      <p className="text-sm text-gray-500">
                        Automatically validate data during import
                      </p>
                    </div>
                    <span className="text-sm text-gray-600">
                      {project.settings.importSettings.autoValidate ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Duplicate handling</p>
                      <p className="text-sm text-gray-500">
                        How to handle duplicate records during import
                      </p>
                    </div>
                    <span className="text-sm text-gray-600 capitalize">
                      {project.settings.importSettings.duplicateHandling}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Required fields</p>
                      <p className="text-sm text-gray-500">
                        Fields that must be present in imports
                      </p>
                    </div>
                    <span className="text-sm text-gray-600">
                      {project.settings.importSettings.requiredFields.join(', ')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save Button */}
          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>

        <TabsContent value="danger" className="space-y-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions that affect your project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                  <div>
                    <p className="font-medium">Delete this project</p>
                    <p className="text-sm text-gray-500">
                      Once you delete a project, there is no going back. All data will be
                      permanently removed.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete Project</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the project
                          <span className="font-medium"> {project.name}</span> and all of its data
                          including products, categories, and import history.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteProject}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={isDeletingProject}
                        >
                          {isDeletingProject ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Yes, delete project'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
