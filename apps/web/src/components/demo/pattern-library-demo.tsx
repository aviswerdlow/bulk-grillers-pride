'use client';

import React from 'react';
import { 
  SeverityIndicator, 
  SeverityIndicatorWithIcon,
  SeverityIndicatorGroup,
  type SeverityLevel,
  patterns,
} from '@/components/accessibility/patterns';
import { useAccessibilityPreferences } from '@/contexts/accessibility';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

const iconMap = {
  info: <Info className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  danger: <AlertCircle className="w-4 h-4" />,
  critical: <XCircle className="w-4 h-4" />,
};

export function PatternLibraryDemo() {
  const { preferences } = useAccessibilityPreferences();
  const severities: SeverityLevel[] = ['info', 'warning', 'danger', 'critical'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SVG Pattern Library</CardTitle>
          <CardDescription>
            Visual patterns for colorblind-accessible severity indicators
            {preferences?.highContrast && ' (High Contrast Mode Active)'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Pattern Showcase */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Severity Patterns</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {severities.map((severity) => {
                const pattern = patterns[severity];
                return (
                  <div key={severity} className="space-y-2">
                    <h4 className="font-medium capitalize">{severity}</h4>
                    <div 
                      className="h-24 rounded-md border-2 relative overflow-hidden"
                      style={{
                        borderColor: pattern.colorScheme.primary,
                        backgroundColor: pattern.colorScheme.secondary,
                      }}
                    >
                      <SeverityIndicator
                        severity={severity}
                        className="absolute inset-0 w-full h-full rounded-none border-0"
                        showPattern={true}
                        variant="filled"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pattern.textureDescription}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Size Variants */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Size Variants</h3>
            <div className="space-y-2">
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <div key={size} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-12">{size.toUpperCase()}</span>
                  <div className="flex gap-2">
                    {severities.map((severity) => (
                      <SeverityIndicator
                        key={severity}
                        severity={severity}
                        size={size}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Style Variants */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Style Variants</h3>
            <div className="space-y-4">
              {(['filled', 'outlined', 'text'] as const).map((variant) => (
                <div key={variant}>
                  <h4 className="text-sm font-medium mb-2 capitalize">{variant}</h4>
                  <div className="flex gap-2">
                    {severities.map((severity) => (
                      <SeverityIndicator
                        key={severity}
                        severity={severity}
                        variant={variant}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* With Icons */}
          <div>
            <h3 className="text-lg font-semibold mb-4">With Icons</h3>
            <div className="flex gap-2 flex-wrap">
              {severities.map((severity) => (
                <SeverityIndicatorWithIcon
                  key={severity}
                  severity={severity}
                  icon={iconMap[severity]}
                  label={severity.charAt(0).toUpperCase() + severity.slice(1)}
                />
              ))}
            </div>
          </div>

          {/* Group Example */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Grouped Indicators</h3>
            <SeverityIndicatorGroup
              items={[
                { severity: 'critical', label: 'Critical Issues', count: 3 },
                { severity: 'danger', label: 'Errors', count: 7 },
                { severity: 'warning', label: 'Warnings', count: 12 },
                { severity: 'info', label: 'Info', count: 24 },
              ]}
            />
          </div>

          {/* Real-world Example */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Deletion Dialog Example</h3>
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <SeverityIndicatorWithIcon
                  severity="danger"
                  icon={iconMap.danger}
                  variant="filled"
                  size="lg"
                />
                <div className="flex-1">
                  <h4 className="font-semibold">Delete 5 Products?</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    This action cannot be undone. The following products will be permanently deleted:
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                <SeverityIndicatorGroup
                  items={[
                    { severity: 'critical', label: 'Active', count: 2 },
                    { severity: 'warning', label: 'Draft', count: 1 },
                    { severity: 'info', label: 'Archived', count: 2 },
                  ]}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}