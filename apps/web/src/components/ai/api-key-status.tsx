"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Key, CheckCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiKeyStatusProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
  provider?: string;
}

export function ApiKeyStatus({ organizationId, orgSlug, provider }: ApiKeyStatusProps) {
  // Check API key configuration
  const apiKeyStatus = useQuery(
    api.functions.ai.categorization.validateApiKeyConfiguration,
    { organizationId, provider }
  );

  // Loading state
  if (apiKeyStatus === undefined) {
    return (
      <Alert>
        <Skeleton className="h-4 w-4 rounded-full" />
        <div className="ml-2 space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
      </Alert>
    );
  }

  // API key is configured and valid
  if (apiKeyStatus.hasApiKey && apiKeyStatus.isValid) {
    return (
      <Alert className="border-semantic-success bg-semantic-success pattern-success">
        <CheckCircle className="h-4 w-4 text-semantic-success" />
        <AlertTitle className="text-semantic-success">API Key Configured</AlertTitle>
        <AlertDescription className="text-semantic-success">
          Your {apiKeyStatus.provider} API key is configured and ready to use.
        </AlertDescription>
      </Alert>
    );
  }

  // No API key configured
  if (!apiKeyStatus.hasApiKey) {
    return (
      <Alert className="border-semantic-warning bg-semantic-warning pattern-warning">
        <AlertCircle className="h-4 w-4 text-semantic-warning" />
        <AlertTitle className="text-semantic-warning">API Key Required</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="text-semantic-warning">
            You need to configure your {apiKeyStatus.provider || "AI provider"} API key before you can use AI categorization.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link href={`/${orgSlug}/settings?tab=api-keys`}>
              <Key className="h-4 w-4 mr-2" />
              Configure API Key
              <ExternalLink className="h-3 w-3 ml-2" />
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // API key is invalid
  return (
    <Alert className="border-semantic-danger bg-semantic-danger pattern-danger">
      <AlertCircle className="h-4 w-4 text-semantic-danger" />
      <AlertTitle className="text-semantic-danger">Invalid API Key</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-semantic-danger">
          {apiKeyStatus.error || `Your ${apiKeyStatus.provider} API key appears to be invalid.`}
        </p>
        <Button asChild size="sm" variant="outline" className="mt-2">
          <Link href={`/${orgSlug}/settings?tab=api-keys`}>
            <Key className="h-4 w-4 mr-2" />
            Update API Key
            <ExternalLink className="h-3 w-3 ml-2" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}