/**
 * Accessibility Dashboard Component
 * 
 * Displays accessibility test results and metrics
 * Used for monitoring and tracking accessibility compliance
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

interface AccessibilityMetrics {
  wcagCompliance: {
    level: 'A' | 'AA' | 'AAA';
    score: number;
    violations: number;
  };
  testCoverage: {
    unit: number;
    e2e: number;
    manual: number;
  };
  issues: {
    blocker: number;
    critical: number;
    major: number;
    minor: number;
  };
  recentScans: Array<{
    page: string;
    violations: number;
    timestamp: Date;
  }>;
}

interface AccessibilityDashboardProps {
  metrics: AccessibilityMetrics;
  onRunTests?: () => void;
}

export function AccessibilityDashboard({ metrics, onRunTests }: AccessibilityDashboardProps) {
  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getIssueSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'blocker':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'major':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'minor':
        return <Info className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const totalIssues = Object.values(metrics.issues).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Accessibility Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and track accessibility compliance across your application
          </p>
        </div>
        {onRunTests && (
          <button
            onClick={onRunTests}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            aria-label="Run accessibility tests"
          >
            Run Tests
          </button>
        )}
      </div>

      {/* WCAG Compliance Card */}
      <Card>
        <CardHeader>
          <CardTitle>WCAG 2.1 Compliance</CardTitle>
          <CardDescription>
            Current compliance level: {metrics.wcagCompliance.level}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                <span className={getComplianceColor(metrics.wcagCompliance.score)}>
                  {metrics.wcagCompliance.score}%
                </span>
              </span>
              <Badge variant={metrics.wcagCompliance.violations === 0 ? 'default' : 'destructive'}>
                {metrics.wcagCompliance.violations} violations
              </Badge>
            </div>
            <Progress 
              value={metrics.wcagCompliance.score} 
              className="h-3"
              aria-label={`WCAG compliance score: ${metrics.wcagCompliance.score}%`}
            />
            {metrics.wcagCompliance.violations > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  {metrics.wcagCompliance.violations} accessibility violations need to be addressed
                  to achieve full WCAG {metrics.wcagCompliance.level} compliance.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Coverage Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unit Test Coverage</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.testCoverage.unit}%</div>
            <Progress value={metrics.testCoverage.unit} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Component-level accessibility tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">E2E Test Coverage</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.testCoverage.e2e}%</div>
            <Progress value={metrics.testCoverage.e2e} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              End-to-end accessibility scenarios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Test Coverage</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.testCoverage.manual}%</div>
            <Progress value={metrics.testCoverage.manual} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Screen reader and keyboard tests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Issues Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Issues</CardTitle>
          <CardDescription>
            {totalIssues === 0 
              ? 'No accessibility issues detected' 
              : `${totalIssues} total issues across all severity levels`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(metrics.issues).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getIssueSeverityIcon(severity)}
                  <span className="capitalize">{severity}</span>
                </div>
                <Badge variant={count === 0 ? 'secondary' : 'outline'}>
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Scans */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Accessibility Scans</CardTitle>
          <CardDescription>
            Latest automated scan results by page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.recentScans.map((scan, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">{scan.page}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(scan.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <Badge 
                  variant={scan.violations === 0 ? 'default' : 'destructive'}
                  aria-label={`${scan.violations} violations on ${scan.page}`}
                >
                  {scan.violations === 0 ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Passed
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      {scan.violations} violations
                    </>
                  )}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1 text-sm border rounded-md hover:bg-accent">
              View Full Report
            </button>
            <button className="px-3 py-1 text-sm border rounded-md hover:bg-accent">
              Export Metrics
            </button>
            <button className="px-3 py-1 text-sm border rounded-md hover:bg-accent">
              Configure Alerts
            </button>
            <button className="px-3 py-1 text-sm border rounded-md hover:bg-accent">
              View Guidelines
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Example usage component
export function AccessibilityDashboardExample() {
  const mockMetrics: AccessibilityMetrics = {
    wcagCompliance: {
      level: 'AA',
      score: 87,
      violations: 12
    },
    testCoverage: {
      unit: 75,
      e2e: 60,
      manual: 40
    },
    issues: {
      blocker: 0,
      critical: 2,
      major: 5,
      minor: 8
    },
    recentScans: [
      { page: 'Dashboard', violations: 0, timestamp: new Date() },
      { page: 'Products', violations: 3, timestamp: new Date() },
      { page: 'Categories', violations: 2, timestamp: new Date() },
      { page: 'Settings', violations: 0, timestamp: new Date() }
    ]
  };

  return <AccessibilityDashboard metrics={mockMetrics} />;
}