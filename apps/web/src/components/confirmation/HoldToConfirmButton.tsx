'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  duration?: number;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function HoldToConfirmButton({
  onConfirm,
  duration = 3000,
  children,
  className,
  disabled = false
}: HoldToConfirmButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const announced25 = useRef(false);
  const announced50 = useRef(false);
  const announced75 = useRef(false);
  const completeTimeout = useRef<NodeJS.Timeout | null>(null);

  const resetState = useCallback(() => {
    setProgress(0);
    setIsHolding(false);
    setIsComplete(false);
    setIsCancelled(false);
    announced25.current = false;
    announced50.current = false;
    announced75.current = false;
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    if (completeTimeout.current) {
      clearTimeout(completeTimeout.current);
      completeTimeout.current = null;
    }
  }, []);

  const startHold = useCallback(() => {
    if (disabled || isComplete) return;
    
    resetState();
    setIsHolding(true);
    announceProgress('Hold started');
    
    // Use setInterval for better Jest timer compatibility
    const intervalTime = 100; // Update every 100ms
    let elapsed = 0;
    
    progressInterval.current = setInterval(() => {
      elapsed += intervalTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      
      // Announce progress milestones
      if (newProgress >= 25 && !announced25.current) {
        announced25.current = true;
        announceProgress('25 percent complete');
      }
      if (newProgress >= 50 && !announced50.current) {
        announced50.current = true;
        announceProgress('50 percent complete');
      }
      if (newProgress >= 75 && !announced75.current) {
        announced75.current = true;
        announceProgress('75 percent complete');
      }
      
      if (newProgress >= 100) {
        setIsComplete(true);
        setIsHolding(false);
        onConfirm();
        announceProgress('Action confirmed');
        
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
          progressInterval.current = null;
        }
        
        // Reset after showing complete state
        completeTimeout.current = setTimeout(() => {
          resetState();
        }, 1500);
      }
    }, intervalTime);
  }, [disabled, isComplete, resetState, duration, onConfirm]);

  const endHold = useCallback(() => {
    if (!isHolding || isComplete) return;
    
    setIsHolding(false);
    setIsCancelled(true);
    announceProgress('Hold cancelled');
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    
    setTimeout(() => {
      resetState();
    }, 1000);
  }, [isHolding, isComplete, resetState]);

  // Handle keyboard interactions
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      startHold();
    }
  }, [startHold]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      endHold();
    }
  }, [endHold]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (completeTimeout.current) {
        clearTimeout(completeTimeout.current);
      }
    };
  }, []);

  const getButtonText = () => {
    if (isComplete) return '✓ Confirmed';
    if (isCancelled) return '✗ Cancelled';
    if (isHolding) {
      if (progress < 50) return 'Keep Holding...';
      return 'Almost there...';
    }
    return children;
  };

  const getHelperText = () => {
    if (isComplete) return 'Action confirmed';
    if (isCancelled) return 'Release to cancel';
    if (isHolding) {
      const remaining = ((100 - progress) / 100 * duration / 1000).toFixed(2);
      return `${remaining}s remaining`;
    }
    return `Hold for ${duration / 1000} seconds`;
  };

  const getButtonState = () => {
    if (isComplete) return 'complete';
    if (isCancelled) return 'cancelled';
    if (isHolding) return 'in-progress';
    return 'initial';
  };

  return (
    <button
      className={cn(
        'relative w-full md:w-[280px] h-14 px-5 pb-2 rounded-lg border-2 bg-white cursor-pointer transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'border-gray-300': getButtonState() === 'initial',
          'border-blue-500 shadow-blue-100 shadow-lg': getButtonState() === 'in-progress',
          'border-green-500 bg-green-50': getButtonState() === 'complete',
          'border-red-500 bg-red-50': getButtonState() === 'cancelled',
        },
        className
      )}
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      onTouchCancel={endHold}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      disabled={disabled}
      aria-label={`${getButtonText()}. ${getHelperText()}`}
      aria-pressed={isHolding}
    >
      <span className="block text-base font-semibold mb-1">
        {getButtonText()}
      </span>
      <span className="text-xs text-gray-600">
        {getHelperText()}
      </span>
      
      {/* Progress bar */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-2 bg-gray-100 rounded-b-md overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full transition-all duration-100',
            {
              'bg-blue-500': getButtonState() === 'in-progress' || getButtonState() === 'initial',
              'bg-green-500': getButtonState() === 'complete',
              'bg-red-500': getButtonState() === 'cancelled',
            }
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        <span id="hold-progress-announcement"></span>
      </div>
    </button>
  );
}

// Helper function to announce progress to screen readers
function announceProgress(message: string) {
  const announcement = document.getElementById('hold-progress-announcement');
  if (announcement) {
    announcement.textContent = message;
    // Clear after announcement
    setTimeout(() => {
      announcement.textContent = '';
    }, 100);
  }
}