"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loading } from "@/components/loading";
import { ProductResultsTable } from "./product-results-table";
import { toast } from "sonner";
import {
  Bot,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Zap,
  DollarSign,
  Package,
  Download,
  User,
  Calendar,
  Brain,
  Tag,
  Timer,
  TrendingUp,
} from "lucide-react";

interface JobDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string | null;
}

export function JobDetailsModal({
  open,
  onOpenChange,
  jobId,
}: JobDetailsModalProps) {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [exportFormat, setExportFormat] = useState<"summary" | "detailed">("summary");

  // Query job details from backend
  const jobDetails = useQuery(
    api.functions.ai.categorization.getJobDetails,
    jobId ? { jobId: jobId as Id<"aiCategorizationJobs"> } : "skip"
  );
  
  // Mutations and actions
  const applyCategorization = useMutation(api.functions.ai.categorization.applyCategorization);
  const exportJobResults = useAction(api.functions.ai.categorization.exportJobResults);

  const isLoading = jobDetails === undefined;
  const hasErrors = jobDetails && jobDetails.errors.length > 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "running":
        return <Zap className="h-5 w-5 text-blue-600 animate-pulse" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "cancelled":
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleApplyCategory = async (productId: string, categoryId: string, confidence: number, rationale: string) => {
    if (!jobId) return;
    
    try {
      await applyCategorization({
        jobId: jobId as Id<"aiCategorizationJobs">,
        productId: productId as Id<"products">,
        categoryId: categoryId as Id<"categories">,
        confidence,
        rationale,
      });
      toast.success("Category applied successfully");
    } catch (error) {
      console.error("Failed to apply category:", error);
      toast.error("Failed to apply category");
    }
  };

  const handleExport = async () => {
    if (!jobId) return;

    try {
      const result = await exportJobResults({
        jobId: jobId as Id<"aiCategorizationJobs">,
        format: exportFormat,
      });

      // Create a download link
      const blob = new Blob(
        [atob(result.base64Content)],
        { type: result.mimeType }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export downloaded successfully");
    } catch (error) {
      console.error("Failed to export results:", error);
      toast.error("Failed to export results");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Categorization Job Details
          </DialogTitle>
          <DialogDescription>
            {jobId ? `Job ID: ${jobId}` : "No job selected"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loading size="lg" text="Loading job details..." />
          </div>
        ) : !jobDetails ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-muted-foreground">Job not found</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="results">
                  Results
                  <Badge variant="outline" className="ml-2">
                    {jobDetails.productResults.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="errors" disabled={!hasErrors}>
                  Errors
                  {hasErrors && (
                    <Badge variant="destructive" className="ml-2">
                      {jobDetails.errors.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4">
                <TabsContent value="overview" className="space-y-4 mt-0">
                  {/* Job Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Job Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Status</p>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(jobDetails.status)}
                            <span className="font-medium capitalize">{jobDetails.status}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Job Type</p>
                          <p className="font-medium">{jobDetails.jobType}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Brain className="h-3 w-3" />
                            AI Provider
                          </p>
                          <p className="font-medium">{jobDetails.aiProvider}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Model</p>
                          <p className="font-medium">{jobDetails.aiModel}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Created By
                          </p>
                          <p className="font-medium">{jobDetails.createdBy.name}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created At
                          </p>
                          <p className="font-medium">
                            {new Date(jobDetails.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Performance Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Success Rate</p>
                          <p className="text-2xl font-bold text-green-600">
                            {jobDetails.metrics.successRate}%
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Avg Confidence</p>
                          <p className="text-2xl font-bold">
                            {Math.round(jobDetails.metrics.averageConfidence * 100)}%
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            Execution Time
                          </p>
                          <p className="text-2xl font-bold">
                            {Math.round(jobDetails.metrics.executionTime / 1000)}s
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            Categories Used
                          </p>
                          <p className="text-2xl font-bold">
                            {jobDetails.metrics.categoriesUsed}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Processing Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Overall Progress</span>
                            <span className="text-sm font-medium">
                              {jobDetails.metrics.processedProducts} / {jobDetails.metrics.totalProducts}
                            </span>
                          </div>
                          <Progress 
                            value={(jobDetails.metrics.processedProducts / jobDetails.metrics.totalProducts) * 100} 
                            className="h-2"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="space-y-1">
                            <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                            <p className="text-2xl font-bold">{jobDetails.metrics.successfulProducts}</p>
                            <p className="text-xs text-muted-foreground">Successful</p>
                          </div>
                          <div className="space-y-1">
                            <XCircle className="h-8 w-8 text-red-600 mx-auto" />
                            <p className="text-2xl font-bold">{jobDetails.metrics.failedProducts}</p>
                            <p className="text-xs text-muted-foreground">Failed</p>
                          </div>
                          <div className="space-y-1">
                            <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto" />
                            <p className="text-2xl font-bold">{jobDetails.metrics.skippedProducts}</p>
                            <p className="text-xs text-muted-foreground">Skipped</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="results" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Product Results</h3>
                      <div className="flex items-center gap-2">
                        <select
                          value={exportFormat}
                          onChange={(e) => setExportFormat(e.target.value as "summary" | "detailed")}
                          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          <option value="summary">Summary</option>
                          <option value="detailed">Detailed</option>
                        </select>
                        <Button size="sm" onClick={handleExport}>
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                      </div>
                    </div>
                    
                    <ProductResultsTable
                      results={jobDetails.productResults}
                      onApplyCategory={handleApplyCategory}
                      isLoading={isLoading}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="progress" className="space-y-4 mt-0">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Real-time Progress Tracking</AlertTitle>
                    <AlertDescription>
                      Real-time progress updates and AI reasoning stream will be displayed here during job execution.
                      This feature is coming soon!
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                <TabsContent value="errors" className="space-y-4 mt-0">
                  {jobDetails.errors.length === 0 ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>No Errors</AlertTitle>
                      <AlertDescription>
                        This job completed without any errors.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Error Details</h3>
                      {jobDetails.errors.map((error, idx) => (
                        <Card key={idx} className="border-red-200">
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <Badge variant="destructive">{error.type}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(error.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm">{error.message}</p>
                              {error.product && (
                                <div className="bg-muted rounded-md p-2 mt-2">
                                  <p className="text-sm">
                                    <span className="font-medium">Product:</span> {error.product.title} ({error.product.handle})
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}