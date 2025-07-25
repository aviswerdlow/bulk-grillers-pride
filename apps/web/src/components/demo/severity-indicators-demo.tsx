'use client';

import React from 'react';
import { 
  SeverityIndicatorEnhanced,
  InfoIndicator,
  WarningIndicator,
  DangerIndicator,
  CriticalIndicator
} from '@/components/accessibility/patterns/SeverityIndicatorEnhanced';

export function SeverityIndicatorsDemo() {
  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Pattern-Based Severity Indicators</h1>
        <p className="text-gray-600 mb-6">
          Accessible severity indicators that work without color reliance, using unique patterns for each severity level.
        </p>
      </div>

      {/* Basic Examples */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Basic Usage</h2>
        <div className="space-y-3">
          <SeverityIndicatorEnhanced severity="info" />
          <SeverityIndicatorEnhanced severity="warning" />
          <SeverityIndicatorEnhanced severity="danger" />
          <SeverityIndicatorEnhanced severity="critical" />
        </div>
      </section>

      {/* With Labels and Messages */}
      <section>
        <h2 className="text-xl font-semibold mb-4">With Labels and Messages</h2>
        <div className="space-y-3">
          <InfoIndicator 
            label="System Update" 
            message="Changes will be saved automatically"
          />
          <WarningIndicator 
            label="Product References" 
            message="External links will break"
          />
          <DangerIndicator 
            label="Delete Product" 
            message="This action cannot be undone"
          />
          <CriticalIndicator 
            label="Permanent Data Loss" 
            message="All associated data will be permanently deleted"
          />
        </div>
      </section>

      {/* Size Variants */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Size Variants</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 w-16">Small:</span>
            <SeverityIndicatorEnhanced severity="warning" size="sm" label="Warning" message="Be careful" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 w-16">Medium:</span>
            <SeverityIndicatorEnhanced severity="warning" size="md" label="Warning" message="Be careful" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 w-16">Large:</span>
            <SeverityIndicatorEnhanced severity="warning" size="lg" label="Warning" message="Be careful" />
          </div>
        </div>
      </section>

      {/* Style Variants */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Style Variants</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Filled (Default)</h3>
            <div className="flex gap-3">
              <SeverityIndicatorEnhanced severity="info" variant="filled" label="Info" />
              <SeverityIndicatorEnhanced severity="warning" variant="filled" label="Warning" />
              <SeverityIndicatorEnhanced severity="danger" variant="filled" label="Danger" />
              <SeverityIndicatorEnhanced severity="critical" variant="filled" label="Critical" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Outlined</h3>
            <div className="flex gap-3">
              <SeverityIndicatorEnhanced severity="info" variant="outlined" label="Info" />
              <SeverityIndicatorEnhanced severity="warning" variant="outlined" label="Warning" />
              <SeverityIndicatorEnhanced severity="danger" variant="outlined" label="Danger" />
              <SeverityIndicatorEnhanced severity="critical" variant="outlined" label="Critical" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Text Only</h3>
            <div className="flex gap-3">
              <SeverityIndicatorEnhanced severity="info" variant="text" label="Info" />
              <SeverityIndicatorEnhanced severity="warning" variant="text" label="Warning" />
              <SeverityIndicatorEnhanced severity="danger" variant="text" label="Danger" />
              <SeverityIndicatorEnhanced severity="critical" variant="text" label="Critical" />
            </div>
          </div>
        </div>
      </section>

      {/* Without Patterns */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Without Patterns (Color Only)</h2>
        <p className="text-sm text-gray-600 mb-2">For comparison - these rely on color alone and are less accessible:</p>
        <div className="flex gap-3">
          <SeverityIndicatorEnhanced severity="info" pattern={false} label="Info" />
          <SeverityIndicatorEnhanced severity="warning" pattern={false} label="Warning" />
          <SeverityIndicatorEnhanced severity="danger" pattern={false} label="Danger" />
          <SeverityIndicatorEnhanced severity="critical" pattern={false} label="Critical" />
        </div>
      </section>

      {/* Without Icons */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Without Icons</h2>
        <div className="space-y-3">
          <SeverityIndicatorEnhanced severity="info" showIcon={false} label="Info message without icon" />
          <SeverityIndicatorEnhanced severity="warning" showIcon={false} label="Warning message without icon" />
        </div>
      </section>

      {/* Real-World Example */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Real-World Example: Deletion Consequences</h2>
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <h3 className="font-medium mb-3">Deleting &quot;Premium Coffee Blend&quot; will have these consequences:</h3>
          
          <InfoIndicator 
            label="Archive Status" 
            message="Product will be moved to trash and can be restored within 30 days"
          />
          
          <WarningIndicator 
            label="External References" 
            message="3 blog posts link to this product and will show 404 errors"
          />
          
          <DangerIndicator 
            label="Order History" 
            message="Historical order data will be preserved but product details will be unavailable"
          />
          
          <CriticalIndicator 
            label="Permanent Deletion" 
            message="After 30 days, all product data including images will be permanently deleted"
          />
        </div>
      </section>

      {/* Accessibility Notes */}
      <section className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Accessibility Features</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Each severity level has a unique pattern visible without color</li>
          <li>Patterns are distinguishable in grayscale mode</li>
          <li>High contrast mode support with increased pattern visibility</li>
          <li>Proper ARIA labels and roles for screen readers</li>
          <li>Text meets WCAG AA contrast requirements (4.5:1)</li>
          <li>Icons and patterns marked as decorative (aria-hidden)</li>
          <li>Keyboard accessible with visible focus indicators</li>
        </ul>
      </section>
    </div>
  );
}