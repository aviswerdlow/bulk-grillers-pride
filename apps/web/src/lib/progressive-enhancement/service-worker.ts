/**
 * Service Worker Registration and Management
 * For offline deletion support
 */

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private messageHandlers = new Map<string, (data: any) => void>();
  
  async register() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Workers not supported');
      return;
    }
    
    try {
      this.registration = await navigator.serviceWorker.register('/sw-deletion.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered:', this.registration);
      
      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        const handler = this.messageHandlers.get(event.data.type);
        if (handler) {
          handler(event.data);
        }
      });
      
      // Check for updates periodically
      setInterval(() => {
        this.registration?.update();
      }, 60 * 60 * 1000); // Every hour
      
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }
  
  async unregister() {
    if (this.registration) {
      await this.registration.unregister();
      this.registration = null;
    }
  }
  
  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }
  
  async sendMessage(type: string, data?: any): Promise<any> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No active Service Worker');
    }
    
    const channel = new MessageChannel();
    
    return new Promise((resolve) => {
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type, ...data },
        [channel.port2]
      );
    });
  }
  
  async checkQueueStatus(): Promise<{ count: number }> {
    try {
      const response = await this.sendMessage('check-queue');
      return response;
    } catch (error) {
      return { count: 0 };
    }
  }
  
  async requestBackgroundSync() {
    if ('sync' in this.registration!) {
      try {
        await (this.registration as any).sync.register('sync-deletions');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }
  
  get isSupported() {
    return 'serviceWorker' in navigator;
  }
  
  get isRegistered() {
    return this.registration !== null;
  }
}

// Singleton instance
export const swManager = new ServiceWorkerManager();

/**
 * React hook for Service Worker
 */
import { useEffect, useState } from 'react';

export function useServiceWorker() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    // Register SW
    swManager.register().then(() => {
      setIsRegistered(true);
      
      // Check queue status
      swManager.checkQueueStatus().then(({ count }) => {
        setQueueCount(count);
      });
    });
    
    // Listen for queue updates
    swManager.onMessage('deletion-queued', () => {
      setQueueCount(prev => prev + 1);
    });
    
    swManager.onMessage('deletions-processed', ({ count }) => {
      setQueueCount(prev => Math.max(0, prev - count));
    });
    
    // Monitor online status
    const handleOnline = () => {
      setIsOnline(true);
      swManager.requestBackgroundSync();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return {
    isRegistered,
    queueCount,
    isOnline
  };
}