import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '*.min.js',
      'convex/_generated/**',
      '.claude/**',
      '.worktrees/**',
      '.turbo/**',
    ],
  },

  // Base JavaScript configuration
  js.configs.recommended,

  // TypeScript configuration for all files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        browser: true,
        node: true,
        es2022: true,
        jest: true,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // TypeScript specific rules - balanced strictness
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn', // Changed from error to warn for pragmatism
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // Performance and security rules
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Requires parserOptions.project
      '@typescript-eslint/prefer-optional-chain': 'off', // Requires parserOptions.project
    },
  },

  // React/Next.js specific configuration for web app
  {
    files: ['apps/web/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js
      'react/prop-types': 'off', // TypeScript handles this

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Accessibility rules
      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['hrefLeft', 'hrefRight'],
          aspects: ['invalidHref', 'preferButton'],
        },
      ],

      // Allow more flexibility in web app
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },

  // Next.js specific extends for web app
  ...compat.extends('next/core-web-vitals').map((config) => ({
    ...config,
    files: ['apps/web/**/*.{js,jsx,ts,tsx}'],
  })),

  // Convex specific rules
  {
    files: ['convex/**/*.{js,ts}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off', // Convex uses exports that may appear unused
      '@typescript-eslint/no-explicit-any': 'warn', // More lenient for generated code
    },
  },

  // Test files configuration
  {
    files: ['**/__tests__/**/*', '**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // More flexibility in tests
      'no-console': 'off', // Allow console in tests
    },
  },

  // Mock files configuration
  {
    files: ['**/__mocks__/**/*'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'react/display-name': 'off',
      '@next/next/no-img-element': 'off',
      'jsx-a11y/alt-text': 'off',
      'jsx-a11y/role-has-required-aria-props': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
    },
  },
  
  // CommonJS configuration files
  {
    files: ['.lintstagedrc.js', 'jest.config.js', '*.config.js', 'babel.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: true,
        require: true,
        __dirname: true,
        __filename: true,
        process: true,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off', // CommonJS globals are defined above
    },
  },

  // Prettier should be last to override conflicting rules
  prettier,
];
