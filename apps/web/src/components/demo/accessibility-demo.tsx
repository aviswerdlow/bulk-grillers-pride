'use client';

import { useAccessibilityPreferences, useAnnouncement } from '@/contexts/accessibility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AccessibilityDemo() {
  const { preferences, updatePreferences } = useAccessibilityPreferences();
  const { announce } = useAnnouncement();

  if (!preferences) {
    return <div>Loading preferences...</div>;
  }

  const handlePreferenceChange = (key: keyof typeof preferences, value: boolean | string) => {
    updatePreferences({ [key]: value });
    announce(`${key} ${value ? 'enabled' : 'disabled'}`, 'polite');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Accessibility Settings</CardTitle>
        <CardDescription>
          Configure your accessibility preferences for the best experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Motion Preferences */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="reduced-motion">Reduced Motion</Label>
            <p className="text-sm text-muted-foreground">
              Minimize animations and transitions
            </p>
          </div>
          <Switch
            id="reduced-motion"
            checked={preferences.reducedMotion}
            onCheckedChange={(checked: boolean) => handlePreferenceChange('reducedMotion', checked)}
          />
        </div>

        {/* High Contrast */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="high-contrast">High Contrast</Label>
            <p className="text-sm text-muted-foreground">
              Increase contrast for better visibility
            </p>
          </div>
          <Switch
            id="high-contrast"
            checked={preferences.highContrast}
            onCheckedChange={(checked: boolean) => handlePreferenceChange('highContrast', checked)}
          />
        </div>

        {/* Screen Reader */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="screen-reader">Screen Reader Active</Label>
            <p className="text-sm text-muted-foreground">
              Optimize for screen reader usage
            </p>
          </div>
          <Switch
            id="screen-reader"
            checked={preferences.screenReaderActive}
            onCheckedChange={(checked: boolean) => handlePreferenceChange('screenReaderActive', checked)}
          />
        </div>

        {/* Keyboard Navigation */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="keyboard-nav">Keyboard Navigation</Label>
            <p className="text-sm text-muted-foreground">
              Enhanced keyboard navigation support
            </p>
          </div>
          <Switch
            id="keyboard-nav"
            checked={preferences.keyboardNavigation}
            onCheckedChange={(checked: boolean) => handlePreferenceChange('keyboardNavigation', checked)}
          />
        </div>

        {/* Confirmation Method */}
        <div className="space-y-2">
          <Label htmlFor="confirmation-method">Confirmation Method</Label>
          <Select
            value={preferences.preferredConfirmationMethod}
            onValueChange={(value) => handlePreferenceChange('preferredConfirmationMethod', value)}
          >
            <SelectTrigger id="confirmation-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard_click">Standard Click</SelectItem>
              <SelectItem value="hold_to_confirm">Hold to Confirm</SelectItem>
              <SelectItem value="type_to_confirm">Type to Confirm</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Focus Indicator Style */}
        <div className="space-y-2">
          <Label htmlFor="focus-style">Focus Indicator Style</Label>
          <Select
            value={preferences.focusIndicatorStyle}
            onValueChange={(value) => handlePreferenceChange('focusIndicatorStyle', value)}
          >
            <SelectTrigger id="focus-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="high-visibility">High Visibility</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Announcement Verbosity */}
        <div className="space-y-2">
          <Label htmlFor="verbosity">Announcement Verbosity</Label>
          <Select
            value={preferences.announcementVerbosity}
            onValueChange={(value) => handlePreferenceChange('announcementVerbosity', value)}
          >
            <SelectTrigger id="verbosity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimal">Minimal</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="verbose">Verbose</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Test Announcement */}
        <div className="pt-4 border-t">
          <Button
            onClick={() => announce('This is a test announcement for screen readers', 'assertive')}
            variant="outline"
            className="w-full"
          >
            Test Screen Reader Announcement
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}