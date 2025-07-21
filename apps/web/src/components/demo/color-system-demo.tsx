'use client';

import React from 'react';

export function ColorSystemDemo() {
  return (
    <div className="p-8 space-y-8 bg-white dark:bg-gray-900">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Color System Visual Guide
      </h1>

      {/* Semantic Colors Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Semantic Colors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Info */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700 dark:text-gray-300">Info</h3>
            <div className="bg-semantic-info text-semantic-info p-4 rounded-lg border-2 border-semantic-info">
              <p className="font-medium">Info Background</p>
              <p className="text-sm opacity-90">Used for informational messages</p>
            </div>
            <div className="bg-semantic-info text-semantic-info p-4 rounded-lg border-2 border-semantic-info pattern-info">
              <p className="font-medium relative z-10">With Dot Pattern</p>
              <p className="text-sm opacity-90 relative z-10">Pattern for colorblind users</p>
            </div>
          </div>

          {/* Warning */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700 dark:text-gray-300">Warning</h3>
            <div className="bg-semantic-warning text-semantic-warning p-4 rounded-lg border-2 border-semantic-warning">
              <p className="font-medium">Warning Background</p>
              <p className="text-sm opacity-90">Used for warning messages</p>
            </div>
            <div className="bg-semantic-warning text-semantic-warning p-4 rounded-lg border-2 border-semantic-warning pattern-warning">
              <p className="font-medium relative z-10">With Stripe Pattern</p>
              <p className="text-sm opacity-90 relative z-10">Diagonal stripes for emphasis</p>
            </div>
          </div>

          {/* Danger */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700 dark:text-gray-300">Danger</h3>
            <div className="bg-semantic-danger text-semantic-danger p-4 rounded-lg border-2 border-semantic-danger">
              <p className="font-medium">Danger Background</p>
              <p className="text-sm opacity-90">Used for error messages</p>
            </div>
            <div className="bg-semantic-danger text-semantic-danger p-4 rounded-lg border-2 border-semantic-danger pattern-danger">
              <p className="font-medium relative z-10">With Crosshatch Pattern</p>
              <p className="text-sm opacity-90 relative z-10">Crosshatch for high visibility</p>
            </div>
          </div>

          {/* Critical */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700 dark:text-gray-300">Critical</h3>
            <div className="bg-semantic-critical text-semantic-critical p-4 rounded-lg border-2 border-semantic-critical">
              <p className="font-medium">Critical Background</p>
              <p className="text-sm opacity-90">Used for destructive actions</p>
            </div>
            <div className="bg-semantic-critical text-semantic-critical p-4 rounded-lg border-2 border-semantic-critical pattern-critical">
              <p className="font-medium relative z-10">With Checkerboard Pattern</p>
              <p className="text-sm opacity-90 relative z-10">Maximum severity indicator</p>
            </div>
          </div>

          {/* Success */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700 dark:text-gray-300">Success</h3>
            <div className="bg-semantic-success text-semantic-success p-4 rounded-lg border-2 border-semantic-success">
              <p className="font-medium">Success Background</p>
              <p className="text-sm opacity-90">Used for success messages</p>
            </div>
          </div>
        </div>
      </section>

      {/* Focus Styles Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Focus Styles
        </h2>
        <div className="flex flex-wrap gap-4">
          <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg focus-default">
            Default Focus (Tab to see)
          </button>
          <button className="px-4 py-2 bg-semantic-info text-white rounded-lg focus-default">
            Info Button Focus
          </button>
          <button className="px-4 py-2 bg-semantic-warning text-semantic-warning rounded-lg focus-warning">
            Warning Focus
          </button>
          <button className="px-4 py-2 bg-semantic-danger text-white rounded-lg focus-danger">
            Danger Focus
          </button>
          <button className="px-4 py-2 bg-semantic-success text-white rounded-lg focus-success">
            Success Focus
          </button>
        </div>
      </section>

      {/* Pattern Opacity Control */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Pattern Opacity Control
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-semantic-warning text-semantic-warning p-4 rounded-lg border-2 border-semantic-warning pattern-warning" style={{'--pattern-opacity': '0.3'} as React.CSSProperties}>
            <p className="font-medium relative z-10">30% Opacity (Default)</p>
            <p className="text-sm relative z-10">Subtle pattern overlay</p>
          </div>
          <div className="bg-semantic-warning text-semantic-warning p-4 rounded-lg border-2 border-semantic-warning pattern-warning" style={{'--pattern-opacity': '0.6'} as React.CSSProperties}>
            <p className="font-medium relative z-10">60% Opacity</p>
            <p className="text-sm relative z-10">Medium visibility</p>
          </div>
          <div className="bg-semantic-warning text-semantic-warning p-4 rounded-lg border-2 border-semantic-warning pattern-warning" style={{'--pattern-opacity': '1'} as React.CSSProperties}>
            <p className="font-medium relative z-10">100% Opacity</p>
            <p className="text-sm relative z-10">Full pattern visibility</p>
          </div>
        </div>
      </section>

      {/* Text Color Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Text Colors on White Background
        </h2>
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-2">
          <p className="text-semantic-primary">Primary text (Gray-900)</p>
          <p className="text-semantic-secondary">Secondary text (Gray-700)</p>
          <p className="text-semantic-tertiary">Tertiary text (Gray-500)</p>
          <p className="text-semantic-info">Info text (Blue Dark)</p>
          <p className="text-semantic-warning">Warning text (Yellow Dark)</p>
          <p className="text-semantic-danger">Danger text (Red Dark)</p>
          <p className="text-semantic-success">Success text (Green Dark)</p>
        </div>
      </section>

      {/* Component Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Component Examples
        </h2>
        
        {/* Alert Examples */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Alerts</h3>
          
          <div className="bg-semantic-info border-2 border-semantic-info pattern-info rounded-lg p-4">
            <h4 className="text-semantic-info font-semibold relative z-10">Information</h4>
            <p className="text-gray-700 text-sm mt-1 relative z-10">
              This is an informational message with accessible colors and pattern.
            </p>
          </div>

          <div className="bg-semantic-warning border-2 border-semantic-warning pattern-warning rounded-lg p-4">
            <h4 className="text-semantic-warning font-semibold relative z-10">Warning</h4>
            <p className="text-gray-700 text-sm mt-1 relative z-10">
              This is a warning message that needs your attention.
            </p>
          </div>

          <div className="bg-semantic-danger border-2 border-semantic-danger pattern-danger rounded-lg p-4">
            <h4 className="text-semantic-danger font-semibold relative z-10">Error</h4>
            <p className="text-gray-700 text-sm mt-1 relative z-10">
              This is an error message indicating something went wrong.
            </p>
          </div>

          <div className="bg-semantic-critical border-2 border-semantic-critical pattern-critical rounded-lg p-4">
            <h4 className="text-semantic-critical font-semibold relative z-10">Critical</h4>
            <p className="text-white text-sm mt-1 relative z-10">
              This is a critical message for destructive actions.
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Status Badges</h3>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-semantic-success text-semantic-success">
              Active
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-semantic-warning text-semantic-warning">
              Pending
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-semantic-danger text-semantic-danger">
              Error
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-semantic-info text-semantic-info">
              Processing
            </span>
          </div>
        </div>
      </section>

      {/* High Contrast Mode Note */}
      <section className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
          Testing Notes
        </h2>
        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>• Enable system high contrast mode to see pattern opacity changes</li>
          <li>• Toggle dark mode to see automatic color adjustments</li>
          <li>• Use Tab key to test focus indicators</li>
          <li>• Test with browser zoom at 200% for text scaling</li>
          <li>• Use grayscale filter to verify pattern differentiation</li>
        </ul>
      </section>
    </div>
  );
}