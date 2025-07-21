'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TypeToConfirmInputProps {
  confirmText: string;
  onConfirm: (confirmed: boolean) => void;
  className?: string;
  disabled?: boolean;
  caseSensitive?: boolean;
  placeholder?: string;
}

export function TypeToConfirmInput({
  confirmText,
  onConfirm,
  className,
  disabled = false,
  caseSensitive = false,
  placeholder
}: TypeToConfirmInputProps) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'empty' | 'partial' | 'complete' | 'mismatch'>('empty');
  
  const checkMatch = useCallback((inputValue: string) => {
    if (!inputValue) {
      setStatus('empty');
      onConfirm(false);
      return;
    }
    
    const normalizedInput = caseSensitive ? inputValue : inputValue.toUpperCase();
    const normalizedConfirm = caseSensitive ? confirmText : confirmText.toUpperCase();
    
    if (normalizedInput === normalizedConfirm) {
      setStatus('complete');
      onConfirm(true);
    } else if (normalizedConfirm.startsWith(normalizedInput)) {
      setStatus('partial');
      onConfirm(false);
    } else {
      setStatus('mismatch');
      onConfirm(false);
    }
  }, [confirmText, caseSensitive, onConfirm]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    checkMatch(newValue);
  };

  useEffect(() => {
    // Announce status changes to screen readers
    const announcement = document.getElementById('type-confirm-announcement');
    if (announcement) {
      switch (status) {
        case 'partial':
          announcement.textContent = `${confirmText.length - value.length} more characters needed`;
          break;
        case 'complete':
          announcement.textContent = 'Text matches. Ready to proceed.';
          break;
        case 'mismatch':
          announcement.textContent = 'Text does not match. Please try again.';
          break;
        default:
          announcement.textContent = '';
      }
    }
  }, [status, value.length, confirmText.length]);

  const getHelperMessage = () => {
    switch (status) {
      case 'empty':
        return {
          icon: 'ⓘ',
          text: 'This action cannot be undone',
          className: 'text-semantic-info'
        };
      case 'partial':
        return {
          icon: '⚠',
          text: `${confirmText.length - value.length} more character${confirmText.length - value.length === 1 ? '' : 's'} needed`,
          className: 'text-semantic-warning'
        };
      case 'complete':
        return {
          icon: '✓',
          text: 'Ready to proceed',
          className: 'text-semantic-success'
        };
      case 'mismatch':
        return {
          icon: '✗',
          text: 'Text doesn\'t match. Please try again.',
          className: 'text-semantic-danger'
        };
    }
  };

  const getInputStyles = () => {
    const baseStyles = 'w-full px-4 py-3 text-base font-mono border-2 rounded-lg transition-all duration-200';
    const focusStyles = 'focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (status) {
      case 'empty':
        return cn(baseStyles, focusStyles, 'border-semantic-default focus-default');
      case 'partial':
        return cn(baseStyles, focusStyles, 'border-semantic-warning bg-semantic-warning focus-warning');
      case 'complete':
        return cn(baseStyles, focusStyles, 'border-semantic-success bg-semantic-success focus-success');
      case 'mismatch':
        return cn(baseStyles, focusStyles, 'border-semantic-danger bg-semantic-danger focus-danger');
    }
  };

  const helper = getHelperMessage();

  return (
    <div className={cn('space-y-2', className)}>
      <label 
        htmlFor="type-confirm-input"
        className="block text-sm font-medium text-semantic-secondary"
      >
        Type "{confirmText}" to confirm:
      </label>
      
      <input
        id="type-confirm-input"
        type="text"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder || confirmText}
        className={cn(
          getInputStyles(),
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        aria-describedby="type-confirm-helper"
        aria-invalid={status === 'mismatch'}
        autoComplete="off"
        spellCheck={false}
      />
      
      <div 
        id="type-confirm-helper"
        className={cn('flex items-center gap-2 text-sm', helper.className)}
        role="status"
      >
        <span className="text-base" aria-hidden="true">{helper.icon}</span>
        <span>{helper.text}</span>
      </div>
      
      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        <span id="type-confirm-announcement"></span>
      </div>
    </div>
  );
}