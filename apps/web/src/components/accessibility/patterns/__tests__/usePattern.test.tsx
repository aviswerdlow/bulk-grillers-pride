import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { cleanupTest, mockUseQuery, mockUseMutation, renderWithProviders, setupTest, renderHookWithProviders } from '@/__tests__/test-helpers';
import { usePattern, usePatterns } from '../usePattern';
import { AccessibilityProvider, usePatternTheme } from '@/contexts/accessibility';

describe('usePattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns pattern config for info severity', () => {
    const { result } = renderHookWithProviders(() => usePattern('info'));

    expect(result.current.severity).toBe('info');
    expect(result.current.patternUrl).toBe('url(#pattern-info)');
    expect(result.current.colors.primary).toBe('#3b82f6');
    expect(result.current.textureDescription).toContain('low severity');
    expect(result.current.highContrast).toBe(false);
  });

  it('returns pattern config for warning severity', () => {
    const { result } = renderHookWithProviders(() => usePattern('warning'));

    expect(result.current.severity).toBe('warning');
    expect(result.current.patternUrl).toBe('url(#pattern-warning)');
    expect(result.current.colors.primary).toBe('#f59e0b');
    expect(result.current.textureDescription).toContain('medium severity');
  });

  it('returns pattern config for danger severity', () => {
    const { result } = renderHookWithProviders(() => usePattern('danger'));

    expect(result.current.severity).toBe('danger');
    expect(result.current.patternUrl).toBe('url(#pattern-danger)');
    expect(result.current.colors.primary).toBe('#ef4444');
    expect(result.current.textureDescription).toContain('high severity');
  });

  it('returns pattern config for critical severity', () => {
    const { result } = renderHookWithProviders(() => usePattern('critical'));

    expect(result.current.severity).toBe('critical');
    expect(result.current.patternUrl).toBe('url(#pattern-critical)');
    expect(result.current.colors.primary).toBe('#7c3aed');
    expect(result.current.textureDescription).toContain('critical severity');
  });

  it('returns high contrast config when enabled', () => {
    // Mock high contrast mode
    jest.spyOn(require('@/contexts/accessibility'), 'usePatternTheme').mockReturnValue({ highContrast: true, reducedMotion: false });

    const { result } = renderHookWithProviders(() => usePattern('info'));

    expect(result.current.highContrast).toBe(true);
    expect(result.current.patternUrl).toBe('url(#pattern-info-hc)');
    expect(result.current.colors.primary).toBe('#1e40af'); // High contrast color
  });
});

describe('usePatterns', () => {
  it('returns multiple pattern configs', () => {
    const severities = ['info', 'warning', 'danger'] as const;
    const { result } = renderHookWithProviders(() => usePatterns([...severities]));

    expect(Object.keys(result.current)).toHaveLength(3);
    expect(result.current.info.severity).toBe('info');
    expect(result.current.warning.severity).toBe('warning');
    expect(result.current.danger.severity).toBe('danger');
  });

  it('returns empty object for empty array', () => {
    const { result } = renderHookWithProviders(() => usePatterns([]));

    expect(Object.keys(result.current)).toHaveLength(0);
  });

  it('memoizes results correctly', () => {
    const severities = ['info', 'warning'] as const;
    const { result, rerender } = renderHookWithProviders(() => usePatterns([...severities]));

    const firstResult = result.current;
    
    // Rerender with same severities
    rerender();
    
    expect(result.current).toBe(firstResult); // Same reference
  });

  it('updates when high contrast changes', () => {
    const mockUsePatternTheme = jest.spyOn(require('@/contexts/accessibility'), 'usePatternTheme');
    mockUsePatternTheme.mockReturnValue({ highContrast: false, reducedMotion: false });

    const severities = ['info'] as const;
    const { result, rerender } = renderHookWithProviders(() => usePatterns([...severities]));

    const normalResult = result.current;
    expect(normalResult.info.highContrast).toBe(false);

    // Change to high contrast
    mockUsePatternTheme.mockReturnValue({ highContrast: true, reducedMotion: false });
    rerender();

    expect(result.current).not.toBe(normalResult); // New reference
    expect(result.current.info.highContrast).toBe(true);
  });
});