'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAnnouncement } from '@/contexts/accessibility';
import { cn } from '@/lib/utils';

export interface LiveRegionManagerProps {
  children?: React.ReactNode;
  className?: string;
  politenessDefault?: 'polite' | 'assertive';
  clearDelay?: number;
  preventSpam?: boolean;
  spamThreshold?: number;
}

export class AnnouncementQueue {
  private queue: Array<{
    id: string;
    message: string;
    priority: 'polite' | 'assertive';
    timestamp: number;
  }> = [];
  private processing = false;
  private lastAnnouncement = '';
  private lastAnnouncementTime = 0;
  
  constructor(
    private onAnnounce: (message: string, priority: 'polite' | 'assertive') => void,
    private spamThreshold = 500
  ) {}

  add(message: string, priority: 'polite' | 'assertive' = 'polite') {
    // Prevent spam - same message within threshold
    if (
      message === this.lastAnnouncement &&
      Date.now() - this.lastAnnouncementTime < this.spamThreshold
    ) {
      return;
    }

    const announcement = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      priority,
      timestamp: Date.now(),
    };

    // Assertive announcements jump to front of queue
    if (priority === 'assertive') {
      this.queue.unshift(announcement);
    } else {
      this.queue.push(announcement);
    }

    this.process();
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const announcement = this.queue.shift();
      if (announcement) {
        this.lastAnnouncement = announcement.message;
        this.lastAnnouncementTime = announcement.timestamp;
        this.onAnnounce(announcement.message, announcement.priority);
        
        // Wait between announcements to prevent overlap
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.processing = false;
  }

  clear() {
    this.queue = [];
  }
}

export function LiveRegionManager({
  children,
  className,
  politenessDefault = 'polite',
  clearDelay = 5000,
  preventSpam = true,
  spamThreshold = 500,
}: LiveRegionManagerProps) {
  void politenessDefault;
  void clearDelay;
  const { announce } = useAnnouncement();
  const queueRef = useRef<AnnouncementQueue | undefined>(undefined);
  const [, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize queue
    queueRef.current = new AnnouncementQueue(
      announce,
      preventSpam ? spamThreshold : 0
    );
    setIsReady(true);

    return () => {
      queueRef.current?.clear();
    };
  }, [announce, preventSpam, spamThreshold]);

  // Provide queue through context or props if needed
  // const contextValue = {
  //   announce: (message: string, priority?: 'polite' | 'assertive') => {
  //     queueRef.current?.add(message, priority || politenessDefault);
  //   },
  //   isReady,
  // };

  return (
    <div className={cn('live-region-manager', className)}>
      {children}
    </div>
  );
}

// Specialized live region for status updates
export function StatusLiveRegion({
  status,
  prefix = 'Status:',
  autoAnnounce = true,
  priority = 'polite',
}: {
  status: string;
  prefix?: string;
  autoAnnounce?: boolean;
  priority?: 'polite' | 'assertive';
}) {
  const { announce } = useAnnouncement();
  const previousStatus = useRef(status);

  useEffect(() => {
    if (autoAnnounce && status !== previousStatus.current) {
      announce(`${prefix} ${status}`, priority);
      previousStatus.current = status;
    }
  }, [status, prefix, autoAnnounce, priority, announce]);

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {prefix} {status}
    </div>
  );
}

// Progress announcer for multi-step operations
export function ProgressAnnouncer({
  current,
  total,
  itemName = 'item',
  autoAnnounce = true,
}: {
  current: number;
  total: number;
  itemName?: string;
  autoAnnounce?: boolean;
}) {
  const { announce } = useAnnouncement();
  const lastAnnounced = useRef({ current: -1, total: -1 });

  useEffect(() => {
    if (
      autoAnnounce &&
      (current !== lastAnnounced.current.current || total !== lastAnnounced.current.total)
    ) {
      const percentage = Math.round((current / total) * 100);
      const message = `Processing ${itemName} ${current} of ${total}, ${percentage}% complete`;
      
      announce(message, 'polite');
      lastAnnounced.current = { current, total };
    }
  }, [current, total, itemName, autoAnnounce, announce]);

  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${itemName} progress`}
      className="sr-only"
    >
      {current} of {total} {itemName}s processed
    </div>
  );
}

// Component for screen reader only content
export function ScreenReaderOnly({
  children,
  as: Component = 'span',
  ...props
}: {
  children: React.ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
} & React.HTMLAttributes<HTMLElement>) {
  return React.createElement(
    Component,
    { ...props, className: cn('sr-only', props.className) },
    children
  );
}

// Visually hidden but focusable (for skip links)
export function VisuallyHidden({
  children,
  showOnFocus = false,
  as: Component = 'a',
  ...props
}: {
  children: React.ReactNode;
  showOnFocus?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
} & React.HTMLAttributes<HTMLElement>) {
  return React.createElement(
    Component,
    {
      ...props,
      className: cn(
        showOnFocus ? 'skip-link' : 'sr-only',
        'focus:not-sr-only',
        props.className
      )
    },
    children
  );
}