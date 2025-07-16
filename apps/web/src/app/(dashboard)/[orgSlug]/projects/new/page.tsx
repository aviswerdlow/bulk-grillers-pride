'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoading } from '@/components/loading';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Project form schema
const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name is too long'),
  slug: z
    .string()
    .min(1, 'Project slug is required')
    .max(100, 'Project slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description is too long').optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

export default function NewProjectPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get organization
  const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  // Get current user
  const currentUser = useQuery(api.functions.auth.users.current);

  // Create project mutation
  const createProject = useMutation(api.functions.projects.projects.createProject);

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
    },
  });

  const watchName = watch('name');

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Update slug when name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = generateSlug(name);
    setValue('slug', slug);
  };

  // Submit handler
  const onSubmit = async (data: ProjectFormData) => {
    if (!organization || !currentUser) return;

    try {
      setIsSubmitting(true);

      const projectId = await createProject({
        organizationId: organization._id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        createdBy: currentUser._id,
      });

      toast.success('Project created successfully!');
      // TODO: Navigate to project dashboard once it's created
      // For now, go back to projects list
      router.push(`/${orgSlug}/projects`);
    } catch (error) {
      console.error('Failed to create project:', error);
      if (error instanceof Error && error.message.includes('slug already exists')) {
        toast.error('A project with this slug already exists. Please choose a different slug.');
      } else {
        toast.error('Failed to create project. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (organization === undefined || currentUser === undefined) {
    return <PageLoading text="Loading..." />;
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
    <div className="p-8 max-w-2xl mx-auto">
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

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
          <CardDescription>
            Projects help you organize your products and categories. Each project can have its own
            catalog, settings, and team access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="My E-commerce Store"
                {...register('name', {
                  onChange: handleNameChange,
                })}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            {/* Project Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">Project Slug *</Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">/{orgSlug}/</span>
                <Input
                  id="slug"
                  placeholder="my-store"
                  {...register('slug')}
                  className={errors.slug ? 'border-red-500' : ''}
                />
              </div>
              {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
              <p className="text-sm text-gray-500">
                This will be used in URLs and cannot be changed later.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what this project is for..."
                rows={4}
                {...register('description')}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
