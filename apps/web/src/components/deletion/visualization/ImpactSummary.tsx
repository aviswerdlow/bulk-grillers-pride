'use client';

import React from 'react';
import { DeletionImpactSummary } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Info, 
  Package,
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPatternColors } from '@/components/accessibility/patterns/SeverityPatterns';

interface ImpactSummaryProps {
  summary: DeletionImpactSummary;
  className?: string;
}

const severityConfig = {
  low: { label: 'Low', color: 'bg-blue-100 text-blue-800', icon: Info },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
};

const impactTypeIcons = {
  direct: Package,
  cascade: Layers,
  reference: AlertCircle
};

export function ImpactSummary({ summary, className }: ImpactSummaryProps) {
  const {
    totalItems,
    directItems,
    cascadeItems,
    referenceItems,
    byType,
    bySeverity,
    estimatedTime,
    warnings = []
  } = summary;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Total Impact Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deletion Impact Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {totalItems}
              </p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <p className="text-2xl font-semibold text-blue-600">
                  {directItems}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Direct</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Layers className="h-4 w-4 text-orange-600" />
                <p className="text-2xl font-semibold text-orange-600">
                  {cascadeItems}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Cascade</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <p className="text-2xl font-semibold text-yellow-600">
                  {referenceItems}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">References</p>
            </div>
          </div>

          {estimatedTime && (
            <div className="flex items-center justify-center gap-2 pt-2 border-t">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Estimated time: <span className="font-medium">{formatTime(estimatedTime)}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm capitalize">{type}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Severity Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Severity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(bySeverity).map(([severity, count]) => {
              const config = severityConfig[severity as keyof typeof severityConfig];
              const Icon = config.icon;
              
              return (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{config.label}</span>
                  </div>
                  <Badge className={config.color}>{count}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}