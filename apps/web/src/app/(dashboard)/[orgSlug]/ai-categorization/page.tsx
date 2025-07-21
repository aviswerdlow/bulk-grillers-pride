"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Bot, Zap, Clock, CheckCircle, XCircle, AlertCircle, Play, Square } from "lucide-react";
import { CreateCategorizationJobDialog } from "@/components/ai/create-categorization-job-dialog";
import { JobActionsDropdown } from "@/components/ai/job-actions-dropdown";
import { JobDetailsModal } from "@/components/ai/job-details-modal";
import { ApiKeyStatus } from "@/components/ai/api-key-status";
import { JobErrorAlert } from "@/components/ai/job-error-alert";
import { Loading } from "@/components/loading";
import { toast } from "sonner";

interface CategorizationJob {
  _id: string;
  status: string;
  jobType: string;
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
  };
  aiProvider: string;
  aiModel: string;
  productIds: string[];
  createdAt: number;
  executionTime?: number;
  errors?: Array<{
    type: string;
    message: string;
    productId?: string;
    timestamp: number;
  }>;
}

export default function AiCategorizationPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Get organization
  const organization = useQuery(api.functions.organizations.organizations.getOrganizationBySlug, {
    slug: orgSlug,
  });

  // Get projects for this organization
  const projects = useQuery(
    api.functions.projects.projects.getOrganizationProjects,
    organization ? { organizationId: organization._id } : "skip"
  );

  // Use first project for now
  const currentProject = projects?.[0];

  // Get AI categorization jobs
  // Note: Using (api as any) as a workaround until Convex dev server regenerates the API types
  const jobs = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).functions.ai.categorization.getCategorizationJobs,
    organization && currentProject ? {
      organizationId: organization._id,
      projectId: currentProject._id,
    } : "skip"
  );

  // Cancel job mutation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cancelJob = useMutation((api as any).functions.ai.categorization.cancelCategorizationJob);
  
  // Debug: Check if the function exists
  // console.log('cancelCategorizationJob exists:', !!(api as any).functions?.ai?.categorization?.cancelCategorizationJob);

  if (organization === undefined || projects === undefined) {
    return <Loading size="lg" text="Loading AI categorization..." />;
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
        <Bot className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Projects Found</h3>
          <p className="text-muted-foreground">Create a project first to use AI categorization</p>
        </div>
      </div>
    );
  }

  const allJobs = (jobs as CategorizationJob[]) || [];
  const isLoading = jobs === undefined;
  
  // Find the most recent failed job with errors
  const recentFailedJob = allJobs.find(job => 
    job.status === "failed" && 
    job.errors && 
    job.errors.length > 0
  );

  const handleCancelJob = async (jobId: string) => {
    try {
      await cancelJob({ jobId });
      toast.success('Categorization job cancelled');
    } catch (error) {
      console.error('Failed to cancel job:', error);
      toast.error('Failed to cancel job. ' + (error instanceof Error ? error.message : 'Please try again.'));
    }
  };

  // Job action handlers
  const handleViewDetails = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowDetailsModal(true);
  };

  const handleViewProgress = (jobId: string) => {
    // TODO: Implement progress tracking panel
    toast.info('Real-time progress tracking coming soon!');
    console.log('View progress for job:', jobId);
  };

  const handleDownloadResults = async (jobId: string) => {
    // TODO: Implement CSV export
    toast.info('Export functionality coming soon!');
    console.log('Download results for job:', jobId);
  };

  const handleRerunFailed = async (jobId: string) => {
    // TODO: Implement re-run failed items
    toast.info('Re-run failed items coming soon!');
    console.log('Re-run failed items for job:', jobId);
  };

  const handleDeleteJob = async (jobId: string) => {
    // TODO: Implement job deletion
    toast.info('Job deletion coming soon!');
    console.log('Delete job:', jobId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-semantic-success" />;
      case "running":
        return <Zap className="h-4 w-4 text-semantic-info animate-pulse" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-semantic-danger" />;
      case "pending":
        return <Clock className="h-4 w-4 text-semantic-warning" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-semantic-tertiary" />;
      default:
        return <Clock className="h-4 w-4 text-semantic-tertiary" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "running":
        return "secondary";
      case "failed":
        return "destructive";
      case "pending":
        return "outline";
      case "cancelled":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getJobTypeLabel = (jobType: string) => {
    switch (jobType) {
      case "bulk_categorization":
        return "Bulk Categorization";
      case "single_product":
        return "Single Product";
      case "validation":
        return "Validation";
      default:
        return jobType;
    }
  };

  const calculateProgress = (progress: { total: number; processed: number }) => {
    if (progress.total === 0) return 0;
    return Math.round((progress.processed / progress.total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Categorization</h1>
          <p className="text-muted-foreground">
            Automatically categorize your products using AI for {currentProject?.name || "your project"}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Play className="h-4 w-4 mr-2" />
          Start Categorization
        </Button>
      </div>

      {/* API Key Status */}
      <ApiKeyStatus 
        organizationId={organization._id} 
        orgSlug={orgSlug}
        provider={organization.settings?.aiProvider}
      />

      {/* Recent Job Error Alert */}
      {recentFailedJob && (
        <JobErrorAlert
          jobId={recentFailedJob._id}
          status={recentFailedJob.status}
          errors={recentFailedJob.errors || []}
          orgSlug={orgSlug}
          onRetry={() => setShowCreateDialog(true)}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-semantic-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allJobs.filter((j: CategorizationJob) => j.status === "completed").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Zap className="h-4 w-4 text-semantic-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allJobs.filter((j: CategorizationJob) => j.status === "running").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Processed</CardTitle>
            <Badge variant="outline" className="h-4 text-xs">Total</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allJobs.reduce((sum: number, job: CategorizationJob) => sum + job.progress.processed, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Categorization Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loading size="md" text="Loading jobs..." />
            </div>
          ) : allJobs.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No categorization jobs yet</h3>
              <p className="text-muted-foreground mb-4">
                Start your first AI categorization job to automatically organize your products
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Play className="h-4 w-4 mr-2" />
                Start Categorization
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>AI Model</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allJobs.map((job: CategorizationJob) => (
                  <TableRow key={job._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <div className="flex flex-col gap-1">
                          <Badge variant={getStatusBadgeVariant(job.status) as "default" | "secondary" | "destructive" | "outline"}>
                            {job.status}
                          </Badge>
                          {job.status === "failed" && job.errors && job.errors.length > 0 && (
                            <span className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {job.errors[0]?.type === "API_KEY_ERROR" ? "API Key Error" : "Error"}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getJobTypeLabel(job.jobType)}</TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex justify-between text-sm">
                          <span>{job.progress.processed}/{job.progress.total}</span>
                          <span>{calculateProgress(job.progress)}%</span>
                        </div>
                        <Progress value={calculateProgress(job.progress)} className="h-2" />
                        {job.progress.successful > 0 && (
                          <div className="text-xs text-muted-foreground">
                            ✓ {job.progress.successful} successful
                            {job.progress.failed > 0 && `, ✗ ${job.progress.failed} failed`}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{job.aiProvider}</div>
                        <div className="text-sm text-muted-foreground">{job.aiModel}</div>
                      </div>
                    </TableCell>
                    <TableCell>{job.productIds.length}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.executionTime 
                        ? `${Math.round(job.executionTime / 1000)}s`
                        : job.status === "running" 
                          ? "Running..." 
                          : "—"
                      }
                    </TableCell>
                    <TableCell>
                      <JobActionsDropdown
                        jobId={job._id}
                        status={job.status}
                        onViewDetails={handleViewDetails}
                        onViewProgress={handleViewProgress}
                        onDownloadResults={handleDownloadResults}
                        onRerunFailed={handleRerunFailed}
                        onCancelJob={handleCancelJob}
                        onDeleteJob={handleDeleteJob}
                      />
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
        <CreateCategorizationJobDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          organizationId={organization._id}
          projectId={currentProject._id}
        />
      )}
      
      {/* Job Details Modal */}
      <JobDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        jobId={selectedJobId}
      />
    </div>
  );
}