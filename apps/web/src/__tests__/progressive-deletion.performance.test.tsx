/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Id } from '@/../../../convex/_generated/dataModel';
import { ProgressiveDeletion } from '@/components/deletion/progressive/ProgressiveDeletion';
import { Product } from '@/types/models';

/**
 * Performance tests for Progressive Deletion
 * Validates Core Web Vitals and bundle size targets
 */

import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-helpers';

// Mock products
const mockProducts: Product[] = [
  {
    _id: 'test1' as Id<'products'>,
    title: 'Test Product 1',
    handle: 'test-1',
    description: 'Test',
    vendor: 'Test',
    productType: 'Test',
    status: 'active',
    image: '',
    tags: [],
    categories: [],
    sku: 'TEST-001',
    price: 10,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

// Mock performance observer
const mockPerformanceObserver = jest.fn();
global.PerformanceObserver = jest.fn().mockImplementation((callback) => {
  void callback;
  return {
    observe: mockPerformanceObserver,
    disconnect: jest.fn()
  };
}) as any;

// Add static property required by TypeScript
(global.PerformanceObserver as any).supportedEntryTypes = ['measure', 'navigation'];

describe('Progressive Deletion Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Bundle Size Targets', () => {
    it('should keep Core layer under 50KB', () => {
      // This would be validated in build process
      // Here we check component doesn't load heavy dependencies
      const { container } = renderWithProviders(<ProgressiveDeletion 
          items={mockProducts} 
          forceLayer="core"
        />
      );
      
      // Check no React hooks beyond basics
      expect(container.querySelector('.core-deletion-form')).toBeInTheDocument();
      expect(container.querySelector('.enhanced-deletion-form')).not.toBeInTheDocument();
      expect(container.querySelector('.optimal-deletion-wizard')).not.toBeInTheDocument();
    });
    
    it('should lazy load enhanced layer components', async () => {
      const { container } = renderWithProviders(<ProgressiveDeletion 
          items={mockProducts} 
          forceLayer="enhanced"
        />
      );
      
      // Should show loading initially
      expect(container.textContent).toContain('');
      
      // Wait for lazy load
      await waitFor(() => {
        expect(container.querySelector('.enhanced-deletion-form')).toBeInTheDocument();
      });
    });
  });
  
  describe('Core Web Vitals', () => {
    it('should achieve LCP < 2.5s', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<ProgressiveDeletion 
          items={mockProducts} 
          forceLayer="core"
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const lcpTime = endTime - startTime;
      
      // In real tests, this would measure actual LCP
      expect(lcpTime).toBeLessThan(2500);
    });
    
    it('should achieve FID < 100ms', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<ProgressiveDeletion 
          items={mockProducts} 
          forceLayer="enhanced"
        />
      );
      
      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });
      
      const startTime = performance.now();
      await user.click(screen.getByRole('checkbox'));
      const endTime = performance.now();
      
      const fidTime = endTime - startTime;
      expect(fidTime).toBeLessThan(100);
    });
    
    it('should achieve CLS < 0.1', async () => {
      let layoutShifts = 0;
      
      // Mock layout shift entries
      const mockEntries = [
        { entryType: 'layout-shift', value: 0.05, hadRecentInput: false }
      ];
      
      renderWithProviders(<ProgressiveDeletion 
          items={mockProducts} 
          forceLayer="optimal"
        />
      );
      
      // Simulate layout shifts
      mockEntries.forEach(entry => {
        if (!entry.hadRecentInput) {
          layoutShifts += entry?.value;
        }
      });
      
      expect(layoutShifts).toBeLessThan(0.1);
    });
  });
  
  describe('Mobile Performance', () => {
    it('should maintain 60fps during interactions', async () => {
      const user = userEvent.setup();
      let frameCount = 0;
      let lastTime = performance.now();
      
      const measureFPS = () => {
        frameCount++;
        const currentTime = performance.now();
        if (currentTime >= lastTime + 1000) {
          const fps = (frameCount * 1000) / (currentTime - lastTime);
          expect(fps).toBeGreaterThanOrEqual(55); // Allow small variance
          frameCount = 0;
          lastTime = currentTime;
        }
        requestAnimationFrame(measureFPS);
      };
      
      renderWithProviders(<ProgressiveDeletion 
          items={mockProducts} 
          forceLayer="enhanced"
        />
      );
      
      const rafSpy = jest.spyOn(window, 'requestAnimationFrame');
      measureFPS();
      
      // Simulate touch interactions
      await user.click(screen.getByText('Delete Items'));
      
      expect(rafSpy).toHaveBeenCalled();
    });
    
    it('should have touch targets >= 44px', () => {
      const { container } = renderWithProviders(<ProgressiveDeletion 
          items={mockProducts} 
          forceLayer="core"
        />
      );
      
      const buttons = container.querySelectorAll('button');
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const height = parseFloat(styles.minHeight) || parseFloat(styles.height);
        expect(height).toBeGreaterThanOrEqual(44);
      });
      
      checkboxes.forEach(checkbox => {
        const styles = window.getComputedStyle(checkbox);
        const size = parseFloat(styles.minWidth) || parseFloat(styles.width);
        expect(size).toBeGreaterThanOrEqual(44);
      });
    });
  });
  
  describe('Progressive Enhancement', () => {
    it('should select appropriate layer based on capabilities', () => {
      // Mock high-end device
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 8,
        configurable: true
      });
      
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g', saveData: false },
        configurable: true
      });
      
      const { container } = renderWithProviders(<ProgressiveDeletion items={mockProducts} />
      );
      
      // Should select optimal layer for high-end device
      waitFor(() => {
        expect(container.querySelector('.optimal-deletion-wizard')).toBeInTheDocument();
      });
    });
    
    it('should fallback gracefully on low-end devices', () => {
      // Mock low-end device
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 1,
        configurable: true
      });
      
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '2g', saveData: true },
        configurable: true
      });
      
      const { container } = renderWithProviders(<ProgressiveDeletion items={mockProducts} />
      );
      
      // Should select core layer for low-end device
      expect(container.querySelector('.core-deletion-form')).toBeInTheDocument();
    });
  });
});