"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, XCircle, Info } from "lucide-react";

export default function SemanticColorsDemo() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold text-semantic-primary">Semantic Color System Demo</h1>
      <p className="text-lg text-semantic-secondary">This page demonstrates the semantic color system that adapts to dark mode automatically.</p>

      {/* Status Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Status Indicators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <CheckCircle className="h-6 w-6 text-semantic-success" />
            <span className="text-semantic-success">Success Status</span>
          </div>
          <div className="flex items-center gap-4">
            <Info className="h-6 w-6 text-semantic-info" />
            <span className="text-semantic-info">Info Status</span>
          </div>
          <div className="flex items-center gap-4">
            <AlertCircle className="h-6 w-6 text-semantic-warning" />
            <span className="text-semantic-warning">Warning Status</span>
          </div>
          <div className="flex items-center gap-4">
            <XCircle className="h-6 w-6 text-semantic-danger" />
            <span className="text-semantic-danger">Danger Status</span>
          </div>
        </CardContent>
      </Card>

      {/* Alert Examples with Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Components with Pattern Overlays</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-semantic-success bg-semantic-success pattern-success">
            <CheckCircle className="h-4 w-4 text-semantic-success" />
            <AlertTitle className="text-semantic-success">Success Alert</AlertTitle>
            <AlertDescription className="text-semantic-success">
              This alert uses semantic colors and includes a pattern overlay for colorblind users.
            </AlertDescription>
          </Alert>

          <Alert className="border-semantic-info bg-semantic-info pattern-info">
            <Info className="h-4 w-4 text-semantic-info" />
            <AlertTitle className="text-semantic-info">Info Alert</AlertTitle>
            <AlertDescription className="text-semantic-info">
              Information alert with dot pattern overlay.
            </AlertDescription>
          </Alert>

          <Alert className="border-semantic-warning bg-semantic-warning pattern-warning">
            <AlertCircle className="h-4 w-4 text-semantic-warning" />
            <AlertTitle className="text-semantic-warning">Warning Alert</AlertTitle>
            <AlertDescription className="text-semantic-warning">
              Warning alert with diagonal stripe pattern overlay.
            </AlertDescription>
          </Alert>

          <Alert className="border-semantic-danger bg-semantic-danger pattern-danger">
            <XCircle className="h-4 w-4 text-semantic-danger" />
            <AlertTitle className="text-semantic-danger">Danger Alert</AlertTitle>
            <AlertDescription className="text-semantic-danger">
              Danger alert with crosshatch pattern overlay.
            </AlertDescription>
          </Alert>

          <Alert className="border-semantic-critical bg-semantic-critical pattern-critical">
            <XCircle className="h-4 w-4 text-semantic-critical" />
            <AlertTitle className="text-semantic-critical">Critical Alert</AlertTitle>
            <AlertDescription className="text-semantic-critical">
              Critical alert with checkerboard pattern overlay.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Focus Styles */}
      <Card>
        <CardHeader>
          <CardTitle>Semantic Focus Styles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button className="focus-default">Default Focus</Button>
            <Button variant="destructive" className="focus-danger">Danger Focus</Button>
            <Button variant="outline" className="focus-warning">Warning Focus</Button>
            <Button variant="secondary" className="focus-success">Success Focus</Button>
          </div>
        </CardContent>
      </Card>

      {/* Text Hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle>Text Color Hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-semantic-primary">Primary text (highest emphasis)</p>
          <p className="text-semantic-secondary">Secondary text (medium emphasis)</p>
          <p className="text-semantic-tertiary">Tertiary text (lowest emphasis)</p>
        </CardContent>
      </Card>

      {/* Background Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Background Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-semantic-primary text-white rounded">Primary Background</div>
          <div className="p-4 bg-semantic-secondary rounded">Secondary Background</div>
          <div className="p-4 bg-semantic-tertiary rounded">Tertiary Background</div>
        </CardContent>
      </Card>
    </div>
  );
}