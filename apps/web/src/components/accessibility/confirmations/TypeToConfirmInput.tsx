'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAnnouncement } from '@/contexts/accessibility';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export interface TypeToConfirmInputProps {
  confirmationPhrase: string;
  onConfirm: () => void;
  onCancel?: () => void;
  caseSensitive?: boolean;
  allowPaste?: boolean;
  showHint?: boolean;
  hintObfuscation?: 'partial' | 'full' | 'none';
  placeholder?: string;
  label?: string;
  errorMessage?: string;
  successMessage?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  validateOnType?: boolean;
  showProgress?: boolean;
}

export function TypeToConfirmInput({
  confirmationPhrase,
  onConfirm,
  onCancel,
  caseSensitive = false,
  allowPaste = false,
  showHint = true,
  hintObfuscation = 'partial',
  placeholder = 'Type the confirmation phrase',
  label = 'Type to confirm',
  errorMessage = 'Phrase does not match',
  successMessage = 'Phrase matches!',
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  className,
  disabled,
  autoFocus = true,
  validateOnType = true,
  showProgress = true,
}: TypeToConfirmInputProps) {
  const { announce } = useAnnouncement();
  const [inputValue, setInputValue] = useState('');
  const [showPhrase, setShowPhrase] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize strings for comparison
  const normalizeString = useCallback((str: string) => {
    return caseSensitive ? str : str.toLowerCase();
  }, [caseSensitive]);

  // Validate input
  const validateInput = useCallback((value: string) => {
    const normalizedInput = normalizeString(value.trim());
    const normalizedPhrase = normalizeString(confirmationPhrase.trim());
    return normalizedInput === normalizedPhrase;
  }, [confirmationPhrase, normalizeString]);

  // Get obfuscated hint
  const getObfuscatedHint = useCallback(() => {
    switch (hintObfuscation) {
      case 'full':
        return '•'.repeat(confirmationPhrase.length);
      case 'partial':
        // Show first and last characters
        if (confirmationPhrase.length <= 2) return confirmationPhrase;
        const first = confirmationPhrase[0];
        const last = confirmationPhrase[confirmationPhrase.length - 1];
        const middle = '•'.repeat(confirmationPhrase.length - 2);
        return `${first}${middle}${last}`;
      case 'none':
      default:
        return confirmationPhrase;
    }
  }, [confirmationPhrase, hintObfuscation]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (validateOnType && value.length > 0) {
      setHasAttempted(true);
      const valid = validateInput(value);
      setIsValid(valid);
      
      if (valid && !isConfirmed) {
        announce(successMessage, 'polite');
      }
    }
  }, [validateOnType, validateInput, isConfirmed, successMessage, announce]);

  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (!allowPaste) {
      e.preventDefault();
      announce('Paste is not allowed. Please type the phrase manually.', 'assertive');
    }
  }, [allowPaste, announce]);

  // Handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!hasAttempted) {
      setHasAttempted(true);
    }

    const valid = validateInput(inputValue);
    setIsValid(valid);

    if (valid) {
      setIsConfirmed(true);
      announce('Action confirmed', 'assertive');
      onConfirm();
    } else {
      announce(errorMessage, 'assertive');
      inputRef.current?.focus();
      
      // Shake animation
      if (inputRef.current) {
        inputRef.current.classList.add('animate-shake');
        setTimeout(() => {
          inputRef.current?.classList.remove('animate-shake');
        }, 500);
      }
    }
  }, [hasAttempted, validateInput, inputValue, errorMessage, announce, onConfirm]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setInputValue('');
    setIsValid(false);
    setHasAttempted(false);
    announce('Action cancelled', 'polite');
    onCancel?.();
  }, [announce, onCancel]);

  // Focus input on mount if autoFocus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Calculate progress percentage
  const progress = showProgress
    ? Math.round((inputValue.length / confirmationPhrase.length) * 100)
    : 0;

  // Determine input state for styling
  const inputState = hasAttempted
    ? isValid
      ? 'valid'
      : inputValue.length > 0
      ? 'invalid'
      : 'neutral'
    : 'neutral';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Label and hint */}
      <div className="space-y-2">
        <Label htmlFor="type-to-confirm" className="text-sm font-medium">
          {label}
        </Label>
        
        {showHint && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Type: {showPhrase ? confirmationPhrase : getObfuscatedHint()}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-1"
              onClick={() => {
                setShowPhrase(!showPhrase);
                announce(
                  showPhrase ? 'Phrase hidden' : 'Phrase shown',
                  'polite'
                );
              }}
              aria-label={showPhrase ? 'Hide phrase' : 'Show phrase'}
            >
              {showPhrase ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Input field */}
      <div className="relative">
        <Input
          ref={inputRef}
          id="type-to-confirm"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled || isConfirmed}
          aria-label={label}
          aria-describedby={
            hasAttempted
              ? isValid
                ? 'confirmation-success'
                : 'confirmation-error'
              : undefined
          }
          aria-invalid={hasAttempted && !isValid && inputValue.length > 0}
          className={cn(
            'pr-10 transition-all',
            inputState === 'valid' && 'border-green-500 focus-visible:ring-green-500',
            inputState === 'invalid' && 'border-red-500 focus-visible:ring-red-500'
          )}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        
        {/* Status icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {inputState === 'valid' && (
            <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
          )}
          {inputState === 'invalid' && (
            <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
          )}
        </div>

        {/* Progress bar */}
        {showProgress && inputValue.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200">
            <div
              className={cn(
                'h-full transition-all duration-200',
                isValid ? 'bg-green-500' : 'bg-blue-500'
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Error/success messages */}
      {hasAttempted && (
        <>
          {isValid && (
            <p
              id="confirmation-success"
              className="text-sm text-green-600 flex items-center gap-1"
              role="status"
            >
              <CheckCircle className="h-4 w-4" />
              {successMessage}
            </p>
          )}
          {!isValid && inputValue.length > 0 && (
            <p
              id="confirmation-error"
              className="text-sm text-red-600 flex items-center gap-1"
              role="alert"
            >
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </p>
          )}
        </>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={disabled || isConfirmed}
        >
          {cancelButtonText}
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit()}
          disabled={disabled || isConfirmed || (validateOnType && !isValid)}
          variant={isValid ? 'default' : 'destructive'}
        >
          {isConfirmed ? '✓ Confirmed' : confirmButtonText}
        </Button>
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {!caseSensitive && 'Case-insensitive matching enabled.'}
        {!allowPaste && 'Paste is disabled. Please type the phrase manually.'}
      </div>
    </div>
  );
}