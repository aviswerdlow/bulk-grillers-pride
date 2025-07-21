# Performance Testing Methodology for Mobile Deletion Flow

**Author**: systems-design-agent  
**Date**: 2025-07-20  
**Related**: #58 - Mobile-First Performance Architecture

## Executive Summary

This document provides a comprehensive performance testing methodology for the mobile deletion flow, ensuring all performance targets are met across device tiers. The methodology covers automated testing, real device testing, continuous monitoring, and performance regression prevention.

## 1. Performance Testing Framework

### 1.1 Testing Matrix

```typescript
interface PerformanceTestMatrix {
  devices: DeviceProfile[];
  networks: NetworkProfile[];
  scenarios: TestScenario[];
  metrics: PerformanceMetric[];
}

const testMatrix: PerformanceTestMatrix = {
  devices: [
    {
      name: 'Low-End Android',
      device: 'Moto G4',
      cpu: 4,
      memory: 2,
      viewport: { width: 360, height: 640 },
      userAgent: 'Mozilla/5.0 (Linux; Android 7.0; Moto G (4))',
      tier: 'low-end'
    },
    {
      name: 'Mid-Range Android',
      device: 'Pixel 4a',
      cpu: 6,
      memory: 6,
      viewport: { width: 393, height: 851 },
      userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 4a)',
      tier: 'mid-range'
    },
    {
      name: 'Mid-Range iOS',
      device: 'iPhone SE (2020)',
      cpu: 6,
      memory: 3,
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5)',
      tier: 'mid-range'
    },
    {
      name: 'High-End Android',
      device: 'Pixel 7 Pro',
      cpu: 8,
      memory: 12,
      viewport: { width: 412, height: 915 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro)',
      tier: 'high-end'
    }
  ],
  
  networks: [
    {
      name: 'Slow 3G',
      download: 400, // kbps
      upload: 400,
      latency: 400, // ms
      packetLoss: 0.1
    },
    {
      name: 'Fast 3G',
      download: 1600,
      upload: 750,
      latency: 150,
      packetLoss: 0.05
    },
    {
      name: '4G',
      download: 12000,
      upload: 12000,
      latency: 70,
      packetLoss: 0.01
    },
    {
      name: 'WiFi',
      download: 30000,
      upload: 15000,
      latency: 20,
      packetLoss: 0
    }
  ],
  
  scenarios: [
    {
      name: 'cold-load',
      description: 'First visit, no cache',
      steps: ['clear-cache', 'navigate', 'open-dialog', 'measure']
    },
    {
      name: 'warm-load',
      description: 'Return visit, with cache',
      steps: ['navigate', 'open-dialog', 'measure']
    },
    {
      name: 'bulk-selection',
      description: 'Select 100+ items',
      steps: ['open-dialog', 'select-all', 'measure-interaction']
    },
    {
      name: 'offline-operation',
      description: 'Complete deletion offline',
      steps: ['go-offline', 'perform-deletion', 'measure', 'go-online', 'verify-sync']
    }
  ],
  
  metrics: [
    { name: 'FCP', target: 2000, unit: 'ms' },
    { name: 'LCP', target: 3000, unit: 'ms' },
    { name: 'TTI', target: 4000, unit: 'ms' },
    { name: 'FID', target: 100, unit: 'ms' },
    { name: 'CLS', target: 0.1, unit: 'score' },
    { name: 'Bundle Size', target: 150000, unit: 'bytes' },
    { name: 'Frame Rate', target: 60, unit: 'fps' },
    { name: 'Memory Usage', target: 50, unit: 'MB' }
  ]
};
```

### 1.2 Automated Testing Setup

```javascript
// performance-test.config.js
module.exports = {
  // Lighthouse configuration
  lighthouse: {
    config: {
      extends: 'lighthouse:default',
      settings: {
        formFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 562.5,
          downloadThroughputKbps: 1474.56,
          uploadThroughputKbps: 675.0
        },
        screenEmulation: {
          mobile: true,
          width: 360,
          height: 640,
          deviceScaleFactor: 2.625,
          disabled: false
        },
        emulatedUserAgent: 'Mozilla/5.0 (Linux; Android 7.0; Moto G (4))'
      },
      audits: [
        'first-contentful-paint',
        'largest-contentful-paint',
        'total-blocking-time',
        'cumulative-layout-shift',
        'interactive',
        'speed-index',
        'bootup-time',
        'mainthread-work-breakdown',
        'uses-responsive-images',
        'offscreen-images',
        'render-blocking-resources',
        'unused-css-rules',
        'unused-javascript',
        'modern-image-formats',
        'uses-text-compression',
        'js-libraries'
      ]
    }
  },
  
  // WebPageTest configuration
  webpagetest: {
    key: process.env.WPT_API_KEY,
    locations: ['Dulles:Chrome', 'London:Chrome', 'Tokyo:Chrome'],
    runs: 3,
    mobile: true,
    device: 'Pixel 4',
    connectivity: '3G',
    lighthouse: true,
    video: true,
    timeline: true,
    bodies: true,
    custom: {
      'deletion-dialog-open': [
        'navigate https://app.example.com/products',
        'wait 3',
        'click .delete-button',
        'wait 2'
      ]
    }
  }
};
```

## 2. Performance Test Implementation

### 2.1 Synthetic Testing

```typescript
// synthetic-performance-tests.ts
import { chromium, devices, Browser, Page } from 'playwright';
import { startFlow } from 'lighthouse';
import * as fs from 'fs/promises';

export class SyntheticPerformanceTests {
  private browser: Browser | null = null;
  
  async runTestSuite() {
    const results: TestResult[] = [];
    
    for (const device of testMatrix.devices) {
      for (const network of testMatrix.networks) {
        for (const scenario of testMatrix.scenarios) {
          const result = await this.runTest(device, network, scenario);
          results.push(result);
        }
      }
    }
    
    await this.generateReport(results);
    return results;
  }
  
  private async runTest(
    device: DeviceProfile,
    network: NetworkProfile,
    scenario: TestScenario
  ): Promise<TestResult> {
    // Launch browser with device emulation
    this.browser = await chromium.launch({
      args: [
        '--force-device-scale-factor=1',
        `--window-size=${device.viewport.width},${device.viewport.height}`
      ]
    });
    
    const context = await this.browser.newContext({
      ...devices[device.device],
      viewport: device.viewport,
      userAgent: device.userAgent
    });
    
    // Apply network conditions
    await context.route('**/*', async (route) => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, network.latency));
      
      // Random packet loss
      if (Math.random() < network.packetLoss) {
        await route.abort();
      } else {
        await route.continue();
      }
    });
    
    const page = await context.newPage();
    
    // Enable performance monitoring
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = {
        fps: [],
        memory: [],
        longTasks: []
      };
      
      // FPS monitoring
      let lastTime = performance.now();
      let frames = 0;
      
      const measureFPS = () => {
        frames++;
        const currentTime = performance.now();
        
        if (currentTime >= lastTime + 1000) {
          window.performanceMetrics.fps.push({
            time: currentTime,
            value: Math.round((frames * 1000) / (currentTime - lastTime))
          });
          frames = 0;
          lastTime = currentTime;
        }
        
        requestAnimationFrame(measureFPS);
      };
      
      requestAnimationFrame(measureFPS);
      
      // Memory monitoring
      if ('memory' in performance) {
        setInterval(() => {
          window.performanceMetrics.memory.push({
            time: performance.now(),
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize
          });
        }, 1000);
      }
      
      // Long task monitoring
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              window.performanceMetrics.longTasks.push({
                time: entry.startTime,
                duration: entry.duration
              });
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      }
    });
    
    // Run scenario
    const metrics = await this.executeScenario(page, scenario);
    
    // Collect results
    const result: TestResult = {
      device: device.name,
      network: network.name,
      scenario: scenario.name,
      metrics,
      timestamp: Date.now()
    };
    
    await context.close();
    await this.browser.close();
    
    return result;
  }
  
  private async executeScenario(
    page: Page,
    scenario: TestScenario
  ): Promise<PerformanceMetrics> {
    const flow = await startFlow(page as any, {
      name: scenario.name,
      config: {
        extends: 'lighthouse:default',
        settings: {
          formFactor: 'mobile',
          throttlingMethod: 'devtools'
        }
      }
    });
    
    // Execute scenario steps
    for (const step of scenario.steps) {
      switch (step) {
        case 'clear-cache':
          await page.context().clearCookies();
          await page.context().clearPermissions();
          break;
          
        case 'navigate':
          await flow.navigate('https://app.example.com/products');
          break;
          
        case 'open-dialog':
          await flow.startTimespan({ stepName: 'Open deletion dialog' });
          await page.click('[data-testid="delete-button"]');
          await page.waitForSelector('[data-testid="deletion-dialog"]');
          await flow.endTimespan();
          break;
          
        case 'select-all':
          await flow.startTimespan({ stepName: 'Select all items' });
          await page.click('[data-testid="select-all-checkbox"]');
          await flow.endTimespan();
          break;
          
        case 'go-offline':
          await page.context().setOffline(true);
          break;
          
        case 'go-online':
          await page.context().setOffline(false);
          break;
          
        case 'measure':
          // Collect performance metrics
          const metrics = await page.evaluate(() => window.performanceMetrics);
          return this.processMetrics(metrics);
      }
    }
    
    const report = await flow.generateReport();
    await fs.writeFile(`reports/${scenario.name}.html`, report);
    
    return flow.getFlowResult();
  }
}
```

### 2.2 Real Device Testing

```typescript
// real-device-tests.ts
import { remote } from 'webdriverio';

export class RealDeviceTests {
  private driver: WebdriverIO.Browser;
  
  async runBrowserStackTests() {
    const capabilities = [
      {
        'bstack:options': {
          deviceName: 'Google Pixel 4',
          osVersion: '11.0',
          realMobile: true,
          local: false,
          networkProfile: '3g-umts-good'
        }
      },
      {
        'bstack:options': {
          deviceName: 'iPhone 12',
          osVersion: '14',
          realMobile: true,
          local: false,
          networkProfile: '4g-lte-good'
        }
      }
    ];
    
    const results = [];
    
    for (const capability of capabilities) {
      this.driver = await remote({
        user: process.env.BROWSERSTACK_USERNAME,
        key: process.env.BROWSERSTACK_ACCESS_KEY,
        capabilities: {
          ...capability,
          browserName: 'chrome',
          'goog:chromeOptions': {
            perfLoggingPrefs: {
              enableNetwork: true,
              enablePage: true,
              traceCategories: 'browser,devtools.timeline,devtools'
            }
          }
        }
      });
      
      const result = await this.runRealDeviceTest();
      results.push(result);
      
      await this.driver.deleteSession();
    }
    
    return results;
  }
  
  private async runRealDeviceTest(): Promise<RealDeviceResult> {
    // Navigate to app
    await this.driver.url('https://app.example.com/products');
    
    // Wait for page load
    await this.driver.waitUntil(
      async () => {
        const readyState = await this.driver.execute(() => document.readyState);
        return readyState === 'complete';
      },
      { timeout: 30000 }
    );
    
    // Start performance measurement
    await this.driver.execute(() => {
      performance.mark('deletion-flow-start');
    });
    
    // Open deletion dialog
    const deleteButton = await this.driver.$('[data-testid="delete-button"]');
    await deleteButton.click();
    
    // Wait for dialog
    const dialog = await this.driver.$('[data-testid="deletion-dialog"]');
    await dialog.waitForDisplayed({ timeout: 5000 });
    
    // Measure dialog open time
    await this.driver.execute(() => {
      performance.mark('dialog-opened');
      performance.measure('dialog-open-time', 'deletion-flow-start', 'dialog-opened');
    });
    
    // Select items
    const selectAll = await this.driver.$('[data-testid="select-all"]');
    await selectAll.click();
    
    // Proceed through wizard
    const nextButton = await this.driver.$('[data-testid="next-button"]');
    await nextButton.click();
    
    // Get performance metrics
    const metrics = await this.driver.execute(() => {
      const entries = performance.getEntriesByType('measure');
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        dialogOpenTime: entries.find(e => e.name === 'dialog-open-time')?.duration,
        pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
      };
    });
    
    // Get logs for additional metrics
    const logs = await this.driver.getLogs('performance');
    const networkMetrics = this.extractNetworkMetrics(logs);
    
    return {
      device: await this.driver.capabilities.deviceName,
      metrics: {
        ...metrics,
        ...networkMetrics
      },
      timestamp: Date.now()
    };
  }
  
  private extractNetworkMetrics(logs: any[]): NetworkMetrics {
    let totalBytes = 0;
    let requestCount = 0;
    const resourceTimings: ResourceTiming[] = [];
    
    logs.forEach(log => {
      const message = JSON.parse(log.message);
      if (message.message.method === 'Network.responseReceived') {
        const response = message.message.params.response;
        totalBytes += response.encodedDataLength || 0;
        requestCount++;
        
        resourceTimings.push({
          url: response.url,
          size: response.encodedDataLength,
          duration: response.timing?.receiveHeadersEnd || 0
        });
      }
    });
    
    return {
      totalBytes,
      requestCount,
      resourceTimings,
      averageRequestSize: totalBytes / requestCount
    };
  }
}
```

## 3. Continuous Performance Monitoring

### 3.1 Performance Budget Enforcement

```typescript
// performance-budget.ts
export class PerformanceBudgetEnforcer {
  private budgets: PerformanceBudget = {
    bundles: {
      main: { size: 50000, gzip: 15000 },
      vendor: { size: 100000, gzip: 30000 },
      'deletion-dialog': { size: 50000, gzip: 15000 }
    },
    metrics: {
      FCP: 2000,
      LCP: 3000,
      TTI: 4000,
      FID: 100,
      CLS: 0.1
    },
    resources: {
      total: 400000,
      scripts: 150000,
      styles: 50000,
      images: 200000,
      fonts: 50000
    }
  };
  
  async checkBudgets(buildOutput: string): Promise<BudgetResult> {
    const violations: BudgetViolation[] = [];
    
    // Check bundle sizes
    const bundles = await this.analyzeBundles(buildOutput);
    Object.entries(bundles).forEach(([name, stats]) => {
      const budget = this.budgets.bundles[name];
      if (budget) {
        if (stats.size > budget.size) {
          violations.push({
            type: 'bundle-size',
            name,
            actual: stats.size,
            budget: budget.size,
            severity: 'error'
          });
        }
        if (stats.gzip > budget.gzip) {
          violations.push({
            type: 'bundle-gzip',
            name,
            actual: stats.gzip,
            budget: budget.gzip,
            severity: 'warning'
          });
        }
      }
    });
    
    // Check runtime metrics
    const metrics = await this.measureRuntimeMetrics();
    Object.entries(metrics).forEach(([metric, value]) => {
      const budget = this.budgets.metrics[metric];
      if (budget && value > budget) {
        violations.push({
          type: 'metric',
          name: metric,
          actual: value,
          budget,
          severity: value > budget * 1.5 ? 'error' : 'warning'
        });
      }
    });
    
    return {
      passed: violations.length === 0,
      violations,
      summary: this.generateSummary(violations)
    };
  }
  
  private async analyzeBundles(buildOutput: string): Promise<BundleStats> {
    const statsFile = `${buildOutput}/bundle-stats.json`;
    const stats = JSON.parse(await fs.readFile(statsFile, 'utf-8'));
    
    const bundles: BundleStats = {};
    
    stats.assets.forEach((asset: any) => {
      const name = asset.name.replace(/\.[a-f0-9]{8}\./, '.');
      bundles[name] = {
        size: asset.size,
        gzip: asset.gzipSize || asset.size * 0.3 // Estimate if not available
      };
    });
    
    return bundles;
  }
}
```

### 3.2 CI/CD Integration

```yaml
# .github/workflows/performance-tests.yml
name: Performance Tests

on:
  pull_request:
    types: [opened, synchronize]
  push:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          ANALYZE: true
      
      - name: Check bundle sizes
        run: |
          node scripts/check-bundle-sizes.js
        env:
          FAIL_ON_VIOLATION: true
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:3000/products
          uploadArtifacts: true
          temporaryPublicStorage: true
          configPath: ./lighthouse.config.js
      
      - name: Run synthetic tests
        run: |
          npm run test:performance
        env:
          PERFORMANCE_BUDGET_STRICT: true
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: |
            reports/
            lighthouse-results/
            bundle-analysis/
      
      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const results = require('./performance-results.json');
            const comment = generatePerformanceComment(results);
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### 3.3 Real User Monitoring (RUM)

```typescript
// rum-client.ts
export class RUMClient {
  private buffer: PerformanceEntry[] = [];
  private sessionId = generateSessionId();
  
  init() {
    // Core Web Vitals
    this.observeWebVitals();
    
    // Custom metrics
    this.observeCustomMetrics();
    
    // Send data periodically
    setInterval(() => this.flush(), 30000);
    
    // Send on page unload
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }
  
  private observeWebVitals() {
    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.track('lcp', {
          value: entry.startTime,
          element: entry.element?.tagName
        });
      });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    
    // FID
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.track('fid', {
          value: entry.processingStart - entry.startTime,
          eventType: entry.name
        });
      });
    }).observe({ type: 'first-input', buffered: true });
    
    // CLS
    let clsValue = 0;
    let clsEntries: LayoutShift[] = [];
    
    new PerformanceObserver((list) => {
      const entries = list.getEntries() as LayoutShift[];
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      });
      
      this.track('cls', {
        value: clsValue,
        sources: clsEntries.length
      });
    }).observe({ type: 'layout-shift', buffered: true });
  }
  
  private observeCustomMetrics() {
    // Deletion dialog performance
    window.addEventListener('deletion-dialog-open', (event: CustomEvent) => {
      performance.mark('deletion-dialog-start');
    });
    
    window.addEventListener('deletion-dialog-ready', (event: CustomEvent) => {
      performance.mark('deletion-dialog-ready');
      performance.measure(
        'deletion-dialog-open-time',
        'deletion-dialog-start',
        'deletion-dialog-ready'
      );
      
      const measure = performance.getEntriesByName('deletion-dialog-open-time')[0];
      this.track('deletion_dialog_open', {
        value: measure.duration,
        itemCount: event.detail.itemCount
      });
    });
    
    // Frame rate monitoring
    let lastTime = performance.now();
    let frames = 0;
    
    const checkFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        
        if (fps < 50) { // Only track poor frame rates
          this.track('low_fps', {
            value: fps,
            duration: currentTime - lastTime
          });
        }
        
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(checkFPS);
    };
    
    requestAnimationFrame(checkFPS);
  }
  
  private track(metric: string, data: any) {
    this.buffer.push({
      metric,
      data,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: (navigator as any).connection?.effectiveType,
      deviceMemory: (navigator as any).deviceMemory
    });
  }
  
  private flush() {
    if (this.buffer.length === 0) return;
    
    const data = [...this.buffer];
    this.buffer = [];
    
    // Use sendBeacon for reliability
    const payload = JSON.stringify({
      sessionId: this.sessionId,
      metrics: data
    });
    
    navigator.sendBeacon('/api/rum', payload);
  }
}
```

## 4. Performance Analysis and Reporting

### 4.1 Automated Analysis

```typescript
// performance-analyzer.ts
export class PerformanceAnalyzer {
  async analyzeResults(results: TestResult[]): Promise<AnalysisReport> {
    const report: AnalysisReport = {
      summary: this.generateSummary(results),
      deviceComparison: this.compareDevices(results),
      networkImpact: this.analyzeNetworkImpact(results),
      regressions: this.detectRegressions(results),
      recommendations: this.generateRecommendations(results)
    };
    
    return report;
  }
  
  private generateSummary(results: TestResult[]): Summary {
    const passRate = results.filter(r => r.passed).length / results.length;
    const avgMetrics = this.calculateAverageMetrics(results);
    
    return {
      totalTests: results.length,
      passRate: passRate * 100,
      criticalIssues: results.filter(r => r.severity === 'critical').length,
      averageMetrics: avgMetrics,
      worstPerformer: this.findWorstPerformer(results)
    };
  }
  
  private compareDevices(results: TestResult[]): DeviceComparison {
    const deviceGroups = this.groupBy(results, 'device');
    const comparison: DeviceComparison = {};
    
    Object.entries(deviceGroups).forEach(([device, deviceResults]) => {
      comparison[device] = {
        averageMetrics: this.calculateAverageMetrics(deviceResults),
        successRate: deviceResults.filter(r => r.passed).length / deviceResults.length,
        criticalMetrics: this.identifyCriticalMetrics(deviceResults)
      };
    });
    
    return comparison;
  }
  
  private detectRegressions(results: TestResult[]): Regression[] {
    const baseline = this.loadBaseline();
    const regressions: Regression[] = [];
    
    results.forEach(result => {
      const baselineResult = baseline.find(
        b => b.device === result.device && 
            b.network === result.network && 
            b.scenario === result.scenario
      );
      
      if (baselineResult) {
        Object.entries(result.metrics).forEach(([metric, value]) => {
          const baselineValue = baselineResult.metrics[metric];
          const degradation = ((value - baselineValue) / baselineValue) * 100;
          
          if (degradation > 10) { // 10% regression threshold
            regressions.push({
              device: result.device,
              network: result.network,
              scenario: result.scenario,
              metric,
              baselineValue,
              currentValue: value,
              degradation
            });
          }
        });
      }
    });
    
    return regressions;
  }
  
  private generateRecommendations(results: TestResult[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Bundle size recommendations
    const avgBundleSize = this.getAverageMetric(results, 'bundleSize');
    if (avgBundleSize > 150000) {
      recommendations.push({
        category: 'bundle-size',
        priority: 'high',
        issue: `Bundle size (${Math.round(avgBundleSize / 1000)}KB) exceeds target`,
        solution: 'Implement code splitting and tree shaking',
        impact: 'Reduce initial load time by up to 40%'
      });
    }
    
    // Frame rate recommendations
    const lowFPSResults = results.filter(r => r.metrics.averageFPS < 50);
    if (lowFPSResults.length > 0) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        issue: 'Frame rate drops below 50fps on some devices',
        solution: 'Implement virtual scrolling and reduce animations',
        impact: 'Improve scrolling performance by 60%'
      });
    }
    
    // Network recommendations
    const slow3GResults = results.filter(r => r.network === 'Slow 3G');
    const avgLoadTime = this.getAverageMetric(slow3GResults, 'loadTime');
    if (avgLoadTime > 5000) {
      recommendations.push({
        category: 'network',
        priority: 'medium',
        issue: 'Load time exceeds 5s on slow networks',
        solution: 'Implement service worker and optimize caching',
        impact: 'Reduce repeat visit load time by 70%'
      });
    }
    
    return recommendations;
  }
}
```

### 4.2 Performance Dashboard

```typescript
// performance-dashboard.tsx
export const PerformanceDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const { data, loading } = usePerformanceData(timeRange, deviceFilter);
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div className="performance-dashboard">
      <h1>Mobile Performance Dashboard</h1>
      
      <div className="filters">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        <DeviceFilter value={deviceFilter} onChange={setDeviceFilter} />
      </div>
      
      <div className="metrics-grid">
        <MetricCard
          title="Average FCP"
          value={data.averageFCP}
          target={2000}
          unit="ms"
          trend={data.fcpTrend}
        />
        <MetricCard
          title="Average LCP"
          value={data.averageLCP}
          target={3000}
          unit="ms"
          trend={data.lcpTrend}
        />
        <MetricCard
          title="P95 FID"
          value={data.p95FID}
          target={100}
          unit="ms"
          trend={data.fidTrend}
        />
        <MetricCard
          title="CLS Score"
          value={data.averageCLS}
          target={0.1}
          unit=""
          trend={data.clsTrend}
        />
      </div>
      
      <div className="charts">
        <PerformanceTimeline data={data.timeline} />
        <DeviceBreakdown data={data.deviceBreakdown} />
        <NetworkImpactChart data={data.networkImpact} />
      </div>
      
      <div className="alerts">
        <h2>Performance Alerts</h2>
        {data.alerts.map(alert => (
          <Alert
            key={alert.id}
            severity={alert.severity}
            message={alert.message}
            timestamp={alert.timestamp}
          />
        ))}
      </div>
      
      <div className="recommendations">
        <h2>Recommendations</h2>
        {data.recommendations.map(rec => (
          <RecommendationCard
            key={rec.id}
            category={rec.category}
            priority={rec.priority}
            issue={rec.issue}
            solution={rec.solution}
            impact={rec.impact}
          />
        ))}
      </div>
    </div>
  );
};
```

## 5. Testing Checklist

### Pre-Release Testing

- [ ] Run full synthetic test suite across all device profiles
- [ ] Execute real device tests on BrowserStack/Sauce Labs
- [ ] Validate performance budgets in CI/CD
- [ ] Review Lighthouse scores for all key pages
- [ ] Test offline functionality on real devices
- [ ] Verify service worker caching strategies
- [ ] Validate bundle sizes and code splitting
- [ ] Test with throttled CPU and network
- [ ] Verify touch targets meet 48x48px minimum
- [ ] Test gesture navigation on touch devices

### Post-Release Monitoring

- [ ] Monitor RUM data for performance regressions
- [ ] Track Core Web Vitals in Search Console
- [ ] Review weekly performance reports
- [ ] Investigate any performance alerts
- [ ] Update performance budgets based on data
- [ ] A/B test performance optimizations
- [ ] Monitor error rates and recovery success
- [ ] Track offline usage patterns
- [ ] Review device and network distribution
- [ ] Update test matrix based on user data

## Conclusion

This comprehensive performance testing methodology ensures the mobile deletion flow meets all performance targets across device tiers. Through automated testing, real device validation, continuous monitoring, and data-driven optimization, we can maintain excellent performance while preventing regressions. The combination of synthetic testing, real user monitoring, and automated analysis provides complete visibility into performance characteristics and enables rapid identification and resolution of issues.