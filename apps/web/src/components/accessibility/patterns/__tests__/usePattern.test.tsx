import { renderHook } from '@testing-library/react';
import { usePattern, usePatterns } from '../usePattern';
import { AccessibilityProvider } from '@/contexts/accessibility';
import React from 'react';

// Mock the accessibility context
jest.mock('@/contexts/accessibility', () => ({
  ...jest.requireActual('@/contexts/accessibility'),
  usePatternTheme: jest.fn(() => ({ highContrast: false, reducedMotion: false })),
}));

// Wrapper component for tests
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}

describe('usePattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns pattern config for info severity', () => {
    const { result } = renderHook(() => usePattern('info'), {
      wrapper: TestWrapper,
    });

    expect(result.current.severity).toBe('info');
    expect(result.current.patternUrl).toBe('url(#pattern-info)');
    expect(result.current.colors.primary).toBe('#3b82f6');
    expect(result.current.textureDescription).toContain('low severity');
    expect(result.current.highContrast).toBe(false);
  });

  it('returns pattern config for warning severity', () => {
    const { result } = renderHook(() => usePattern('warning'), {
      wrapper: TestWrapper,
    });

    expect(result.current.severity).toBe('warning');
    expect(result.current.patternUrl).toBe('url(#pattern-warning)');
    expect(result.current.colors.primary).toBe('#f59e0b');
    expect(result.current.textureDescription).toContain('medium severity');
  });

  it('returns pattern config for danger severity', () => {
    const { result } = renderHook(() => usePattern('danger'), {
      wrapper: TestWrapper,
    });

    expect(result.current.severity).toBe('danger');
    expect(result.current.patternUrl).toBe('url(#pattern-danger)');
    expect(result.current.colors.primary).toBe('#ef4444');
    expect(result.current.textureDescription).toContain('high severity');
  });

  it('returns pattern config for critical severity', () => {
    const { result } = renderHook(() => usePattern('critical'), {
      wrapper: TestWrapper,
    });

    expect(result.current.severity).toBe('critical');
    expect(result.current.patternUrl).toBe('url(#pattern-critical)');
    expect(result.current.colors.primary).toBe('#7c3aed');
    expect(result.current.textureDescription).toContain('critical severity');
  });

  it('returns high contrast config when enabled', () => {
    // Mock high contrast mode
    const mockUsePatternTheme = jest.requireMock('@/contexts/accessibility').usePatternTheme;
    mockUsePatternTheme.mockReturnValue({ highContrast: true, reducedMotion: false });

    const { result } = renderHook(() => usePattern('info'), {
      wrapper: TestWrapper,
    });

    expect(result.current.highContrast).toBe(true);
    expect(result.current.patternUrl).toBe('url(#pattern-info-hc)');
    expect(result.current.colors.primary).toBe('#1e40af'); // High contrast color
  });
});

describe('usePatterns', () => {
  it('returns multiple pattern configs', () => {
    const severities = ['info', 'warning', 'danger'] as const;
    const { result } = renderHook(() => usePatterns([...severities]), {
      wrapper: TestWrapper,
    });

    expect(Object.keys(result.current)).toHaveLength(3);
    expect(result.current.info.severity).toBe('info');
    expect(result.current.warning.severity).toBe('warning');
    expect(result.current.danger.severity).toBe('danger');
  });

  it('returns empty object for empty array', () => {
    const { result } = renderHook(() => usePatterns([]), {
      wrapper: TestWrapper,
    });

    expect(Object.keys(result.current)).toHaveLength(0);
  });

  it('memoizes results correctly', () => {
    const severities = ['info', 'warning'] as const;
    const { result, rerender } = renderHook(() => usePatterns([...severities]), {
      wrapper: TestWrapper,
    });

    const firstResult = result.current;
    
    // Rerender with same severities
    rerender();
    
    expect(result.current).toBe(firstResult); // Same reference
  });

  it('updates when high contrast changes', () => {
    const mockUsePatternTheme = jest.requireMock('@/contexts/accessibility').usePatternTheme;
    mockUsePatternTheme.mockReturnValue({ highContrast: false, reducedMotion: false });

    const severities = ['info'] as const;
    const { result, rerender } = renderHook(() => usePatterns([...severities]), {
      wrapper: TestWrapper,
    });

    const normalResult = result.current;
    expect(normalResult.info.highContrast).toBe(false);

    // Change to high contrast
    mockUsePatternTheme.mockReturnValue({ highContrast: true, reducedMotion: false });
    rerender();

    expect(result.current).not.toBe(normalResult); // New reference
    expect(result.current.info.highContrast).toBe(true);
  });
});