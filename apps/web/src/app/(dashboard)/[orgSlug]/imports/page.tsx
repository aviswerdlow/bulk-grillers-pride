'use client';

import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
} from 'lucide-react';
import { CreateImportJobDialog } from '@/components/imports/create-import-job-dialog';
import { Loading } from '@/components/loading';
import {
  downloadProductsTemplate,
  downloadVariantsTemplate,
  downloadCategoriesTemplate,
} from '@/utils/csv-templates';

interface ImportJob {
  _id: string;
  status: string;
  fileName: string;
  fileSize: number;
  importType: string;
  progress: {
    totalRows: number;
    processedRows: number;
    importedRows: number;
    skippedRows: number;
  };
  validationErrors: string[];
  createdAt: number;
}

export default function ImportsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Get organization
  const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  // Get projects for this organization
  const projects = useQuery(
    api.functions.projects.projects.getOrganizationProjects,
    organization ? { organizationId: organization._id } : 'skip'
  );

  // Use first project for now
  const currentProject = projects?.[0];

  // Get import jobs
  // Note: Using (api as any) as a workaround until Convex dev server regenerates the API types
  const jobs = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).functions.imports.imports.getImportJobs,
    organization && currentProject
      ? {
          organizationId: organization._id,
          projectId: currentProject._id,
        }
      : 'skip'
  );

  if (organization === undefined || projects === undefined) {
    return <Loading size="lg" text="Loading imports..." />;
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] flex-col gap-4">
        <Upload className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Projects Found</h3>
          <p className="text-muted-foreground">Create a project first to import data</p>
        </div>
      </div>
    );
  }

  const allJobs = (jobs as ImportJob[]) || [];
  const isLoading = jobs === undefined;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'importing':
      case 'validating':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'uploaded':
        return <Upload className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'importing':
      case 'validating':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'uploaded':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getImportTypeLabel = (importType: string) => {
    switch (importType) {
      case 'products':
        return 'Products';
      case 'categories':
        return 'Categories';
      case 'variants':
        return 'Product Variants';
      default:
        return importType;
    }
  };

  const calculateProgress = (progress: { totalRows: number; processedRows: number }) => {
    if (progress.totalRows === 0) return 0;
    return Math.round((progress.processedRows / progress.totalRows) * 100);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Import</h1>
          <p className="text-muted-foreground">
            Import products, categories, and variants from CSV files for{' '}
            {currentProject?.name || 'your project'}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Imports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allJobs.filter((j: ImportJob) => j.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                allJobs.filter((j: ImportJob) => ['importing', 'validating'].includes(j.status))
                  .length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records Imported</CardTitle>
            <Badge variant="outline" className="h-4 text-xs">
              Total
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allJobs.reduce((sum: number, job: ImportJob) => sum + job.progress.importedRows, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Import Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Import Templates</CardTitle>
          <p className="text-sm text-muted-foreground">
            Download CSV templates with the correct format for importing your data
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="font-medium">Products Template</div>
                  <div className="text-sm text-muted-foreground">
                    Title, description, vendor, type, etc.
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadProductsTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-600" />
                <div>
                  <div className="font-medium">Categories Template (JSON)</div>
                  <div className="text-sm text-muted-foreground">
                    Hierarchical categories with level names (Aisle → Product Type → Master Category
                    → Category → Sub Category)
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadCategoriesTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="font-medium">Variants Template</div>
                  <div className="text-sm text-muted-foreground">
                    SKU, price, inventory, options
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadVariantsTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loading size="md" text="Loading imports..." />
            </div>
          ) : allJobs.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No imports yet</h3>
              <p className="text-muted-foreground mb-4">Start by importing your first data file</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allJobs.map((job: ImportJob) => (
                  <TableRow key={job._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <Badge
                          variant={
                            getStatusBadgeVariant(job.status) as
                              | 'default'
                              | 'secondary'
                              | 'destructive'
                              | 'outline'
                          }
                        >
                          {job.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{job.fileName}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatFileSize(job.fileSize)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getImportTypeLabel(job.importType)}</TableCell>
                    <TableCell>
                      {job.progress.totalRows > 0 ? (
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex justify-between text-sm">
                            <span>
                              {job.progress.processedRows}/{job.progress.totalRows}
                            </span>
                            <span>{calculateProgress(job.progress)}%</span>
                          </div>
                          <Progress value={calculateProgress(job.progress)} className="h-2" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>{job.progress.importedRows} imported</span>
                        </div>
                        {job.progress.skippedRows > 0 && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{job.progress.skippedRows} skipped</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.validationErrors.length > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {job.validationErrors.length} errors
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {currentProject && (
        <CreateImportJobDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          organizationId={organization._id}
          projectId={currentProject._id}
        />
      )}
    </div>
  );
}
