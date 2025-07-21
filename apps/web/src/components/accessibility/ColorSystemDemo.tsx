'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ColorSwatchProps {
  name: string;
  cssVar: string;
  description?: string;
  textColor?: string;
}

function ColorSwatch({ name, cssVar, description, textColor = 'black' }: ColorSwatchProps) {
  return (
    <div className="flex flex-col gap-2">
      <div 
        className={cn(
          "w-full h-20 rounded-lg border-2 border-gray-300 flex items-center justify-center",
          "font-medium text-sm"
        )}
        style={{ 
          backgroundColor: `var(${cssVar})`,
          color: textColor 
        }}
      >
        {name}
      </div>
      <div className="text-xs space-y-1">
        <code className="font-mono text-gray-600">{cssVar}</code>
        {description && <p className="text-gray-500">{description}</p>}
      </div>
    </div>
  );
}

export function ColorSystemDemo() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Accessible Color System</h1>
        <p className="text-gray-600 mb-8">
          WCAG 2.1 AA/AAA compliant color palette with automatic high contrast and dark mode support.
        </p>
      </div>

      {/* Primary Colors */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Primary Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch 
            name="Info" 
            cssVar="--color-info" 
            description="Primary info color"
          />
          <ColorSwatch 
            name="Info Light" 
            cssVar="--color-info-light" 
            description="Info background"
          />
          <ColorSwatch 
            name="Info Dark" 
            cssVar="--color-info-dark" 
            description="Info text on light"
            textColor="white"
          />
          <ColorSwatch 
            name="Info HC" 
            cssVar="--color-info-hc" 
            description="High contrast"
            textColor="white"
          />
        </div>
      </section>

      {/* Warning Colors */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Warning Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch 
            name="Warning" 
            cssVar="--color-warning" 
            description="Primary warning"
          />
          <ColorSwatch 
            name="Warning Light" 
            cssVar="--color-warning-light" 
            description="Warning background"
          />
          <ColorSwatch 
            name="Warning Dark" 
            cssVar="--color-warning-dark" 
            description="Warning text"
            textColor="white"
          />
          <ColorSwatch 
            name="Warning HC" 
            cssVar="--color-warning-hc" 
            description="High contrast"
            textColor="white"
          />
        </div>
      </section>

      {/* Danger Colors */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Danger/Error Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch 
            name="Danger" 
            cssVar="--color-danger" 
            description="Primary danger"
            textColor="white"
          />
          <ColorSwatch 
            name="Danger Light" 
            cssVar="--color-danger-light" 
            description="Danger background"
          />
          <ColorSwatch 
            name="Danger Dark" 
            cssVar="--color-danger-dark" 
            description="Danger text"
            textColor="white"
          />
          <ColorSwatch 
            name="Danger HC" 
            cssVar="--color-danger-hc" 
            description="High contrast"
            textColor="white"
          />
        </div>
      </section>

      {/* Critical Colors */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Critical Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch 
            name="Critical" 
            cssVar="--color-critical" 
            description="Critical actions"
            textColor="white"
          />
          <ColorSwatch 
            name="Critical Light" 
            cssVar="--color-critical-light" 
            description="Critical tint"
          />
          <ColorSwatch 
            name="Critical Dark" 
            cssVar="--color-critical-dark" 
            description="Critical shade"
            textColor="white"
          />
          <ColorSwatch 
            name="Critical HC" 
            cssVar="--color-critical-hc" 
            description="High contrast"
            textColor="white"
          />
        </div>
      </section>

      {/* Success Colors */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Success Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch 
            name="Success" 
            cssVar="--color-success" 
            description="Primary success"
          />
          <ColorSwatch 
            name="Success Light" 
            cssVar="--color-success-light" 
            description="Success background"
          />
          <ColorSwatch 
            name="Success Dark" 
            cssVar="--color-success-dark" 
            description="Success text"
            textColor="white"
          />
          <ColorSwatch 
            name="Success HC" 
            cssVar="--color-success-hc" 
            description="High contrast"
            textColor="white"
          />
        </div>
      </section>

      {/* Semantic Usage Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Semantic Usage Examples</h2>
        <div className="space-y-4">
          {/* Info Alert */}
          <div 
            className="p-4 rounded-lg border-2"
            style={{ 
              backgroundColor: 'var(--bg-info)',
              borderColor: 'var(--border-info)',
              color: 'var(--text-info)'
            }}
          >
            <h3 className="font-semibold mb-1">Info Alert</h3>
            <p>This is an informational message using semantic color tokens.</p>
          </div>

          {/* Warning Alert */}
          <div 
            className="p-4 rounded-lg border-2"
            style={{ 
              backgroundColor: 'var(--bg-warning)',
              borderColor: 'var(--border-warning)',
              color: 'var(--text-warning)'
            }}
          >
            <h3 className="font-semibold mb-1">Warning Alert</h3>
            <p>This is a warning message that requires user attention.</p>
          </div>

          {/* Danger Alert */}
          <div 
            className="p-4 rounded-lg border-2"
            style={{ 
              backgroundColor: 'var(--bg-danger)',
              borderColor: 'var(--border-danger)',
              color: 'var(--text-danger)'
            }}
          >
            <h3 className="font-semibold mb-1">Danger Alert</h3>
            <p>This is an error message indicating a problem.</p>
          </div>

          {/* Success Alert */}
          <div 
            className="p-4 rounded-lg border-2"
            style={{ 
              backgroundColor: 'var(--bg-success)',
              borderColor: 'var(--border-success)',
              color: 'var(--text-success)'
            }}
          >
            <h3 className="font-semibold mb-1">Success Alert</h3>
            <p>This is a success message confirming an action.</p>
          </div>

          {/* Critical Alert */}
          <div 
            className="p-4 rounded-lg"
            style={{ 
              backgroundColor: 'var(--bg-critical)',
              color: 'var(--text-critical)'
            }}
          >
            <h3 className="font-semibold mb-1">Critical Alert</h3>
            <p>This is a critical message requiring immediate action.</p>
          </div>
        </div>
      </section>

      {/* Pattern Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Pattern Overlays</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="pattern-info h-20 rounded-lg border-2 border-semantic-info flex items-center justify-center">
              <span className="z-10 font-medium">Info Pattern</span>
            </div>
            <code className="text-xs font-mono">.pattern-info</code>
          </div>

          <div className="space-y-2">
            <div className="pattern-warning h-20 rounded-lg border-2 border-semantic-warning flex items-center justify-center">
              <span className="z-10 font-medium">Warning Pattern</span>
            </div>
            <code className="text-xs font-mono">.pattern-warning</code>
          </div>

          <div className="space-y-2">
            <div className="pattern-danger h-20 rounded-lg border-2 border-semantic-danger flex items-center justify-center">
              <span className="z-10 font-medium">Danger Pattern</span>
            </div>
            <code className="text-xs font-mono">.pattern-danger</code>
          </div>

          <div className="space-y-2">
            <div className="pattern-critical h-20 rounded-lg border-2 border-semantic-critical flex items-center justify-center">
              <span className="z-10 font-medium text-white">Critical Pattern</span>
            </div>
            <code className="text-xs font-mono">.pattern-critical</code>
          </div>
        </div>
      </section>

      {/* Focus States */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Focus States</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="px-4 py-2 rounded-lg bg-semantic-info text-white font-medium focus-default">
            Default Focus
          </button>
          <button className="px-4 py-2 rounded-lg bg-semantic-warning-dark text-white font-medium focus-warning">
            Warning Focus
          </button>
          <button className="px-4 py-2 rounded-lg bg-semantic-danger text-white font-medium focus-danger">
            Danger Focus
          </button>
          <button className="px-4 py-2 rounded-lg bg-semantic-success-dark text-white font-medium focus-success">
            Success Focus
          </button>
        </div>
      </section>

      {/* Usage Guidelines */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Usage Guidelines</h2>
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Do&apos;s</h3>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Use dark variants for text on light backgrounds</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Use light variants for background colors</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Always test color combinations with contrast checker</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Provide patterns in addition to color for severity indicators</span>
            </li>
          </ul>

          <h3 className="font-semibold mb-3">Don&apos;ts</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-red-600">✗</span>
              <span>Never use base warning or success colors for text (contrast too low)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600">✗</span>
              <span>Don&apos;t rely on color alone to convey meaning</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600">✗</span>
              <span>Avoid light text on light backgrounds</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600">✗</span>
              <span>Don&apos;t use colors with contrast ratio below 4.5:1 for text</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}