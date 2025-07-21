/**
 * Performance Monitor Component
 * Tracks and displays Core Web Vitals for progressive deletion flow
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Zap, Eye, MousePointer } from 'lucide-react';

interface WebVitals {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  fcp?: number; // First Contentful Paint
}

interface PerformanceMetrics extends WebVitals {
  memory?: number; // Memory usage in MB
  fps?: number; // Current FPS
  bundleSize?: number; // Bundle size in KB
  layer?: string; // Current enhancement layer
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isMonitoring, setIsMonitoring] = useState(true);
  
  useEffect(() => {
    if (!isMonitoring || typeof window === 'undefined') return;
    
    // Monitor Web Vitals
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'largest-contentful-paint') {
          setMetrics(prev => ({ ...prev, lcp: Math.round(entry.startTime) }));
        }
        if (entry.entryType === 'first-input' && 'processingStart' in entry) {
          const fid = Math.round((entry as any).processingStart - entry.startTime);
          setMetrics(prev => ({ ...prev, fid }));
        }
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          setMetrics(prev => ({ 
            ...prev, 
            cls: (prev.cls || 0) + (entry as any).value 
          }));
        }
      });
    });
    
    // Observe Web Vitals
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (e) {
      console.warn('Performance monitoring not fully supported');
    }
    
    // Monitor memory usage
    const memoryInterval = setInterval(() => {
      if ((performance as any).memory) {
        const memoryMB = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
        setMetrics(prev => ({ ...prev, memory: memoryMB }));
      }
    }, 1000);
    
    // Monitor FPS
    let lastTime = performance.now();
    let frames = 0;
    let animationId: number;
    
    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        setMetrics(prev => ({ ...prev, fps }));
        frames = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };
    
    animationId = requestAnimationFrame(measureFPS);
    
    // Get layer info
    const params = new URLSearchParams(window.location.search);
    const layer = params.get('layer') || 'auto';
    setMetrics(prev => ({ ...prev, layer }));
    
    return () => {
      observer.disconnect();
      clearInterval(memoryInterval);
      cancelAnimationFrame(animationId);
    };
  }, [isMonitoring]);
  
  const getScoreColor = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'text-green-600';
    if (value <= thresholds[1]) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getScoreBadge = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'default';
    if (value <= thresholds[1]) return 'secondary';
    return 'destructive';
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Performance Metrics</CardTitle>
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {isMonitoring ? 'Pause' : 'Resume'}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Core Web Vitals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* LCP */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">LCP</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(metrics.lcp || 0, [2500, 4000])}`}>
              {metrics.lcp ? `${(metrics.lcp / 1000).toFixed(1)}s` : '--'}
            </div>
            <Badge variant={getScoreBadge(metrics.lcp || 0, [2500, 4000])} className="text-xs">
              {metrics.lcp && metrics.lcp <= 2500 ? 'Good' : metrics.lcp && metrics.lcp <= 4000 ? 'Needs Work' : 'Poor'}
            </Badge>
          </div>
          
          {/* FID */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">FID</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(metrics.fid || 0, [100, 300])}`}>
              {metrics.fid !== undefined ? `${metrics.fid}ms` : '--'}
            </div>
            <Badge variant={getScoreBadge(metrics.fid || 0, [100, 300])} className="text-xs">
              {metrics.fid && metrics.fid <= 100 ? 'Good' : metrics.fid && metrics.fid <= 300 ? 'Needs Work' : 'Poor'}
            </Badge>
          </div>
          
          {/* CLS */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">CLS</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor((metrics.cls || 0) * 1000, [100, 250])}`}>
              {metrics.cls !== undefined ? metrics.cls.toFixed(3) : '--'}
            </div>
            <Badge variant={getScoreBadge((metrics.cls || 0) * 1000, [100, 250])} className="text-xs">
              {metrics.cls && metrics.cls <= 0.1 ? 'Good' : metrics.cls && metrics.cls <= 0.25 ? 'Needs Work' : 'Poor'}
            </Badge>
          </div>
          
          {/* FPS */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">FPS</span>
            </div>
            <div className={`text-2xl font-bold ${metrics.fps && metrics.fps >= 55 ? 'text-green-600' : 'text-yellow-600'}`}>
              {metrics.fps || '--'}
            </div>
            <Badge variant={metrics.fps && metrics.fps >= 55 ? 'default' : 'secondary'} className="text-xs">
              {metrics.fps && metrics.fps >= 55 ? 'Smooth' : 'Choppy'}
            </Badge>
          </div>
        </div>
        
        {/* Memory Usage */}
        {metrics.memory !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Memory Usage</span>
              <span className="text-muted-foreground">{metrics.memory}MB</span>
            </div>
            <Progress 
              value={Math.min((metrics.memory / 500) * 100, 100)} 
              className="h-2"
            />
          </div>
        )}
        
        {/* Layer Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Enhancement Layer</span>
          <Badge variant="outline">{metrics.layer || 'Unknown'}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}