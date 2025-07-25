import React from 'react';


// Helper function to calculate relative luminance
function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const { r, g, b } = rgb;
  
  // Convert to sRGB
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;
  
  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

// Helper function to calculate contrast ratio
function getContrastRatio(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Color definitions from our palette
const colors = {
  white: '#FFFFFF',
  black: '#000000',
  
  // Info colors
  info: '#2563EB',
  infoLight: '#DBEAFE',
  infoDark: '#1E40AF',
  
  // Warning colors
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#92400E',
  
  // Danger colors
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerDark: '#B91C1C',
  
  // Critical colors
  critical: '#991B1B',
  criticalLight: '#FCA5A5',
  criticalDark: '#450A0A',
  
  // Success colors
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#065F46',
  
  // Gray scale
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
};

describe('Color Contrast Ratios', () => {
  describe('Text on White Background', () => {
    const white = hexToRgb(colors.white);
    
    it('should meet WCAG AA for info dark text', () => {
      const infoDark = hexToRgb(colors.infoDark);
      const ratio = getContrastRatio(white, infoDark);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
    
    it('should meet WCAG AAA for warning dark text', () => {
      const warningDark = hexToRgb(colors.warningDark);
      const ratio = getContrastRatio(white, warningDark);
      expect(ratio).toBeGreaterThanOrEqual(7);
    });
    
    it('should meet WCAG AA for danger dark text', () => {
      const dangerDark = hexToRgb(colors.dangerDark);
      const ratio = getContrastRatio(white, dangerDark);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      // Note: This is 6.47, which meets AA but not AAA
    });
    
    it('should meet WCAG AAA for critical text', () => {
      const critical = hexToRgb(colors.critical);
      const ratio = getContrastRatio(white, critical);
      expect(ratio).toBeGreaterThanOrEqual(7);
    });
    
    it('should meet WCAG AAA for success dark text', () => {
      const successDark = hexToRgb(colors.successDark);
      const ratio = getContrastRatio(white, successDark);
      expect(ratio).toBeGreaterThanOrEqual(7);
    });
    
    it('should NOT use base warning color for text (fails contrast)', () => {
      const warning = hexToRgb(colors.warning);
      const ratio = getContrastRatio(white, warning);
      expect(ratio).toBeLessThan(4.5);
    });
    
    it('should NOT use base success color for text (fails contrast)', () => {
      const success = hexToRgb(colors.success);
      const ratio = getContrastRatio(white, success);
      expect(ratio).toBeLessThan(4.5);
    });
  });
  
  describe('Text on Light Backgrounds', () => {
    it('should meet WCAG AA for info dark on info light', () => {
      const infoLight = hexToRgb(colors.infoLight);
      const infoDark = hexToRgb(colors.infoDark);
      const ratio = getContrastRatio(infoLight, infoDark);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
    
    it('should meet WCAG AA for warning dark on warning light', () => {
      const warningLight = hexToRgb(colors.warningLight);
      const warningDark = hexToRgb(colors.warningDark);
      const ratio = getContrastRatio(warningLight, warningDark);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      // Note: This is 6.37, which meets AA but not AAA
    });
    
    it('should meet WCAG AA for danger dark on danger light', () => {
      const dangerLight = hexToRgb(colors.dangerLight);
      const dangerDark = hexToRgb(colors.dangerDark);
      const ratio = getContrastRatio(dangerLight, dangerDark);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
    
    it('should meet WCAG AA for success dark on success light', () => {
      const successLight = hexToRgb(colors.successLight);
      const successDark = hexToRgb(colors.successDark);
      const ratio = getContrastRatio(successLight, successDark);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      // Note: This is 6.78, which meets AA but not AAA
    });
  });
  
  describe('Focus Indicator Contrast', () => {
    const white = hexToRgb(colors.white);
    
    it('should meet WCAG SC 2.4.11 for info focus on white', () => {
      const info = hexToRgb(colors.info);
      const ratio = getContrastRatio(white, info);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });
    
    it('should meet WCAG SC 2.4.11 for danger focus on white', () => {
      const danger = hexToRgb(colors.danger);
      const ratio = getContrastRatio(white, danger);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });
    
    it('should meet maximum contrast for black focus in high contrast mode', () => {
      const black = hexToRgb(colors.black);
      const ratio = getContrastRatio(white, black);
      expect(ratio).toEqual(21);
    });
  });
  
  describe('Gray Scale Text', () => {
    const white = hexToRgb(colors.white);
    
    it('should meet WCAG AA for gray-500 (secondary text)', () => {
      const gray500 = hexToRgb(colors.gray500);
      const ratio = getContrastRatio(white, gray500);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
    
    it('should meet WCAG AAA for gray-700 (body text)', () => {
      const gray700 = hexToRgb(colors.gray700);
      const ratio = getContrastRatio(white, gray700);
      expect(ratio).toBeGreaterThanOrEqual(7);
    });
    
    it('should meet WCAG AAA for gray-900 (headings)', () => {
      const gray900 = hexToRgb(colors.gray900);
      const ratio = getContrastRatio(white, gray900);
      expect(ratio).toBeGreaterThanOrEqual(7);
    });
  });
});
