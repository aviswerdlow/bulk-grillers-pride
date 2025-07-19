"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Key,
  Globe,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface JobError {
  type: string;
  message: string;
  productId?: string;
  timestamp: number;
}

interface JobErrorAlertProps {
  jobId: string;
  status: string;
  errors: JobError[];
  orgSlug: string;
  onRetry?: () => void;
  className?: string;
}

export function JobErrorAlert({
  jobId,
  status,
  errors,
  orgSlug,
  onRetry,
  className,
}: JobErrorAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (status !== "failed" || errors.length === 0) {
    return null;
  }

  // Get the primary error (most recent or most important)
  const primaryError = errors.find(e => 
    e.type === "API_KEY_ERROR" || 
    e.type === "configuration_error"
  ) || errors[errors.length - 1];

  const getErrorIcon = (errorType: string) => {
    switch (errorType) {
      case "API_KEY_ERROR":
      case "configuration_error":
        return <Key className="h-4 w-4" />;
      case "MODEL_ERROR":
      case "not_found_error":
        return <Globe className="h-4 w-4" />;
      case "RATE_LIMIT_ERROR":
        return <AlertCircle className="h-4 w-4" />;
      case "permission_error":
      case "authentication_error":
        return <ShieldAlert className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getErrorSeverity = (errorType: string) => {
    switch (errorType) {
      case "API_KEY_ERROR":
      case "configuration_error":
        return "destructive";
      case "RATE_LIMIT_ERROR":
        return "warning";
      default:
        return "destructive";
    }
  };

  const getErrorAction = (error: JobError) => {
    if (error.type === "API_KEY_ERROR" || error.type === "configuration_error") {
      return (
        <Button asChild size="sm" variant="outline" className="mt-2">
          <Link href={`/${orgSlug}/settings?tab=api-keys`}>
            <Key className="h-4 w-4 mr-2" />
            Configure API Key
            <ExternalLink className="h-3 w-3 ml-2" />
          </Link>
        </Button>
      );
    }

    if (error.type === "RATE_LIMIT_ERROR" && onRetry) {
      return (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Later
        </Button>
      );
    }

    return null;
  };

  const getErrorTitle = (error: JobError) => {
    switch (error.type) {
      case "API_KEY_ERROR":
        return "API Key Error";
      case "configuration_error":
        return "Configuration Error";
      case "MODEL_ERROR":
        return "Model Not Available";
      case "RATE_LIMIT_ERROR":
        return "Rate Limit Exceeded";
      case "permission_error":
        return "Permission Denied";
      case "authentication_error":
        return "Authentication Failed";
      default:
        return "Processing Error";
    }
  };

  return (
    <Alert 
      variant={getErrorSeverity(primaryError.type) as "default" | "destructive"} 
      className={cn("border-2", className)}
    >
      <div className="flex items-start gap-2">
        {getErrorIcon(primaryError.type)}
        <div className="flex-1">
          <AlertTitle>{getErrorTitle(primaryError)}</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p>{primaryError.message}</p>
            {getErrorAction(primaryError)}
            
            {errors.length > 1 && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 -ml-2 h-auto p-2 hover:bg-transparent"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 mr-1 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                    {errors.length - 1} additional error{errors.length > 2 ? "s" : ""}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 space-y-2">
                    {errors.slice(0, -1).map((error, idx) => (
                      <Card key={idx} className="border-muted">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            {getErrorIcon(error.type)}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {getErrorTitle(error)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(error.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm">{error.message}</p>
                              {error.productId && (
                                <p className="text-xs text-muted-foreground">
                                  Product ID: {error.productId}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}