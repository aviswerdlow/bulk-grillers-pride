"use client";

import { useState } from "react";
import { MoreHorizontal, Eye, Activity, Download, RefreshCw, Square, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface JobActionsDropdownProps {
  jobId: string;
  status: string;
  onViewDetails: (jobId: string) => void;
  onViewProgress: (jobId: string) => void;
  onDownloadResults: (jobId: string) => void;
  onRerunFailed: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onDeleteJob?: (jobId: string) => void;
}

export function JobActionsDropdown({
  jobId,
  status,
  onViewDetails,
  onViewProgress,
  onDownloadResults,
  onRerunFailed,
  onCancelJob,
  onDeleteJob,
}: JobActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void, actionName: string) => {
    setIsOpen(false);
    try {
      action();
    } catch (error) {
      toast.error(`Failed to ${actionName}`);
      console.error(`Error during ${actionName}:`, error);
    }
  };

  const isRunning = status === "running" || status === "pending";
  const isCompleted = status === "completed";
  const hasFailed = status === "failed" || status === "partial_success";

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleAction(() => onViewDetails(jobId), "view details")}
          className="cursor-pointer"
        >
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        
        {isRunning && (
          <DropdownMenuItem
            onClick={() => handleAction(() => onViewProgress(jobId), "view progress")}
            className="cursor-pointer"
          >
            <Activity className="mr-2 h-4 w-4" />
            View Progress
          </DropdownMenuItem>
        )}

        {(isCompleted || hasFailed) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleAction(() => onDownloadResults(jobId), "download results")}
              className="cursor-pointer"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Results
            </DropdownMenuItem>
          </>
        )}

        {hasFailed && (
          <DropdownMenuItem
            onClick={() => handleAction(() => onRerunFailed(jobId), "re-run failed items")}
            className="cursor-pointer"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-run Failed
          </DropdownMenuItem>
        )}

        {isRunning && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleAction(() => onCancelJob(jobId), "cancel job")}
              className="cursor-pointer text-destructive"
            >
              <Square className="mr-2 h-4 w-4" />
              Cancel Job
            </DropdownMenuItem>
          </>
        )}

        {onDeleteJob && !isRunning && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleAction(() => onDeleteJob(jobId), "delete job")}
              className="cursor-pointer text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Job
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}