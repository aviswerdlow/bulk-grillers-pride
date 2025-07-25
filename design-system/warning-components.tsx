import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  AlertOctagon 
} from 'lucide-react';

// Warning level type definitions
export type WarningLevel = 'info' | 'success' | 'warning' | 'error' | 'critical';

interface WarningAlertProps {
  level: WarningLevel;
  title: string;
  message?: string;
  actions?: React.ReactNode;
  onDismiss?: () => void;
  autoFocus?: boolean;
  className?: string;
}

// Icon mapping for each warning level
const warningIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  critical: AlertOctagon,
};

// Style variants for each warning level
const warningStyles = {
  info: {
    container: 'bg-[--warning-info-bg] border-[--warning-info-border] text-[--warning-info-text]',
    icon: 'text-[--warning-info-icon]',
    animation: 'animate-fadeIn',
  },
  success: {
    container: 'bg-[--warning-success-bg] border-[--warning-success-border] text-[--warning-success-text]',
    icon: 'text-[--warning-success-icon]',
    animation: 'animate-fadeIn',
  },
  warning: {
    container: 'bg-[--warning-caution-bg] border-[--warning-caution-border] text-[--warning-caution-text]',
    icon: 'text-[--warning-caution-icon] animate-pulse',
    animation: 'animate-slideDown',
  },
  error: {
    container: 'bg-[--warning-error-bg] border-[--warning-error-border] text-[--warning-error-text]',
    icon: 'text-[--warning-error-icon] animate-pulse',
    animation: 'animate-slideDown animate-glow',
  },
  critical: {
    container: 'bg-[--warning-critical-bg] border-[--warning-critical-border] text-[--warning-critical-text]',
    icon: 'text-[--warning-critical-icon] animate-pulse',
    animation: 'animate-shake animate-criticalPulse',
  },
};

// ARIA roles for accessibility
const ariaRoles = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  error: 'alert',
  critical: 'alert',
};

// Main warning component
export const WarningAlert: React.FC<WarningAlertProps> = ({
  level,
  title,
  message,
  actions,
  onDismiss,
  autoFocus = false,
  className,
}) => {
  const Icon = warningIcons[level];
  const styles = warningStyles[level];
  const ariaRole = ariaRoles[level];
  const isAssertive = level === 'critical';

  React.useEffect(() => {
    // Auto-dismiss for low severity levels
    if (level === 'info' || level === 'success') {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [level, onDismiss]);

  return (
    <div
      role={ariaRole}
      aria-live={isAssertive ? 'assertive' : 'polite'}
      tabIndex={autoFocus ? 0 : -1}
      ref={(el) => autoFocus && el?.focus()}
      className={cn(
        'relative flex items-start gap-3 p-4 border rounded-lg transition-all',
        styles.container,
        styles.animation,
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        level === 'critical' && 'focus:ring-red-500',
        className
      )}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0', styles.icon)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold leading-none">
          <span className="sr-only">{level} alert:</span>
          {title}
        </h4>
        {message && (
          <p className="mt-1 text-sm opacity-90">{message}</p>
        )}
        {actions && (
          <div className="mt-3 flex gap-2">{actions}</div>
        )}
      </div>

      {/* Dismiss button for dismissible levels */}
      {onDismiss && level !== 'error' && level !== 'critical' && (
        <button
          onClick={onDismiss}
          className={cn(
            'flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 rounded',
            'p-1 -m-1'
          )}
          aria-label="Dismiss alert"
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// Mobile-optimized bottom sheet variant for critical warnings
export const MobileWarningSheet: React.FC<WarningAlertProps> = (props) => {
  if (props.level !== 'error' && props.level !== 'critical') {
    return <WarningAlert {...props} />;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:relative md:inset-auto">
      <div className="bg-black/50 fixed inset-0 md:hidden" onClick={props.onDismiss} />
      <WarningAlert
        {...props}
        className={cn(
          'rounded-b-none md:rounded-b-lg',
          'animate-slideUp md:animate-none',
          'shadow-2xl md:shadow-none'
        )}
      />
    </div>
  );
};

// Example usage components
export const WarningExamples = () => {
  return (
    <div className="space-y-4 p-4">
      <WarningAlert
        level="info"
        title="System Update Available"
        message="New features have been added to your dashboard."
      />

      <WarningAlert
        level="success"
        title="Changes Saved"
        message="Your product updates have been successfully saved."
      />

      <WarningAlert
        level="warning"
        title="Approaching Storage Limit"
        message="You've used 90% of your storage quota. Consider upgrading your plan."
        actions={
          <>
            <button className="btn-sm btn-primary">Upgrade Plan</button>
            <button className="btn-sm btn-outline">View Usage</button>
          </>
        }
      />

      <WarningAlert
        level="error"
        title="Failed to Save Changes"
        message="An error occurred while saving. Please check your connection and try again."
        actions={
          <>
            <button className="btn-sm btn-primary">Retry</button>
            <button className="btn-sm btn-outline">View Details</button>
          </>
        }
      />

      <WarningAlert
        level="critical"
        title="Permanent Deletion Warning"
        message="This action will permanently delete 25 products and cannot be undone."
        actions={
          <>
            <button className="btn-sm btn-destructive">Delete Forever</button>
            <button className="btn-sm btn-outline">Cancel</button>
          </>
        }
        autoFocus
      />
    </div>
  );
};