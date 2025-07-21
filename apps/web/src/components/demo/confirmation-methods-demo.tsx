'use client';

import React, { useState } from 'react';
import {
  HoldToConfirmButton,
  TypeToConfirmInput,
  ConfirmationMethodSelector,
  UnifiedConfirmationDialog,
  useConfirmation,
} from '@/components/accessibility/confirmations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, Save, Send } from 'lucide-react';

export function ConfirmationMethodsDemo() {
  const [holdResult, setHoldResult] = useState<string>('');
  const [typeResult, setTypeResult] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSeverity, setDialogSeverity] = useState<'info' | 'warning' | 'danger' | 'critical'>('danger');
  const { confirm, dialog } = useConfirmation();

  // Demo handlers
  const handleHoldConfirm = () => {
    setHoldResult('Action confirmed via hold!');
    toast.success('Hold confirmation successful');
  };

  const handleTypeConfirm = () => {
    setTypeResult('Action confirmed via typing!');
    toast.success('Type confirmation successful');
  };

  const handleDialogConfirm = async () => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Dialog action confirmed');
    setDialogOpen(false);
  };

  // Hook-based confirmation
  const handleHookConfirm = async () => {
    const confirmed = await confirm({
      title: 'Delete Everything?',
      description: 'This will permanently delete all your data. This action cannot be undone.',
      severity: 'critical',
    });

    if (confirmed) {
      toast.success('Hook-based confirmation accepted');
    } else {
      toast.info('Hook-based confirmation cancelled');
    }
  };

  return (
    <div className="space-y-6">
      {/* Method Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Confirmation Method Selector</CardTitle>
          <CardDescription>
            Choose your preferred confirmation method for important actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmationMethodSelector
            savePreference={true}
            showUnavailable={true}
          />
        </CardContent>
      </Card>

      {/* Hold to Confirm Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Hold to Confirm</CardTitle>
          <CardDescription>
            Press and hold the button for 3 seconds to confirm the action
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <HoldToConfirmButton
              onConfirm={handleHoldConfirm}
              onCancel={() => setHoldResult('Cancelled')}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Item
            </HoldToConfirmButton>

            <HoldToConfirmButton
              onConfirm={handleHoldConfirm}
              holdDuration={5000}
              progressColor="rgb(239, 68, 68)"
              variant="destructive"
            >
              Delete All (5s hold)
            </HoldToConfirmButton>

            <HoldToConfirmButton
              onConfirm={handleHoldConfirm}
              holdDuration={2000}
              progressColor="rgb(34, 197, 94)"
              variant="outline"
            >
              <Save className="mr-2 h-4 w-4" />
              Quick Save (2s)
            </HoldToConfirmButton>
          </div>

          {holdResult && (
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded">
              Result: {holdResult}
            </p>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Mobile devices will receive haptic feedback</p>
            <p>• Screen readers announce progress at 25%, 50%, and 75%</p>
            <p>• Moving more than 50 pixels cancels the action</p>
            <p>• Keyboard users can press and hold Enter/Space</p>
          </div>
        </CardContent>
      </Card>

      {/* Type to Confirm Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Type to Confirm</CardTitle>
          <CardDescription>
            Type the exact phrase to confirm the action
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <TypeToConfirmInput
              confirmationPhrase="delete my account"
              onConfirm={handleTypeConfirm}
              onCancel={() => setTypeResult('Cancelled')}
              label="Type 'delete my account' to confirm"
              caseSensitive={false}
              allowPaste={false}
              showHint={true}
              hintObfuscation="partial"
            />

            {typeResult && (
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded">
                Result: {typeResult}
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Custom Phrase Example</h4>
            <TypeToConfirmInput
              confirmationPhrase="DEPLOY"
              onConfirm={() => toast.success('Deployment confirmed!')}
              label="Type 'DEPLOY' to push to production"
              caseSensitive={true}
              allowPaste={true}
              showHint={true}
              hintObfuscation="none"
              confirmButtonText="Deploy"
              placeholder="Type deployment confirmation"
            />
          </div>
        </CardContent>
      </Card>

      {/* Unified Confirmation Dialog */}
      <Card>
        <CardHeader>
          <CardTitle>Unified Confirmation Dialog</CardTitle>
          <CardDescription>
            Complete confirmation dialog that respects user's preferred method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setDialogSeverity('info');
                setDialogOpen(true);
              }}
              variant="outline"
            >
              Info Dialog
            </Button>
            <Button
              onClick={() => {
                setDialogSeverity('warning');
                setDialogOpen(true);
              }}
              variant="outline"
              className="text-yellow-600"
            >
              Warning Dialog
            </Button>
            <Button
              onClick={() => {
                setDialogSeverity('danger');
                setDialogOpen(true);
              }}
              variant="outline"
              className="text-red-600"
            >
              Danger Dialog
            </Button>
            <Button
              onClick={() => {
                setDialogSeverity('critical');
                setDialogOpen(true);
              }}
              variant="outline"
              className="text-purple-600"
            >
              Critical Dialog
            </Button>
          </div>

          <div className="border-t pt-4">
            <Button onClick={handleHookConfirm} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Test Hook-based Confirmation
            </Button>
          </div>

          <UnifiedConfirmationDialog
            open={dialogOpen}
            onConfirm={handleDialogConfirm}
            onCancel={() => setDialogOpen(false)}
            title={`${dialogSeverity.charAt(0).toUpperCase() + dialogSeverity.slice(1)} Action`}
            description="This dialog will use your preferred confirmation method."
            severity={dialogSeverity}
            confirmationPhrase="confirm action"
          >
            <div className="space-y-2 text-sm">
              <p>This is a demonstration of the unified confirmation dialog.</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Respects user's preferred confirmation method</li>
                <li>Provides appropriate severity indicators</li>
                <li>Includes focus management and announcements</li>
                <li>Supports async operations with loading states</li>
              </ul>
            </div>
          </UnifiedConfirmationDialog>
        </CardContent>
      </Card>

      {/* Hook-based dialog */}
      {dialog}

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Confirmation Method Features</CardTitle>
          <CardDescription>
            Comparison of different confirmation methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Method</th>
                  <th className="text-left py-2">Best For</th>
                  <th className="text-left py-2">Accessibility</th>
                  <th className="text-left py-2">Security</th>
                </tr>
              </thead>
              <tbody className="space-y-2">
                <tr className="border-b">
                  <td className="py-2 font-medium">Standard Click</td>
                  <td className="py-2">Quick actions, familiar UX</td>
                  <td className="py-2">✓ Keyboard, ✓ Screen reader</td>
                  <td className="py-2">Low - accidental clicks possible</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Hold to Confirm</td>
                  <td className="py-2">Preventing accidental actions</td>
                  <td className="py-2">✓ Touch, ✓ Keyboard, ✓ Announcements</td>
                  <td className="py-2">Medium - requires intentional action</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Type to Confirm</td>
                  <td className="py-2">Critical actions, clear intent</td>
                  <td className="py-2">✓ Keyboard required, ✓ Screen reader</td>
                  <td className="py-2">High - explicit confirmation</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Biometric</td>
                  <td className="py-2 text-muted-foreground">High security actions</td>
                  <td className="py-2 text-muted-foreground">Device dependent</td>
                  <td className="py-2 text-muted-foreground">Very High - unique identity</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}