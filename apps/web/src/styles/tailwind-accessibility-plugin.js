const plugin = require('tailwindcss/plugin');

module.exports = plugin(function({ addBase, addUtilities, theme }) {
  // Add CSS custom properties to root
  addBase({
    ':root': {
      // Import all color custom properties
      '@import': './colors.css',
    },
  });

  // Add semantic color utilities
  const colorUtilities = {
    // Text colors
    '.text-semantic-primary': { color: 'var(--text-primary)' },
    '.text-semantic-secondary': { color: 'var(--text-secondary)' },
    '.text-semantic-tertiary': { color: 'var(--text-tertiary)' },
    '.text-semantic-info': { color: 'var(--text-info)' },
    '.text-semantic-warning': { color: 'var(--text-warning)' },
    '.text-semantic-danger': { color: 'var(--text-danger)' },
    '.text-semantic-critical': { color: 'var(--text-critical)' },
    '.text-semantic-success': { color: 'var(--text-success)' },
    
    // Background colors
    '.bg-semantic-primary': { backgroundColor: 'var(--bg-primary)' },
    '.bg-semantic-secondary': { backgroundColor: 'var(--bg-secondary)' },
    '.bg-semantic-tertiary': { backgroundColor: 'var(--bg-tertiary)' },
    '.bg-semantic-info': { backgroundColor: 'var(--bg-info)' },
    '.bg-semantic-warning': { backgroundColor: 'var(--bg-warning)' },
    '.bg-semantic-danger': { backgroundColor: 'var(--bg-danger)' },
    '.bg-semantic-critical': { backgroundColor: 'var(--bg-critical)' },
    '.bg-semantic-success': { backgroundColor: 'var(--bg-success)' },
    
    // Border colors
    '.border-semantic-default': { borderColor: 'var(--border-default)' },
    '.border-semantic-light': { borderColor: 'var(--border-light)' },
    '.border-semantic-dark': { borderColor: 'var(--border-dark)' },
    '.border-semantic-info': { borderColor: 'var(--border-info)' },
    '.border-semantic-warning': { borderColor: 'var(--border-warning)' },
    '.border-semantic-danger': { borderColor: 'var(--border-danger)' },
    '.border-semantic-critical': { borderColor: 'var(--border-critical)' },
    '.border-semantic-success': { borderColor: 'var(--border-success)' },
  };

  // Focus utilities with accessibility in mind
  const focusUtilities = {
    '.focus-default': {
      '&:focus': {
        outline: `var(--focus-width) solid var(--focus-default)`,
        outlineOffset: 'var(--focus-offset)',
      },
      '&:focus-visible': {
        outline: `var(--focus-width) solid var(--focus-default)`,
        outlineOffset: 'var(--focus-offset)',
      },
    },
    '.focus-danger': {
      '&:focus': {
        outline: `var(--focus-width) solid var(--focus-danger)`,
        outlineOffset: 'var(--focus-offset)',
      },
      '&:focus-visible': {
        outline: `var(--focus-width) solid var(--focus-danger)`,
        outlineOffset: 'var(--focus-offset)',
      },
    },
    '.focus-warning': {
      '&:focus': {
        outline: `var(--focus-width) solid var(--focus-warning)`,
        outlineOffset: 'var(--focus-offset)',
      },
      '&:focus-visible': {
        outline: `var(--focus-width) solid var(--focus-warning)`,
        outlineOffset: 'var(--focus-offset)',
      },
    },
    '.focus-success': {
      '&:focus': {
        outline: `var(--focus-width) solid var(--focus-success)`,
        outlineOffset: 'var(--focus-offset)',
      },
      '&:focus-visible': {
        outline: `var(--focus-width) solid var(--focus-success)`,
        outlineOffset: 'var(--focus-offset)',
      },
    },
  };

  // Pattern overlay utilities
  const patternUtilities = {
    // Info pattern (dots)
    '.pattern-info': {
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        opacity: 'var(--pattern-opacity)',
        backgroundColor: 'var(--color-info)',
        maskImage: `radial-gradient(circle, transparent 1px, black 1px)`,
        maskSize: '4px 4px',
        maskPosition: '0 0',
        pointerEvents: 'none',
      },
    },
    
    // Warning pattern (diagonal stripes)
    '.pattern-warning': {
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        opacity: 'var(--pattern-opacity)',
        background: `repeating-linear-gradient(
          45deg,
          var(--color-warning-dark),
          var(--color-warning-dark) 10px,
          transparent 10px,
          transparent 20px
        )`,
        pointerEvents: 'none',
      },
    },
    
    // Danger pattern (crosshatch)
    '.pattern-danger': {
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        opacity: 'var(--pattern-opacity)',
        background: `
          repeating-linear-gradient(
            45deg,
            var(--color-danger),
            var(--color-danger) 1px,
            transparent 1px,
            transparent 10px
          ),
          repeating-linear-gradient(
            -45deg,
            var(--color-danger),
            var(--color-danger) 1px,
            transparent 1px,
            transparent 10px
          )
        `,
        pointerEvents: 'none',
      },
    },
    
    // Critical pattern (checkerboard)
    '.pattern-critical': {
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        opacity: 'var(--pattern-opacity)',
        background: `
          repeating-conic-gradient(
            var(--color-critical-dark) 0% 25%,
            transparent 0% 50%
          ) 0 0 / 20px 20px
        `,
        pointerEvents: 'none',
      },
    },
  };

  // High contrast mode utilities
  const highContrastUtilities = {
    '@media (prefers-contrast: high)': {
      '.hc\\:border-2': { borderWidth: '2px' },
      '.hc\\:border-4': { borderWidth: '4px' },
      '.hc\\:font-bold': { fontWeight: '700' },
      '.hc\\:underline': { textDecoration: 'underline' },
      '.hc\\:pattern-opacity-full': {
        '--pattern-opacity': '1',
      },
    },
  };

  // Dark mode utilities
  const darkModeUtilities = {
    '@media (prefers-color-scheme: dark)': {
      '.dark\\:pattern-opacity-high': {
        '--pattern-opacity': 'var(--pattern-opacity-high)',
      },
    },
  };

  // Add all utilities
  addUtilities({
    ...colorUtilities,
    ...focusUtilities,
    ...patternUtilities,
    ...highContrastUtilities,
    ...darkModeUtilities,
  });
}, {
  theme: {
    extend: {
      colors: {
        // Semantic color tokens
        semantic: {
          info: {
            DEFAULT: 'var(--color-info)',
            light: 'var(--color-info-light)',
            dark: 'var(--color-info-dark)',
          },
          warning: {
            DEFAULT: 'var(--color-warning)',
            light: 'var(--color-warning-light)',
            dark: 'var(--color-warning-dark)',
          },
          danger: {
            DEFAULT: 'var(--color-danger)',
            light: 'var(--color-danger-light)',
            dark: 'var(--color-danger-dark)',
          },
          critical: {
            DEFAULT: 'var(--color-critical)',
            light: 'var(--color-critical-light)',
            dark: 'var(--color-critical-dark)',
          },
          success: {
            DEFAULT: 'var(--color-success)',
            light: 'var(--color-success-light)',
            dark: 'var(--color-success-dark)',
          },
        },
      },
      opacity: {
        pattern: 'var(--pattern-opacity)',
        'pattern-medium': 'var(--pattern-opacity-medium)',
        'pattern-high': 'var(--pattern-opacity-high)',
      },
    },
  },
});