'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAnnouncement } from '@/contexts/accessibility';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { type VariantProps } from 'class-variance-authority';

export interface HoldToConfirmButtonProps extends Omit<React.ComponentProps<'button'>, 'onClick'>, VariantProps<typeof buttonVariants> {
  onConfirm: () => void;
  onCancel?: () => void;
  holdDuration?: number; // milliseconds
  progressColor?: string;
  progressBackgroundColor?: string;
  progressThickness?: number;
  cancelThreshold?: number; // pixels of movement to cancel
  hapticFeedback?: boolean;
  announceProgress?: boolean;
  announceThresholds?: number[]; // percentages to announce
  confirmMessage?: string;
  cancelMessage?: string;
}

export function HoldToConfirmButton({
  onConfirm,
  onCancel,
  holdDuration = 3000,
  progressColor = 'rgb(59, 130, 246)', // blue-500
  progressBackgroundColor = 'rgba(59, 130, 246, 0.2)',
  progressThickness = 4,
  cancelThreshold = 50,
  hapticFeedback = true,
  announceProgress = true,
  announceThresholds = [25, 50, 75],
  confirmMessage = 'Action confirmed',
  cancelMessage = 'Action cancelled',
  children,
  className,
  disabled,
  ...buttonProps
}: HoldToConfirmButtonProps) {
  const { announce } = useAnnouncement();
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  
  const startTimeRef = useRef<number>(0);
  const startPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | undefined>(undefined);
  const announcedThresholdsRef = useRef<Set<number>>(new Set());
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'start' | 'progress' | 'success' | 'cancel') => {
    if (!hapticFeedback || !window.navigator.vibrate) return;

    switch (type) {
      case 'start':
        window.navigator.vibrate(50);
        break;
      case 'progress':
        window.navigator.vibrate(10);
        break;
      case 'success':
        window.navigator.vibrate([50, 50, 50]);
        break;
      case 'cancel':
        window.navigator.vibrate(100);
        break;
    }
  }, [hapticFeedback]);

  // Update progress
  const updateProgress = useCallback(() => {
    if (!isHolding || isDone) return;

    const elapsed = Date.now() - startTimeRef.current;
    const newProgress = Math.min((elapsed / holdDuration) * 100, 100);
    
    setProgress(newProgress);

    // Announce progress at thresholds
    if (announceProgress) {
      announceThresholds.forEach(threshold => {
        if (
          newProgress >= threshold &&
          !announcedThresholdsRef.current.has(threshold)
        ) {
          announce(`Hold progress: ${threshold}%`, 'polite');
          announcedThresholdsRef.current.add(threshold);
          triggerHaptic('progress');
        }
      });
    }

    // Check if complete
    if (newProgress >= 100) {
      setIsDone(true);
      setIsHolding(false);
      triggerHaptic('success');
      announce(confirmMessage, 'assertive');
      onConfirm();
    } else {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [
    isHolding,
    isDone,
    holdDuration,
    announceProgress,
    announceThresholds,
    confirmMessage,
    announce,
    onConfirm,
    triggerHaptic,
  ]);

  // Start holding
  const handleStart = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    if (disabled || isDone) return;

    const point = 'touches' in e ? e.touches[0] : e;
    if (!point) return;
    startPositionRef.current = { x: point.clientX, y: point.clientY };
    startTimeRef.current = Date.now();
    announcedThresholdsRef.current.clear();
    
    setIsHolding(true);
    setProgress(0);
    triggerHaptic('start');
    announce('Hold to confirm action', 'polite');
    
    updateProgress();
  }, [disabled, isDone, announce, triggerHaptic, updateProgress]);

  // Handle movement (cancel if moved too far)
  const handleMove = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    if (!isHolding || isDone) return;

    const point = 'touches' in e ? e.touches[0] : e;
    if (!point) return;
    const deltaX = Math.abs(point.clientX - startPositionRef.current.x);
    const deltaY = Math.abs(point.clientY - startPositionRef.current.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > cancelThreshold) {
      handleCancel();
    }
  }, [isHolding, isDone, cancelThreshold]);

  // Cancel holding
  const handleCancel = useCallback(() => {
    if (!isHolding) return;

    setIsHolding(false);
    setProgress(0);
    announcedThresholdsRef.current.clear();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    triggerHaptic('cancel');
    announce(cancelMessage, 'polite');
    onCancel?.();
  }, [isHolding, cancelMessage, announce, triggerHaptic, onCancel]);

  // Handle end (release)
  const handleEnd = useCallback(() => {
    if (isHolding && !isDone) {
      handleCancel();
    }
  }, [isHolding, isDone, handleCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Reset after completion
  useEffect(() => {
    if (isDone) {
      const timeout = setTimeout(() => {
        setIsDone(false);
        setProgress(0);
      }, 1000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isDone]);

  // Keyboard support (Enter/Space)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled || isDone) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // For keyboard, immediately show confirmation dialog or alternative
      announce('Press and hold Enter or Space to confirm', 'polite');
      handleStart(e as any);
    }
  }, [disabled, isDone, announce, handleStart]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleEnd();
    }
  }, [handleEnd]);

  return (
    <Button
      ref={buttonRef}
      className={cn('relative overflow-hidden touch-none', className)}
      disabled={disabled}
      onPointerDown={handleStart}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerCancel={handleCancel}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleCancel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      role="button"
      aria-label={`Hold for ${holdDuration / 1000} seconds to confirm`}
      aria-pressed={isHolding}
      {...buttonProps}
    >
      {/* Progress background */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{
          backgroundColor: progressBackgroundColor,
          opacity: isHolding || progress > 0 ? 1 : 0,
        }}
      />

      {/* Progress bar */}
      <div
        className="absolute inset-y-0 left-0 transition-all"
        style={{
          width: `${progress}%`,
          backgroundColor: progressColor,
          opacity: isHolding || progress > 0 ? 1 : 0,
        }}
      />

      {/* Circular progress indicator */}
      <svg
        className={cn(
          'absolute inset-0 w-full h-full pointer-events-none transition-opacity',
          (isHolding || progress > 0) ? 'opacity-100' : 'opacity-0'
        )}
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke={progressBackgroundColor}
          strokeWidth={progressThickness}
        />
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke={progressColor}
          strokeWidth={progressThickness}
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 48}`}
          strokeDashoffset={`${2 * Math.PI * 48 * (1 - progress / 100)}`}
          transform="rotate(-90 50 50)"
          className="transition-all duration-100"
        />
      </svg>

      {/* Button content */}
      <span className="relative z-10">
        {isDone ? '✓ Confirmed' : children}
      </span>

      {/* Screen reader progress */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isHolding && `Holding: ${Math.round(progress)}% complete`}
        {isDone && confirmMessage}
      </span>
    </Button>
  );
}