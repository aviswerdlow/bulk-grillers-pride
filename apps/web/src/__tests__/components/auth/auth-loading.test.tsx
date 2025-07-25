import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { cleanupTest, mockUseQuery, mockUseMutation, renderWithProviders, setupTest } from '@/__tests__/test-helpers';
import { AuthButtonLoading, AuthLoading } from '@/components/auth/auth-loading';
describe('AuthLoading', () => {
  describe('default mode', () => {
    it('renders with default text', () => {
      renderWithProviders(<AuthLoading />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      // Check for spinner icon (Loader2 renders as an svg)
      expect(
        screen.getByText('Loading...').parentElement?.querySelector('svg')
      ).toBeInTheDocument();
    });

    it('renders with custom text', () => {
      renderWithProviders(<AuthLoading text="Authenticating..." />);

      expect(screen.getByText('Authenticating...')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      renderWithProviders(<AuthLoading className="custom-loading" />);

      const container = screen.getByText('Loading...').parentElement;
      expect(container).toHaveClass('custom-loading');
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-col');
      expect(container).toHaveClass('items-center');
    });

    it('has correct default styling', () => {
      renderWithProviders(<AuthLoading />);

      const container = screen.getByText('Loading...').parentElement;
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-col');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('justify-center');
      expect(container).toHaveClass('p-8');
      expect(container).toHaveClass('min-h-[200px]');
    });

    it('renders spinner with correct classes', () => {
      renderWithProviders(<AuthLoading />);

      const spinner = screen.getByText('Loading...').parentElement?.querySelector('svg');
      expect(spinner).toHaveClass('h-8');
      expect(spinner).toHaveClass('w-8');
      expect(spinner).toHaveClass('animate-spin');
      expect(spinner).toHaveClass('text-primary');
    });

    it('renders text with correct classes', () => {
      renderWithProviders(<AuthLoading />);

      const text = screen.getByText('Loading...');
      expect(text).toHaveClass('mt-4');
      expect(text).toHaveClass('text-sm');
      expect(text).toHaveClass('text-muted-foreground');
    });
  });

  describe('inline mode', () => {
    it('renders inline when inline prop is true', () => {
      renderWithProviders(<AuthLoading inline />);

      const container = screen.getByText('Loading...').parentElement;
      expect(container).toHaveClass('inline-flex');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('gap-2');
      expect(container).not.toHaveClass('flex-col');
    });

    it('renders inline with custom text', () => {
      renderWithProviders(<AuthLoading inline text="Please wait..." />);

      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('renders inline with custom className', () => {
      renderWithProviders(<AuthLoading inline className="inline-custom" />);

      const container = screen.getByText('Loading...').parentElement;
      expect(container).toHaveClass('inline-custom');
      expect(container).toHaveClass('inline-flex');
    });

    it('renders inline spinner with correct classes', () => {
      renderWithProviders(<AuthLoading inline />);

      const spinner = screen.getByText('Loading...').parentElement?.querySelector('svg');
      expect(spinner).toHaveClass('h-4');
      expect(spinner).toHaveClass('w-4');
      expect(spinner).toHaveClass('animate-spin');
      // Inline spinner doesn't have text-primary class
      expect(spinner).not.toHaveClass('text-primary');
    });

    it('renders inline text with correct classes', () => {
      renderWithProviders(<AuthLoading inline />);

      const text = screen.getByText('Loading...');
      expect(text).toHaveClass('text-sm');
      // Inline text doesn't have mt-4 or text-muted-foreground
      expect(text).not.toHaveClass('mt-4');
      expect(text).not.toHaveClass('text-muted-foreground');
    });
  });
});

describe('AuthButtonLoading', () => {
  it('renders spinner without text', () => {
    const { container } = renderWithProviders(<AuthButtonLoading />);

    // Should have spinner but no text
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders with default styling', () => {
    const { container } = renderWithProviders(<AuthButtonLoading />);

    const div = container.querySelector('.flex.items-center.justify-center');
    expect(div).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = renderWithProviders(<AuthButtonLoading className="button-loading" />);

    const div = container.querySelector('.button-loading');
    expect(div).toBeInTheDocument();
    expect(div).toHaveClass('flex');
  });

  it('renders spinner with correct classes', () => {
    const { container } = renderWithProviders(<AuthButtonLoading />);

    const spinner = container.querySelector('svg');
    expect(spinner).toHaveClass('h-4');
    expect(spinner).toHaveClass('w-4');
    expect(spinner).toHaveClass('animate-spin');
  });
});
